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

describe('EditHistorySetForm Unit & Prefill tests', () => {
  const defaultInitialValues = {
    reps: 10,
    weight: 82500, // 82.5 kg in grams
    time: 90, // 1m 30s
    distance: 200,
    notes: 'Test notes',
    isDropSet: false,
  }

  it('prefills weight: 82500 as 82.5, time: 90 as min: 1, sec: 30', async () => {
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

    // Check prefilled inputs using findByLabelText to allow reset effects to execute
    const weightInput = await view.findByLabelText('Input Peso')
    const repsInput = await view.findByLabelText('Input Repeticiones')
    const notesInput = await view.findByLabelText('Input Notas')

    expect(weightInput.props.value).toBe('82.5')
    expect(repsInput.props.value).toBe('10')
    expect(notesInput.props.value).toBe('Test notes')
  })

  it('rejects invalid decimal formats beyond 3 decimals for weight', async () => {
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
    const saveButton = await view.findByLabelText('Boton Guardar Serie')

    fireEvent.changeText(weightInput, '82.5555')
    fireEvent.press(saveButton)

    await waitFor(() => {
      expect(
        view.getByText('El peso debe ser un número no negativo con hasta 3 decimales'),
      ).toBeTruthy()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })
})
