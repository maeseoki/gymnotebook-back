import { notifyManager, onlineManager, QueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { type ApiFailure, normalizeApiError } from '@/shared/api/errors'
import type { NetworkProvider } from '@/shared/network/network-state'

export const queryKeys = {
  mobile: ['mobile'] as const,
  auth: ['mobile', 'auth'] as const,
  exercises: {
    all: ['mobile', 'exercises'] as const,
    list: ['mobile', 'exercises', 'list'] as const,
    detail: (id: number) => ['mobile', 'exercises', 'detail', id] as const,
  },
  workouts: {
    all: ['mobile', 'workouts'] as const,
    history: (year: number, month: number) =>
      ['mobile', 'workouts', 'history', year, month] as const,
    detail: (date: string) => ['mobile', 'workouts', 'detail', date] as const,
    exerciseHistory: (exerciseId: number) =>
      ['mobile', 'workouts', 'exerciseHistory', exerciseId] as const,
  },
}

export function createMobileQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetryQueryFailure,
        refetchOnWindowFocus: false,
        networkMode: 'online',
      },
      mutations: {
        retry: false,
        networkMode: 'online',
      },
    },
  })
}

export function shouldRetryQueryFailure(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) {
    return false
  }

  return isTransientApiFailure(toApiFailure(error))
}

function toApiFailure(error: unknown): ApiFailure {
  const parsed = ApiFailureSchema.safeParse(error)
  if (parsed.success) {
    return parsed.data
  }

  return normalizeApiError(error)
}

const ApiFailureSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('backend'),
    status: z.number().int(),
    code: z.string(),
    message: z.string(),
  }),
  z.strictObject({ kind: z.literal('validation'), message: z.string() }),
  z.strictObject({ kind: z.literal('network_unavailable'), message: z.string() }),
  z.strictObject({ kind: z.literal('timeout'), message: z.string() }),
  z.strictObject({ kind: z.literal('unknown'), message: z.string() }),
])

export function isTransientApiFailure(failure: ApiFailure): boolean {
  if (failure.kind === 'network_unavailable' || failure.kind === 'timeout') {
    return true
  }

  return failure.kind === 'backend' && failure.status >= 500 && failure.status <= 599
}

export function createTestQueryClient(): QueryClient {
  notifyManager.setScheduler((cb) => cb())
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always', gcTime: Infinity },
      mutations: { retry: false, networkMode: 'always', gcTime: Infinity },
    },
  })
}

export function installNetworkOnlineManager(provider: NetworkProvider): () => void {
  let cancelled = false
  const update = (state: Awaited<ReturnType<NetworkProvider['getState']>>) => {
    if (!cancelled) {
      onlineManager.setOnline(state.availability !== 'offline')
    }
  }
  void provider.getState().then(update)
  const unsubscribe = provider.subscribe?.(update)

  return () => {
    cancelled = true
    unsubscribe?.()
  }
}
