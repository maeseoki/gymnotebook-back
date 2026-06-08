export class UserApplicationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'UserApplicationError';
  }
}

export class UserNotFoundError extends UserApplicationError {
  constructor() {
    super(404, 'user_not_found', 'User not found');
    this.name = 'UserNotFoundError';
  }
}

export class UsernameAlreadyExistsError extends UserApplicationError {
  constructor() {
    super(409, 'username_already_exists', 'Username is already in use');
    this.name = 'UsernameAlreadyExistsError';
  }
}

export class EmailAlreadyExistsError extends UserApplicationError {
  constructor() {
    super(409, 'email_already_exists', 'Email is already in use');
    this.name = 'EmailAlreadyExistsError';
  }
}

export class RoleNotFoundError extends UserApplicationError {
  constructor() {
    super(404, 'role_not_found', 'Role not found');
    this.name = 'RoleNotFoundError';
  }
}

export class RoleAlreadyAssignedError extends UserApplicationError {
  constructor() {
    super(409, 'role_already_assigned', 'Role is already assigned to user');
    this.name = 'RoleAlreadyAssignedError';
  }
}

export class RoleNotAssignedError extends UserApplicationError {
  constructor() {
    super(409, 'role_not_assigned', 'Role is not assigned to user');
    this.name = 'RoleNotAssignedError';
  }
}

export class InvalidRoleChangeError extends UserApplicationError {
  constructor() {
    super(400, 'invalid_role_change', 'Requested role change is not allowed');
    this.name = 'InvalidRoleChangeError';
  }
}

export class CannotDeleteSelfError extends UserApplicationError {
  constructor() {
    super(403, 'cannot_delete_self', 'Administrators cannot delete themselves');
    this.name = 'CannotDeleteSelfError';
  }
}

export class CannotDeleteLastAdminError extends UserApplicationError {
  constructor() {
    super(409, 'cannot_delete_last_admin', 'Cannot delete the final administrator');
    this.name = 'CannotDeleteLastAdminError';
  }
}
