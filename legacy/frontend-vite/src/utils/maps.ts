import { ExerciseTypeType, MuscleGroups } from '../types.d'

export const muscleGroupNames: Record<MuscleGroups, string> = {
  [MuscleGroups.ABDOMINALS]: 'Abdominales',
  [MuscleGroups.ABDUCTORS]: 'Abductores',
  [MuscleGroups.BICEPS]: 'Bíceps',
  [MuscleGroups.CALVES]: 'Gemelos',
  [MuscleGroups.CARDIO]: 'Cardio',
  [MuscleGroups.CHEST]: 'Pecho',
  [MuscleGroups.FOREARMS]: 'Antebrazos',
  [MuscleGroups.FULL_BODY]: 'Cuerpo Completo',
  [MuscleGroups.GLUTES]: 'Glúteos',
  [MuscleGroups.HAMSTRINGS]: 'Isquiotibiales',
  [MuscleGroups.LATS]: 'Dorsales',
  [MuscleGroups.LOWER_BACK]: 'Espalda Baja',
  [MuscleGroups.QUADRICEPS]: 'Cuádriceps',
  [MuscleGroups.SHOULDERS]: 'Hombros',
  [MuscleGroups.TRAPS]: 'Trapecios',
  [MuscleGroups.TRICEPS]: 'Tríceps',
  [MuscleGroups.UPPER_BACK]: 'Espalda Alta',
  [MuscleGroups.OTHER]: 'Otro'
}

export const exerciseTypeNames: Record<ExerciseTypeType, string> = {
  [ExerciseTypeType.WEIGHT]: 'Peso',
  [ExerciseTypeType.REPS]: 'Repeticiones',
  [ExerciseTypeType.TIME]: 'Tiempo',
  [ExerciseTypeType.DISTANCE]: 'Distancia',
  [ExerciseTypeType.WEIGHT_REPS]: 'Peso y Repeticiones',
  [ExerciseTypeType.TIME_DISTANCE]: 'Tiempo y Distancia'
}
