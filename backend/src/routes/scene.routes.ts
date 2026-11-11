import { Router } from 'express'
import type { Repository } from '../repositories/repository.js'
import { sceneController } from '../controllers/scene.controller.js'
import { asyncHandler } from '../utils/async-handler.js'
export function sceneRoutes(repository: Repository) {
  const router = Router()
  router.get('/:audioId', asyncHandler(sceneController.get(repository)))
  router.put('/:audioId', asyncHandler(sceneController.save(repository)))
  router.post('/:audioId/transcript', asyncHandler(sceneController.saveTranscript(repository)))
  router.post('/:audioId/parse', asyncHandler(sceneController.parse(repository)))
  return router
}
