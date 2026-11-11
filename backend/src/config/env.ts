import 'dotenv/config'
import { z } from 'zod'

const booleanText = z
  .enum(['true', 'false'])
  .transform(value => value === 'true')

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:5174'),
  STORAGE_DIR: z.string().default('storage'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(100),

  MYSQL_HOST: z.string().default('localhost'),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_USER: z.string().default('root'),
  MYSQL_PASSWORD: z.string().default(''),
  MYSQL_DATABASE: z.string().default('echoflow'),

  REDIS_URL: z.url().default('redis://127.0.0.1:6380'),
  AUDIO_QUEUE_NAME: z.string().min(1).default('audio-processing'),
  AUDIO_QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(2),
  AUDIO_QUEUE_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  AUDIO_QUEUE_BACKOFF_MS: z.coerce.number().int().nonnegative().default(2000),
  AUDIO_QUEUE_KEEP_COMPLETED: z.coerce.number().int().nonnegative().default(100),
  AUDIO_QUEUE_KEEP_FAILED: z.coerce.number().int().nonnegative().default(500),

  FUNASR_BASE_URL: z.string().default('http://localhost:8001'),
  FUNASR_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),

  DEEPSEEK_API_KEY: z.string().min(1).default(''),
  DEEPSEEK_BASE_URL: z.string().default('https://api.deepseek.com'),
  DEEPSEEK_MODEL: z.string().default('deepseek-v4-flash'),

  JWT_SECRET: z.string().min(32).default('development-only-change-me-please-32chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanText.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

const values = parsed.data

export const config = {
  app: {
    environment: values.NODE_ENV,
    port: values.PORT,
    corsOrigin: values.CORS_ORIGIN,
  },
  storage: {
    directory: values.STORAGE_DIR,
    maxUploadMb: values.MAX_UPLOAD_MB,
  },
  database: {
    host: values.MYSQL_HOST,
    port: values.MYSQL_PORT,
    user: values.MYSQL_USER,
    password: values.MYSQL_PASSWORD,
    name: values.MYSQL_DATABASE,
  },
  queue: {
    url: values.REDIS_URL,
    audio: {
      name: values.AUDIO_QUEUE_NAME,
      concurrency: values.AUDIO_QUEUE_CONCURRENCY,
      attempts: values.AUDIO_QUEUE_ATTEMPTS,
      backoffMs: values.AUDIO_QUEUE_BACKOFF_MS,
      keepCompleted: values.AUDIO_QUEUE_KEEP_COMPLETED,
      keepFailed: values.AUDIO_QUEUE_KEEP_FAILED,
    },
  },
  asr: {
    baseUrl: values.FUNASR_BASE_URL,
    timeoutMs: values.FUNASR_TIMEOUT_MS,
  },
  llm:{
    apiKey: values.DEEPSEEK_API_KEY,
    baseUrl: values.DEEPSEEK_BASE_URL,
    model: values.DEEPSEEK_MODEL,
  },
  auth: {
    jwtSecret: values.JWT_SECRET,
    jwtExpiresIn: values.JWT_EXPIRES_IN,
    bcryptRounds: values.BCRYPT_ROUNDS,
  },
  mail: {
    host: values.SMTP_HOST,
    port: values.SMTP_PORT,
    secure: values.SMTP_SECURE,
    user: values.SMTP_USER,
    password: values.SMTP_PASSWORD,
    from: values.SMTP_FROM,
  },
} as const
