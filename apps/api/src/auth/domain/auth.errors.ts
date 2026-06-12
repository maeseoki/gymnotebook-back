export class AuthApplicationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AuthApplicationError'
  }
}

export class InvalidCredentialsError extends AuthApplicationError {
  constructor() {
    super(401, 'invalid_credentials', 'Invalid username or password')
    this.name = 'InvalidCredentialsError'
  }
}

export class UsernameAlreadyExistsError extends AuthApplicationError {
  constructor() {
    super(409, 'username_already_exists', 'Username is already in use')
    this.name = 'UsernameAlreadyExistsError'
  }
}

export class EmailAlreadyExistsError extends AuthApplicationError {
  constructor() {
    super(409, 'email_already_exists', 'Email is already in use')
    this.name = 'EmailAlreadyExistsError'
  }
}

export class DefaultRoleNotFoundError extends AuthApplicationError {
  constructor() {
    super(404, 'role_not_found', 'Default user role was not found')
    this.name = 'DefaultRoleNotFoundError'
  }
}
