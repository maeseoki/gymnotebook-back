import { fireEvent, render, waitFor } from '@testing-library/react-native'
import type React from 'react'

// Mock react-native Modal for tests (must wrap in a native View)
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const MockModal = ({ children, visible }: { children: React.ReactNode; visible: boolean }) => {
    const { View } = require('react-native')
    if (visible === false) return null
    return <View>{children}</View>
  }
  return {
    __esModule: true,
    default: MockModal,
  }
})

import { EditHistorySetForm } from '../src/features/history/components/EditHistorySetForm'

describe('EditHistorySetForm Submit tests', () => {
  const defaultInitialValues = {
    reps: 10,
    weight: 82500, // 82.5 kg in grams
    time: 90, // 1m 30s
    distance: 200,
    notes: 'Test notes',
    isDropSet: false,
  }

  it('submits 82.5 kg as 82500 grams', async () => {
    const mockOnSubmit = jest.fn()
    const mockOnClose = jest.fn()

    const view = await render(
      <EditHistorySetForm
        visible={true}
        exerciseType="WEIGHT_REPS"
        exerciseName="Bench Press"
        initialValues={defaultInitialValues}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />,
    )

    const weightInput = await view.findByLabelText('Input Peso')
    const repsInput = await view.findByLabelText('Input Repeticiones')
    const saveButton = await view.findByLabelText('Boton Guardar Serie')

    fireEvent.changeText(weightInput, '82.5')
    fireEvent.changeText(repsInput, '12')
    fireEvent.press(saveButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          weight: 82500,
          reps: 12,
        }),
      )
    })
  })
})
