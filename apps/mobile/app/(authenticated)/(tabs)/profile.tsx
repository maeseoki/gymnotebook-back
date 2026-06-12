import { Link } from 'expo-router'
import { View } from 'react-native'
import { useLogoutAction } from '@/features/auth/hooks/use-auth-actions'
import { useAuthSessionStore } from '@/shared/auth/session-store'
import { spacing, typography } from '@/shared/theme/tokens'
import { Button, Card, Screen, Text } from '@/shared/ui/primitives'

export default function ProfileScreen() {
  const user = useAuthSessionStore((state) => state.user)
  const logout = useLogoutAction()

  return (
    <Screen>
      <View style={{ gap: spacing[4] }}>
        <Card>
          <View style={{ gap: spacing[2] }}>
            <Text style={{ fontFamily: typography.fontFamilyBold, fontSize: 24 }}>Profile</Text>
            <Text>Username: {user?.username ?? 'Unknown'}</Text>
            <Text>Email: {user?.email ?? 'Unknown'}</Text>
            <Text>Roles: {user?.roles.join(', ') || 'None'}</Text>
          </View>
        </Card>
        <Link href="/(authenticated)/settings" asChild>
          <Button label="Settings" variant="outline" />
        </Link>
        <Button
          accessibilityLabel="Log out"
          label="Log out"
          loading={logout.isPending}
          onPress={() => logout.mutate()}
          variant="secondary"
        />
      </View>
    </Screen>
  )
}
