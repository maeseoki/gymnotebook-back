import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  headers: {
    'Content-type': 'application/json'
  }
})

// Interceptamos todas las peticiones para añadir el token de autenticación.
// Si la petición tiene la cabecera noAuth a true, no se añade el token.
apiClient.interceptors.request.use(config => {
  if (config.headers.noAuth !== true) {
    const token = localStorage.getItem('token')

    if (token !== null) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  delete config.headers.noAuth
  return config
}, async error => {
  return await Promise.reject(error)
})

// Interceptamos todas las respuestas para comprobar si el token ha expirado o la petición no está autorizada.
// En ese caso, eliminamos el token del localStorage y redirigimos a la página de login.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.config?.params?._noAuthRedirect === true) {
      return await Promise.reject(error)
    }

    if (error.response.status === 401 || error.response.status === 403) {
      console.warn('Acceso no autorizado')
      if (localStorage.getItem('token') !== null) {
        localStorage.removeItem('token')
      }

      window.location.href = '/login'
    }
    return await Promise.reject(error)
  }
)
