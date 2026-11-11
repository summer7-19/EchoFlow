import type { Repository } from '../repositories/repository.js'
import type { CreateEvent } from '../models/types.js'

export async function createScheduleEvent(
  repository: Repository,
  audioId: string,
  data: CreateEvent,
) {
  return repository.createEvent(audioId, data)
}

export async function listScheduleEvents(
  repository: Repository,
  userId: string,
  audioId?: string,
) {
  const events = await repository.listEvents(userId, audioId)
  const now = Date.now()

  return Promise.all(
    events.map(event => {
      const isOverdue =
        event.status === 'PENDING' && new Date(event.triggerTime).getTime() < now
      if (!isOverdue) return event

      return repository
        .updateEvent(event.id, 'OVERDUE', userId)
        .then(updated => updated ?? event)
    }),
  )
}
