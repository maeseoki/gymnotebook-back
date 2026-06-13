import { Link } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { userFacingAuthError } from '@/features/auth/application/auth-errors'
import { AuthErrorMessage } from '@/features/auth/components/AuthErrorMessage'
import { AuthFormContainer } from '@/features/auth/components/AuthFormContainer'
import { useSignInAction } from '@/features/auth/hooks/use-auth-actions'
import { type LoginFormValues, loginFormResolver } from '@/features/auth/schemas/login-form'
import { colors, spacing } from '@/shared/theme/tokens'
import { Button, FormField, Text, TextInput } from '@/shared/ui/primitives'

export default function LoginScreen() {
  const { t } = useTranslation()
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
    <AuthFormContainer title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      <Controller
        control={control}
        name="username"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField label={t('auth.username')} error={errors.username?.message ?? ''}>
            <TextInput
              accessibilityLabel={t('auth.username')}
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
          <FormField label={t('auth.password')} error={errors.password?.message ?? ''}>
            <TextInput
              accessibilityLabel={t('auth.password')}
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
        accessibilityLabel={t('auth.loginTitle')}
        disabled={submitting}
        label={t('auth.loginTitle')}
        loading={submitting}
        onPress={handleSubmit((values) => signIn.mutateAsync(values))}
      />
      <View style={{ alignItems: 'center', gap: spacing[2] }}>
        <Text>{t('auth.needAccount')}</Text>
        <Link
          accessibilityLabel={t('auth.signupTitle')}
          href="/(public)/signup"
          style={{ color: colors.secondary }}
        >
          {t('auth.signupTitle')}
        </Link>
      </View>
    </AuthFormContainer>
  )
}
