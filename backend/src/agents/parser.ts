// backend/src/agents/parser.ts
import { z } from 'zod';
import { llmClient } from '../config/llm.js'; // 👈 引入刚才初始化的客户端
import { config } from '../config/env.js';
import { routeIntent } from './router.agent.js';
import type { Category, Segment } from '../models/types.js';

export interface ParseResult {
  category: Category;
  transcript: Segment[];
  payload: Record<string, unknown>;
}

// 1. 按场景类别定义 Zod Schema，与 frontend/src/types/scenes.d.ts 保持一致
const MedicationPayloadSchema = z.object({
  medication: z.object({
    name: z.string().min(1),
    dose: z.string().min(1),
    method: z.string().min(1),
  }),
  schedule: z.array(
    z.object({
      time: z.string().min(1),
      title: z.string().min(1),
      segmentId: z.string().optional(),
    }),
  ),
  warnings: z
    .array(
      z.object({
        text: z.string().min(1),
        segmentId: z.string().optional(),
      }),
    )
    .optional(),
});

const SopPayloadSchema = z.object({
  title: z.string().min(1),
  steps: z
    .array(
      z.object({
        title: z.string().min(1),
        order: z.number().int().positive(),
        duration: z.number().nonnegative().optional(),
        segmentId: z.string().optional(),
        warnings: z.array(z.string()).optional(),
      }),
    )
    .min(1),
});

const QuizPayloadSchema = z.object({
  title: z.string().min(1),
  transcript: z
    .array(
      z.object({
        start: z.number().nonnegative(),
        end: z.number().nonnegative(),
        text: z.string().min(1),
        translation: z.string(),
      }),
    )
    .min(1),
  questions: z.array(
    z.object({
      question: z.string().min(1),
      options: z.array(z.string().min(1)).min(2),
      answer: z.number().int().nonnegative(),
      clueSegmentId: z.string().optional(),
    }),
  ),
});

const MemoPayloadSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  bullets: z.array(z.string()),
  actions: z.array(
    z.object({
      title: z.string().min(1),
      dueAt: z.string().optional(),
    }),
  ),
  mindmap: z
    .object({
      name: z.string().min(1),
      children: z.array(z.unknown()),
    })
    .optional(),
});

const InterviewPayloadSchema = z.object({
  title: z.string().min(1),
  role: z.string().optional(),
  summary: z.string().min(1),
  rounds: z.array(
    z.object({
      question: z.string().min(1),
      answer: z.string().min(1),
      segmentId: z.string().optional(),
      evaluation: z.string().optional(),
    }),
  ),
  highlights: z.array(z.string()),
});

const TranscriptPayloadSchema = z.object({
  title: z.string().min(1),
  language: z.string().optional(),
  paragraphs: z.array(
    z.object({
      start: z.number().nonnegative(),
      end: z.number().nonnegative().optional(),
      text: z.string().min(1),
      speaker: z.string().optional(),
    }),
  ),
});

