import { LoginRequest, LoginResponse, SignUpRequest, SignUpResponse, VerifyUserRequest, VerifyUserResponse, LogoutResponse } from '../types'
import { apiClient } from '../utils/apiClient'

export const loginUser = async (loginRequest: LoginRequest): Promise<LoginResponse> => {
  const { username, password } = loginRequest
  const response = await apiClient.post('auth/signin', {
    username,
    password
  }, {
    params: {
      _noAuthRedirect: true // Evitamos que se redirija a la página de login si la petición falla.
    }
  })
  return response.data
}

export const signUpUser = async (singUpRequest: SignUpRequest): Promise<SignUpResponse> => {
  const { username, email, password } = singUpRequest
  const response = await apiClient.post('auth/signup', {
    username,
    email,
    password
  })
  return response.data
}

export const verifyUser = async (verifyUserRequest: VerifyUserRequest): Promise<VerifyUserResponse> => {
  const { username, email } = verifyUserRequest
  const response = await apiClient.get(`auth/verifyuser/${username}/${email}`)
  return response.data
}

export const logoutUser = async (): Promise<LogoutResponse> => {
  const response = await apiClient.get('auth/logout')
  return response.data
}
