const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const codingProblemModel = require("../src/models/codingProblem.model");
const codingService = require("../src/services/coding.services");
const codingAiService = require("../src/services/codingAi.services");
const { CODING_TOPICS } = require("../src/config/codingTopics");
const {
  generatedProblemSchema,
  normalizeStarterCode,
} = require("../src/services/codingAi.services");
const {
  generationSchema,
  problemQuerySchema,
} = require("../src/controllers/coding.controller");

const validProblem = {
  title: "Balanced Split Point",
  shortDescription:
    "Find a position where the values on both sides have equal sums.",
  description:
    "Given an integer array, return the first index that divides it into non-empty left and right portions with equal sums. Return -1 when no such position exists.",
  difficulty: "easy",
  topic: "arrays",
  constraints: ["2 <= nums.length <= 100000"],
  examples: [
    {
      input: "[1, 2, 3, 3]",
      output: "3",
      explanation: "Both portions sum to 6.",
    },
    { input: "[1, 2]", output: "-1", explanation: "No valid split exists." },
  ],
  starterCode: {
    javascript: "function splitPoint(nums) {\n  // TODO\n}",
    python: "def split_point(nums):\n    # TODO\n    pass",
    java: "class Solution { int splitPoint(int[] nums) { return -1; } }",
    cpp: "int splitPoint(vector<int>& nums) { return -1; }",
    c: "int splitPoint(int* nums, int size) { return -1; }",
  },
  supportedLanguages: ["javascript", "python", "java", "cpp", "c"],
  hints: [
    "Track the total before choosing a split.",
    "Update a running prefix sum.",
  ],
  explanation:
    "Compare a running left sum with the remaining total at every valid boundary.",
  timeComplexity: "O(n)",
  spaceComplexity: "O(1)",
};

test("coding topics expose the complete centralized catalog", () => {
  assert.equal(CODING_TOPICS.length, 15);
  assert.deepEqual(CODING_TOPICS[0], {
    id: "arrays",
    displayName: "Arrays",
    slug: "arrays",
    shortDescription:
      "Practice array traversal, manipulation, and problem solving.",
  });
});

test("problem query validates supported topic, difficulty, and search", () => {
  assert.equal(
    problemQuerySchema.parse({
      topic: "arrays",
      difficulty: "medium",
      search: "sum",
    }).difficulty,
    "medium",
  );
  assert.equal(
    problemQuerySchema.safeParse({ topic: "unknown" }).success,
    false,
  );
  assert.equal(
    problemQuerySchema.safeParse({ difficulty: "expert" }).success,
    false,
  );
});

test("AI generation request requires a supported topic and exact difficulty", () => {
  assert.deepEqual(
    generationSchema.parse({ topic: "graphs", difficulty: "hard" }),
    { topic: "graphs", difficulty: "hard" },
  );
  assert.equal(
    generationSchema.safeParse({ topic: "graphs", difficulty: "expert" })
      .success,
    false,
  );
});

test("AI-generated coding problem validation accepts complete data and rejects malformed data", () => {
  assert.equal(generatedProblemSchema.safeParse(validProblem).success, true);
  assert.equal(
    generatedProblemSchema.safeParse({ ...validProblem, examples: [] }).success,
    false,
  );
  assert.equal(
    generatedProblemSchema.safeParse({ ...validProblem, topic: "unknown" })
      .success,
    false,
  );
});

test("Python starter templates import List when their annotations require it", () => {
  const starterCode = normalizeStarterCode({
    ...validProblem.starterCode,
    python:
      "class Solution:\n    def solve(self, nums: List[int]) -> bool:\n        pass",
  });
  assert.match(starterCode.python, /^from typing import List/);
  assert.equal(
    (starterCode.python.match(/from typing import List/g) || []).length,
    1,
  );

  const alreadyValid = normalizeStarterCode({
    ...validProblem.starterCode,
    python: "from typing import List\n\ndef solve(nums: List[int]):\n    pass",
  });
  assert.equal(
    (alreadyValid.python.match(/from typing import List/g) || []).length,
    1,
  );
});

test("Mongoose coding problem model validates required fields and language values", async () => {
  const document = new codingProblemModel({
    ...validProblem,
    normalizedTitle: codingService.normalizeTitle(validProblem.title),
    slug: codingService.slugify(validProblem.title),
    source: "ai",
  });
  await document.validate();
  assert.equal(document.topic, "arrays");

  document.supportedLanguages = ["javascript", "not-a-language"];
  await assert.rejects(document.validate());
});

test("problem listing sends topic, difficulty, and escaped search to MongoDB", async () => {
  const originalFind = codingProblemModel.find;
  const originalCount = codingProblemModel.countDocuments;
  let receivedQuery;
  const chain = {
    select() {
      return this;
    },
    sort() {
      return this;
    },
    skip() {
      return this;
    },
    limit() {
      return this;
    },
    lean: async () => [{ title: "Sum Pair" }],
  };
  codingProblemModel.find = (query) => {
    receivedQuery = query;
    return chain;
  };
  codingProblemModel.countDocuments = async () => 1;
  try {
    const result = await codingService.listProblems({
      topic: "arrays",
      difficulty: "easy",
      search: "sum.",
      page: 1,
      limit: 24,
    });
    assert.equal(receivedQuery.topic, "arrays");
    assert.equal(receivedQuery.difficulty, "easy");
    assert.equal(receivedQuery.$or[0].title.test("SUM."), true);
    assert.equal(receivedQuery.$or[0].title.test("SUMX"), false);
    assert.equal(result.total, 1);
  } finally {
    codingProblemModel.find = originalFind;
    codingProblemModel.countDocuments = originalCount;
  }
});

test("generation reuses a full MongoDB pool without calling Gemini", async () => {
  const originalFind = codingProblemModel.find;
  const originalGenerate = codingAiService.generateCodingProblems;
  let aiCalled = false;
  const existing = Array.from({ length: 10 }, (_, index) => ({
    title: `Problem ${index}`,
    normalizedTitle: `problem ${index}`,
  }));
  const chain = {
    select() {
      return this;
    },
    lean: async () => existing,
  };
  codingProblemModel.find = () => chain;
  codingAiService.generateCodingProblems = async () => {
    aiCalled = true;
    return [];
  };
  try {
    const result = await codingService.generateMissing({
      topic: "arrays",
      difficulty: "easy",
    });
    assert.equal(result.reused, true);
    assert.equal(result.generated, 0);
    assert.equal(aiCalled, false);
  } finally {
    codingProblemModel.find = originalFind;
    codingAiService.generateCodingProblems = originalGenerate;
  }
});

test("coding routes apply authentication globally and AI limiting to generation", () => {
  const router = require("../src/routes/coding.routes");
  assert.equal(router.stack[0].handle.name, "authUser");
  const generationRoute = router.stack.find(
    (layer) => layer.route?.path === "/problems/generate",
  );
  assert.ok(generationRoute);
  assert.ok(generationRoute.route.stack.length >= 2);
});

test.after(() => mongoose.deleteModel(/CodingProblem/));