// 2. 每个类别在提示词中对应的输出结构与提取重点
const CATEGORY_GUIDES: Record<Category, string> = {
  MEDICATION: `输出结构：
{
  "medication": { "name": "药品名称", "dose": "单次剂量，如 5mg / 1片", "method": "服用方式，如 口服" },
  "schedule": [ { "time": "服药时间，优先 HH:mm；无法确定时保留原文表述", "title": "如 早餐后服用", "segmentId": "对应转写片段的 id" } ],
  "warnings": [ { "text": "禁忌、不良反应、饮食注意等原文提醒", "segmentId": "对应转写片段的 id" } ]
}
提取重点：药品名称、单次剂量、服用方式、每日次数、具体服药时间、疗程、饮食禁忌和不良反应。缺失字段写 "未提及"，无内容数组返回 []，禁止编造药名或剂量。`,

  SOP: `输出结构：
{
  "title": "流程标题",
  "steps": [ { "title": "步骤描述", "order": 1, "duration": 120, "segmentId": "对应转写片段的 id", "warnings": ["该步骤的注意事项"] } ]
}
提取重点：按原音频顺序拆解为可执行步骤，保留数字、时长、前置条件和例外情况。duration 单位为秒，原文未提及则省略该字段；步骤至少输出一条。`,

  QUIZ: `输出结构：
{
  "title": "练习标题",
  "transcript": [ { "start": 0, "end": 1500, "text": "英文原句", "translation": "准确的中文翻译" } ],
  "questions": [ { "question": "题目", "options": ["选项A", "选项B", "选项C", "选项D"], "answer": 0, "clueSegmentId": "答案所在转写片段的 id" } ]
}
提取重点：保留英文原文，按自然意群合并为完整句子（整段控制在 25~35 句以内），translation 必须是准确中文翻译；原文已含题目和选项时原样整理，answer 使用从 0 开始的正确选项下标；原文没有题目时 questions 返回 []。`,

  MEMO: `输出结构：
{
  "title": "纪要标题",
  "summary": "120 字以内的内容摘要",
  "bullets": ["关键结论1", "关键结论2"],
  "actions": [ { "title": "待办事项", "dueAt": "ISO 8601 截止时间，原文未提及则省略" } ],
  "mindmap": { "name": "中心主题", "children": [ { "name": "分支主题", "children": [] } ] }
}
提取重点：主题、核心结论、关键数据、决策与待办。mindmap 不超过 3 层，节点名不超过 12 字；无法确定的信息不要写入。`,

  INTERVIEW: `输出结构：
{
  "title": "面试复盘标题",
  "role": "应聘岗位，原文未提及则省略",
  "summary": "120 字以内的面试整体复盘",
  "rounds": [ { "question": "面试官的问题", "answer": "候选人的回答要点", "segmentId": "对应转写片段的 id", "evaluation": "对该轮回答的简短评价，可选" } ],
  "highlights": ["表现亮点或需要改进的关键点"]
}
提取重点：面试官问题、候选人回答、岗位匹配度、亮点与风险。按原音频顺序整理问答；回答过长时提炼要点，不要编造候选人未说过的内容；无法确定的信息不要写入。`,

  TRANSCRIPT: `输出结构：
{
  "title": "录音原文",
  "language": "主要语言，可选",
  "paragraphs": [ { "start": 0, "end": 1500, "text": "转写原文", "speaker": "说话人，可选" } ]
}
说明：普通录音只做语音转写，保留原始表达和时间戳，不生成摘要、结论或待办。`,
};

function buildSystemPrompt(category: Category): string {
  return `你是 EchoFlow（声流时空）的音频语义分析引擎。EchoFlow 会把用户的录音转写成带时间戳的片段，并围绕六类场景生成可交互的结构化结果：健康日程（MEDICATION）、流程规程（SOP）、语言精听（QUIZ）、知识纪要（MEMO）、面试复盘（INTERVIEW）和原文转写（TRANSCRIPT）。

当前录音的场景类别：${category}

你的任务：阅读用户提供的转写片段（每段包含 id、start、end、text），只针对当前类别提取结构化信息。

${CATEGORY_GUIDES[category]}

通用规则：
1. 只输出一个 JSON 对象，不要输出 Markdown 代码块、解释说明或任何前后缀文字。
2. 所有描述使用简体中文；药名、英文原文、专有名词保留原语言。
3. segmentId 和 clueSegmentId 必须取自输入片段中真实存在的 id；无法对应时省略该字段，不得杜撰。
4. 不得虚构原文没有的信息；无法提取的字段按类别要求写 "未提及" 或返回空数组。
5. 如果转写内容与当前类别明显不符，仍返回当前类别的结构，字段写 "未提及" 或空数组，不要自行更改类别。
6. 时间若是“今晚八点”这类相对表述且无法确定绝对时间，保留原文表述，不要猜测日期。

【重要输出约束】
1. 请直接输出最终的 JSON 对象，切勿在思考阶段（reasoning）逐句预演或草拟翻译。
2. 如果 payload 中包含 transcript 数组，请将相邻短句按自然意群合并为完整句子（控制在 25~35 句以内），以保证 JSON 结构紧凑完整。`;
}

