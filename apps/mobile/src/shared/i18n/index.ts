import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Localization from 'expo-localization'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './resources/en'
import { es } from './resources/es'

export const LANGUAGE_STORAGE_KEY = 'gymnotebook.language'

export type SupportedLanguage = 'es' | 'en'

export const supportedLanguages = ['es', 'en'] as const

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return value === 'es' || value === 'en'
}

// Detect device locale
export const getDeviceLanguage = (): string => {
  try {
    const locales = Localization.getLocales()
    const code = locales[0]?.languageCode || 'en'
    return code === 'es' ? 'es' : 'en' // fallback to 'en' for unsupported/missing/error languages
  } catch {
    return 'en'
  }
}

// Initialize i18n synchronously with device language (or English if unsupported)
void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  compatibilityJSON: 'v4', // Required for compatibility with certain JSON structures or environments
  interpolation: {
    escapeValue: false, // react already safes from xss
  },
})

// Helper to set language in memory & AsyncStorage
export async function setAppLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang)

  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  } catch {
    // Keep in-memory language change even if persistence fails.
  }
}

// Helper to load persisted language on startup
export async function loadPersistedLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)

    if (isSupportedLanguage(saved)) {
      await i18n.changeLanguage(saved)
      return
    }
  } catch {
    // Ignore storage failures and fall back to device language.
  }

  await i18n.changeLanguage(getDeviceLanguage())
}

export default i18n
export { en, es }
