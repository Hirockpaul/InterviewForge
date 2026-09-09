const test = require("node:test");
const assert = require("node:assert/strict");
const {
  generateMcqBatch,
  MCQ_MODEL,
} = require("../src/services/mcqFactory.services");

test("MCQ generation uses the configured Groq model and parses structured output", async (context) => {
  const previousKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-key";
  context.after(() => {
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
  });

  let requests;
  context.mock.method(global, "fetch", async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    question: "What does JavaScript Promise.resolve return?",
                    options: [
                      "A Promise",
                      "A callback",
                      "A timer ID",
                      "An event loop",
                    ],
                    correctOption: 0,
                    explanation:
                      "It returns a Promise resolved with the supplied value.",
                    topic: "JavaScript",
                    subtopic: "Promises",
                    category: "Programming",
                    difficulty: "easy",
                    tags: ["async"],
                  },
                ],
              }),
            },
          },
        ],
      }),
    };
  });

  const questions = await generateMcqBatch({
    canonicalTopic: "javascript",
    displayTopic: "JavaScript",
    category: "programming",
    difficulty: "easy",
    count: 1,
    existing: [],
  });

  assert.equal(request.url, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(request.body.model, "llama-3.3-70b-versatile");
  assert.equal(request.options.headers.Authorization, "Bearer test-key");
  assert.equal(questions.length, 1);
  assert.equal(questions[0].canonicalTopic, "javascript");
  assert.equal(MCQ_MODEL, "llama-3.3-70b-versatile");
});

test("MCQ generation fails clearly without Groq configuration", async () => {
  const previousKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  await assert.rejects(
    () =>
      generateMcqBatch({
        canonicalTopic: "javascript",
        displayTopic: "JavaScript",
        category: "programming",
        difficulty: "easy",
        count: 1,
        existing: [],
      }),
    /GROQ_API_KEY/,
  );
  if (previousKey !== undefined) process.env.GROQ_API_KEY = previousKey;
});
