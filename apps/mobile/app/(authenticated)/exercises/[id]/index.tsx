import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Image, ScrollView, View } from 'react-native'
import { ExerciseStatsCard } from '@/features/exercises/components/ExerciseStatsCard'
import {
  getExerciseTypeLabel,
  getMuscleGroupLabel,
} from '@/features/exercises/constants/exercise-options'
import { useExerciseDetail } from '@/features/exercises/hooks/use-exercise-detail'
import { useDeleteExerciseMutation } from '@/features/exercises/hooks/use-exercise-mutations'
import { mapExerciseError } from '@/features/exercises/utils/exercise-errors'
import { getPublicImageUri } from '@/features/images/api/images-api'
import { colors, radius, spacing } from '@/shared/theme/tokens'
import { Button, Card, ErrorState, LoadingIndicator, Screen, Text } from '@/shared/ui/primitives'

export default function ExerciseDetailScreen() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const numericId = Number(id)
  const isValidId = id !== undefined && !Number.isNaN(numericId) && numericId > 0

  const { data: exercise, isLoading, error } = useExerciseDetail(numericId)
  const { mutate: deleteExercise, isPending: isDeleting } = useDeleteExerciseMutation()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = () => {
    setDeleteError(null)
    deleteExercise(numericId, {
      onSuccess: () => {
        router.replace('/(authenticated)/(tabs)/exercises')
      },
      onError: (err) => {
        setDeleteError(mapExerciseError(err))
      },
    })
  }

  const showConfirmDelete = () => {
    Alert.alert(t('exerciseDetail.confirmDeleteTitle'), t('exerciseDetail.confirmDeleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: handleDelete },
    ])
  }

  if (!isValidId) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <ErrorState title={t('exerciseDetail.invalidId')} />
        <Button
          label={t('exerciseDetail.backToExercises')}
          onPress={() => router.replace('/(authenticated)/(tabs)/exercises')}
        />
      </Screen>
    )
  }

  if (isLoading) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <LoadingIndicator label={t('exerciseDetail.loading')} />
      </Screen>
    )
  }

  if (error || !exercise) {
    return (
      <Screen style={{ justifyContent: 'center', gap: spacing[4] }}>
        <ErrorState
          title={error ? mapExerciseError(error) : t('exercisesScreen.errors.notFound')}
        />
        <Button
          label={t('exerciseDetail.backToExercises')}
          onPress={() => router.replace('/(authenticated)/(tabs)/exercises')}
        />
      </Screen>
    )
  }

  const typeDisplay = getExerciseTypeLabel(exercise.type, t)
  const primaryMuscle = getMuscleGroupLabel(exercise.primaryMuscleGroup, t)
  const secondaryMuscle = exercise.secondaryMuscleGroup
    ? getMuscleGroupLabel(exercise.secondaryMuscleGroup, t)
    : null

  return (
    <Screen style={{ padding: 0 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, gap: spacing[4], padding: spacing[4] }}>
        {deleteError ? (
          <Card style={{ borderColor: colors.danger }}>
            <Text style={{ color: colors.danger }}>{deleteError}</Text>
          </Card>
        ) : null}

        <Card style={{ gap: spacing[3] }}>
          {exercise.imageId ? (
            <Image
              source={{ uri: getPublicImageUri(exercise.imageId) }}
              style={{
                width: '100%',
                height: 180,
                borderRadius: radius.md,
                marginBottom: spacing[2],
              }}
              resizeMode="cover"
              accessibilityLabel={t('exerciseDetail.imageLabel')}
            />
          ) : null}
          <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24 }}>{exercise.name}</Text>

          <View style={{ gap: spacing[1] }}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>
              {t('exerciseDetail.type')}
            </Text>
            <Text style={{ fontSize: 16 }}>{typeDisplay}</Text>
          </View>

          <View style={{ gap: spacing[1] }}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>
              {t('exerciseDetail.primaryMuscle')}
            </Text>
            <Text style={{ fontSize: 16 }}>{primaryMuscle}</Text>
          </View>

          {secondaryMuscle ? (
            <View style={{ gap: spacing[1] }}>
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>
                {t('exerciseDetail.secondaryMuscle')}
              </Text>
              <Text style={{ fontSize: 16 }}>{secondaryMuscle}</Text>
            </View>
          ) : null}

          {exercise.description ? (
            <View style={{ gap: spacing[1] }}>
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>
                {t('exerciseDetail.description')}
              </Text>
              <Text style={{ fontSize: 16 }}>{exercise.description}</Text>
            </View>
          ) : null}
        </Card>

        <ExerciseStatsCard exerciseId={numericId} exerciseType={exercise.type} />

        <View style={{ gap: spacing[3], marginTop: 'auto' }}>
          <Button
            label={t('exerciseDetail.editExercise')}
            variant="outline"
            onPress={() => router.push(`/(authenticated)/exercises/${numericId}/edit`)}
            disabled={isDeleting}
          />
          <Button
            label={t('exerciseDetail.deleteExercise')}
            variant="secondary"
            onPress={showConfirmDelete}
            loading={isDeleting}
            disabled={isDeleting}
          />
        </View>
      </ScrollView>
    </Screen>
  )
}
