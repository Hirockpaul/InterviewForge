import api from "../../../services/api";

export const createMcqSession = async (payload) =>
  (await api.post("/api/mcq/sessions", payload)).data;
export const getMcqSession = async (id) =>
  (await api.get(`/api/mcq/sessions/${id}`)).data;
export const submitMcqAnswer = async (id, payload) =>
  (await api.post(`/api/mcq/sessions/${id}/answer`, payload)).data;
export const completeMcqSession = async (id) =>
  (await api.post(`/api/mcq/sessions/${id}/complete`)).data;
export const getMcqResult = async (id) =>
  (await api.get(`/api/mcq/sessions/${id}/result`)).data;
export const getMcqHistory = async () =>
  (await api.get("/api/mcq/history")).data;
export const getMcqTopics = async () => (await api.get("/api/mcq/topics")).data;
export const getMcqPoolStatus = async (topic, category) =>
  (await api.get("/api/mcq/pool-status", { params: { topic, category } })).data;
