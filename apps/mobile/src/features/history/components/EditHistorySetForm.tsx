import type { EExerciseType } from '@gymnotebook/contracts'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  type GestureResponderEvent,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native'
import { z } from 'zod'
import { colors, spacing } from '@/shared/theme/tokens'
import { Button, Card, FormField, Text, TextInput } from '@/shared/ui/primitives'

const createEditSetFormSchema = (exerciseType: EExerciseType) => {
  return z
    .object({
      weightKg: ['WEIGHT', 'WEIGHT_REPS'].includes(exerciseType)
        ? z
            .string()
            .refine((val) => val.trim() !== '', { message: 'El peso es obligatorio' })
            .refine((val) => /^\d+(\.\d{1,3})?$/.test(val.trim()), {
              message: 'El peso debe ser un número no negativo con hasta 3 decimales',
            })
            .transform((val) => Number(val))
        : z
            .string()
            .optional()
            .transform(() => null),
      reps: ['REPS', 'WEIGHT_REPS'].includes(exerciseType)
        ? z
            .string()
            .refine((val) => val.trim() !== '', { message: 'Las repeticiones son obligatorias' })
            .refine((val) => /^\d+$/.test(val.trim()), {
              message: 'Las repeticiones deben ser un número entero no negativo',
            })
            .transform((val) => Number(val))
        : z
            .string()
            .optional()
            .transform(() => null),
      minutes: ['TIME', 'TIME_DISTANCE'].includes(exerciseType)
        ? z
            .string()
            .transform((val) => (val.trim() === '' ? 0 : Number(val)))
            .refine((val) => !Number.isNaN(val) && Number.isInteger(val) && val >= 0, {
              message: 'Los minutos deben ser un número entero no negativo',
            })
        : z
            .string()
            .optional()
            .transform(() => 0),
      seconds: ['TIME', 'TIME_DISTANCE'].includes(exerciseType)
        ? z
            .string()
            .transform((val) => (val.trim() === '' ? 0 : Number(val)))
            .refine((val) => !Number.isNaN(val) && Number.isInteger(val) && val >= 0 && val < 60, {
              message: 'Los segundos deben ser un número entero no negativo entre 0 y 59',
            })
        : z
            .string()
            .optional()
            .transform(() => 0),
      distanceMeters: ['DISTANCE', 'TIME_DISTANCE'].includes(exerciseType)
        ? z
            .string()
            .refine((val) => val.trim() !== '', { message: 'La distancia es obligatoria' })
            .refine((val) => /^\d+$/.test(val.trim()), {
              message: 'La distancia debe ser un número entero no negativo',
            })
            .transform((val) => Number(val))
        : z
            .string()
            .optional()
            .transform(() => null),
      notes: z.string().trim().max(255).optional().nullable(),
      isDropSet: z.boolean().default(false),
    })
    .refine(
      (data) => {
        if (['TIME', 'TIME_DISTANCE'].includes(exerciseType)) {
          const totalSeconds = (data.minutes ?? 0) * 60 + (data.seconds ?? 0)
          return totalSeconds > 0
        }
        return true
      },
      {
        path: ['seconds'],
        message: 'El tiempo total debe ser mayor que 0 segundos',
      },
    )
}

interface EditHistorySetFormProps {
  visible: boolean
  exerciseType: EExerciseType
  exerciseName: string
  initialValues: {
    reps?: number | null
    weight?: number | null // in grams
    time?: number | null // in seconds
    distance?: number | null // in meters
    notes?: string | null | undefined
    isDropSet?: boolean
  }
  onClose: () => void
  onSubmit: (data: {
    reps?: number | null
    weight?: number | null // in grams
    time?: number | null // in seconds
    distance?: number | null // in meters
    notes?: string | null | undefined
    isDropSet?: boolean
  }) => void
  loading?: boolean
  errorMsg?: string | null
}

