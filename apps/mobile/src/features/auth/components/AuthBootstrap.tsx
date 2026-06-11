import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { authService } from '@/features/auth/application/auth-service';

let bootstrapStarted = false;

export function AuthBootstrap({ children }: { children: ReactNode }): ReactNode {
  useEffect(() => {
    if (bootstrapStarted) {
      return;
    }

    bootstrapStarted = true;
    void authService.restoreSession().catch(() => {
      // The auth store is moved to reauthentication_required by the service for recoverable
      // restoration failures. UI routing handles that state.
    });
  }, []);

  return children;
}

export function resetAuthBootstrapForTests(): void {
  bootstrapStarted = false;
}
