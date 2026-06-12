import type { ImageUploadResponse } from '@gymnotebook/contracts'
import type { ImageUploadResult } from '../domain/image.js'

export function toImageUploadResponse(result: ImageUploadResult): ImageUploadResponse {
  return { id: result.id }
}
