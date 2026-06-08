import { Temporal } from '@js-temporal/polyfill';
import { InvalidTimezoneError } from './workout.errors.js';

export interface UtcRange {
  start: string;
  end: string;
}

export function isoInstantToMysqlUtc(value: string): string {
  return instantToMysqlUtc(Temporal.Instant.from(value));
}

export function mysqlUtcToIsoInstant(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  return Temporal.Instant.from(`${value.replace(' ', 'T')}Z`).toString({ smallestUnit: 'second' });
}

export function compareIsoInstants(left: string, right: string): number {
  return Temporal.Instant.compare(Temporal.Instant.from(left), Temporal.Instant.from(right));
}

export function calendarDateUtcRange(date: string, timezone: string): UtcRange {
  const plainDate = Temporal.PlainDate.from(date);
  return plainDateRangeToUtcRange(plainDate, plainDate.add({ days: 1 }), timezone);
}

export function calendarMonthUtcRange(year: number, month: number, timezone: string): UtcRange {
  const start = new Temporal.PlainDate(year, month, 1);
  return plainDateRangeToUtcRange(start, start.add({ months: 1 }), timezone);
}

export function mysqlUtcDayOfMonth(value: string, timezone: string): number {
  return Temporal.Instant.from(`${value.replace(' ', 'T')}Z`).toZonedDateTimeISO(timezone).day;
}

export function assertValidTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch {
    throw new InvalidTimezoneError();
  }
}

function plainDateRangeToUtcRange(
  startDate: Temporal.PlainDate,
  endDate: Temporal.PlainDate,
  timezone: string,
): UtcRange {
  assertValidTimezone(timezone);
  const plainTime = Temporal.PlainTime.from('00:00');
  const start = startDate.toZonedDateTime({ timeZone: timezone, plainTime }).toInstant();
  const end = endDate.toZonedDateTime({ timeZone: timezone, plainTime }).toInstant();
  return {
    start: instantToMysqlUtc(start),
    end: instantToMysqlUtc(end),
  };
}

function instantToMysqlUtc(instant: Temporal.Instant): string {
  const utc = instant.toZonedDateTimeISO('UTC');
  return `${utc.year.toString().padStart(4, '0')}-${utc.month
    .toString()
    .padStart(2, '0')}-${utc.day.toString().padStart(2, '0')} ${utc.hour
    .toString()
    .padStart(2, '0')}:${utc.minute.toString().padStart(2, '0')}:${utc.second
    .toString()
    .padStart(2, '0')}`;
}
