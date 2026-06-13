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
            <Text style={{ fontFamily: typography.fontFamilyBold, fontSize: 24 }}>Perfil</Text>
            <Text>Usuario: {user?.username ?? 'Desconocido'}</Text>
            <Text>Correo electrónico: {user?.email ?? 'Desconocido'}</Text>
            <Text>Roles: {user?.roles.join(', ') || 'Ninguno'}</Text>
          </View>
        </Card>
        <Link href="/(authenticated)/settings" asChild>
          <Button label="Ajustes" variant="outline" />
        </Link>
        <Button
          accessibilityLabel="Cerrar sesión"
          label="Cerrar sesión"
          loading={logout.isPending}
          onPress={() => logout.mutate()}
          variant="secondary"
        />
      </View>
    </Screen>
  )
}
