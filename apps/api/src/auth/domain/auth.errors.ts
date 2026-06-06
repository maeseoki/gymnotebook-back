export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid credentials');
    this.name = 'InvalidCredentialsError';
  }
}

export class DuplicateUsernameError extends Error {
  constructor() {
    super('¡El nombre de usuario ya está en uso!');
    this.name = 'DuplicateUsernameError';
  }
}

export class DuplicateEmailError extends Error {
  constructor() {
    super('¡El email ya está en uso!');
    this.name = 'DuplicateEmailError';
  }
}
