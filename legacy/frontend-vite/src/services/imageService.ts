import { apiClient } from '../utils/apiClient'

export const getImage = async (id: number): Promise<Blob> => {
  const response = await apiClient.get(`image/${id}`, {
    responseType: 'blob'
  })
  return response.data
}

export const getImageAsUrl = async (id: number): Promise<string> => {
  try {
    const image = await getImage(id)
    return URL.createObjectURL(image)
  } catch (error) {
    return ''
  }
}

export const uploadImage = async (image: Blob): Promise<number> => {
  const formData = new FormData()
  formData.append('image', image)
  const response = await apiClient.post('image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}
