import type { ReactNode } from 'react';
import { colors, spacing } from '@/shared/theme/tokens';
import { Text } from '@/shared/ui/primitives';

export function AuthErrorMessage({ message }: { message?: string | null }): ReactNode {
  if (!message) {
    return null;
  }

  return (
    <Text
      accessibilityRole="alert"
      style={{
        color: colors.danger,
        marginTop: spacing[2],
      }}
    >
      {message}
    </Text>
  );
}