export function EditHistorySetForm({
  visible,
  exerciseType,
  exerciseName,
  initialValues,
  onClose,
  onSubmit,
  loading = false,
  errorMsg = null,
}: EditHistorySetFormProps) {
  const schema = createEditSetFormSchema(exerciseType)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      weightKg: '',
      reps: '',
      minutes: '',
      seconds: '',
      distanceMeters: '',
      notes: '',
      isDropSet: false,
    },
  })

  useEffect(() => {
    if (visible) {
      const mins = initialValues.time ? Math.floor(initialValues.time / 60).toString() : ''
      const secs = initialValues.time ? (initialValues.time % 60).toString() : ''

      const weightKgDisplay =
        initialValues.weight !== undefined && initialValues.weight !== null
          ? Number((initialValues.weight / 1000).toFixed(3)).toString()
          : ''

      reset({
        weightKg: weightKgDisplay,
        reps:
          initialValues.reps !== undefined && initialValues.reps !== null
            ? initialValues.reps.toString()
            : '',
        minutes: mins,
        seconds: secs,
        distanceMeters:
          initialValues.distance !== undefined && initialValues.distance !== null
            ? initialValues.distance.toString()
            : '',
        notes: initialValues.notes || '',
        isDropSet: initialValues.isDropSet || false,
      })
    }
  }, [visible, initialValues, reset])

  interface FormSubmitData {
    weightKg?: number | null
    reps?: number | null
    minutes?: number
    seconds?: number
    distanceMeters?: number | null
    notes?: string | null | undefined
    isDropSet: boolean
  }

  const onFormSubmit = (data: FormSubmitData) => {
    const timeSeconds = ['TIME', 'TIME_DISTANCE'].includes(exerciseType)
      ? (data.minutes ?? 0) * 60 + (data.seconds ?? 0)
      : null

    const weightGrams = typeof data.weightKg === 'number' ? Math.round(data.weightKg * 1000) : null

    onSubmit({
      weight: weightGrams,
      reps: data.reps ?? null,
      time: timeSeconds,
      distance: data.distanceMeters ?? null,
      notes: data.notes || null,
      isDropSet: data.isDropSet,
    })
  }

  const hasWeight = ['WEIGHT', 'WEIGHT_REPS'].includes(exerciseType)
  const hasReps = ['REPS', 'WEIGHT_REPS'].includes(exerciseType)
  const hasTime = ['TIME', 'TIME_DISTANCE'].includes(exerciseType)
  const hasDistance = ['DISTANCE', 'TIME_DISTANCE'].includes(exerciseType)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%', maxHeight: '90%' }}
        >
          <Pressable
            style={[styles.modalContent, { maxHeight: '100%' }]}
            onPress={(e: GestureResponderEvent) => e.stopPropagation()}
          >
            <Card style={[styles.card, { maxHeight: '100%' }]}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: spacing[4] }}
                style={{ flexShrink: 1 }}
              >
                <Text style={styles.title}>Editar Serie</Text>
                <Text style={styles.subtitle}>{exerciseName}</Text>

                {errorMsg ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                ) : null}

                <View style={styles.formContainer}>
                  {hasWeight && (
                    <Controller
                      control={control}
                      name="weightKg"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <FormField label="Peso (kg)" error={errors.weightKg?.message as string}>
                          <TextInput
                            keyboardType="decimal-pad"
                            placeholder="0.0"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            accessibilityLabel="Input Peso"
                          />
                        </FormField>
                      )}
                    />
                  )}

                  {hasReps && (
                    <Controller
                      control={control}
                      name="reps"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <FormField label="Repeticiones" error={errors.reps?.message as string}>
                          <TextInput
                            keyboardType="number-pad"
                            placeholder="0"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            accessibilityLabel="Input Repeticiones"
                          />
                        </FormField>
                      )}
                    />
                  )}

                  {hasTime && (
                    <View style={styles.timeRow}>
                      <View style={{ flex: 1 }}>
                        <Controller
                          control={control}
                          name="minutes"
                          render={({ field: { onChange, onBlur, value } }) => (
                            <FormField label="Minutos" error={errors.minutes?.message as string}>
                              <TextInput
                                keyboardType="number-pad"
                                placeholder="0"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                accessibilityLabel="Input Minutos"
                              />
                            </FormField>
                          )}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Controller
                          control={control}
                          name="seconds"
                          render={({ field: { onChange, onBlur, value } }) => (
                            <FormField label="Segundos" error={errors.seconds?.message as string}>
                              <TextInput
                                keyboardType="number-pad"
                                placeholder="0"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                accessibilityLabel="Input Segundos"
                              />
                            </FormField>
                          )}
                        />
                      </View>
                    </View>
                  )}

                  {hasDistance && (
                    <Controller
                      control={control}
                      name="distanceMeters"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <FormField
                          label="Distancia (m)"
                          error={errors.distanceMeters?.message as string}
                        >
                          <TextInput
                            keyboardType="number-pad"
                            placeholder="0"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            accessibilityLabel="Input Distancia"
                          />
                        </FormField>
                      )}
                    />
                  )}

                  <Controller
                    control={control}
                    name="notes"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <FormField label="Notas (opcional)" error={errors.notes?.message as string}>
                        <TextInput
                          placeholder="Ej. muy pesado al final"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value || ''}
                          maxLength={255}
                          accessibilityLabel="Input Notas"
                        />
                      </FormField>
                    )}
                  />

                  <Controller
                    control={control}
                    name="isDropSet"
                    render={({ field: { onChange, value } }) => (
                      <FormField label="Tipo de serie">
                        <View style={styles.switchRow}>
                          <Switch
                            value={value}
                            onValueChange={onChange}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={value ? colors.primaryPressed : colors.surfacePressed}
                          />
                          <Text style={styles.switchLabel}>Serie Drop Set</Text>
                        </View>
                      </FormField>
                    )}
                  />
                </View>

                <View style={styles.buttonRow}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Cancelar"
                      variant="outline"
                      onPress={onClose}
                      disabled={loading}
                      accessibilityLabel="Boton Cancelar Serie"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Guardar"
                      variant="primary"
                      onPress={handleSubmit(onFormSubmit)}
                      loading={loading}
                      disabled={loading}
                      accessibilityLabel="Boton Guardar Serie"
                    />
                  </View>
                </View>
              </ScrollView>
            </Card>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: spacing[4],
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
  },
  card: {
    gap: spacing[4],
  },
  title: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: -spacing[2],
  },
  formContainer: {
    gap: spacing[4],
    marginVertical: spacing[2],
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[1],
  },
  switchLabel: {
    fontSize: 14,
    color: colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[4],
    marginTop: spacing[2],
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    padding: spacing[2],
    marginVertical: spacing[1],
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
})
