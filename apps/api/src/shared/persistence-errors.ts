interface MySqlErrorShape {
  code?: unknown;
  errno?: unknown;
  sqlMessage?: unknown;
  message?: unknown;
  cause?: unknown;
}

export function isUniqueConstraintError(error: unknown, markers: readonly string[]): boolean {
  const mysqlError = findMySqlError(error);
  if (!mysqlError) {
    return false;
  }

  const codeMatches = mysqlError.code === 'ER_DUP_ENTRY' || mysqlError.errno === 1062;
  if (!codeMatches) {
    return false;
  }

  const text = `${stringValue(mysqlError.sqlMessage)} ${stringValue(mysqlError.message)}`;
  return markers.some((marker) => text.includes(marker));
}

function findMySqlError(error: unknown): MySqlErrorShape | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const candidate = error as MySqlErrorShape;
  if (candidate.code === 'ER_DUP_ENTRY' || candidate.errno === 1062) {
    return candidate;
  }
  return findMySqlError(candidate.cause);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
