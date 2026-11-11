import { Redis } from 'ioredis'
import { config } from '../config/env.js'

/** Shared Redis client for short-lived authentication state. */
export const redis = new Redis(config.queue.url, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
})

/** Connection options for BullMQ queues and workers. */
export function createRedisConnection() {
  const url = new URL(config.queue.url)
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    username: url.username || undefined,
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  }
}

export async function ensureRedisConnection() {
  if (redis.status === 'wait') await redis.connect()
}

export async function takeRedisValue(key: string) {
  await ensureRedisConnection()
  const result = await redis.eval(
    "local value = redis.call('GET', KEYS[1]); if value then redis.call('DEL', KEYS[1]); end; return value",
    1,
    key,
  )
  return typeof result === 'string' ? result : null
}

export async function closeRedis() {
  if (redis.status !== 'end') await redis.quit()
}
