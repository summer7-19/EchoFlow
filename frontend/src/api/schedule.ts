import { apiRequest } from './client'

export type EventStatus = 'PENDING' | 'COMPLETED' | 'OVERDUE'

export interface TimelineEvent {
  id: string
  audioId: string
  title: string
  triggerTime: string
  status: EventStatus
  clueSegmentId?: number
  notifyOffset: number
}

export function listScheduleEvents(audioId?: string) {
  return apiRequest<TimelineEvent[]>('/schedule', {
    params: audioId ? { audioId } : undefined,
  })
}

export function createScheduleEvent(
  audioId: string,
  input: {
    title: string
    triggerTime: string
    clueSegmentId?: number
    notifyOffset?: number
  },
) {
  return apiRequest<TimelineEvent>(`/schedule/${encodeURIComponent(audioId)}/events`, {
    method: 'POST',
    data: input,
  })
}

export function updateScheduleEvent(eventId: string, status: EventStatus) {
  return apiRequest<TimelineEvent>(`/schedule/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    data: { status },
  })
}
