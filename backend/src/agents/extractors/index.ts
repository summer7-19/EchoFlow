import type { Category, Segment } from '../../models/types.js'

export function buildDemoPayload(
  category: Category,
  transcript: Segment[],
): Record<string, unknown> {
  const source = transcript.map(item => item.text).join(' ')

  if (category === 'MEDICATION') {
    return {
      medication: { name: '待确认药物', dose: '按医嘱', method: '口服' },
      warnings: [],
      schedule: [],
      sourceSummary: source,
    }
  }

  if (category === 'SOP') {
    return {
      title: '待整理操作流程',
      steps: transcript.map((item, index) => ({
        title: item.text,
        order: index + 1,
        segmentId: item.id,
      })),
    }
  }

  if (category === 'QUIZ') {
    return {
      title: '听力练习',
      transcript: transcript.map(item => ({
        start: item.start,
        end: item.end,
        text: item.text,
        translation: '',
      })),
      questions: [],
    }
  }

  if (category === 'INTERVIEW') {
    return {
      title: '面试复盘',
      summary: source.slice(0, 180),
      rounds: transcript.map(item => ({
        question: '待确认问题',
        answer: item.text,
        segmentId: item.id,
      })),
      highlights: [],
    }
  }

  if (category === 'TRANSCRIPT') {
    return {
      title: '录音原文',
      paragraphs: transcript.map(item => ({
        start: item.start,
        end: item.end,
        text: item.text,
        ...(item.speaker === undefined ? {} : { speaker: item.speaker }),
      })),
    }
  }

  return {
    title: '音频纪要',
    summary: source.slice(0, 180),
    bullets: transcript.map(item => item.text),
    actions: [],
    mindmap: { name: '主题', children: [] },
  }
}
