import type { EExerciseType } from '@gymnotebook/contracts';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/shared/theme/tokens';
import { Text } from '@/shared/ui/primitives';
import type { ActiveWorkoutSet } from '../schemas/active-workout-draft';

interface WorkoutSetRowProps {
  set: ActiveWorkoutSet;
  index: number;
  exerciseType: EExerciseType;
  onEdit: () => void;
  onDelete: () => void;
}

function formatWeight(grams: number | null | undefined): string {
  if (grams === null || grams === undefined) return '0 kg';
  const kg = grams / 1000;
  return `${Number(kg.toFixed(3))} kg`;
}

export function formatSetValues(set: ActiveWorkoutSet, type: EExerciseType): string {
  switch (type) {
    case 'WEIGHT_REPS':
      return `${formatWeight(set.weightGrams)} x ${set.reps ?? 0} reps`;
    case 'WEIGHT':
      return formatWeight(set.weightGrams);
    case 'REPS':
      return `${set.reps ?? 0} reps`;
    case 'TIME': {
      const secs = set.timeSeconds ?? 0;
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return m > 0 ? `${m}m ${s}s` : `${s}s`;
    }
    case 'DISTANCE':
      return `${set.distanceMeters ?? 0} m`;
    case 'TIME_DISTANCE': {
      const secs = set.timeSeconds ?? 0;
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
      return `${timeStr} | ${set.distanceMeters ?? 0} m`;
    }
    default:
      return '';
  }
}

export function WorkoutSetRow({ set, index, exerciseType, onEdit, onDelete }: WorkoutSetRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.setNumber}>Serie {index + 1}</Text>
      <Text style={styles.setValues}>{formatSetValues(set, exerciseType)}</Text>

      <View style={styles.actions}>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Editar Serie ${index + 1}`}
        >
          <Text style={styles.editText}>Editar</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar Serie ${index + 1}`}
        >
          <Text style={styles.deleteText}>Eliminar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  setNumber: {
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: 'SpaceGrotesk_500Medium',
    width: 60,
  },
  setValues: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingLeft: spacing[2],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  actionButton: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
  },
  actionPressed: {
    opacity: 0.7,
  },
  editText: {
    fontSize: 13,
    color: colors.secondary,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  deleteText: {
    fontSize: 13,
    color: colors.danger,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
});
