const { z } = require("zod");
const { mcqSchema, normalizeMcq } = require("./mcqCore.services");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MCQ_MODEL = "llama-3.3-70b-versatile";

const aiMcqSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correctOption: z.number(),
  explanation: z.string(),
  topic: z.string(),
  subtopic: z.string(),
  category: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.array(z.string()),
});
const batchSchema = z.object({ questions: z.array(aiMcqSchema) });

async function generateMcqBatch({
  canonicalTopic,
  displayTopic,
  category,
  difficulty,
  count,
  existing,
}) {
  if (!process.env.GROQ_API_KEY)
    throw new Error("GROQ_API_KEY is required for MCQ generation.");

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MCQ_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an interview MCQ question factory. Return only valid JSON matching the supplied schema.",
        },
        {
          role: "user",
          content: `Generate exactly ${count} ${difficulty} multiple-choice questions for "${displayTopic}" (canonical topic: ${canonicalTopic}), category "${category}". Every question must have exactly four meaningfully different options and exactly one correct option index from 0 to 3. Include a concise factual explanation, specific subtopic, and useful tags. Avoid ambiguity and trick questions. Do not repeat these normalized questions: ${existing.slice(0, 200).join(" | ")}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "mcq_batch",
          strict: true,
          schema: z.toJSONSchema(batchSchema),
        },
      },
      temperature: 0.4,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Groq MCQ generation failed (${response.status}): ${detail.slice(0, 300)}`,
    );
  }
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned an empty MCQ response.");
  const parsed = batchSchema.parse(JSON.parse(content));
  return parsed.questions
    .map((question) => mcqSchema.safeParse(question))
    .filter((result) => result.success)
    .map((result) =>
      normalizeMcq(result.data, {
        canonicalTopic,
        topic: displayTopic,
        category,
        difficulty,
        source: "ai-generated",
        visibility: "global",
        qualityStatus: "approved",
      }),
    );
}

module.exports = { generateMcqBatch, MCQ_MODEL };
