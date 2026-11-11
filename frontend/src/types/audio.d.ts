export type AudioStatus = 'UPLOADED' | 'TRANSCRIBING' | 'PARSED' | 'FAILED'
export type AudioCategory =
  | 'MEDICATION'
  | 'SOP'
  | 'QUIZ'
  | 'MEMO'
  | 'INTERVIEW'
  | 'TRANSCRIPT'

export interface TranscriptSegment {
  id: string
  start: number
  end: number
  text: string
}

export interface AudioRecord {
  audioId: string
  originalName: string
  mimeType: string
  duration: number | null
  fileSize: number
  status: AudioStatus
  category: AudioCategory | null
  transcript: TranscriptSegment[]
  createdAt: string
  audioUrl: string
  error?: string
}
