export interface AccessTokenMemory {
  get: () => string | null
  set: (token: string) => void
  clear: () => void
}

export function createAccessTokenMemory(): AccessTokenMemory {
  let token: string | null = null
  return {
    get: () => token,
    set: (nextToken) => {
      token = nextToken
    },
    clear: () => {
      token = null
    },
  }
}
