import path from 'node:path';
import { parseAudio } from './src/agents/parser.js';
import { AsrService } from './src/services/asr.service.js';
import type { Segment } from './src/models/types.js';

const AUDIO_FILE = 'aud_85e66e120aff42ee9f1730e190e53feb.mp3';

async function testParse() {
  // AsrService 内部按 process.cwd() 解析相对路径，所以从 backend 目录运行
  const relativePath = path.join('storage', 'uploads', AUDIO_FILE);
  const absolutePath = path.resolve(process.cwd(), relativePath);

  try {
    // 1. 本地 FunASR 转写
    console.log('🎧 正在调用 FunASR 转写:', absolutePath);
    const asr = await AsrService.transcribeLocalAudio(relativePath);

    const transcript: Segment[] = asr.segments.map(segment => ({
      id: String(segment.id),
      start: segment.start,
      end: segment.end,
      text: segment.text,
      ...(segment.speaker === undefined ? {} : { speaker: String(segment.speaker) }),
    }));

    if (transcript.length === 0) {
      throw new Error('ASR 未返回任何转写片段');
    }

    console.log('✅ 转写完成，片段数:', transcript.length);
    // console.log('转写全文:', asr.fullText);

    // 2. LLM 结构化解析
    const result = await parseAudio(transcript);
    console.log('✅ 解析成功！');
    console.log('识别场景:', result.category);
    console.log('时间轴段数:', result.transcript.length);
    console.log('LLM 提取的 Payload:', JSON.stringify(result.payload, null, 2));
  } catch (error) {
    console.error('❌ 解析失败:', error);
    process.exitCode = 1;
  }
}

testParse();
