import type { Category } from '../models/types.js'

export function routeIntent(text: string): Category {
  const value = text.toLowerCase()

  if (/面试|面试官|候选人|求职|应聘|薪资|岗位|自我介绍|interview|candidate|recruiter/.test(value)) {
    return 'INTERVIEW'
  }
  if (/药|服用|剂量|血压|复诊|medicine|medication|dose/.test(value)) return 'MEDICATION'
  if (/步骤|流程|操作|首先|然后|step|procedure|recipe/.test(value)) return 'SOP'
  if (/英语|听力|选择题|英文|listening|question|answer/.test(value)) return 'QUIZ'
  if (/会议|纪要|总结|讨论|结论|待办|meeting|memo|notes|minutes|summary/.test(value)) {
    return 'MEMO'
  }
  // 普通录音只做语音转写，不做结构化语义提取。
  return 'TRANSCRIPT'
}
