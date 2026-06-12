import type { EExerciseType, SetResponse, UpdateWorkoutSetRequest } from '@gymnotebook/contracts'
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native'
import { type ApiFailure, normalizeApiError } from '@/shared/api/errors'
import { colors, spacing } from '@/shared/theme/tokens'
import { Text } from '@/shared/ui/primitives'
import { HistoryApiError } from '../api/history-api'
import { useDeleteHistorySet } from '../hooks/use-delete-history-set'
import { useUpdateHistorySet } from '../hooks/use-update-history-set'
import { getHistoryErrorMessage } from '../utils/history-errors'
import { formatSetValues } from '../utils/history-formatters'
import { EditHistorySetForm } from './EditHistorySetForm'

interface HistorySetRowProps {
  set: SetResponse
  index: number
  exerciseType: EExerciseType
  exerciseName: string
}

export function HistorySetRow({ set, index, exerciseType, exerciseName }: HistorySetRowProps) {
  const [modalVisible, setModalVisible] = useState(false)

  const { mutate: updateSet, isPending: isUpdating, error: updateError } = useUpdateHistorySet()
  const { mutate: deleteSet, isPending: isDeleting } = useDeleteHistorySet()

  const handleEditSubmit = (data: {
    reps?: number | null
    weight?: number | null
    time?: number | null
    distance?: number | null
    notes?: string | null | undefined
    isDropSet?: boolean
  }) => {
    const payload: UpdateWorkoutSetRequest = {
      reps: data.reps ?? undefined,
      weight: data.weight ?? undefined,
      time: data.time ?? undefined,
      distance: data.distance ?? undefined,
      notes: data.notes,
      isDropSet: data.isDropSet,
    }
    updateSet(
      {
        setId: set.id,
        payload,
      },
      {
        onSuccess: () => {
          setModalVisible(false)
        },
      },
    )
  }

  const handleDelete = () => {
    Alert.alert('Eliminar serie', '¿Estás seguro de que deseas eliminar esta serie?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deleteSet(set.id, {
            onError: (err) => {
              const apiFailure = normalizeApiError(err)
              const msg = getHistoryErrorMessage(apiFailure)
              Alert.alert('Error', msg)
            },
          })
        },
      },
    ])
  }

  let errorMsg: string | null = null
  if (updateError) {
    if (updateError instanceof HistoryApiError) {
      errorMsg = getHistoryErrorMessage(updateError.failure)
    } else if (
      updateError &&
      typeof updateError === 'object' &&
      'failure' in updateError &&
      updateError.failure
    ) {
      errorMsg = getHistoryErrorMessage(updateError.failure as ApiFailure)
    } else {
      errorMsg = getHistoryErrorMessage(normalizeApiError(updateError))
    }
  }

  return (
    <View style={styles.container}>
      <View
        style={styles.row}
        accessibilityRole="text"
        accessibilityLabel={`Serie ${index + 1}: ${formatSetValues(set, exerciseType)}${set.isDropSet ? ' drop set' : ''}`}
      >
        <View style={styles.info}>
          <Text style={styles.setNumber}>
            Serie {index + 1}
            {set.isDropSet ? ' (Drop)' : ''}
          </Text>
          <Text style={styles.setValues}>{formatSetValues(set, exerciseType)}</Text>
        </View>

        <View style={styles.actions}>
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <>
              <Pressable
                onPress={() => setModalVisible(true)}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Editar serie ${index + 1}`}
              >
                <Text style={styles.editText}>Editar</Text>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar serie ${index + 1}`}
              >
                <Text style={styles.deleteText}>Eliminar</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {set.notes ? <Text style={styles.notes}>{set.notes}</Text> : null}

      <EditHistorySetForm
        visible={modalVisible}
        exerciseType={exerciseType}
        exerciseName={exerciseName}
        initialValues={set}
        onClose={() => setModalVisible(false)}
        onSubmit={handleEditSubmit}
        loading={isUpdating}
        errorMsg={errorMsg}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
    paddingVertical: spacing[1],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  setNumber: {
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: 'SpaceGrotesk_500Medium',
    width: 100,
  },
  setValues: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingLeft: spacing[2],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  actionPressed: {
    opacity: 0.7,
  },
  editText: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  deleteText: {
    fontSize: 12,
    color: colors.danger,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  notes: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingLeft: 100 + spacing[2],
    paddingBottom: spacing[1],
  },
})
