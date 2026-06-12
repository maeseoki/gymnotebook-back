import type { ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { ScrollView } from 'react-native'
import { colors, spacing } from '@/shared/theme/tokens'
import { Button, Card, FormField, Text, TextInput } from '@/shared/ui/primitives'
import { EXERCISE_TYPE_OPTIONS, MUSCLE_GROUP_OPTIONS } from '../constants/exercise-options'
import { type ExerciseFormValues, exerciseFormResolver } from '../schemas/exercise-form'

export type { ExerciseFormValues }

import { ExerciseSelectField } from './ExerciseSelectField'

export interface ExerciseFormProps {
  initialValues?: Partial<ExerciseFormValues>
  onSubmit: (values: ExerciseFormValues) => void
  loading?: boolean
  submitLabel?: string
  generalError?: string | null
}

export function ExerciseForm({
  initialValues,
  onSubmit,
  loading = false,
  submitLabel = 'Save',
  generalError,
}: ExerciseFormProps): ReactNode {
  const cleanInitialValues = initialValues || {}

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ExerciseFormValues>({
    resolver: exerciseFormResolver,
    defaultValues: {
      name: '',
      description: '',
      type: 'WEIGHT_REPS',
      primaryMuscleGroup: 'OTHER',
      secondaryMuscleGroup: null,
      imageId: null,
      ...cleanInitialValues,
    },
  })

  const onFormSubmit = (data: ExerciseFormValues) => {
    onSubmit({
      ...data,
      name: data.name.trim(),
      description: data.description?.trim() || null,
    })
  }

  return (
    <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
      {generalError ? (
        <Card style={{ borderColor: colors.danger }}>
          <Text style={{ color: colors.danger }}>{generalError}</Text>
        </Card>
      ) : null}

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField label="Exercise Name *" error={errors.name?.message}>
            <TextInput
              placeholder="e.g. Bench Press"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              editable={!loading}
              accessibilityLabel="Exercise Name"
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField label="Description" error={errors.description?.message}>
            <TextInput
              placeholder="e.g. Targets chest and triceps"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ''}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top', paddingTop: spacing[2] }}
              editable={!loading}
              accessibilityLabel="Description"
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="type"
        render={({ field: { onChange, value } }) => (
          <ExerciseSelectField
            label="Exercise Type *"
            value={value}
            options={EXERCISE_TYPE_OPTIONS}
            onChange={(val) => {
              // Map null to a default type value or assert value types since type is non-nullable in ExerciseFormValues
              if (val) onChange(val)
            }}
            error={errors.type?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="primaryMuscleGroup"
        render={({ field: { onChange, value } }) => (
          <ExerciseSelectField
            label="Primary Muscle Group *"
            value={value}
            options={MUSCLE_GROUP_OPTIONS}
            onChange={(val) => {
              // Map null to a default or assert value types since primaryMuscleGroup is non-nullable
              if (val) onChange(val)
            }}
            error={errors.primaryMuscleGroup?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="secondaryMuscleGroup"
        render={({ field: { onChange, value } }) => (
          <ExerciseSelectField
            label="Secondary Muscle Group (Optional)"
            value={value}
            options={MUSCLE_GROUP_OPTIONS}
            onChange={onChange}
            error={errors.secondaryMuscleGroup?.message}
            placeholder="None"
            allowClear
          />
        )}
      />

      <Button
        label={submitLabel}
        onPress={handleSubmit(onFormSubmit)}
        loading={loading}
        disabled={loading}
      />
    </ScrollView>
  )
}
