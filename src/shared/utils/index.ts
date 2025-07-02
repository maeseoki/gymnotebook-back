import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSuccessResponse<T>(data?: T, message?: string) {
  return {
    success: true,
    data,
    message,
  };
}

export function createErrorResponse(message: string, errors?: string[]) {
  return {
    success: false,
    message,
    errors,
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  }
) {
  return {
    success: true,
    data,
    pagination: {
      ...pagination,
      pages: Math.ceil(pagination.total / pagination.limit),
    },
  };
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

export function omitFields<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  fields: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const field of fields) {
    delete result[field];
  }
  return result;
}
