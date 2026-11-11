import { Queue, Worker } from 'bullmq'
import type { Repository } from '../repositories/repository.js'
import { listScheduleEvents } from './schedule.service.js'
import { createRedisConnection } from './redis.service.js'

const connection = createRedisConnection()

let reminderQueue: Queue | undefined
let reminderWorker: Worker | undefined

export function startReminderWorker(repository: Repository) {
  try {
    reminderQueue = new Queue('reminders', { connection })
    reminderWorker = new Worker(
      'reminders',
      async job => {
        const events = await listScheduleEvents(repository, job.data.audioId)
        const event = events.find(item => item.id === job.data.eventId)
        if (event?.status === 'PENDING') {
          console.info(`[reminder] ${event.title} at ${event.triggerTime}`)
        }
      },
      { connection },
    )
    reminderWorker.on('error', error => console.warn('Reminder worker error:', error.message))
    return true
  } catch (error) {
    console.warn(
      'Redis unavailable; reminders will be evaluated on list requests',
      error instanceof Error ? error.message : error,
    )
    return false
  }
}

export async function scheduleReminder(event: {
  id: string
  audioId: string
  title: string
  triggerTime: string
  notifyOffset: number
}) {
  if (!reminderQueue) return null

  const dueAt = new Date(event.triggerTime).getTime() - event.notifyOffset * 60_000
  const delay = Math.max(0, dueAt - Date.now())

  try {
    return await reminderQueue.add(
      'notify',
      {
        eventId: event.id,
        audioId: event.audioId,
        title: event.title,
        triggerTime: event.triggerTime,
      },
      { delay, jobId: `reminder-${event.id}`, removeOnComplete: true },
    )
  } catch {
    return null
  }
}

export async function closeReminderQueue() {
  await Promise.allSettled([reminderWorker?.close(), reminderQueue?.close()])
}
