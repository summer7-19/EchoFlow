import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const TOKEN_KEY = 'echoflow.accessToken'

export interface ApiEnvelope<T> {
  success: boolean
  code: number
  data: T
  requestId?: string
  error?: { code: string; message: string }
}

export interface AuthUser {
  id: string
  email: string
  displayName?: string
  avatarUrl?: string | null
}

export interface AuthSession {
  accessToken: string
  tokenType: 'Bearer'
  user: AuthUser
}

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export const httpClient = axios.create({ baseURL, timeout: 20_000 })

httpClient.interceptors.request.use(config => {
  const token = tokenStorage.get()
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

httpClient.interceptors.response.use(
  response => response,
  (error: AxiosError<ApiEnvelope<never>>) => {
    if (error.response?.status === 401) tokenStorage.clear()
    const message = error.response?.data?.error?.message ?? error.message
    return Promise.reject(new Error(message))
  },
)

export async function apiRequest<T>(path: string, config: AxiosRequestConfig = {}): Promise<T> {
  const requestConfig: AxiosRequestConfig = {
    url: path,
    ...config,
  }

  const response = await httpClient.request<ApiEnvelope<T>>(requestConfig)
  const envelope = response.data

  return envelope.data
}
