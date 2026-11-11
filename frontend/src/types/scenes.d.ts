export type SceneCategory =
  | 'MEDICATION'
  | 'SOP'
  | 'QUIZ'
  | 'MEMO'
  | 'INTERVIEW'
  | 'TRANSCRIPT'

export interface MedicationPayload {
  medication: { name: string; dose: string; method: string }
  schedule: Array<{ time: string; title: string; segmentId?: string }>
  warnings?: Array<{ text: string; segmentId?: string }>
}

export interface SopPayload {
  title: string
  steps: Array<{
    title: string
    order: number
    duration?: number
    segmentId?: string
    warnings?: string[]
  }>
}

export interface QuizPayload {
  title: string
  transcript: Array<{ start: number; end?: number; text: string; translation?: string }>
  questions: Array<{
    question: string
    options: string[]
    answer: number
    clueSegmentId?: string
  }>
}

export interface MindmapNode {
  name: string
  children?: MindmapNode[]
}

export interface MemoPayload {
  title: string
  summary: string
  bullets: string[]
  actions: Array<{ title: string; dueAt?: string }>
  mindmap?: MindmapNode
}

export interface InterviewPayload {
  title: string
  role?: string
  summary: string
  rounds: Array<{
    question: string
    answer: string
    segmentId?: string
    evaluation?: string
  }>
  highlights: string[]
}

export interface TranscriptPayload {
  title: string
  language?: string
  paragraphs: Array<{
    start: number
    end?: number
    text: string
    speaker?: string
  }>
}
