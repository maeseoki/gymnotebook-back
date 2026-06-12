import { normalizeBaseUrl, readMobileEnv } from '@/shared/config/env'

describe('mobile env', () => {
  it('accepts a development HTTP URL and normalizes trailing slashes', () => {
    expect(
      readMobileEnv({
        EXPO_PUBLIC_APP_ENV: 'development',
        EXPO_PUBLIC_API_URL: 'http://192.168.1.30:8080/api/',
      }),
    ).toEqual({ appEnv: 'development', apiUrl: 'http://192.168.1.30:8080/api' })
  })

  it('accepts preview and production HTTPS URLs', () => {
    expect(
      readMobileEnv({
        EXPO_PUBLIC_APP_ENV: 'preview',
        EXPO_PUBLIC_API_URL: 'https://api.example.com/api/',
      }),
    ).toEqual({ appEnv: 'preview', apiUrl: 'https://api.example.com/api' })
    expect(
      readMobileEnv({
        EXPO_PUBLIC_APP_ENV: 'production',
        EXPO_PUBLIC_API_URL: 'https://api.example.com/api',
      }),
    ).toEqual({ appEnv: 'production', apiUrl: 'https://api.example.com/api' })
  })

  it('rejects malformed URLs, invalid environments and missing API URLs', () => {
    expect(() =>
      readMobileEnv({
        EXPO_PUBLIC_APP_ENV: 'production',
        EXPO_PUBLIC_API_URL: 'not-a-url',
      }),
    ).toThrow()
    expect(() =>
      readMobileEnv({
        EXPO_PUBLIC_APP_ENV: 'staging',
        EXPO_PUBLIC_API_URL: 'https://api.example.com/api',
      }),
    ).toThrow()
    expect(() =>
      readMobileEnv({
        EXPO_PUBLIC_APP_ENV: 'development',
        EXPO_PUBLIC_API_URL: undefined,
      }),
    ).toThrow()
    expect(() =>
      readMobileEnv({
        EXPO_PUBLIC_APP_ENV: undefined,
        EXPO_PUBLIC_API_URL: 'https://api.example.com/api',
      }),
    ).toThrow()
  })

  it('rejects production HTTP URLs', () => {
    expect(() =>
      readMobileEnv({
        EXPO_PUBLIC_APP_ENV: 'production',
        EXPO_PUBLIC_API_URL: 'http://api.example.com/api',
      }),
    ).toThrow()
  })

  it('normalizes base URL trailing slashes consistently', () => {
    expect(normalizeBaseUrl('https://api.example.com/api///')).toBe('https://api.example.com/api')
  })
})
