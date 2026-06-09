import { Tr, Td, Icon } from '@chakra-ui/react'
import { ExerciseTypeType, SetProps } from '../../types.d'
import { BsLightningChargeFill } from 'react-icons/bs'

export default function Set ({
  index,
  reps,
  weight,
  time,
  distance,
  isDropSet,
  exerciseType
}: SetProps) {
  return (
    <Tr>
      <Td>{index + 1}</Td>
      {exerciseType === ExerciseTypeType.WEIGHT && (
        <>
          <Td>{weight ?? '-'}</Td>
        </>
      )}
      {exerciseType === ExerciseTypeType.REPS && (
        <>
          <Td>{reps ?? '-'}</Td>
        </>
      )}
      {exerciseType === ExerciseTypeType.TIME && (
        <>
          <Td>{time ?? '-'}</Td>
        </>
      )}
      {exerciseType === ExerciseTypeType.DISTANCE && (
        <>
          <Td>{distance ?? '-'}</Td>
        </>
      )}
      {exerciseType === ExerciseTypeType.WEIGHT_REPS && (
        <>
          <Td>{weight ?? '-'}</Td>
          <Td>{reps ?? '-'}</Td>
        </>
      )}
      {exerciseType === ExerciseTypeType.TIME_DISTANCE && (
        <>
          <Td>{time ?? '-'}</Td>
          <Td>{distance ?? '-'}</Td>
        </>
      )}
      <Td>
        <Icon
          as={BsLightningChargeFill}
          variant={isDropSet ? 'lightning' : 'off'}
          boxSize={6}
          ms={4}
        />
      </Td>
    </Tr>
  )
}
