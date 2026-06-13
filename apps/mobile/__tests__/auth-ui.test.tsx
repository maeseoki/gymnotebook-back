import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { loginFormSchema } from '@/features/auth/schemas/login-form'
import { createSignupFormSchema } from '@/features/auth/schemas/signup-form'
import { useAuthSessionStore } from '@/shared/auth/session-store'
import { createTestQueryClient } from '@/shared/query/client'
import ProfileScreen from '../app/(authenticated)/(tabs)/profile'

const mockLogoutMutate = jest.fn()

jest.mock('@/features/auth/hooks/use-auth-actions', () => ({
  useLogoutAction: () => ({ mutate: mockLogoutMutate, isPending: false }),
}))

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => {
    const { Text } = require('react-native')
    return <Text>{children}</Text>
  },
  router: { replace: jest.fn() },
}))

async function renderWithQuery(ui: ReactNode) {
  return await render(
    <QueryClientProvider client={createTestQueryClient()}>{ui}</QueryClientProvider>,
  )
}

describe('auth UI', () => {
  beforeEach(() => {
    mockLogoutMutate.mockClear()
    useAuthSessionStore.getState().setAuthenticated({
      accessTokenExpiresAt: '2026-06-10T10:00:00.000Z',
      user: {
        id: 1,
        username: 'victor',
        email: 'victor@example.test',
        roles: ['ROLE_USER'],
      },
    })
  })

  it('validates login form input with the shared compatible schema', () => {
    expect(loginFormSchema.safeParse({ username: '', password: '' }).success).toBe(false)
    expect(loginFormSchema.parse({ username: 'victor', password: 'secret' })).toEqual({
      username: 'victor',
      password: 'secret',
    })
  })

  it('validates signup confirm password locally without sending it to the API schema', () => {
    const signupFormSchema = createSignupFormSchema((k) => k)
    expect(
      signupFormSchema.safeParse({
        username: 'victor',
        email: 'victor@example.test',
        password: 'secret1',
        confirmPassword: 'different',
      }).success,
    ).toBe(false)

    expect(
      signupFormSchema.parse({
        username: 'victor',
        email: 'victor@example.test',
        password: 'secret1',
        confirmPassword: 'secret1',
      }),
    ).toMatchObject({ username: 'victor', confirmPassword: 'secret1' })
  })

  it('shows authenticated profile metadata and invokes logout', async () => {
    const view = await renderWithQuery(<ProfileScreen />)

    expect(view.getByText('Usuario: victor')).toBeTruthy()
    expect(view.getByText('Correo electrónico: victor@example.test')).toBeTruthy()
    expect(view.getByText('Roles: ROLE_USER')).toBeTruthy()

    fireEvent.press(view.getByRole('button', { name: 'Cerrar sesión' }))

    await waitFor(() => expect(mockLogoutMutate).toHaveBeenCalledTimes(1))
  })
})
