import axios, { type AxiosInstance } from 'axios'
import { mobileEnv } from '@/shared/config/env'

export type AccessTokenGetter = () => string | null

export interface MobileApiClientOptions {
  baseUrl?: string
  accessToken?: AccessTokenGetter
  timeoutMs?: number
}

export function createMobileApiClient(options: MobileApiClientOptions = {}): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseUrl ?? mobileEnv.apiUrl,
    timeout: options.timeoutMs ?? 15_000,
    headers: {
      Accept: 'application/json',
    },
  })

  client.interceptors.request.use((config) => {
    const token = options.accessToken?.()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  return client
}
