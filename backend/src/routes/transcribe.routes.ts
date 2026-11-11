import { Router } from 'express'
import type { Repository } from '../repositories/repository.js'
import { transcribeController } from '../controllers/transcribe.controller.js'
import { asyncHandler } from '../utils/async-handler.js'

export function transcribeRoutes(repository: Repository) {
  const router = Router()
  router.post('/', asyncHandler(transcribeController.transcribe(repository)))
  return router
}
