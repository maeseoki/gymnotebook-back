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

describe('EditHistorySetForm Distance tests', () => {
  it('distance accepts only integer meters', async () => {
    const mockOnSubmit = jest.fn()
    const mockOnClose = jest.fn()

    const view = await render(
      <EditHistorySetForm
        visible={true}
        exerciseType="DISTANCE"
        exerciseName="Running"
        initialValues={{
          reps: 0,
          weight: 0,
          time: 0,
          distance: 100,
          notes: '',
          isDropSet: false,
        }}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />,
    )

    const distanceInput = await view.findByLabelText('Input Distancia')
    const saveButton = await view.findByLabelText('Boton Guardar Serie')
    expect(distanceInput.props.value).toBe('100')

    // Try a decimal
    fireEvent.changeText(distanceInput, '100.5')
    fireEvent.press(saveButton)

    await waitFor(() => {
      expect(view.getByText('La distancia debe ser un número entero no negativo')).toBeTruthy()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    // Now valid integer
    fireEvent.changeText(distanceInput, '105')
    fireEvent.press(saveButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          distance: 105,
        }),
      )
    })
  })
})
