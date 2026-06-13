export {}

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT is a global flag for React testing
global.IS_REACT_ACT_ENVIRONMENT = true
globalThis.IS_REACT_ACT_ENVIRONMENT = true

process.env.EXPO_PUBLIC_APP_ENV = 'test'
process.env.EXPO_PUBLIC_API_URL = 'https://example.invalid/api'

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
}))

jest.mock('@expo-google-fonts/space-grotesk', () => ({
  SpaceGrotesk_400Regular: 1,
  SpaceGrotesk_500Medium: 1,
  SpaceGrotesk_700Bold: 1,
  useFonts: () => [true, null],
}))

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}))

jest.mock('react-native-safe-area-context', () => {
  const React = require('react')
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  }
})

const { notifyManager } = require('@tanstack/react-query')
notifyManager.setScheduler(queueMicrotask)

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
