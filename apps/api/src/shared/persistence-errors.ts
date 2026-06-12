interface MySqlErrorShape {
  code?: unknown
  errno?: unknown
  sqlMessage?: unknown
  message?: unknown
  cause?: unknown
}

export function isUniqueConstraintError(error: unknown, markers: readonly string[]): boolean {
  const mysqlError = findMySqlError(error, (candidate) => {
    return candidate.code === 'ER_DUP_ENTRY' || candidate.errno === 1062
  })
  if (!mysqlError) {
    return false
  }

  const codeMatches = mysqlError.code === 'ER_DUP_ENTRY' || mysqlError.errno === 1062
  if (!codeMatches) {
    return false
  }

  const text = `${stringValue(mysqlError.sqlMessage)} ${stringValue(mysqlError.message)}`
  return markers.some((marker) => text.includes(marker))
}

export function isForeignKeyConstraintError(error: unknown, markers: readonly string[]): boolean {
  const mysqlError = findMySqlError(error, (candidate) => {
    return (
      candidate.code === 'ER_ROW_IS_REFERENCED_2' ||
      candidate.code === 'ER_NO_REFERENCED_ROW_2' ||
      candidate.errno === 1451 ||
      candidate.errno === 1452
    )
  })
  if (!mysqlError) {
    return false
  }

  const text = `${stringValue(mysqlError.sqlMessage)} ${stringValue(mysqlError.message)}`
  return markers.some((marker) => text.includes(marker))
}

function findMySqlError(
  error: unknown,
  predicate: (candidate: MySqlErrorShape) => boolean,
): MySqlErrorShape | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined
  }
  const candidate = error as MySqlErrorShape
  if (predicate(candidate)) {
    return candidate
  }
  return findMySqlError(candidate.cause, predicate)
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
