import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { userFacingAuthError } from '@/features/auth/application/auth-errors';
import { AuthErrorMessage } from '@/features/auth/components/AuthErrorMessage';
import { AuthFormContainer } from '@/features/auth/components/AuthFormContainer';
import { useSignUpAction } from '@/features/auth/hooks/use-auth-actions';
import { type SignupFormValues, signupFormResolver } from '@/features/auth/schemas/signup-form';
import { colors, spacing } from '@/shared/theme/tokens';
import { Button, FormField, Text, TextInput } from '@/shared/ui/primitives';

export default function SignupScreen() {
  const signUp = useSignUpAction();
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
  });
  const submitting = isSubmitting || signUp.isPending;

  return (
    <AuthFormContainer title="Create account" subtitle="Start tracking with a mobile session.">
      <Controller
        control={control}
        name="username"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField label="Username" error={errors.username?.message ?? ''}>
            <TextInput
              accessibilityLabel="Username"
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
          <FormField label="Email" error={errors.email?.message ?? ''}>
            <TextInput
              accessibilityLabel="Email"
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
          <FormField label="Password" error={errors.password?.message ?? ''}>
            <TextInput
              accessibilityLabel="Password"
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
          <FormField label="Confirm password" error={errors.confirmPassword?.message ?? ''}>
            <TextInput
              accessibilityLabel="Confirm password"
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
        accessibilityLabel="Create account"
        disabled={submitting}
        label="Create account"
        loading={submitting}
        onPress={handleSubmit((values) => signUp.mutateAsync(values))}
      />
      <View style={{ alignItems: 'center', gap: spacing[2] }}>
        <Text>Already have an account?</Text>
        <Link
          accessibilityLabel="Back to login"
          href="/(public)/login"
          style={{ color: colors.secondary }}
        >
          Back to login
        </Link>
      </View>
    </AuthFormContainer>
  );
}
