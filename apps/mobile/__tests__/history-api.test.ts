import { AxiosError } from 'axios';
import { HistoryApiError, historyApi } from '../src/features/history/api/history-api';

jest.mock('@/features/auth/api/mobile-auth-api', () => {
  return {
    mobileApiClient: {
      get: jest.fn(),
    },
  };
});

import { mobileApiClient } from '@/features/auth/api/mobile-auth-api';

const mockGet = mobileApiClient.get as jest.Mock;

describe('History API wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWorkoutDays', () => {
    it('successfully fetches workout days', async () => {
      mockGet.mockResolvedValue({ data: [1, 5, 20] });
      const days = await historyApi.getWorkoutDays(6, 2026, 'Europe/Madrid');
      expect(days).toEqual([1, 5, 20]);
      expect(mockGet).toHaveBeenCalledWith('/workout/days/6/2026', {
        params: { timezone: 'Europe/Madrid' },
      });
    });

    it('handles network error by throwing HistoryApiError', async () => {
      mockGet.mockRejectedValue(new AxiosError('Network Error'));
      await expect(historyApi.getWorkoutDays(6, 2026)).rejects.toThrow(HistoryApiError);
    });
  });

  describe('getWorkoutsByDate', () => {
    it('successfully fetches workouts by date', async () => {
      const mockWorkouts = [
        {
          id: 1,
          uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          startDate: '2026-06-12T10:00:00Z',
          endDate: '2026-06-12T11:00:00Z',
          notes: 'Test note',
          workoutSets: [],
        },
      ];
      mockGet.mockResolvedValue({ data: mockWorkouts });
      const workouts = await historyApi.getWorkoutsByDate('2026-06-12', 'Europe/Madrid');
      expect(workouts).toEqual(mockWorkouts);
      expect(mockGet).toHaveBeenCalledWith('/workout/workouts/2026-06-12', {
        params: { timezone: 'Europe/Madrid' },
      });
    });

    it('handles validation error by throwing HistoryApiError', async () => {
      // Missing mandatory fields fails Zod parsing
      mockGet.mockResolvedValue({ data: [{ invalidField: true }] });
      await expect(historyApi.getWorkoutsByDate('2026-06-12')).rejects.toThrow(HistoryApiError);
    });
  });
});
