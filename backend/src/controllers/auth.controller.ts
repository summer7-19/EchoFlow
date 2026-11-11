import type { RequestHandler } from 'express'
import type { Repository } from '../repositories/repository.js'
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
} from '../schemas/auth.schema.js'
import {
  changePassword,
  createCaptcha,
  loginUser,
  registerUser,
  resetPassword,
  sendPasswordResetCode,
  toPublicUser,
  updateProfile,
} from '../services/auth.service.js'
import { HttpError } from '../utils/http-error.js'
import { currentUserId } from '../utils/request-user.js'
import { sendSuccess } from '../utils/controller-response.js'

export const authController = {
  register(repository: Repository): RequestHandler {
    return async (req, res) => {
      const input = registerSchema.parse(req.body)
      return sendSuccess(req, res, await registerUser(repository, input), 201)
    }
  },

  captcha(): RequestHandler {
    return async (req, res) => sendSuccess(req, res, await createCaptcha())
  },

  login(repository: Repository): RequestHandler {
    return async (req, res) => {
      const input = loginSchema.parse(req.body)
      return sendSuccess(req, res, await loginUser(repository, input))
    }
  },

  forgotPassword(repository: Repository): RequestHandler {
    return async (req, res) => {
      const input = forgotPasswordSchema.parse(req.body)
      return sendSuccess(req, res, await sendPasswordResetCode(repository, input.email))
    }
  },

  resetPassword(repository: Repository): RequestHandler {
    return async (req, res) => {
      const input = resetPasswordSchema.parse(req.body)
      return sendSuccess(req, res, await resetPassword(repository, input))
    }
  },

  updateProfile(repository: Repository): RequestHandler {
    return async (req, res) => {
      const input = profileSchema.parse(req.body)
      const user = await updateProfile(repository, currentUserId(req), input)
      return sendSuccess(req, res, { user })
    }
  },

  changePassword(repository: Repository): RequestHandler {
    return async (req, res) => {
      const input = changePasswordSchema.parse(req.body)
      const result = await changePassword(
        repository,
        currentUserId(req),
        input.currentPassword,
        input.newPassword,
      )
      return sendSuccess(req, res, result)
    }
  },

  me(repository: Repository): RequestHandler {
    return async (req, res) => {
      const user = await repository.getUserById(currentUserId(req))
      if (!user) throw new HttpError(401, '用户不存在或已删除', 'UNAUTHORIZED')
      return sendSuccess(req, res, { user: toPublicUser(user) })
    }
  },
}
