import api from "../../../services/api";

export const startMockInterview = async (interviewPlanId, focus) => {
  const response = await api.post("/api/mock-interviews", {
    interviewPlanId,
    focus,
  });
  return response.data;
};

export const getMockInterview = async (mockInterviewId) => {
  const response = await api.get(`/api/mock-interviews/${mockInterviewId}`);
  return response.data;
};

export const submitMockAnswer = async (mockInterviewId, answer) => {
  const response = await api.post(
    `/api/mock-interviews/${mockInterviewId}/answer`,
    { answer },
  );
  return response.data;
};
