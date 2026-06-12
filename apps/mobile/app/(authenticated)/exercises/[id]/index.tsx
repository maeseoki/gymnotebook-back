import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useExerciseDetail } from '@/features/exercises/hooks/use-exercise-detail';
import { useDeleteExerciseMutation } from '@/features/exercises/hooks/use-exercise-mutations';
import { mapExerciseError } from '@/features/exercises/utils/exercise-errors';
import { colors, spacing } from '@/shared/theme/tokens';
import { Button, Card, ErrorState, LoadingIndicator, Screen, Text } from '@/shared/ui/primitives';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numericId = Number(id);
  const isValidId = id !== undefined && !Number.isNaN(numericId) && numericId > 0;

  const { data: exercise, isLoading, error } = useExerciseDetail(numericId);
  const { mutate: deleteExercise, isPending: isDeleting } = useDeleteExerciseMutation();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = () => {
    setDeleteError(null);
    deleteExercise(numericId, {
      onSuccess: () => {
        router.replace('/(authenticated)/(tabs)/exercises');
      },
      onError: (err) => {
        setDeleteError(mapExerciseError(err));
      },
    });
  };

  const showConfirmDelete = () => {
    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to delete this exercise? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ],
    );
  };

  if (!isValidId) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <ErrorState title="Invalid Exercise ID" />
        <Button
          label="Back to exercises"
          onPress={() => router.replace('/(authenticated)/(tabs)/exercises')}
        />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <LoadingIndicator label="Loading exercise details" />
      </Screen>
    );
  }

  if (error || !exercise) {
    return (
      <Screen style={{ justifyContent: 'center', gap: spacing[4] }}>
        <ErrorState title={error ? mapExerciseError(error) : 'Exercise not found.'} />
        <Button
          label="Back to exercises"
          onPress={() => router.replace('/(authenticated)/(tabs)/exercises')}
        />
      </Screen>
    );
  }

  const typeDisplay = exercise.type.replace('_', ' & ').toLowerCase();
  const primaryMuscle = exercise.primaryMuscleGroup.replace('_', ' ').toLowerCase();
  const secondaryMuscle = exercise.secondaryMuscleGroup
    ? exercise.secondaryMuscleGroup.replace('_', ' ').toLowerCase()
    : null;

  return (
    <Screen style={{ gap: spacing[4] }}>
      {deleteError ? (
        <Card style={{ borderColor: colors.danger }}>
          <Text style={{ color: colors.danger }}>{deleteError}</Text>
        </Card>
      ) : null}

      <Card style={{ gap: spacing[3] }}>
        <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24 }}>{exercise.name}</Text>

        <View style={{ gap: spacing[1] }}>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Type</Text>
          <Text style={{ fontSize: 16, textTransform: 'capitalize' }}>{typeDisplay}</Text>
        </View>

        <View style={{ gap: spacing[1] }}>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Primary Muscle Group</Text>
          <Text style={{ fontSize: 16, textTransform: 'capitalize' }}>{primaryMuscle}</Text>
        </View>

        {secondaryMuscle ? (
          <View style={{ gap: spacing[1] }}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>Secondary Muscle Group</Text>
            <Text style={{ fontSize: 16, textTransform: 'capitalize' }}>{secondaryMuscle}</Text>
          </View>
        ) : null}

        {exercise.description ? (
          <View style={{ gap: spacing[1] }}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>Description</Text>
            <Text style={{ fontSize: 16 }}>{exercise.description}</Text>
          </View>
        ) : null}
      </Card>

      <View style={{ gap: spacing[3], marginTop: 'auto' }}>
        <Button
          label="Edit Exercise"
          variant="outline"
          onPress={() => router.push(`/(authenticated)/exercises/${numericId}/edit`)}
          disabled={isDeleting}
        />
        <Button
          label="Delete Exercise"
          variant="secondary"
          onPress={showConfirmDelete}
          loading={isDeleting}
          disabled={isDeleting}
        />
      </View>
    </Screen>
  );
}
