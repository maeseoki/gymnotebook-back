import { Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useLogoutAction } from '@/features/auth/hooks/use-auth-actions'
import { useAuthSessionStore } from '@/shared/auth/session-store'
import { spacing, typography } from '@/shared/theme/tokens'
import { Button, Card, Screen, Text } from '@/shared/ui/primitives'

export default function ProfileScreen() {
  const { t } = useTranslation()
  const user = useAuthSessionStore((state) => state.user)
  const logout = useLogoutAction()

  return (
    <Screen>
      <View style={{ gap: spacing[4] }}>
        <Card>
          <View style={{ gap: spacing[2] }}>
            <Text style={{ fontFamily: typography.fontFamilyBold, fontSize: 24 }}>
              {t('profileScreen.title')}
            </Text>
            <Text>
              {t('profileScreen.username', { username: user?.username ?? t('common.unknown') })}
            </Text>
            <Text>{t('profileScreen.email', { email: user?.email ?? t('common.unknown') })}</Text>
            <Text>
              {t('profileScreen.roles', { roles: user?.roles.join(', ') || t('common.none') })}
            </Text>
          </View>
        </Card>
        <Link href="/(authenticated)/settings" asChild>
          <Button label={t('profileScreen.settings')} variant="outline" />
        </Link>
        <Button
          accessibilityLabel={t('profileScreen.logout')}
          label={t('profileScreen.logout')}
          loading={logout.isPending}
          onPress={() => logout.mutate()}
          variant="secondary"
        />
      </View>
    </Screen>
  )
}
