import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { setAppLanguage } from '@/shared/i18n'
import { spacing } from '@/shared/theme/tokens'
import { Button, Card, Screen, Text } from '@/shared/ui/primitives'

export default function SettingsScreen() {
  const { t, i18n } = useTranslation()

  return (
    <Screen>
      <Card style={{ gap: spacing[4] }}>
        <Text style={{ fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold' }}>
          {t('settingsScreen.title')}
        </Text>

        <View style={{ gap: spacing[2] }}>
          <Text style={{ fontSize: 16, fontFamily: 'SpaceGrotesk_500Medium' }}>
            {t('settingsScreen.language')}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            <View style={{ flex: 1 }}>
              <Button
                label={t('settingsScreen.spanish')}
                variant={i18n.language.startsWith('es') ? 'primary' : 'outline'}
                onPress={() => void setAppLanguage('es')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={t('settingsScreen.english')}
                variant={i18n.language.startsWith('en') ? 'primary' : 'outline'}
                onPress={() => void setAppLanguage('en')}
              />
            </View>
          </View>
        </View>
      </Card>
    </Screen>
  )
}
