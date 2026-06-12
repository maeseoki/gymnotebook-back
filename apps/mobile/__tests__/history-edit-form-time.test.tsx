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

describe('EditHistorySetForm Time tests', () => {
  it('time min/sec maps to seconds', async () => {
    const mockOnSubmit = jest.fn()
    const mockOnClose = jest.fn()

    const view = await render(
      <EditHistorySetForm
        visible={true}
        exerciseType="TIME"
        exerciseName="Plank"
        initialValues={{
          reps: 0,
          weight: 0,
          time: 90, // 1 min 30 sec
          distance: 0,
          notes: '',
          isDropSet: false,
        }}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />,
    )

    const minutesInput = await view.findByLabelText('Input Minutos')
    const secondsInput = await view.findByLabelText('Input Segundos')
    const saveButton = await view.findByLabelText('Boton Guardar Serie')

    expect(minutesInput.props.value).toBe('1')
    expect(secondsInput.props.value).toBe('30')

    // Change to 2 min 45 sec (165 seconds)
    fireEvent.changeText(minutesInput, '2')
    fireEvent.changeText(secondsInput, '45')
    fireEvent.press(saveButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          time: 165,
        }),
      )
    })
  })
})
