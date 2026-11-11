import { z } from 'zod'

const passwordSchema = z.string().min(8).max(128)

export const accountSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .transform(value => value.toLowerCase())

const credentialsSchema = z.object({
  email: z.email().max(255).transform(value => value.toLowerCase()),
  password: passwordSchema,
})

export const registerSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(1).max(80),
})

export const loginSchema = z.object({
  account: accountSchema,
  password: passwordSchema,
  captchaId: z.uuid(),
  captchaCode: z
    .string()
    .trim()
    .length(4)
    .transform(value => value.toUpperCase()),
})

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(255)
    .transform(value => value.toLowerCase()),
})

export const resetPasswordSchema = forgotPasswordSchema.extend({
  code: z.string().trim().regex(/^\d{6}$/),
  password: passwordSchema,
})

export const profileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80).optional(),
    avatarUrl: z
      .union([z.string().trim().url().max(512), z.literal(''), z.null()])
      .optional(),
  })
  .refine(value => value.displayName !== undefined || value.avatarUrl !== undefined, {
    message: '至少需要修改一个字段',
  })
  .transform(value => ({
    ...value,
    avatarUrl: value.avatarUrl === '' ? null : value.avatarUrl,
  }))

export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
})
