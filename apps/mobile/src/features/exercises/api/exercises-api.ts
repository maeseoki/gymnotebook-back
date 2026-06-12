import {
  type CreateExerciseRequest,
  CreateExerciseRequestSchema,
  type ExerciseResponse,
  ExerciseResponseSchema,
  type UpdateExerciseRequest,
  UpdateExerciseRequestSchema,
} from '@gymnotebook/contracts';
import { z } from 'zod';
import { mobileApiClient } from '@/features/auth/api/mobile-auth-api';
import { type ApiFailure, normalizeApiError } from '@/shared/api/errors';

export class ExercisesApiError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(failure.message);
    this.name = 'ExercisesApiError';
  }
}

export const exercisesApi = {
  async list(): Promise<ExerciseResponse[]> {
    try {
      const response = await mobileApiClient.get('/exercise');
      return z.array(ExerciseResponseSchema).parse(response.data);
    } catch (error) {
      throw new ExercisesApiError(normalizeApiError(error));
    }
  },

  async get(id: number): Promise<ExerciseResponse> {
    try {
      const response = await mobileApiClient.get(`/exercise/${id}`);
      return ExerciseResponseSchema.parse(response.data);
    } catch (error) {
      throw new ExercisesApiError(normalizeApiError(error));
    }
  },

  async create(input: CreateExerciseRequest): Promise<ExerciseResponse> {
    try {
      const payload = CreateExerciseRequestSchema.parse(input);
      const response = await mobileApiClient.post('/exercise', payload);
      return ExerciseResponseSchema.parse(response.data);
    } catch (error) {
      throw new ExercisesApiError(normalizeApiError(error));
    }
  },

  async update(id: number, input: UpdateExerciseRequest): Promise<ExerciseResponse> {
    try {
      const payload = UpdateExerciseRequestSchema.parse(input);
      const response = await mobileApiClient.put(`/exercise/${id}`, payload);
      return ExerciseResponseSchema.parse(response.data);
    } catch (error) {
      throw new ExercisesApiError(normalizeApiError(error));
    }
  },

  async delete(id: number): Promise<void> {
    try {
      await mobileApiClient.delete(`/exercise/${id}`);
    } catch (error) {
      throw new ExercisesApiError(normalizeApiError(error));
    }
  },
};
