const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });
const model = "gemini-3-flash-preview";

const introductionSchema = z.object({
  content: z.string().min(30),
  whyItWorks: z.array(z.string().min(2)).min(1).max(5),
  keyPoints: z.array(z.string().min(2)).min(1).max(6),
});

const projectListSchema = z.object({
  projects: z
    .array(z.object({ name: z.string().min(1), context: z.string().min(10) }))
    .max(12),
});
const questionSetSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(10),
        difficulty: z.enum([
          "beginner",
          "intermediate",
          "advanced",
          "deep-dive",
        ]),
        topic: z.enum([
          "Architecture",
          "Technology choices",
          "Database",
          "API",
          "Security",
          "Scalability",
          "Performance",
          "Challenges",
          "Trade-offs",
          "Testing",
          "Deployment",
        ]),
      }),
    )
    .min(4)
    .max(24),
});

async function structuredGenerate(schema, prompt) {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(schema),
    },
  });
  return schema.parse(JSON.parse(response.text));
}

function planContext(plan) {
  return `Candidate-provided resume:\n${plan.resume || "(not provided)"}\nCandidate-provided self-description:\n${plan.selfDescription || "(not provided)"}\nTarget role: ${plan.title}\nJob description:\n${plan.jobDescription}`;
}

async function generateIntroduction(
  plan,
  { targetRole, duration, tone, candidateName },
) {
  return structuredGenerate(
    introductionSchema,
    `Create a truthful ${duration}-second, ${tone} "Tell me about yourself" introduction for ${targetRole}.
Use ONLY facts in the candidate-provided context below. The authenticated user's provided name is "${candidateName || "(not provided)"}". Never infer or invent employers, degrees, skills, projects, achievements, certifications, or metrics. Omit facts that are absent. Return the introduction, why it works, and memorable key points.\n\n${planContext(plan)}`,
  );
}

async function detectProjects(plan) {
  if (!(plan.resume || plan.selfDescription).trim()) return { projects: [] };
  return structuredGenerate(
    projectListSchema,
    `Extract only projects explicitly described or named by the candidate. Preserve their real names and summarize only stated facts. Do not invent functionality or technologies. Return no project if none exists.\n\n${planContext(plan)}`,
  );
}

async function generateProjectQuestions(plan, project) {
  return structuredGenerate(
    questionSetSchema,
    `Generate interview questions about the candidate's project below, grouped across beginner, intermediate, advanced, and deep-dive difficulty. Use ONLY stated project facts; questions may probe decisions, risks, trade-offs, and hypothetical scaling but must not assert unstated functionality. Prioritize relevance to ${plan.title}.\nProject: ${project.name}\nKnown facts: ${project.context}\n\n${planContext(plan)}`,
  );
}

module.exports = {
  generateIntroduction,
  detectProjects,
  generateProjectQuestions,
};
