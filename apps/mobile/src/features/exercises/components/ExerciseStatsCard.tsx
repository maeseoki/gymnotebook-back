import type { EExerciseType } from '@gymnotebook/contracts'
import { View } from 'react-native'
import { useExerciseSetHistory } from '@/features/workout/hooks/use-exercise-set-history'
import { colors, spacing, typography } from '@/shared/theme/tokens'
import { Card, Text } from '@/shared/ui/primitives'
import { computeExerciseStats } from '../utils/exercise-stats'

interface ExerciseStatsCardProps {
  exerciseId: number
  exerciseType: EExerciseType
}

export function ExerciseStatsCard({ exerciseId, exerciseType }: ExerciseStatsCardProps) {
  const { data: history, isLoading, error } = useExerciseSetHistory(exerciseId)

  if (isLoading) {
    return (
      <Card style={{ gap: spacing[2] }}>
        <Text
          style={{
            fontFamily: typography.fontFamilyBold,
            fontSize: 18,
            color: colors.primary,
          }}
        >
          Estadísticas
        </Text>
        <Text style={{ color: colors.textMuted }}>Cargando estadísticas...</Text>
      </Card>
    )
  }

  if (error) {
    return (
      <Card style={{ gap: spacing[2], borderColor: colors.danger }}>
        <Text
          style={{
            fontFamily: typography.fontFamilyBold,
            fontSize: 18,
            color: colors.primary,
          }}
        >
          Estadísticas
        </Text>
        <Text style={{ color: colors.danger }}>No se pudieron cargar las estadísticas.</Text>
      </Card>
    )
  }

  const stats = history ? computeExerciseStats(history, exerciseType) : null

  if (!stats) {
    return (
      <Card style={{ gap: spacing[2] }}>
        <Text
          style={{
            fontFamily: typography.fontFamilyBold,
            fontSize: 18,
            color: colors.primary,
          }}
        >
          Estadísticas
        </Text>
        <Text style={{ color: colors.textMuted }}>
          Aún no hay estadísticas para este ejercicio.
        </Text>
      </Card>
    )
  }

  return (
    <Card style={{ gap: spacing[2] }}>
      <Text
        style={{
          fontFamily: typography.fontFamilyBold,
          fontSize: 18,
          color: colors.primary,
          marginBottom: spacing[1],
        }}
      >
        Estadísticas
      </Text>
      <View style={{ gap: spacing[1] }}>
        {stats.ultimaVez ? (
          <Text>
            <Text style={{ color: colors.textMuted }}>Última vez: </Text>
            <Text style={{ fontFamily: typography.fontFamilyMedium }}>{stats.ultimaVez}</Text>
          </Text>
        ) : null}
        <Text>
          <Text style={{ color: colors.textMuted }}>Total de series: </Text>
          <Text style={{ fontFamily: typography.fontFamilyMedium }}>{stats.totalSeries}</Text>
        </Text>
        {stats.mejorPeso ? (
          <Text>
            <Text style={{ color: colors.textMuted }}>Mejor peso: </Text>
            <Text style={{ fontFamily: typography.fontFamilyMedium }}>{stats.mejorPeso}</Text>
          </Text>
        ) : null}
        {stats.mejorVolumen ? (
          <Text>
            <Text style={{ color: colors.textMuted }}>Mejor volumen: </Text>
            <Text style={{ fontFamily: typography.fontFamilyMedium }}>{stats.mejorVolumen}</Text>
          </Text>
        ) : null}
        {stats.mejorTiempo ? (
          <Text>
            <Text style={{ color: colors.textMuted }}>Mejor tiempo: </Text>
            <Text style={{ fontFamily: typography.fontFamilyMedium }}>{stats.mejorTiempo}</Text>
          </Text>
        ) : null}
        {stats.mejorDistancia ? (
          <Text>
            <Text style={{ color: colors.textMuted }}>Mejor distancia: </Text>
            <Text style={{ fontFamily: typography.fontFamilyMedium }}>{stats.mejorDistancia}</Text>
          </Text>
        ) : null}
      </View>
    </Card>
  )
}
