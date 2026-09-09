import api from "../../../services/api";

export const getQuestionBank = async (params = {}) =>
  (await api.get("/api/preparation/question-bank", { params })).data;
export const saveQuestion = async (question) =>
  (await api.post("/api/preparation/question-bank", question)).data;
export const removeQuestion = async (id) =>
  (await api.delete(`/api/preparation/question-bank/${id}`)).data;
export const getIntroductions = async () =>
  (await api.get("/api/preparation/introductions")).data;
export const generateIntroduction = async (payload) =>
  (await api.post("/api/preparation/introductions/generate", payload)).data;
export const updateIntroduction = async (id, content) =>
  (await api.put(`/api/preparation/introductions/${id}`, { content })).data;
export const deleteIntroduction = async (id) =>
  (await api.delete(`/api/preparation/introductions/${id}`)).data;
export const recordIntroductionPractice = async (id) =>
  (await api.post(`/api/preparation/introductions/${id}/practice`)).data;
export const getProjects = async (interviewPlanId) =>
  (await api.get("/api/preparation/projects", { params: { interviewPlanId } }))
    .data;
export const generateProjectQuestions = async (payload) =>
  (await api.post("/api/preparation/projects/questions", payload)).data;
export const getStreak = async () =>
  (
    await api.get("/api/preparation/streak", {
      params: { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    })
  ).data;
