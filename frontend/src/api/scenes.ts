import { apiRequest } from './client'
import type {
  SceneCategory,
  MedicationPayload,
  SopPayload,
  QuizPayload,
  MemoPayload,
  InterviewPayload,
  TranscriptPayload,
} from '../types/scenes'

export type ScenePayload =
  | { audioId: string; category: 'MEDICATION'; payload: MedicationPayload; updatedAt: string }
  | { audioId: string; category: 'SOP'; payload: SopPayload; updatedAt: string }
  | { audioId: string; category: 'QUIZ'; payload: QuizPayload; updatedAt: string }
  | { audioId: string; category: 'MEMO'; payload: MemoPayload; updatedAt: string }
  | { audioId: string; category: 'INTERVIEW'; payload: InterviewPayload; updatedAt: string }
  | { audioId: string; category: 'TRANSCRIPT'; payload: TranscriptPayload; updatedAt: string }

export function getScene(audioId: string) {
  return apiRequest<ScenePayload>(`/scenes/${encodeURIComponent(audioId)}`)
}

export function saveScene(input: {
  audioId: string
  category: SceneCategory
  payload: Record<string, unknown>
}) {
  return apiRequest<ScenePayload>(`/scenes/${encodeURIComponent(input.audioId)}`, {
    method: 'PUT',
    data: input,
  })
}

export function parseScene(audioId: string, asynchronous = true) {
  return apiRequest<{ audioId: string; status: string; category?: SceneCategory }>(
    `/scenes/${encodeURIComponent(audioId)}/parse`,
    { method: 'POST', params: asynchronous ? { async: 'true' } : undefined },
  )
}
