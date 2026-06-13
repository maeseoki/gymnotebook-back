import { Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Card, Screen, Text } from '@/shared/ui/primitives'

export default function HomeScreen() {
  const { t } = useTranslation()
  return (
    <Screen>
      <Card>
        <Text>{t('homeScreen.placeholder')}</Text>
        <Link href="/(authenticated)/(tabs)/workout" asChild>
          <Button label={t('homeScreen.openWorkout')} />
        </Link>
      </Card>
    </Screen>
  )
}
