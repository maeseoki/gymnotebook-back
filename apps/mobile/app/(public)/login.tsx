import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { userFacingAuthError } from '@/features/auth/application/auth-errors';
import { AuthErrorMessage } from '@/features/auth/components/AuthErrorMessage';
import { AuthFormContainer } from '@/features/auth/components/AuthFormContainer';
import { useSignInAction } from '@/features/auth/hooks/use-auth-actions';
import { type LoginFormValues, loginFormResolver } from '@/features/auth/schemas/login-form';
import { colors, spacing } from '@/shared/theme/tokens';
import { Button, FormField, Text, TextInput } from '@/shared/ui/primitives';

export default function LoginScreen() {
  const signIn = useSignInAction();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: loginFormResolver,
    defaultValues: { username: '', password: '' },
  });
  const submitting = isSubmitting || signIn.isPending;

  return (
    <AuthFormContainer title="Sign in" subtitle="Use your Gym Notebook account.">
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
          <FormField label="Password" error={errors.password?.message ?? ''}>
            <TextInput
              accessibilityLabel="Password"
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
        accessibilityLabel="Sign in"
        disabled={submitting}
        label="Sign in"
        loading={submitting}
        onPress={handleSubmit((values) => signIn.mutateAsync(values))}
      />
      <View style={{ alignItems: 'center', gap: spacing[2] }}>
        <Text>Need an account?</Text>
        <Link
          accessibilityLabel="Create account"
          href="/(public)/signup"
          style={{ color: colors.secondary }}
        >
          Create account
        </Link>
      </View>
    </AuthFormContainer>
  );
}
