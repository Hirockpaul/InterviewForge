import api from '../../../services/api'

export const getProgress = async () => {
    const response = await api.get('/api/progress')
    return response.data
}
