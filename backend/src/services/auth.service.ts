import bcrypt from 'bcryptjs'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { createHash, randomInt, randomUUID } from 'node:crypto'
import nodemailer from 'nodemailer'
import { config } from '../config/env.js'
import type { Repository } from '../repositories/repository.js'
import type { UserRecord } from '../models/types.js'
import { HttpError } from '../utils/http-error.js'
import { ensureRedisConnection, redis, takeRedisValue } from './redis.service.js'

export interface AuthInput {
  email: string
  password: string
}

export interface LoginInput {
  account: string
  password: string
  captchaId: string
  captchaCode: string
}

export interface AuthClaims {
  userId: string
  email: string
}

const CAPTCHA_TTL_SECONDS = 300
const RESET_CODE_TTL_MS = 10 * 60 * 1000
const RESET_MESSAGE = '若该邮箱已注册，验证码将发送至邮箱'
const CAPTCHA_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Short-lived password reset codes, keyed by normalised email. */
const resetCodes = new Map<string, { hash: string; expiresAt: number }>()

export function toPublicUser(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  }
}

function issueSession(user: UserRecord) {
  const accessToken = jwt.sign({ email: user.email }, config.auth.jwtSecret, {
    subject: user.id,
    expiresIn: config.auth.jwtExpiresIn as SignOptions['expiresIn'],
  })
  return { accessToken, tokenType: 'Bearer' as const, user: toPublicUser(user) }
}

export async function registerUser(
  repository: Repository,
  input: AuthInput & { displayName: string },
) {
  const email = input.email.trim().toLowerCase()
  const displayName = input.displayName.trim()

  if (await repository.getUserByEmail(email)) {
    throw new HttpError(409, '该邮箱已注册', 'EMAIL_ALREADY_EXISTS')
  }
  if (await repository.getUserByDisplayName(displayName)) {
    throw new HttpError(409, '该用户名已被使用', 'USERNAME_ALREADY_EXISTS')
  }

  const user: UserRecord = {
    id: randomUUID(),
    email,
    displayName,
    passwordHash: await bcrypt.hash(input.password, config.auth.bcryptRounds),
    avatarUrl: null,
    createdAt: new Date().toISOString(),
  }

  try {
    await repository.createUser(user)
  } catch (error) {
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, '该邮箱已注册', 'EMAIL_ALREADY_EXISTS')
    }
    throw error
  }

  return issueSession(user)
}

function captchaKey(id: string) {
  return `echoflow:captcha:${id}`
}

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function generateCaptchaCode() {
  return Array.from(
    { length: 4 },
    () => CAPTCHA_ALPHABET[randomInt(0, CAPTCHA_ALPHABET.length)],
  ).join('')
}

function renderCaptchaSvg(code: string) {
  const characters = [...code]
    .map(
      (char, index) =>
        `<text x="${28 + index * 34}" y="48" transform="rotate(${randomInt(-15, 16)} ${28 + index * 34} 48)">${char}</text>`,
    )
    .join('')

  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="190" height="64" viewBox="0 0 190 64">',
    '<rect width="190" height="64" rx="8" fill="#f1f6f1"/>',
    '<path d="M5 18 Q45 42 92 18 T185 35 M8 50 Q55 22 105 46 T184 17" fill="none" stroke="#86aa8e" stroke-width="1.2" opacity=".55"/>',
    `<g fill="#365f43" font-family="Arial,sans-serif" font-size="29" font-weight="700" letter-spacing="5">${characters}</g>`,
    '</svg>',
  ].join('')

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

export async function createCaptcha() {
  const code = generateCaptchaCode()
  const captchaId = randomUUID()

  await ensureRedisConnection()
  await redis.set(captchaKey(captchaId), digest(code.toUpperCase()), 'EX', CAPTCHA_TTL_SECONDS)

  return { captchaId, image: renderCaptchaSvg(code), expiresIn: CAPTCHA_TTL_SECONDS }
}

async function verifyCaptcha(id: string, input: string) {
  const stored = await takeRedisValue(captchaKey(id))
  if (!stored || stored !== digest(input.toUpperCase())) {
    throw new HttpError(400, '验证码错误或已过期', 'INVALID_CAPTCHA')
  }
}

export async function loginUser(repository: Repository, input: LoginInput) {
  await verifyCaptcha(input.captchaId, input.captchaCode)

  const account = input.account.trim().toLowerCase()
  const user = account.includes('@')
    ? await repository.getUserByEmail(account)
    : await repository.getUserByDisplayName(account)

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new HttpError(401, '邮箱、用户名或密码错误', 'INVALID_CREDENTIALS')
  }

  return issueSession(user)
}

function hashResetCode(email: string, code: string) {
  return createHash('sha256')
    .update(`${config.auth.jwtSecret}:${email}:${code}`)
    .digest('hex')
}

async function sendResetMail(email: string, code: string) {
  const transport = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.password } : undefined,
  })

  await transport.sendMail({
    from: config.mail.from,
    to: email,
    subject: 'EchoFlow 密码重置验证码',
    text: `你的验证码是 ${code}，10 分钟内有效。若非本人操作，请忽略此邮件。`,
  })
}

export async function sendPasswordResetCode(repository: Repository, emailInput: string) {
  if (!config.mail.host || !config.mail.from) {
    throw new HttpError(503, '邮件服务尚未配置', 'MAIL_NOT_CONFIGURED')
  }

  const email = emailInput.trim().toLowerCase()
  const user = await repository.getUserByEmail(email)

  if (user) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    resetCodes.set(email, {
      hash: hashResetCode(email, code),
      expiresAt: Date.now() + RESET_CODE_TTL_MS,
    })
    await sendResetMail(email, code)
  }

  // Always return the same message so registered emails cannot be enumerated.
  return { message: RESET_MESSAGE }
}

function invalidResetCode() {
  return new HttpError(400, '验证码无效或已过期', 'INVALID_RESET_CODE')
}

export async function resetPassword(
  repository: Repository,
  input: { email: string; code: string; password: string },
) {
  const email = input.email.trim().toLowerCase()
  const stored = resetCodes.get(email)

  if (!stored || stored.expiresAt < Date.now()) {
    resetCodes.delete(email)
    throw invalidResetCode()
  }
  if (stored.hash !== hashResetCode(email, input.code)) throw invalidResetCode()

  const user = await repository.getUserByEmail(email)
  if (!user) throw invalidResetCode()

  await repository.updateUser(user.id, {
    passwordHash: await bcrypt.hash(input.password, config.auth.bcryptRounds),
  })
  resetCodes.delete(email)

  return { message: '密码已更新，请使用新密码登录' }
}

export async function changePassword(
  repository: Repository,
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await repository.getUserById(userId)
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new HttpError(400, '当前密码不正确', 'INVALID_CURRENT_PASSWORD')
  }

  await repository.updateUser(user.id, {
    passwordHash: await bcrypt.hash(newPassword, config.auth.bcryptRounds),
  })

  return { message: '密码修改成功' }
}

export async function updateProfile(
  repository: Repository,
  userId: string,
  update: { displayName?: string; avatarUrl?: string | null },
) {
  const user = await repository.updateUser(userId, update)
  if (!user) throw new HttpError(404, '用户不存在', 'USER_NOT_FOUND')
  return toPublicUser(user)
}

export function verifyAccessToken(token: string): AuthClaims {
  const payload = jwt.verify(token, config.auth.jwtSecret)

  if (typeof payload === 'string' || typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
    throw new HttpError(401, '无效的访问令牌', 'UNAUTHORIZED')
  }

  return { userId: payload.sub, email: payload.email }
}
