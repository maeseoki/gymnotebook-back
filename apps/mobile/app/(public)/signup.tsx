import { Link } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'
import { userFacingAuthError } from '@/features/auth/application/auth-errors'
import { AuthErrorMessage } from '@/features/auth/components/AuthErrorMessage'
import { AuthFormContainer } from '@/features/auth/components/AuthFormContainer'
import { useSignUpAction } from '@/features/auth/hooks/use-auth-actions'
import { type SignupFormValues, signupFormResolver } from '@/features/auth/schemas/signup-form'
import { colors, spacing } from '@/shared/theme/tokens'
import { Button, FormField, Text, TextInput } from '@/shared/ui/primitives'

export default function SignupScreen() {
  const signUp = useSignUpAction()
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: signupFormResolver,
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })
  const submitting = isSubmitting || signUp.isPending

  return (
    <AuthFormContainer title="Crear cuenta" subtitle="Comienza a registrar con una sesión móvil.">
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
              textContentType="username"
              value={value}
            />
          </FormField>
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField label="Correo electrónico" error={errors.email?.message ?? ''}>
            <TextInput
              accessibilityLabel="Correo electrónico"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
              inputMode="email"
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              textContentType="emailAddress"
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
              secureTextEntry
              textContentType="newPassword"
              value={value}
            />
          </FormField>
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField label="Confirmar contraseña" error={errors.confirmPassword?.message ?? ''}>
            <TextInput
              accessibilityLabel="Confirmar contraseña"
              editable={!submitting}
              onBlur={onBlur}
              onChangeText={onChange}
              secureTextEntry
              textContentType="newPassword"
              value={value}
            />
          </FormField>
        )}
      />
      <AuthErrorMessage message={signUp.error ? userFacingAuthError(signUp.error) : null} />
      <Button
        accessibilityLabel="Crear cuenta"
        disabled={submitting}
        label="Crear cuenta"
        loading={submitting}
        onPress={handleSubmit((values) => signUp.mutateAsync(values))}
      />
      <View style={{ alignItems: 'center', gap: spacing[2] }}>
        <Text>¿Ya tienes una cuenta?</Text>
        <Link
          accessibilityLabel="Volver al inicio de sesión"
          href="/(public)/login"
          style={{ color: colors.secondary }}
        >
          Volver al inicio de sesión
        </Link>
      </View>
    </AuthFormContainer>
  )
}
