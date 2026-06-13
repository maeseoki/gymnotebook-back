import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'expo-router'
import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { userFacingAuthError } from '@/features/auth/application/auth-errors'
import { AuthErrorMessage } from '@/features/auth/components/AuthErrorMessage'
import { AuthFormContainer } from '@/features/auth/components/AuthFormContainer'
import { useSignUpAction } from '@/features/auth/hooks/use-auth-actions'
import { createSignupFormSchema, type SignupFormValues } from '@/features/auth/schemas/signup-form'
import { colors, spacing } from '@/shared/theme/tokens'
import { Button, FormField, Text, TextInput } from '@/shared/ui/primitives'

export default function SignupScreen() {
  const { t } = useTranslation()
  const signUp = useSignUpAction()
  const signupSchema = useMemo(() => createSignupFormSchema(t), [t])
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })
  const submitting = isSubmitting || signUp.isPending

  return (
    <AuthFormContainer title={t('auth.signupTitle')} subtitle={t('auth.signupSubtitle')}>
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
          <FormField label={t('auth.email')} error={errors.email?.message ?? ''}>
            <TextInput
              accessibilityLabel={t('auth.email')}
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
          <FormField label={t('auth.password')} error={errors.password?.message ?? ''}>
            <TextInput
              accessibilityLabel={t('auth.password')}
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
          <FormField
            label={t('auth.confirmPassword')}
            error={errors.confirmPassword?.message ?? ''}
          >
            <TextInput
              accessibilityLabel={t('auth.confirmPassword')}
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
        accessibilityLabel={t('auth.signupTitle')}
        disabled={submitting}
        label={t('auth.signupTitle')}
        loading={submitting}
        onPress={handleSubmit((values) => signUp.mutateAsync(values))}
      />
      <View style={{ alignItems: 'center', gap: spacing[2] }}>
        <Text>{t('auth.haveAccount')}</Text>
        <Link
          accessibilityLabel={t('auth.backToLogin')}
          href="/(public)/login"
          style={{ color: colors.secondary }}
        >
          {t('auth.backToLogin')}
        </Link>
      </View>
    </AuthFormContainer>
  )
}
