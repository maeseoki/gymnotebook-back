import type { ReactNode } from 'react';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { colors, radius, spacing } from '@/shared/theme/tokens';
import { Card, Text } from '@/shared/ui/primitives';

export interface SelectFieldProps {
  label: string;
  value: string | null | undefined;
  options: readonly { readonly label: string; readonly value: string }[];
  onChange: (val: string | null) => void;
  error?: string | undefined;
  placeholder?: string;
  allowClear?: boolean;
}

export function ExerciseSelectField({
  label,
  value,
  options,
  onChange,
  error,
  placeholder = 'Select option...',
  allowClear = false,
}: SelectFieldProps): ReactNode {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <View style={{ gap: spacing[2] }}>
      <Text style={{ color: colors.textMuted }}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedOption ? selectedOption.label : 'not set'}`}
        onPress={() => setModalVisible(true)}
        style={{
          minHeight: 48,
          backgroundColor: colors.surfaceMuted,
          borderColor: error ? colors.danger : colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          paddingHorizontal: spacing[3],
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: value ? colors.text : colors.textMuted }}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
      </Pressable>
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          onPress={() => setModalVisible(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: spacing[4],
          }}
        >
          <Card style={{ width: '100%', maxHeight: 400, padding: 0 }}>
            <View
              style={{
                padding: spacing[4],
                borderBottomWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18 }}>
                Select {label}
              </Text>
              {allowClear && (
                <Pressable
                  onPress={() => {
                    onChange(null);
                    setModalVisible(false);
                  }}
                  style={{ padding: spacing[1] }}
                >
                  <Text style={{ color: colors.danger }}>Clear</Text>
                </Pressable>
              )}
            </View>
            <ScrollView style={{ padding: spacing[2] }}>
              {options.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    onChange(opt.value);
                    setModalVisible(false);
                  }}
                  style={{
                    padding: spacing[3],
                    borderRadius: radius.sm,
                    backgroundColor: opt.value === value ? colors.surfacePressed : 'transparent',
                    marginBottom: 2,
                  }}
                >
                  <Text style={{ color: opt.value === value ? colors.primary : colors.text }}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Card>
        </Pressable>
      </Modal>
    </View>
  );
}
