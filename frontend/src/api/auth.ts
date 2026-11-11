import { apiRequest, tokenStorage, type AuthSession } from './client'

export interface LoginCredentials {
  account: string
  password: string
  captchaId: string
  captchaCode: string
}

export interface RegisterCredentials {
  email: string
  password: string
  displayName: string
}

async function authenticate(
  path: '/auth/login' | '/auth/register',
  credentials: LoginCredentials | RegisterCredentials,
) {
  const session = await apiRequest<AuthSession>(path, { method: 'POST', data: credentials })
  tokenStorage.set(session.accessToken)
  return session
}

export const login = (credentials: LoginCredentials) =>
  authenticate('/auth/login', credentials)

export const register = (credentials: RegisterCredentials) =>
  authenticate('/auth/register', credentials)

export const getCaptcha = () =>
  apiRequest<{ captchaId: string; image: string; expiresIn: number }>('/auth/captcha')

export const requestPasswordReset = (email: string) =>
  apiRequest<{ message: string }>('/auth/forgot-password', { method: 'POST', data: { email } })

export const resetPassword = (input: { email: string; code: string; password: string }) =>
  apiRequest<{ message: string }>('/auth/reset-password', { method: 'POST', data: input })

export const updateProfile = (input: { displayName?: string; avatarUrl?: string | null }) =>
  apiRequest<{ user: AuthSession['user'] }>('/auth/me', { method: 'PATCH', data: input })

export const changePassword = (input: { currentPassword: string; newPassword: string }) =>
  apiRequest<{ message: string }>('/auth/me/password', { method: 'PUT', data: input })

export const getCurrentUser = () => apiRequest<{ user: AuthSession['user'] }>('/auth/me')

export function logout() {
  tokenStorage.clear()
}
