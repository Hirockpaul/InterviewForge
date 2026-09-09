const { z } = require("zod");
const {
  resolveTopic,
  normalizeQuestion,
  shuffle,
} = require("./focusedPractice.services");

const mcqSchema = z
  .object({
    question: z.string().trim().min(8).max(1000),
    options: z.array(z.string().trim().min(1).max(500)).length(4),
    correctOption: z.number().int().min(0).max(3),
    explanation: z.string().trim().min(8).max(2000),
    topic: z.string().trim().min(1),
    subtopic: z.string().trim().min(1),
    category: z.string().trim().min(1),
    difficulty: z.enum(["easy", "medium", "hard"]),
    tags: z.array(z.string().trim().min(1)).min(1).max(10),
  })
  .superRefine((value, context) => {
    if (new Set(value.options.map(normalizeQuestion)).size !== 4)
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Options must be meaningfully different.",
      });
  });

const normalizeMcq = (value, metadata = {}) => {
  const topic = resolveTopic(value.canonicalTopic || value.topic);
  return {
    ...value,
    question: value.question.trim(),
    options: value.options.map((item) => item.trim()),
    explanation: value.explanation.trim(),
    normalizedQuestion: normalizeQuestion(value.question),
    topic: topic.displayTopic,
    canonicalTopic: topic.canonicalTopic,
    aliases: topic.aliases,
    subtopic: resolveTopic(value.subtopic).canonicalTopic,
    category: resolveTopic(value.category).canonicalTopic,
    tags: [
      ...new Set(value.tags.map((item) => resolveTopic(item).canonicalTopic)),
    ],
    ...metadata,
  };
};

function distribution(count, difficulty) {
  if (difficulty !== "mixed")
    return {
      easy: difficulty === "easy" ? count : 0,
      medium: difficulty === "medium" ? count : 0,
      hard: difficulty === "hard" ? count : 0,
    };
  const easy = Math.round(count * 0.25),
    medium = Math.round(count * 0.5);
  return { easy, medium, hard: count - easy - medium };
}

function selectMcqs(
  questions,
  requested,
  attempted = new Set(),
  random = Math.random,
) {
  return ["easy", "medium", "hard"].flatMap((level) => {
    const matches = questions.filter((item) => item.difficulty === level),
      fresh = shuffle(
        matches.filter((item) => !attempted.has(String(item._id))),
        random,
      ),
      repeated = shuffle(
        matches.filter((item) => attempted.has(String(item._id))),
        random,
      );
    return [...fresh, ...repeated].slice(0, requested[level]);
  });
}
const average = (values) =>
  values.length
    ? Math.round((values.filter(Boolean).length / values.length) * 100)
    : null;
function buildMcqResult(questions, answers) {
  const rows = answers.map((answer) => ({
    answer,
    question: questions.find(
      (item) => String(item._id) === String(answer.question),
    ),
  }));
  const group = (key) =>
    Object.fromEntries(
      [...new Set(rows.map((row) => row.question?.[key]).filter(Boolean))].map(
        (value) => [
          value,
          average(
            rows
              .filter((row) => row.question?.[key] === value)
              .map((row) => row.answer.correct),
          ),
        ],
      ),
    );
  const subtopicAccuracy = group("subtopic"),
    topicAccuracy = group("canonicalTopic"),
    ranked = Object.entries(subtopicAccuracy).sort((a, b) => b[1] - a[1]);
  return {
    difficultyPerformance: Object.fromEntries(
      ["easy", "medium", "hard"].map((level) => [
        level,
        average(
          rows
            .filter((row) => row.question?.difficulty === level)
            .map((row) => row.answer.correct),
        ),
      ]),
    ),
    topicAccuracy,
    subtopicAccuracy,
    strongAreas: ranked
      .filter(([, score]) => score >= 75)
      .slice(0, 4)
      .map(([name]) => name),
    weakAreas: [...ranked]
      .reverse()
      .filter(([, score]) => score < 60)
      .slice(0, 4)
      .map(([name]) => name),
  };
}

module.exports = {
  mcqSchema,
  normalizeMcq,
  distribution,
  selectMcqs,
  buildMcqResult,
};
