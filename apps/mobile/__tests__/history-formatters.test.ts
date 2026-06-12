import {
  formatDate,
  formatDateTime,
  formatDistance,
  formatLocalDateKey,
  formatSetValues,
  formatTime,
  formatTimeRange,
  formatWeight,
  parseHistoryDate,
} from '../src/features/history/utils/history-formatters';

describe('History Unit Formatters', () => {
  describe('formatWeight', () => {
    it('formats grams to kg without silent rounding', () => {
      expect(formatWeight(82500)).toBe('82.5 kg');
      expect(formatWeight(80000)).toBe('80 kg');
      expect(formatWeight(80234)).toBe('80.234 kg');
    });

    it('returns empty string for zero, null, or undefined', () => {
      expect(formatWeight(0)).toBe('');
      expect(formatWeight(null)).toBe('');
      expect(formatWeight(undefined)).toBe('');
    });
  });

  describe('formatTime', () => {
    it('formats seconds to human-readable format', () => {
      expect(formatTime(90)).toBe('1m 30s');
      expect(formatTime(45)).toBe('45s');
      expect(formatTime(120)).toBe('2m');
      expect(formatTime(3600)).toBe('60m');
    });

    it('returns empty string for zero, null, or undefined', () => {
      expect(formatTime(0)).toBe('');
      expect(formatTime(null)).toBe('');
      expect(formatTime(undefined)).toBe('');
    });
  });

  describe('formatDistance', () => {
    it('formats meters to distance display', () => {
      expect(formatDistance(2000)).toBe('2000 m');
      expect(formatDistance(50)).toBe('50 m');
    });

    it('returns empty string for zero, null, or undefined', () => {
      expect(formatDistance(0)).toBe('');
      expect(formatDistance(null)).toBe('');
      expect(formatDistance(undefined)).toBe('');
    });
  });

  describe('formatDate', () => {
    it('formats date to localized Spanish format', () => {
      const dateStr = '2026-06-12T10:00:00Z';
      const formatted = formatDate(dateStr);
      expect(formatted).toContain('de');
      expect(formatted).toContain('2026');
    });

    it('returns empty string for invalid dates', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate('invalid-date')).toBe('');
      expect(formatDate(null)).toBe('');
    });
  });

  describe('formatDateTime', () => {
    it('formats date and time to localized Spanish format', () => {
      const dateStr = '2026-06-12T10:30:00Z';
      const formatted = formatDateTime(dateStr);
      expect(formatted).toContain('de');
      expect(formatted).toContain('2026');
    });

    it('returns empty string for invalid dates', () => {
      expect(formatDateTime('')).toBe('');
      expect(formatDateTime('invalid-date')).toBe('');
      expect(formatDateTime(null)).toBe('');
    });
  });

  describe('formatTimeRange', () => {
    it('formats start and end times to localized time range', () => {
      const start = '2026-06-12T10:30:00Z';
      const end = '2026-06-12T11:45:00Z';
      const formatted = formatTimeRange(start, end);
      expect(formatted).toContain('De');
      expect(formatted).toContain('a');
    });

    it('returns empty string for invalid time inputs', () => {
      expect(formatTimeRange('invalid', 'invalid')).toBe('');
    });
  });

  describe('formatSetValues', () => {
    it('formats sets according to exercise type', () => {
      expect(formatSetValues({ weight: 82500, reps: 10 }, 'WEIGHT_REPS')).toBe('82.5 kg x 10 reps');
      expect(formatSetValues({ weight: 0, reps: 10 }, 'WEIGHT_REPS')).toBe('10 reps');
      expect(formatSetValues({ weight: 80000 }, 'WEIGHT')).toBe('80 kg');
      expect(formatSetValues({ weight: 0 }, 'WEIGHT')).toBe('0 kg');
      expect(formatSetValues({ reps: 15 }, 'REPS')).toBe('15 reps');
      expect(formatSetValues({ time: 90 }, 'TIME')).toBe('1m 30s');
      expect(formatSetValues({ distance: 2000 }, 'DISTANCE')).toBe('2000 m');
      expect(formatSetValues({ time: 90, distance: 2000 }, 'TIME_DISTANCE')).toBe(
        '1m 30s | 2000 m',
      );
    });
  });

  describe('parseHistoryDate', () => {
    it('successfully parses ISO strings', () => {
      const date = parseHistoryDate('2026-06-12T10:30:00Z');
      expect(date).toBeInstanceOf(Date);
      expect(date?.toISOString()).toBe('2026-06-12T10:30:00.000Z');
    });

    it('successfully parses MySQL-like datetimes', () => {
      const date = parseHistoryDate('2026-06-12 10:30:00Z');
      expect(date).toBeInstanceOf(Date);
      expect(date?.toISOString()).toBe('2026-06-12T10:30:00.000Z');
    });

    it('returns null for invalid strings or empty values', () => {
      expect(parseHistoryDate(null)).toBeNull();
      expect(parseHistoryDate(undefined)).toBeNull();
      expect(parseHistoryDate('')).toBeNull();
      expect(parseHistoryDate('invalid-date')).toBeNull();
    });
  });

  describe('formatLocalDateKey', () => {
    it('formats ISO string to YYYY-MM-DD local key', () => {
      const key = formatLocalDateKey('2026-06-12T10:30:00Z');
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('formats MySQL-like string to YYYY-MM-DD local key', () => {
      const key = formatLocalDateKey('2026-06-12 10:30:00Z');
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns empty string for invalid inputs', () => {
      expect(formatLocalDateKey(null)).toBe('');
      expect(formatLocalDateKey('invalid')).toBe('');
    });
  });
});
