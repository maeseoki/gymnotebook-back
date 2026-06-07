import type { CreateExerciseRequest, EExerciseType, EMuscleGroup } from '@gymnotebook/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { createExercise } from '../src/exercises/application/create-exercise.js';
import { deleteExercise } from '../src/exercises/application/delete-exercise.js';
import { getExercise } from '../src/exercises/application/get-exercise.js';
import { listExercises } from '../src/exercises/application/list-exercises.js';
import { updateExercise } from '../src/exercises/application/update-exercise.js';
import {
  ExerciseInUseError,
  ExerciseNotFoundError,
  ImageNotAvailableError,
} from '../src/exercises/domain/exercise.errors.js';
import type { Exercise, ExerciseDraft, ExerciseUpdate } from '../src/exercises/domain/exercise.js';
import type { ExerciseRepository } from '../src/exercises/domain/exercise.repository.js';
import type { ExerciseImageAccess } from '../src/exercises/domain/exercise-image-access.js';

class FakeExerciseRepository implements ExerciseRepository {
  exercises = new Map<number, Exercise>();
  nextId = 1;
  inUseIds = new Set<number>();

  async findById(id: number) {
    return this.exercises.get(id) ?? null;
  }

  async findByIdForUser(id: number, userId: number) {
    const exercise = this.exercises.get(id);
    return exercise?.userId === userId ? exercise : null;
  }

  async listByUser(userId: number) {
    return Array.from(this.exercises.values())
      .filter((exercise) => exercise.userId === userId)
      .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
  }

  async create(input: ExerciseDraft) {
    const exercise = { ...input, id: this.nextId };
    this.nextId += 1;
    this.exercises.set(exercise.id, exercise);
    return exercise;
  }

  async updateForUser(id: number, userId: number, input: ExerciseUpdate) {
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) {
      return null;
    }
    const updated = { ...existing, ...input };
    this.exercises.set(id, updated);
    return updated;
  }

  async deleteForUser(id: number, userId: number) {
    if (this.inUseIds.has(id)) {
      throw new Error('foreign key');
    }
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) {
      return false;
    }
    return this.exercises.delete(id);
  }
}

class FakeImageAccess implements ExerciseImageAccess {
  available = new Set<string>();

  async isImageAvailableForUser(imageId: number, userId: number) {
    return this.available.has(`${userId}:${imageId}`);
  }
}

let exercises: FakeExerciseRepository;
let imageAccess: FakeImageAccess;

beforeEach(() => {
  exercises = new FakeExerciseRepository();
  imageAccess = new FakeImageAccess();
});

function validRequest(overrides: Partial<CreateExerciseRequest> = {}): CreateExerciseRequest {
  return {
    name: 'Bench press',
    description: 'Chest movement',
    imageId: null,
    type: 'WEIGHT_REPS',
    primaryMuscleGroup: 'CHEST',
    secondaryMuscleGroup: 'TRICEPS',
    ...overrides,
  };
}

async function addExercise(userId: number, name = 'Bench press') {
  return exercises.create({
    name,
    description: 'Description',
    imageId: null,
    type: 'WEIGHT_REPS' satisfies EExerciseType,
    primaryMuscleGroup: 'CHEST' satisfies EMuscleGroup,
    secondaryMuscleGroup: 'TRICEPS' satisfies EMuscleGroup,
    userId,
  });
}

describe('exercise use cases', () => {
  it('lists only the current user exercises in deterministic order', async () => {
    await addExercise(1, 'Curl');
    await addExercise(2, 'Bench');
    await addExercise(1, 'Bench');

    await expect(listExercises({ userId: 1 }, exercises)).resolves.toMatchObject([
      { name: 'Bench' },
      { name: 'Curl' },
    ]);
  });

  it('gets owned exercises and hides missing or foreign-owned exercises as not found', async () => {
    const owned = await addExercise(1);
    const foreign = await addExercise(2);

    await expect(getExercise({ id: owned.id, userId: 1 }, exercises)).resolves.toMatchObject({
      id: owned.id,
    });
    await expect(getExercise({ id: 999, userId: 1 }, exercises)).rejects.toBeInstanceOf(
      ExerciseNotFoundError,
    );
    await expect(getExercise({ id: foreign.id, userId: 1 }, exercises)).rejects.toBeInstanceOf(
      ExerciseNotFoundError,
    );
  });

  it('creates exercises without images and normalizes text', async () => {
    const created = await createExercise(
      { ...validRequest({ name: '  Press  ', description: '   ' }), userId: 1 },
      { exercises, imageAccess },
    );

    expect(created).toMatchObject({ name: 'Press', description: null, imageId: null, userId: 1 });
  });

  it('creates with owned images and rejects missing or foreign images', async () => {
    imageAccess.available.add('1:10');

    await expect(
      createExercise({ ...validRequest({ imageId: 10 }), userId: 1 }, { exercises, imageAccess }),
    ).resolves.toMatchObject({ imageId: 10 });
    await expect(
      createExercise({ ...validRequest({ imageId: 99 }), userId: 1 }, { exercises, imageAccess }),
    ).rejects.toBeInstanceOf(ImageNotAvailableError);
    await expect(
      createExercise({ ...validRequest({ imageId: 10 }), userId: 2 }, { exercises, imageAccess }),
    ).rejects.toBeInstanceOf(ImageNotAvailableError);
  });

  it('updates owned exercises and validates image ownership', async () => {
    const owned = await addExercise(1);
    const foreign = await addExercise(2);
    imageAccess.available.add('1:20');

    await expect(
      updateExercise(
        { ...validRequest({ name: '  Updated  ', imageId: 20 }), id: owned.id, userId: 1 },
        { exercises, imageAccess },
      ),
    ).resolves.toMatchObject({ name: 'Updated', imageId: 20 });

    await expect(
      updateExercise({ ...validRequest(), id: foreign.id, userId: 1 }, { exercises, imageAccess }),
    ).rejects.toBeInstanceOf(ExerciseNotFoundError);
    await expect(
      updateExercise(
        { ...validRequest({ imageId: 20 }), id: owned.id, userId: 2 },
        { exercises, imageAccess },
      ),
    ).rejects.toBeInstanceOf(ImageNotAvailableError);
  });

  it('deletes owned exercises and maps missing, foreign, and in-use cases', async () => {
    const owned = await addExercise(1);
    const foreign = await addExercise(2);
    const inUse = await addExercise(1, 'In use');
    exercises.inUseIds.add(inUse.id);

    await expect(
      deleteExercise({ id: owned.id, userId: 1 }, { exercises, isExerciseInUseError: () => false }),
    ).resolves.toBeUndefined();
    await expect(
      deleteExercise({ id: 999, userId: 1 }, { exercises, isExerciseInUseError: () => false }),
    ).rejects.toBeInstanceOf(ExerciseNotFoundError);
    await expect(
      deleteExercise(
        { id: foreign.id, userId: 1 },
        { exercises, isExerciseInUseError: () => false },
      ),
    ).rejects.toBeInstanceOf(ExerciseNotFoundError);
    await expect(
      deleteExercise({ id: inUse.id, userId: 1 }, { exercises, isExerciseInUseError: () => true }),
    ).rejects.toBeInstanceOf(ExerciseInUseError);
  });
});
