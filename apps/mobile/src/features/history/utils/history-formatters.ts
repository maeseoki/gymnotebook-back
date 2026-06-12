import type { EExerciseType } from '@gymnotebook/contracts';

/**
 * Formats weight in grams to a human-readable kg string.
 * Supporting up to 3 decimal places without silent rounding.
 * e.g., 82500 -> '82.5 kg', 80000 -> '80 kg'.
 * Returns empty string if weight is 0, null, or undefined.
 */
export function formatWeight(grams: number | null | undefined): string {
  if (grams === null || grams === undefined || grams === 0) {
    return '';
  }
  const kg = grams / 1000;
  return `${Number(kg.toFixed(3))} kg`;
}

/**
 * Formats time in seconds to minutes and seconds format.
 * e.g., 90 -> '1m 30s', 45 -> '45s'.
 * Returns empty string if time is 0, null, or undefined.
 */
export function formatTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds === 0) {
    return '';
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) {
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${s}s`;
}

/**
 * Formats distance in meters.
 * e.g., 2000 -> '2000 m'.
 * Returns empty string if distance is 0, null, or undefined.
 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || meters === 0) {
    return '';
  }
  return `${meters} m`;
}

/**
 * Safely parses an ISO date string or a MySQL-like datetime string.
 * Returns null for invalid or empty inputs, and does not throw.
 */
export function parseHistoryDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  try {
    let normalized = value.trim();
    if (normalized.includes(' ')) {
      normalized = normalized.replace(' ', 'T');
    }
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

/**
 * Formats a date string to YYYY-MM-DD in the local device timezone.
 * Returns empty string for invalid/null inputs.
 */
export function formatLocalDateKey(value: string | null | undefined): string {
  const dateObj = parseHistoryDate(value);
  if (!dateObj) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a localized date string.
 */
export function formatDate(isoString: string | null | undefined): string {
  const date = parseHistoryDate(isoString);
  if (!date) return '';
  try {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Formats a localized date and time string.
 */
export function formatDateTime(isoString: string | null | undefined): string {
  const date = parseHistoryDate(isoString);
  if (!date) return '';
  try {
    return date.toLocaleString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Formats the values of a single workout set according to the exercise type.
 */
export function formatSetValues(
  set: {
    reps?: number | null;
    weight?: number | null;
    time?: number | null;
    distance?: number | null;
  },
  type: EExerciseType,
): string {
  switch (type) {
    case 'WEIGHT_REPS': {
      const wStr = formatWeight(set.weight);
      const reps = set.reps ?? 0;
      return wStr ? `${wStr} x ${reps} reps` : `${reps} reps`;
    }
    case 'WEIGHT':
      return formatWeight(set.weight) || '0 kg';
    case 'REPS':
      return `${set.reps ?? 0} reps`;
    case 'TIME':
      return formatTime(set.time) || '0s';
    case 'DISTANCE':
      return formatDistance(set.distance) || '0 m';
    case 'TIME_DISTANCE': {
      const tStr = formatTime(set.time);
      const dStr = formatDistance(set.distance);
      if (tStr && dStr) return `${tStr} | ${dStr}`;
      return tStr || dStr || '0s';
    }
    default:
      return '';
  }
}

/**
 * Formats a start and end ISO string into a localized time range.
 * e.g. "De 11:14 a 12:15"
 */
export function formatTimeRange(startIso: string, endIso: string): string {
  const start = parseHistoryDate(startIso);
  const end = parseHistoryDate(endIso);
  if (!start || !end) return '';
  try {
    const formatTimeOption = { hour: '2-digit', minute: '2-digit' } as const;
    return `De ${start.toLocaleTimeString('es-ES', formatTimeOption)} a ${end.toLocaleTimeString('es-ES', formatTimeOption)}`;
  } catch {
    return '';
  }
}
