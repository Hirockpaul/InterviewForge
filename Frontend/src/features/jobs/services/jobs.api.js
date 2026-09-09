import api from "../../../services/api";

export const searchJobs = async (params, signal) =>
  (await api.get("/api/jobs", { params, signal })).data;
export const getJob = async (id, signal) =>
  (await api.get(`/api/jobs/${id}`, { signal })).data;
export const saveJob = async (id) =>
  (await api.post(`/api/jobs/${id}/save`)).data;
export const unsaveJob = async (id) =>
  (await api.delete(`/api/jobs/${id}/save`)).data;
export const analyzeJob = async (id) =>
  (await api.post(`/api/jobs/${id}/analyze`)).data;
export const prepareJob = async (id) =>
  (await api.post(`/api/jobs/${id}/prepare`)).data;
export const getRecommendedJobs = async () =>
  (await api.get("/api/jobs/recommended")).data;
export const getSavedJobs = async (signal) =>
  (await api.get("/api/jobs/saved", { signal })).data;
