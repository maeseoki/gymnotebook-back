import { act, render } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';
import { AuthenticatedRouteGuard, PublicRouteGuard } from '@/features/auth/components/AuthGate';
import { useAuthSessionStore } from '@/shared/auth/session-store';
import HomeScreen from '../app/(authenticated)/(tabs)';

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text>Redirect:{href}</Text>;
  },
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

describe('route skeleton', () => {
  beforeEach(() => {
    useAuthSessionStore.getState().setRestoring();
  });

  it('renders a representative authenticated route placeholder', async () => {
    useAuthSessionStore.getState().setAuthenticated({
      accessTokenExpiresAt: '2026-06-10T10:00:00.000Z',
      user: { id: 1, username: 'victor', email: 'victor@example.test', roles: ['ROLE_USER'] },
    });
    const authenticatedView = await render(<HomeScreen />);
    expect(authenticatedView.getByText('Home foundation placeholder.')).toBeTruthy();
  });

  it('protects authenticated routes by auth status', async () => {
    const restoring = await render(
      <AuthenticatedRouteGuard>
        <RNText>Protected</RNText>
      </AuthenticatedRouteGuard>,
    );
    expect(restoring.getByLabelText('Restoring session')).toBeTruthy();

    await act(async () => {
      useAuthSessionStore.getState().setUnauthenticated();
      await restoring.rerender(
        <AuthenticatedRouteGuard>
          <RNText>Protected</RNText>
        </AuthenticatedRouteGuard>,
      );
    });
    expect(restoring.getByText('Redirect:/(public)/login')).toBeTruthy();

    await act(async () => {
      useAuthSessionStore.getState().setAuthenticated({
        accessTokenExpiresAt: '2026-06-10T10:00:00.000Z',
        user: { id: 1, username: 'victor', email: 'victor@example.test', roles: ['ROLE_USER'] },
      });
      await restoring.rerender(
        <AuthenticatedRouteGuard>
          <RNText>Protected</RNText>
        </AuthenticatedRouteGuard>,
      );
    });
    expect(restoring.getByText('Protected')).toBeTruthy();
  });

  it('redirects authenticated users away from public routes', async () => {
    await act(async () => {
      useAuthSessionStore.getState().setAuthenticated({
        accessTokenExpiresAt: '2026-06-10T10:00:00.000Z',
        user: { id: 1, username: 'victor', email: 'victor@example.test', roles: ['ROLE_USER'] },
      });
    });

    const view = await render(
      <PublicRouteGuard>
        <RNText>Public</RNText>
      </PublicRouteGuard>,
    );

    expect(view.getByText('Redirect:/(authenticated)/(tabs)')).toBeTruthy();
  });
});
