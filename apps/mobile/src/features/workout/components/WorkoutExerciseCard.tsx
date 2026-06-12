import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { colors, radius, spacing } from '@/shared/theme/tokens'
import { Button, Card, Text } from '@/shared/ui/primitives'
import type { ActiveWorkoutExercise, ActiveWorkoutSet } from '../schemas/active-workout-draft'
import { SetForm } from './SetForm'
import { WorkoutSetRow } from './WorkoutSetRow'

interface WorkoutExerciseCardProps {
  exercise: ActiveWorkoutExercise
  onRemoveExercise: () => void
  onAddSet: (setFields: {
    weightGrams?: number | null
    reps?: number | null
    timeSeconds?: number | null
    distanceMeters?: number | null
  }) => void
  onUpdateSet: (
    draftSetId: string,
    setFields: {
      weightGrams?: number | null
      reps?: number | null
      timeSeconds?: number | null
      distanceMeters?: number | null
    },
  ) => void
  onDeleteSet: (draftSetId: string) => void
}

export function WorkoutExerciseCard({
  exercise,
  onRemoveExercise,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
}: WorkoutExerciseCardProps) {
  const [modalVisible, setModalVisible] = useState(false)
  const [editingSet, setEditingSet] = useState<ActiveWorkoutSet | null>(null)

  const handleOpenAdd = () => {
    setEditingSet(null)
    setModalVisible(true)
  }

  const handleOpenEdit = (set: ActiveWorkoutSet) => {
    setEditingSet(set)
    setModalVisible(true)
  }

  const handleFormSubmit = (data: {
    weightGrams?: number | null
    reps?: number | null
    timeSeconds?: number | null
    distanceMeters?: number | null
  }) => {
    if (editingSet) {
      onUpdateSet(editingSet.draftSetId, data)
    } else {
      onAddSet(data)
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.name}>{exercise.exerciseName}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{exercise.exerciseType}</Text>
          </View>
        </View>

        <Pressable
          onPress={onRemoveExercise}
          style={({ pressed }) => [styles.removeButton, pressed && styles.removePressed]}
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${exercise.exerciseName}`}
        >
          <Text style={styles.removeText}>Quitar</Text>
        </Pressable>
      </View>

      <View style={styles.setsList}>
        {exercise.sets.length === 0 ? (
          <Text style={styles.emptyText}>No hay series registradas.</Text>
        ) : (
          exercise.sets.map((set, index) => (
            <WorkoutSetRow
              key={set.draftSetId}
              set={set}
              index={index}
              exerciseType={exercise.exerciseType}
              onEdit={() => handleOpenEdit(set)}
              onDelete={() => onDeleteSet(set.draftSetId)}
            />
          ))
        )}
      </View>

      <Button
        label="Añadir Serie"
        variant="outline"
        onPress={handleOpenAdd}
        accessibilityLabel={`Añadir Serie a ${exercise.exerciseName}`}
      />

      <SetForm
        visible={modalVisible}
        exerciseType={exercise.exerciseType}
        exerciseName={exercise.exerciseName}
        exerciseId={exercise.exerciseId}
        editingSet={editingSet}
        onClose={() => setModalVisible(false)}
        onSubmit={handleFormSubmit}
      />
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[2],
  },
  name: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  badge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  removeButton: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
  },
  removePressed: {
    opacity: 0.7,
  },
  removeText: {
    fontSize: 13,
    color: colors.danger,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  setsList: {
    marginVertical: spacing[1],
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: spacing[2],
  },
})
