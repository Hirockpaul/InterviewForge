import api from "../../../services/api";

export const createFocusedSession = async ({
  sourceType,
  sourceText,
  mode,
  interviewPlanId,
  resume,
}) => {
  const form = new FormData();
  form.append("sourceType", sourceType);
  form.append("sourceText", sourceText || "");
  form.append("mode", mode);
  if (interviewPlanId) {
    form.append("interviewPlanId", interviewPlanId);
  }
  if (resume) {
    form.append("resume", resume);
  }
  return (await api.post("/api/focused-practice", form)).data;
};

export const getFocusedSession = async (id) =>
  (await api.get(`/api/focused-practice/${id}`)).data;
export const submitFocusedAnswer = async (id, payload) =>
  (await api.post(`/api/focused-practice/${id}/answer`, payload)).data;
export const getFocusedReport = async (id) =>
  (await api.get(`/api/focused-practice/${id}/report`)).data;
export const listFocusedSessions = async () =>
  (await api.get("/api/focused-practice")).data;
