import type { EExerciseType } from '@gymnotebook/contracts'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { type GestureResponderEvent, Modal, Pressable, StyleSheet, View } from 'react-native'
import { z } from 'zod'
import { formatDate, formatSetValues } from '@/features/history/utils/history-formatters'
import { colors, radius, spacing } from '@/shared/theme/tokens'
import { Button, Card, FormField, Text, TextInput } from '@/shared/ui/primitives'
import { useExerciseSetHistory } from '../hooks/use-exercise-set-history'
import type { ActiveWorkoutSet } from '../schemas/active-workout-draft'

const createSetFormSchema = (exerciseType: EExerciseType) => {
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

export type SetFormData = {
  weightKg?: string
  reps?: string
  minutes?: string
  seconds?: string
  distanceMeters?: string
}

interface SetFormProps {
  visible: boolean
  exerciseType: EExerciseType
  exerciseName: string
  exerciseId?: number
  editingSet?: ActiveWorkoutSet | null
  onClose: () => void
  onSubmit: (data: {
    weightGrams?: number | null
    reps?: number | null
    timeSeconds?: number | null
    distanceMeters?: number | null
  }) => void
}

export function SetForm({
  visible,
  exerciseType,
  exerciseName,
  exerciseId,
  editingSet,
  onClose,
  onSubmit,
}: SetFormProps) {
  const schema = createSetFormSchema(exerciseType)

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    isError: historyError,
  } = useExerciseSetHistory(exerciseId, visible)

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
    },
  })

  // Prefill when modal becomes visible or editingSet changes
  useEffect(() => {
    if (visible) {
      if (editingSet) {
        const mins = editingSet.timeSeconds
          ? Math.floor(editingSet.timeSeconds / 60).toString()
          : ''
        const secs = editingSet.timeSeconds ? (editingSet.timeSeconds % 60).toString() : ''

        // Display weightGrams as kg
        const weightKgDisplay =
          editingSet.weightGrams !== undefined && editingSet.weightGrams !== null
            ? Number((editingSet.weightGrams / 1000).toFixed(3)).toString()
            : ''

        reset({
          weightKg: weightKgDisplay,
          reps:
            editingSet.reps !== undefined && editingSet.reps !== null
              ? editingSet.reps.toString()
              : '',
          minutes: mins,
          seconds: secs,
          distanceMeters:
            editingSet.distanceMeters !== undefined && editingSet.distanceMeters !== null
              ? editingSet.distanceMeters.toString()
              : '',
        })
      } else {
        reset({
          weightKg: '',
          reps: '',
          minutes: '',
          seconds: '',
          distanceMeters: '',
        })
      }
    }
  }, [visible, editingSet, reset])

  interface FormSubmitData {
    weightKg?: number | null
    reps?: number | null
    minutes?: number
    seconds?: number
    distanceMeters?: number | null
  }

  const onFormSubmit = (data: FormSubmitData) => {
    const timeSeconds = ['TIME', 'TIME_DISTANCE'].includes(exerciseType)
      ? (data.minutes ?? 0) * 60 + (data.seconds ?? 0)
      : null

    // Convert weightKg input to weightGrams explicitly
    const weightGrams = typeof data.weightKg === 'number' ? Math.round(data.weightKg * 1000) : null

    onSubmit({
      weightGrams,
      reps: data.reps ?? null,
      timeSeconds,
      distanceMeters: data.distanceMeters ?? null,
    })
    onClose()
  }

  const hasWeight = ['WEIGHT', 'WEIGHT_REPS'].includes(exerciseType)
  const hasReps = ['REPS', 'WEIGHT_REPS'].includes(exerciseType)
  const hasTime = ['TIME', 'TIME_DISTANCE'].includes(exerciseType)
  const hasDistance = ['DISTANCE', 'TIME_DISTANCE'].includes(exerciseType)

  const [feedbackVisible, setFeedbackVisible] = useState(false)

  useEffect(() => {
    if (!visible) {
      setFeedbackVisible(false)
    }
  }, [visible])

  const handleUseSet = (set: {
    reps?: number | null
    weight?: number | null
    time?: number | null
    distance?: number | null
  }) => {
    const mins = hasTime && set.time ? Math.floor(set.time / 60).toString() : ''
    const secs = hasTime && set.time ? (set.time % 60).toString() : ''

    const weightKgDisplay =
      hasWeight && set.weight !== undefined && set.weight !== null
        ? Number((set.weight / 1000).toFixed(3)).toString()
        : ''

    const repsDisplay =
      hasReps && set.reps !== undefined && set.reps !== null ? set.reps.toString() : ''

    const distanceDisplay =
      hasDistance && set.distance !== undefined && set.distance !== null
        ? set.distance.toString()
        : ''

    reset({
      weightKg: weightKgDisplay,
      reps: repsDisplay,
      minutes: mins,
      seconds: secs,
      distanceMeters: distanceDisplay,
    })

    setFeedbackVisible(true)
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.modalContent}
          onPress={(e: GestureResponderEvent) => e.stopPropagation()}
        >
          <Card style={styles.card}>
            <Text style={styles.title}>{editingSet ? 'Editar Serie' : 'Añadir Serie'}</Text>
            <Text style={styles.subtitle}>{exerciseName}</Text>

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
            </View>

            {/* Recent exercise history section */}
            <View style={styles.historySection}>
              <View style={styles.historyHeaderRow}>
                <Text style={styles.historyTitle}>Últimas series</Text>
                {feedbackVisible && (
                  <Text style={styles.copiedFeedback}>Serie copiada al formulario.</Text>
                )}
              </View>
              {isLoadingHistory ? (
                <Text style={styles.historyStatus}>Cargando historial...</Text>
              ) : historyError ? (
                <Text style={styles.historyStatus}>No se pudo cargar el historial reciente.</Text>
              ) : historyData?.content && historyData.content.length > 0 ? (
                <View style={styles.historyList}>
                  {historyData.content.slice(0, 2).map((workout) => (
                    <View key={workout.id} style={styles.historyWorkout}>
                      <Text style={styles.historyDate}>{formatDate(workout.startDate)}</Text>
                      <View style={styles.historySets}>
                        {workout.sets.map((set, idx) => (
                          <View key={set.id} style={styles.historySetRow}>
                            <Text style={styles.historySetItem}>
                              Serie {idx + 1}: {formatSetValues(set, exerciseType)}
                              {set.isDropSet ? ' (Drop)' : ''}
                              {set.notes ? ` - ${set.notes}` : ''}
                            </Text>
                            <Pressable
                              style={styles.useButton}
                              onPress={() => handleUseSet(set)}
                              accessibilityLabel={`Usar serie ${idx + 1}`}
                            >
                              <Text style={styles.useButtonText}>Usar</Text>
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.historyStatus}>Sin historial previo para este ejercicio.</Text>
              )}
            </View>

            <View style={styles.buttonRow}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Cancelar"
                  variant="outline"
                  onPress={onClose}
                  accessibilityLabel="Boton Cancelar Serie"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Guardar"
                  variant="primary"
                  onPress={handleSubmit(onFormSubmit)}
                  accessibilityLabel="Boton Guardar Serie"
                />
              </View>
            </View>
          </Card>
        </Pressable>
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
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[4],
    marginTop: spacing[2],
  },
  historySection: {
    marginTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing[3],
    gap: spacing[2],
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.primary,
  },
  copiedFeedback: {
    fontSize: 12,
    color: colors.success,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  historyStatus: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  historyList: {
    gap: spacing[3],
  },
  historyWorkout: {
    gap: spacing[1],
  },
  historyDate: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_500Medium',
    color: colors.text,
  },
  historySets: {
    paddingLeft: spacing[2],
    gap: 2,
  },
  historySetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
    gap: spacing[2],
  },
  historySetItem: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
  },
  useButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  useButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
})
