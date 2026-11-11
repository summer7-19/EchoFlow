import { Queue, Worker } from 'bullmq'
import { config } from '../config/env.js'
import type { Repository } from '../repositories/repository.js'
import { processAudio } from './pipeline.service.js'
import { createRedisConnection } from './redis.service.js'

const connection = createRedisConnection()

let audioQueue: Queue | undefined
let audioWorker: Worker | undefined
let fallbackRepository: Repository | undefined

function describeError(error: unknown) {
  return error instanceof Error ? error.message : error
}

export function startAudioWorker(repository: Repository) {
  fallbackRepository = repository

  try {
    audioQueue = new Queue(config.queue.audio.name, { connection })
    audioWorker = new Worker(
      config.queue.audio.name,
      job => processAudio(repository, String(job.data.audioId)),
      { connection, concurrency: config.queue.audio.concurrency },
    )
    audioWorker.on('error', error => console.warn('Audio worker error:', error.message))
    return true
  } catch (error) {
    console.warn('Redis unavailable; using in-process audio processing:', describeError(error))
    return false
  }
}

export async function enqueueAudio(audioId: string) {
  if (audioQueue) {
    try {
      await audioQueue.add(
        'parse',
        { audioId },
        {
          attempts: config.queue.audio.attempts,
          backoff: { type: 'exponential', delay: config.queue.audio.backoffMs },
          removeOnComplete: config.queue.audio.keepCompleted,
          removeOnFail: config.queue.audio.keepFailed,
        },
      )
      return
    } catch (error) {
      console.warn('Audio queue unavailable; processing in-process:', describeError(error))
    }
  }

  if (!fallbackRepository) throw new Error('Audio processing worker has not been initialized')

  void processAudio(fallbackRepository, audioId).catch(error => {
    console.error('Local audio processing failed:', error)
  })
}

export async function closeAudioQueue() {
  await Promise.allSettled([audioWorker?.close(), audioQueue?.close()])
}
