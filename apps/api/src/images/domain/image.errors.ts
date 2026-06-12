export class ImageApplicationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ImageApplicationError'
  }
}

export class ImageNotFoundError extends ImageApplicationError {
  constructor() {
    super(404, 'image_not_found', 'Image not found')
    this.name = 'ImageNotFoundError'
  }
}

export class ImageMissingError extends ImageApplicationError {
  constructor() {
    super(400, 'image_missing', 'Image upload is required')
    this.name = 'ImageMissingError'
  }
}

export class ImageUnexpectedFieldError extends ImageApplicationError {
  constructor() {
    super(400, 'image_unexpected_field', 'Unexpected image upload field')
    this.name = 'ImageUnexpectedFieldError'
  }
}

export class ImageEmptyError extends ImageApplicationError {
  constructor() {
    super(400, 'image_empty', 'Image file is empty')
    this.name = 'ImageEmptyError'
  }
}

export class ImageUnsupportedTypeError extends ImageApplicationError {
  constructor() {
    super(415, 'image_unsupported_type', 'Image type is not supported')
    this.name = 'ImageUnsupportedTypeError'
  }
}

export class ImageTypeMismatchError extends ImageApplicationError {
  constructor() {
    super(415, 'image_type_mismatch', 'Declared image type does not match file content')
    this.name = 'ImageTypeMismatchError'
  }
}

export class ImageInUseError extends ImageApplicationError {
  constructor() {
    super(409, 'image_in_use', 'Image is referenced by an exercise')
    this.name = 'ImageInUseError'
  }
}