function validatePayload(category: Category, value: unknown): Record<string, unknown> {
  switch (category) {
    case 'MEDICATION':
      return MedicationPayloadSchema.parse(value);
    case 'SOP':
      return SopPayloadSchema.parse(value);
    case 'QUIZ':
      return QuizPayloadSchema.parse(value);
    case 'MEMO':
      return MemoPayloadSchema.parse(value);
    case 'INTERVIEW':
      return InterviewPayloadSchema.parse(value);
    case 'TRANSCRIPT':
      return TranscriptPayloadSchema.parse(value);
  }
}

/** 普通录音只需转写：直接由转写片段生成场景结果，不调用 LLM。 */
function buildTranscriptPayload(transcript: Segment[]): Record<string, unknown> {
  return TranscriptPayloadSchema.parse({
    title: '录音原文',
    paragraphs: transcript.map(({ start, end, text, speaker }) => ({
      start,
      end,
      text,
      ...(speaker === undefined ? {} : { speaker }),
    })),
  });
}

export async function parseAudio(transcript: Segment[]): Promise<ParseResult> {
  // 👇 这里假设你已经在前面一步拿到了 ASR 的真实文本（如果没有，就先保留 mock text）
  const text = transcript.map((segment) => segment.text).join(' ');
  // console.log('text', text);

  // 2. 确定场景类别（如果你有 routerIntent，最好结合它来走）
  const category = routeIntent(text);
  console.log('category', category);

  // 普通录音没有结构化分析诉求，转写完成后直接返回原文，避免不必要的 LLM 调用。
  if (category === 'TRANSCRIPT') {
    return {
      category,
      transcript,
      payload: buildTranscriptPayload(transcript),
    };
  }

  // 3. 调用 DeepSeek 进行结构化提取
  try {
    const completion = await llmClient.chat.completions.create({
      model: config.llm.model,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(category),
        },
        {
          role: 'user',
          content: JSON.stringify({
            category,
            segments: transcript.map(({ id, start, end, text: segmentText, speaker }) => ({
              id,
              start,
              end,
              text: segmentText,
              ...(speaker === undefined ? {} : { speaker }),
            })),
          }),
        },
      ],
      response_format: { type: 'json_object' }, // 强制 JSON 模式
      temperature: 0.1,
      max_tokens: 2000,
      ...({
        thinking: { type: 'disabled' },
        enable_thinking: false,
        reasoning_effort: 'low',
      } as Record<string, unknown>),
    });

    const choice = completion.choices?.[0];
    const rawJson = choice?.message?.content;
    if (!rawJson) {
      console.error('⚠️ LLM 返回的 choice 详情:', JSON.stringify(choice, null, 2));
      throw new Error(`LLM_EMPTY_RESPONSE (finish_reason: ${choice?.finish_reason})`);
    }

    // 4. 解析并按当前类别校验，结构不对会抛错进入 catch
    const parsed = JSON.parse(rawJson);
    const validatedPayload = validatePayload(category, parsed);

    return {
      category,
      transcript,
      payload: validatedPayload,
    };

  } catch (error) {
    console.error('LLM 解析失败:', error);
    // 如果失败，可以降级使用你现有的 Demo Payload 兜底，或者直接抛错让队列重试
    // return { category, transcript, payload: buildDemoPayload(category, transcript) };

    // 推荐：直接抛出特定错误，让外层的 BullMQ worker 捕获并重试
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`LLM_SCHEMA_MISMATCH: ${errorMessage}`);
  }
}
