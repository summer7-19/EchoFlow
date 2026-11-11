import { apiRequest } from './client'

export interface TranscribeSegment {
  id: string
  start: number
  end: number
  text: string
  speaker?: string
}

export interface TranscribeResult {
  audioId: string
  fullText: string
  segments: TranscribeSegment[]
  processTime: number
}

/** Triggers the backend's local FunASR transcription; inference can take minutes. */
export function transcribeAudio(audioId: string, language = 'auto') {
  return apiRequest<TranscribeResult>('/transcribe', {
    method: 'POST',
    data: { audioId, language },
    timeout: 300_000,
  })
}
