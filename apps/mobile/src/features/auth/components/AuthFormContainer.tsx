import type { ReactNode } from 'react';
import { View } from 'react-native';
import { spacing, typography } from '@/shared/theme/tokens';
import { Card, KeyboardSafeScreen, Text } from '@/shared/ui/primitives';

export function AuthFormContainer({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}): ReactNode {
  return (
    <KeyboardSafeScreen>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing[5] }}>
        <View style={{ gap: spacing[2] }}>
          <Text style={{ fontFamily: typography.fontFamilyBold, fontSize: 32 }}>
            The Gym Notebook
          </Text>
          <Text style={{ fontFamily: typography.fontFamilyMedium, fontSize: 20 }}>{title}</Text>
          <Text>{subtitle}</Text>
        </View>
        <Card>
          <View style={{ gap: spacing[4] }}>{children}</View>
        </Card>
      </View>
    </KeyboardSafeScreen>
  );
}
