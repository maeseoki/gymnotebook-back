import { CreateWorkoutRequestSchema } from '@gymnotebook/contracts';
import { mobileApiClient } from '@/features/auth/api/mobile-auth-api';
import { type ApiFailure, normalizeApiError } from '@/shared/api/errors';
import type { ActiveWorkoutDraft } from '../schemas/active-workout-draft';
import { mapDraftToCreateRequest } from '../utils/workout-draft';

export class WorkoutsApiError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(failure.message);
    this.name = 'WorkoutsApiError';
  }
}

export const workoutsApi = {
  async save(draft: ActiveWorkoutDraft): Promise<void> {
    try {
      const payload = mapDraftToCreateRequest(draft);
      CreateWorkoutRequestSchema.parse(payload);
      await mobileApiClient.post('/workout', payload);
    } catch (error) {
      throw new WorkoutsApiError(normalizeApiError(error));
    }
  },
};
