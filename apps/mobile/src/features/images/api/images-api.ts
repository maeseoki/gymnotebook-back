import { type ImageUploadResponse, ImageUploadResponseSchema } from '@gymnotebook/contracts'
import { mobileApiClient } from '@/features/auth/api/mobile-auth-api'
import { type ApiFailure, normalizeApiError } from '@/shared/api/errors'
import { mobileEnv } from '@/shared/config/env'

export class ImagesApiError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(failure.message)
    this.name = 'ImagesApiError'
  }
}

export const imagesApi = {
  async upload(uri: string, filename?: string, mimeType?: string): Promise<ImageUploadResponse> {
    try {
      const formData = new FormData()

      const resolvedName = filename || uri.split('/').pop() || 'photo.jpg'

      let resolvedType = mimeType
      if (!resolvedType) {
        const ext = resolvedName.split('.').pop()?.toLowerCase()
        if (ext === 'png') {
          resolvedType = 'image/png'
        } else if (ext === 'webp') {
          resolvedType = 'image/webp'
        } else {
          resolvedType = 'image/jpeg'
        }
      }

      interface ReactNativeFile {
        uri: string
        name: string
        type: string
      }

      const file: ReactNativeFile = {
        uri,
        name: resolvedName,
        type: resolvedType,
      }

      formData.append('image', file as unknown as Blob)

      const response = await mobileApiClient.post('/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      return ImageUploadResponseSchema.parse(response.data)
    } catch (error) {
      throw new ImagesApiError(normalizeApiError(error))
    }
  },

  async delete(id: number): Promise<void> {
    try {
      await mobileApiClient.delete(`/image/${id}`)
    } catch (error) {
      throw new ImagesApiError(normalizeApiError(error))
    }
  },
}

export function getPublicImageUri(id: number): string {
  return `${mobileEnv.apiUrl}/image/${id}`
}
