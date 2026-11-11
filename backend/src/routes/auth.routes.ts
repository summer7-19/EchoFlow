import { Router } from 'express'
import type { Repository } from '../repositories/repository.js'
import { authenticate } from '../middlewares/authenticate.js'
import { authController } from '../controllers/auth.controller.js'
import { asyncHandler } from '../utils/async-handler.js'

export function authRoutes(repository: Repository) {
  const router = Router()
  router.post('/register', asyncHandler(authController.register(repository)))
  router.post('/login', asyncHandler(authController.login(repository)))
  router.get('/captcha', asyncHandler(authController.captcha()))
  router.post('/forgot-password', asyncHandler(authController.forgotPassword(repository)))
  router.post('/reset-password', asyncHandler(authController.resetPassword(repository)))
  router.get('/me', authenticate, asyncHandler(authController.me(repository)))
  router.patch('/me', authenticate, asyncHandler(authController.updateProfile(repository)))
  router.put('/me/password', authenticate, asyncHandler(authController.changePassword(repository)))
  return router
}
