import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.get<T>(url, config)
  return response.data
}

export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.post<T>(url, data, config)
  return response.data
}

export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.put<T>(url, data, config)
  return response.data
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.delete<T>(url, config)
  return response.data
}
