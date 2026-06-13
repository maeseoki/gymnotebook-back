import { Link } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'
import { userFacingAuthError } from '@/features/auth/application/auth-errors'
import { AuthErrorMessage } from '@/features/auth/components/AuthErrorMessage'
import { AuthFormContainer } from '@/features/auth/components/AuthFormContainer'
import { useSignInAction } from '@/features/auth/hooks/use-auth-actions'
import { type LoginFormValues, loginFormResolver } from '@/features/auth/schemas/login-form'
import { colors, spacing } from '@/shared/theme/tokens'
import { Button, FormField, Text, TextInput } from '@/shared/ui/primitives'

export default function LoginScreen() {
  const signIn = useSignInAction()
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: loginFormResolver,
    defaultValues: { username: '', password: '' },
  })
  const submitting = isSubmitting || signIn.isPending

  return (
    <AuthFormContainer title="Iniciar sesión" subtitle="Usa tu cuenta de Gym Notebook.">
      <Controller
        control={control}
        name="username"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField label="Usuario" error={errors.username?.message ?? ''}>
            <TextInput
              accessibilityLabel="Usuario"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
              onBlur={onBlur}
              onChangeText={onChange}
              returnKeyType="next"
              textContentType="username"
              value={value}
            />
          </FormField>
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField label="Contraseña" error={errors.password?.message ?? ''}>
            <TextInput
              accessibilityLabel="Contraseña"
              editable={!submitting}
              onBlur={onBlur}
              onChangeText={onChange}
              returnKeyType="done"
              secureTextEntry
              textContentType="password"
              value={value}
            />
          </FormField>
        )}
      />
      <AuthErrorMessage message={signIn.error ? userFacingAuthError(signIn.error) : null} />
      <Button
        accessibilityLabel="Iniciar sesión"
        disabled={submitting}
        label="Iniciar sesión"
        loading={submitting}
        onPress={handleSubmit((values) => signIn.mutateAsync(values))}
      />
      <View style={{ alignItems: 'center', gap: spacing[2] }}>
        <Text>¿Necesitas una cuenta?</Text>
        <Link
          accessibilityLabel="Crear cuenta"
          href="/(public)/signup"
          style={{ color: colors.secondary }}
        >
          Crear cuenta
        </Link>
      </View>
    </AuthFormContainer>
  )
}
