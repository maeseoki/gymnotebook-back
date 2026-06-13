export const EXERCISE_TYPE_OPTIONS = [
  { label: 'Peso y repeticiones', value: 'WEIGHT_REPS' },
  { label: 'Solo peso', value: 'WEIGHT' },
  { label: 'Solo repeticiones', value: 'REPS' },
  { label: 'Solo tiempo', value: 'TIME' },
  { label: 'Solo distancia', value: 'DISTANCE' },
  { label: 'Tiempo y distancia', value: 'TIME_DISTANCE' },
] as const

export const MUSCLE_GROUP_OPTIONS = [
  { label: 'Pecho', value: 'CHEST' },
  { label: 'Bíceps', value: 'BICEPS' },
  { label: 'Tríceps', value: 'TRICEPS' },
  { label: 'Hombros', value: 'SHOULDERS' },
  { label: 'Espalda superior', value: 'UPPER_BACK' },
  { label: 'Espalda inferior', value: 'LOWER_BACK' },
  { label: 'Dorsales', value: 'LATS' },
  { label: 'Trapecios', value: 'TRAPS' },
  { label: 'Cuádriceps', value: 'QUADRICEPS' },
  { label: 'Femorales', value: 'HAMSTRINGS' },
  { label: 'Glúteos', value: 'GLUTES' },
  { label: 'Gemelos', value: 'CALVES' },
  { label: 'Abdominales', value: 'ABDOMINALS' },
  { label: 'Aductores', value: 'ABDUCTORS' },
  { label: 'Antebrazos', value: 'FOREARMS' },
  { label: 'Cuerpo completo', value: 'FULL_BODY' },
  { label: 'Cardio', value: 'CARDIO' },
  { label: 'Otro', value: 'OTHER' },
] as const

export function getExerciseTypeLabel(type: string, t?: (key: string) => string): string {
  if (t) {
    return t(`exercises.types.${type}`)
  }
  const option = EXERCISE_TYPE_OPTIONS.find((o) => o.value === type)
  return option ? option.label : type
}

export function getMuscleGroupLabel(group: string, t?: (key: string) => string): string {
  if (t) {
    return t(`exercises.muscles.${group}`)
  }
  const option = MUSCLE_GROUP_OPTIONS.find((o) => o.value === group)
  return option ? option.label : group
}
