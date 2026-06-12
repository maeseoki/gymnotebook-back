export interface Clock {
  now(): Date
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}

export function addMilliseconds(date: Date, milliseconds: number): Date {
  return new Date(date.getTime() + milliseconds)
}

export function toMysqlUtc(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

export function mysqlUtcToIso(value: string): string {
  return `${value.replace(' ', 'T')}Z`
}

export function isMysqlUtcExpired(expiresAt: string, now: string): boolean {
  return expiresAt <= now
}

export function millisecondsBetweenMysqlUtc(earlier: string, later: string): number {
  return Date.parse(mysqlUtcToIso(later)) - Date.parse(mysqlUtcToIso(earlier))
}
