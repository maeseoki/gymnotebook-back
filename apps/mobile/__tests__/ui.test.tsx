import { fireEvent, render } from '@testing-library/react-native'
import { Button, Card, EmptyState, ErrorState, TextInput } from '@/shared/ui/primitives'

describe('UI primitives', () => {
  it('supports button accessibility, disabled and loading states', async () => {
    const onPress = jest.fn()
    const view = await render(<Button label="Save" loading onPress={onPress} />)

    const button = view.getByRole('button', { name: 'Save' })
    expect(button.props.accessibilityState).toMatchObject({ disabled: true, busy: true })
    fireEvent.press(button)
    expect(onPress).not.toHaveBeenCalled()
  })

  it('renders foundational primitives', async () => {
    const view = await render(
      <Card>
        <TextInput accessibilityLabel="Name" />
        <EmptyState title="Nothing here" />
        <ErrorState title="Something failed" />
      </Card>,
    )

    expect(view.getByLabelText('Name')).toBeTruthy()
    expect(view.getByText('Nothing here')).toBeTruthy()
    expect(view.getByText('Something failed')).toBeTruthy()
  })
})
