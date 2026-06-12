export const EXERCISE_TYPE_OPTIONS = [
  { label: 'Weight & Reps', value: 'WEIGHT_REPS' },
  { label: 'Weight Only', value: 'WEIGHT' },
  { label: 'Reps Only', value: 'REPS' },
  { label: 'Time Only', value: 'TIME' },
  { label: 'Distance Only', value: 'DISTANCE' },
  { label: 'Time & Distance', value: 'TIME_DISTANCE' },
] as const;

export const MUSCLE_GROUP_OPTIONS = [
  { label: 'Chest', value: 'CHEST' },
  { label: 'Biceps', value: 'BICEPS' },
  { label: 'Triceps', value: 'TRICEPS' },
  { label: 'Shoulders', value: 'SHOULDERS' },
  { label: 'Upper Back', value: 'UPPER_BACK' },
  { label: 'Lower Back', value: 'LOWER_BACK' },
  { label: 'Lats', value: 'LATS' },
  { label: 'Traps', value: 'TRAPS' },
  { label: 'Quadriceps', value: 'QUADRICEPS' },
  { label: 'Hamstrings', value: 'HAMSTRINGS' },
  { label: 'Glutes', value: 'GLUTES' },
  { label: 'Calves', value: 'CALVES' },
  { label: 'Abdominus', value: 'ABDOMINALS' },
  { label: 'Abductors', value: 'ABDUCTORS' },
  { label: 'Forearms', value: 'FOREARMS' },
  { label: 'Full Body', value: 'FULL_BODY' },
  { label: 'Cardio', value: 'CARDIO' },
  { label: 'Other', value: 'OTHER' },
] as const;
