import { Thead, Tr, Th } from '@chakra-ui/react'
import { ExerciseTypeType, SetsTableHeadProps } from '../../types.d'

export default function SetsTableHead ({ exerciseType }: SetsTableHeadProps) {
  return (
    <Thead>
      <Tr>
        <Th>Set</Th>
        {exerciseType === ExerciseTypeType.WEIGHT && (
          <>
            <Th>Peso</Th>
          </>
        )}
        {exerciseType === ExerciseTypeType.REPS && (
          <>
            <Th>Reps</Th>
          </>
        )}
        {exerciseType === ExerciseTypeType.TIME && (
          <>
            <Th>Tiempo</Th>
          </>
        )}
        {exerciseType === ExerciseTypeType.DISTANCE && (
          <>
            <Th>Distancia</Th>
          </>
        )}
        {exerciseType === ExerciseTypeType.WEIGHT_REPS && (
          <>
            <Th>Peso</Th>
            <Th>Reps</Th>
          </>
        )}
        {exerciseType === ExerciseTypeType.TIME_DISTANCE && (
          <>
            <Th>Tiempo</Th>
            <Th>Distancia</Th>
          </>
        )}
        <Th>Drop Set</Th>
      </Tr>
    </Thead>
  )
}
