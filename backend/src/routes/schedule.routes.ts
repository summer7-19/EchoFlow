import { Router } from 'express'
import type { Repository } from '../repositories/repository.js'
import { scheduleController } from '../controllers/schedule.controller.js'
import { asyncHandler } from '../utils/async-handler.js'
export function scheduleRoutes(repository: Repository) {
  const router = Router()
  router.get('/', asyncHandler(scheduleController.list(repository)))
  router.post('/:audioId/events', asyncHandler(scheduleController.create(repository)))
  router.patch('/events/:eventId', asyncHandler(scheduleController.update(repository)))
  return router
}
