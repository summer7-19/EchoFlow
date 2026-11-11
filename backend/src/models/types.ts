import type { z } from 'zod'
import type { createEventSchema } from '../schemas/schedule.schema.js'
import type { categorySchema, transcriptSegmentSchema } from '../schemas/audio.schema.js'

export type Category = z.infer<typeof categorySchema>
export type Segment = z.infer<typeof transcriptSegmentSchema> & { id: string }
export type AudioStatus = 'UPLOADED' | 'TRANSCRIBING' | 'PARSED' | 'FAILED'

export interface AudioRecord {
  userId: string
  audioId: string
  filePath: string
  originalName: string
  mimeType: string
  duration: number | null
  fileSize: number
  status: AudioStatus
  category: Category | null
  transcript: Segment[]
  createdAt: string
  error?: string
}

export interface ScenePayload {
  audioId: string
  category: Category
  payload: Record<string, unknown>
  updatedAt: string
}

export interface TimelineEvent {
  id: string
  audioId: string
  title: string
  triggerTime: string
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE'
  clueSegmentId?: number
  notifyOffset: number
}

export type CreateEvent = Pick<
  z.infer<typeof createEventSchema>,
  'title' | 'triggerTime' | 'clueSegmentId' | 'notifyOffset'
>

export interface UserRecord {
  id: string
  email: string
  displayName: string
  passwordHash: string
  avatarUrl: string | null
  createdAt: string
}
