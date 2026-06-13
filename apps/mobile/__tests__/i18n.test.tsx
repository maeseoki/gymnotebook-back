import AsyncStorage from '@react-native-async-storage/async-storage'
import { render } from '@testing-library/react-native'
import * as Localization from 'expo-localization'
import { useTranslation } from 'react-i18next'
import { Text } from 'react-native'
import { createSignupFormSchema } from '@/features/auth/schemas/signup-form'
import i18n, { LANGUAGE_STORAGE_KEY, loadPersistedLanguage, setAppLanguage } from '@/shared/i18n'

jest.unmock('i18next')
jest.unmock('react-i18next')
jest.unmock('expo-localization')

let mockLanguageCode = 'es'

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: mockLanguageCode }],
}))

describe('i18n foundation', () => {
  let getLocalesSpy: jest.SpyInstance

  beforeEach(async () => {
    mockLanguageCode = 'es'
    getLocalesSpy = jest.spyOn(Localization, 'getLocales').mockImplementation(() => [
      {
        languageCode: mockLanguageCode,
        languageTag: mockLanguageCode,
        regionCode: null,
        currencyCode: null,
        currencySymbol: null,
        decimalSeparator: '.',
        digitGroupingSeparator: ',',
        measurementSystem: 'metric',
        isMetric: true,
        textDirection: 'ltr',
        languageScriptCode: null,
        languageRegionCode: null,
        languageCurrencyCode: null,
        languageCurrencySymbol: null,
        temperatureUnit: 'celsius',
      },
    ])
    await AsyncStorage.clear()
    await i18n.changeLanguage('en') // Reset to English default
  })

  afterEach(() => {
    getLocalesSpy.mockRestore()
  })

  it('initializes with English fallback', () => {
    expect(i18n.options.fallbackLng).toContain('en')
  })

  describe('Device Locale & Storage priority', () => {
    it('unsupported device locale falls back to English', async () => {
      mockLanguageCode = 'fr'
      await loadPersistedLanguage()
      expect(i18n.language).toBe('en')
    })

    it('device language es is used when no saved preference exists', async () => {
      mockLanguageCode = 'es'
      await loadPersistedLanguage()
      expect(i18n.language).toBe('es')
    })

    it('device language en is used when no saved preference exists', async () => {
      mockLanguageCode = 'en'
      await loadPersistedLanguage()
      expect(i18n.language).toBe('en')
    })

    it('saved es preference wins over device language en', async () => {
      mockLanguageCode = 'en'
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, 'es')
      await loadPersistedLanguage()
      expect(i18n.language).toBe('es')
    })

    it('saved en preference wins over device language es', async () => {
      mockLanguageCode = 'es'
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
      await loadPersistedLanguage()
      expect(i18n.language).toBe('en')
    })
  })

  describe('Manual selection', () => {
    it('persists selection and updates i18n', async () => {
      await setAppLanguage('es')
      expect(i18n.language).toBe('es')
      expect(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es')

      await setAppLanguage('en')
      expect(i18n.language).toBe('en')
      expect(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
    })
  })

  describe('Component Rendering & Zod Schema', () => {
    it('renders Spanish/English text dynamically based on translation state', async () => {
      function DummyComponent() {
        const { t } = useTranslation()
        return <Text>{t('common.cancel')}</Text>
      }

      await i18n.changeLanguage('es')
      const esView = await render(<DummyComponent />)
      expect(esView.getByText('Cancelar')).toBeTruthy()
      await esView.unmount()

      await i18n.changeLanguage('en')
      const enView = await render(<DummyComponent />)
      expect(enView.getByText('Cancel')).toBeTruthy()
      await enView.unmount()
    })

    it('resolves correct Zod schema validation messages based on dynamic translation function', () => {
      // Test Spanish
      const tEs = (key: string) =>
        key === 'auth.errors.confirmPasswordRequired' ? 'Confirmar requerido' : key
      const schemaEs = createSignupFormSchema(tEs)
      const resultEs = schemaEs.safeParse({
        username: 'test',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: '',
      })
      expect(resultEs.success).toBe(false)
      if (!resultEs.success) {
        expect(resultEs.error?.issues[0]?.message).toBe('Confirmar requerido')
      }

      // Test English
      const tEn = (key: string) =>
        key === 'auth.errors.confirmPasswordRequired' ? 'Confirm required' : key
      const schemaEn = createSignupFormSchema(tEn)
      const resultEn = schemaEn.safeParse({
        username: 'test',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: '',
      })
      expect(resultEn.success).toBe(false)
      if (!resultEn.success) {
        expect(resultEn.error?.issues[0]?.message).toBe('Confirm required')
      }
    })
  })
})
