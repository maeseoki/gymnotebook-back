import { useMutation } from '@tanstack/react-query'
import { imagesApi } from '../api/images-api'

interface UploadImageParams {
  uri: string
  filename?: string
  mimeType?: string
}

export function useUploadImage() {
  return useMutation({
    mutationFn: ({ uri, filename, mimeType }: UploadImageParams) =>
      imagesApi.upload(uri, filename, mimeType),
  })
}
