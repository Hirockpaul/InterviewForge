import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    withCredentials: true
})

let refreshRequest = null

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const request = error.config
        const isUnauthorized = error.response?.status === 401
        const isRefreshRequest = request?.url?.includes('/api/auth/refresh')
        const isLoginRequest = /\/api\/auth\/(login|register|google)/.test(request?.url || '')

        if (!isUnauthorized || !request || request._retry || isRefreshRequest || isLoginRequest) {
            return Promise.reject(error)
        }

        request._retry = true

        try {
            if (!refreshRequest) {
                refreshRequest = api.post('/api/auth/refresh').finally(() => {
                    refreshRequest = null
                })
            }

            await refreshRequest
            return api(request)
        } catch (refreshError) {
            return Promise.reject(refreshError)
        }
    }
)

export default api
