import type { EExerciseType, WorkoutHistoryPage } from '@gymnotebook/contracts'
import {
  formatDistance,
  formatTime,
  formatWeight,
  parseHistoryDate,
} from '@/features/history/utils/history-formatters'

export interface ExerciseStats {
  ultimaVez: string
  totalSeries: number
  mejorPeso?: string
  mejorVolumen?: string
  mejorTiempo?: string
  mejorDistancia?: string
}

export function formatStatsDate(isoString: string | null | undefined): string {
  const date = parseHistoryDate(isoString)
  if (!date) return ''
  try {
    const str = date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    return str.replace('.', '')
  } catch {
    return ''
  }
}

export function computeExerciseStats(
  history: WorkoutHistoryPage,
  exerciseType: EExerciseType,
): ExerciseStats | null {
  if (!history?.content || history.content.length === 0) {
    return null
  }

  let mostRecentDateStr: string | null = null
  let mostRecentTime = 0

  let totalSeries = 0
  let maxWeightGrams = 0
  let maxVolumeKg = 0
  let maxTimeSeconds = 0
  let maxDistanceMeters = 0

  const typeUpper = exerciseType.toUpperCase()
  const hasWeight = typeUpper === 'WEIGHT' || typeUpper === 'WEIGHT_REPS'
  const hasReps = typeUpper === 'REPS' || typeUpper === 'WEIGHT_REPS'
  const hasTime = typeUpper === 'TIME' || typeUpper === 'TIME_DISTANCE'
  const hasDistance = typeUpper === 'DISTANCE' || typeUpper === 'TIME_DISTANCE'

  for (const workoutSet of history.content) {
    const dateStr = workoutSet.startDate || workoutSet.endDate
    if (dateStr) {
      const parsed = parseHistoryDate(dateStr)
      if (parsed) {
        const time = parsed.getTime()
        if (time > mostRecentTime) {
          mostRecentTime = time
          mostRecentDateStr = dateStr
        }
      }
    }

    if (workoutSet.sets) {
      totalSeries += workoutSet.sets.length

      for (const set of workoutSet.sets) {
        // Mejor peso
        if (hasWeight && typeof set.weight === 'number' && set.weight > maxWeightGrams) {
          maxWeightGrams = set.weight
        }

        // Mejor volumen
        if (
          hasWeight &&
          hasReps &&
          typeof set.weight === 'number' &&
          typeof set.reps === 'number'
        ) {
          const weightKg = set.weight / 1000
          const volume = weightKg * set.reps
          if (volume > maxVolumeKg) {
            maxVolumeKg = volume
          }
        }

        // Mejor tiempo
        if (hasTime && typeof set.time === 'number' && set.time > maxTimeSeconds) {
          maxTimeSeconds = set.time
        }

        // Mejor distancia
        if (hasDistance && typeof set.distance === 'number' && set.distance > maxDistanceMeters) {
          maxDistanceMeters = set.distance
        }
      }
    }
  }

  if (totalSeries === 0) {
    return null
  }

  const stats: ExerciseStats = {
    ultimaVez: formatStatsDate(mostRecentDateStr),
    totalSeries,
  }

  if (hasWeight && maxWeightGrams > 0) {
    stats.mejorPeso = formatWeight(maxWeightGrams)
  }

  if (hasWeight && hasReps && maxVolumeKg > 0) {
    stats.mejorVolumen = `${Number(maxVolumeKg.toFixed(3))} kg`
  }

  if (hasTime && maxTimeSeconds > 0) {
    stats.mejorTiempo = formatTime(maxTimeSeconds)
  }

  if (hasDistance && maxDistanceMeters > 0) {
    stats.mejorDistancia = formatDistance(maxDistanceMeters)
  }

  return stats
}
