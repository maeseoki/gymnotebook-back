import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
  type TextProps as RNTextProps,
  View,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/shared/theme/tokens';

export function Screen({ children, style, ...props }: ViewProps): ReactNode {
  return (
    <SafeAreaView
      {...props}
      style={[{ flex: 1, backgroundColor: colors.background, padding: spacing[4] }, style]}
    >
      {children}
    </SafeAreaView>
  );
}

export function KeyboardSafeScreen({ children }: { children: ReactNode }): ReactNode {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <Screen>{children}</Screen>
    </KeyboardAvoidingView>
  );
}

export function Text({ style, ...props }: RNTextProps): ReactNode {
  return (
    <RNText {...props} style={[{ color: colors.text, fontFamily: typography.fontFamily }, style]} />
  );
}

export function Card({ children, style, ...props }: ViewProps): ReactNode {
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing[4],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export interface ButtonProps {
  label: string;
  accessibilityLabel?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}

export function Button({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
}: ButtonProps): ReactNode {
  const inactive = disabled || loading;
  const backgroundColor =
    variant === 'outline'
      ? 'transparent'
      : variant === 'secondary'
        ? colors.secondary
        : colors.primary;
  const pressedBackgroundColor =
    variant === 'outline'
      ? colors.surfacePressed
      : variant === 'secondary'
        ? colors.secondaryPressed
        : colors.primaryPressed;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: variant === 'outline' ? colors.border : backgroundColor,
        backgroundColor: pressed && !inactive ? pressedBackgroundColor : backgroundColor,
        opacity: inactive ? 0.55 : 1,
        paddingHorizontal: spacing[4],
      })}
    >
      {loading ? <ActivityIndicator color={colors.text} /> : <Text>{label}</Text>}
    </Pressable>
  );
}

export function TextInput({ style, ...props }: RNTextInputProps): ReactNode {
  return (
    <RNTextInput
      placeholderTextColor={colors.textMuted}
      {...props}
      style={[
        {
          minHeight: 48,
          color: colors.text,
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          paddingHorizontal: spacing[3],
          fontFamily: typography.fontFamily,
        },
        style,
      ]}
    />
  );
}

export function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: ReactNode;
}): ReactNode {
  return (
    <View style={{ gap: spacing[2] }}>
      <Text accessibilityRole="text" style={{ color: colors.textMuted }}>
        {label}
      </Text>
      {children}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
    </View>
  );
}

export function LoadingIndicator({ label = 'Loading' }: { label?: string }): ReactNode {
  return <ActivityIndicator accessibilityLabel={label} color={colors.primary} />;
}

export function EmptyState({ title }: { title: string }): ReactNode {
  return (
    <Card>
      <Text>{title}</Text>
    </Card>
  );
}

export function ErrorState({ title }: { title: string }): ReactNode {
  return (
    <Card style={{ borderColor: colors.danger }}>
      <Text>{title}</Text>
    </Card>
  );
}
