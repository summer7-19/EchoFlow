import { Router } from 'express'
import type { Repository } from '../repositories/repository.js'
import { audioRoutes } from './audio.routes.js'
import { sceneRoutes } from './scene.routes.js'
import { scheduleRoutes } from './schedule.routes.js'
import { transcribeRoutes } from './transcribe.routes.js'
export function apiRoutes(repository: Repository) {
  const router = Router()
  router.use('/audios', audioRoutes(repository))
  router.use('/scenes', sceneRoutes(repository))
  router.use('/schedule', scheduleRoutes(repository))
  router.use('/transcribe', transcribeRoutes(repository))
  return router
}
