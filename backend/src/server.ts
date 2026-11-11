import express from 'express'
import cors from 'cors'
import { config } from './config/env.js'
import { requestId } from './middlewares/request-id.js'
import { successCode } from './middlewares/success-code.js'
import { errorHandler } from './middlewares/error-handler.js'
import { authenticate } from './middlewares/authenticate.js'
import { authRoutes } from './routes/auth.routes.js'
import { apiRoutes } from './routes/index.js'
import { MysqlRepository } from './repositories/mysql.repository.js'
import { mysqlPool } from './models/mysql.js'
import { initializeDatabase } from './models/migrate.js'
import { ensureStorage } from './services/storage.service.js'
import { startAudioWorker, closeAudioQueue } from './services/queue.service.js'
import { startReminderWorker, closeReminderQueue } from './services/reminder.service.js'
import { closeRedis } from './services/redis.service.js'
import { sendSuccess } from './utils/controller-response.js'

const app = express()
const repository = new MysqlRepository(mysqlPool)

app.disable('x-powered-by')
app.use(requestId)
app.use(successCode)
app.use(
  cors({
    origin: config.app.corsOrigin === '*' ? true : config.app.corsOrigin,
    exposedHeaders: ['Accept-Ranges', 'Content-Range', 'Content-Length', 'X-Request-Id'],
  }),
)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (req, res) =>
  sendSuccess(req, res, { service: 'echoflow-backend', status: 'ok', storage: 'local' }),
)

app.use('/api/auth', authRoutes(repository))
app.use('/api', authenticate, apiRoutes(repository))

app.use((req, res) =>
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: '请求的接口不存在' },
    requestId: req.requestId,
  }),
)
app.use(errorHandler)

await ensureStorage()
await initializeDatabase(mysqlPool)
console.info('MySQL schema is ready')

startAudioWorker(repository)
startReminderWorker(repository)

const server = app.listen(config.app.port, () =>
  console.info(`EchoFlow API listening on :${config.app.port},服务启动`),
)

async function shutdown(signal: string) {
  console.info(`Received ${signal}; shutting down`)
  server.close()
  await Promise.allSettled([closeAudioQueue(), closeReminderQueue(), closeRedis(), mysqlPool.end()])
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
