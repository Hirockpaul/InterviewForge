import api from '../../../services/api'

export async function runCode(payload) {
    const response = await api.post('/api/coding/run', payload)
    return response.data
}

export async function getCodingTopics() {
    const response = await api.get('/api/coding/topics')
    return response.data
}

export async function getCodingProblems(params = {}) {
    const response = await api.get('/api/coding/problems', { params })
    return response.data
}

export async function getCodingProblem(id) {
    const response = await api.get(`/api/coding/problems/${id}`)
    return response.data
}

export async function generateCodingProblems(payload) {
    const response = await api.post('/api/coding/problems/generate', payload)
    return response.data
}
