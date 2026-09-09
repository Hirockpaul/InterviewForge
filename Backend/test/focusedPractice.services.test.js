const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveTopic,
  normalizeQuestion,
  missingByDifficulty,
  selectQuestions,
  buildReport,
} = require("../src/services/focusedPractice.services");

const questions = ["easy", "medium", "hard"].flatMap((difficulty) =>
  Array.from({ length: 12 }, (_, index) => ({
    _id: `${difficulty}-${index}`,
    difficulty,
    canonicalTopic: index < 6 ? "nodejs" : "backend",
  })),
);

test("normalizes common aliases and arbitrary topics", () => {
  assert.equal(resolveTopic("Express.js backend").canonicalTopic, "expressjs");
  assert.equal(resolveTopic("Python 3 decorators").canonicalTopic, "python");
  assert.equal(
    resolveTopic("Quantum networking").canonicalTopic,
    "quantum-networking",
  );
});

test("normalizes question text for duplicate detection", () => {
  assert.equal(
    normalizeQuestion(" How does Node.js work? "),
    normalizeQuestion("how does node js work"),
  );
});

test("calculates only missing difficulty quantities", () => {
  const available = [
    ...questions.filter((item) => item.difficulty === "easy").slice(0, 2),
    ...questions.filter((item) => item.difficulty === "medium").slice(0, 3),
    ...questions.filter((item) => item.difficulty === "hard").slice(0, 1),
  ];
  assert.deepEqual(missingByDifficulty(available), {
    easy: 6,
    medium: 5,
    hard: 7,
  });
});

test("selects exactly 8 easy, 8 medium, and 8 hard while deprioritizing attempts", () => {
  const attempted = new Set(["easy-0", "medium-0", "hard-0"]);
  const selected = selectQuestions(questions, attempted, () => 0.5);
  assert.equal(selected.length, 24);
  for (const difficulty of ["easy", "medium", "hard"])
    assert.equal(
      selected.filter((item) => item.difficulty === difficulty).length,
      8,
    );
  assert.equal(
    selected.some((item) => attempted.has(item._id)),
    false,
  );
});

test("builds difficulty and topic recommendations from actual evaluation scores", () => {
  const sampleQuestions = questions
    .slice(0, 2)
    .map((item, index) => ({ ...item, _id: `q${index}` }));
  const answers = sampleQuestions.map((item, index) => ({
    question: item._id,
    evaluation: {
      score: index ? 40 : 90,
      technicalAccuracy: 70,
      communication: 60,
      clarity: 65,
      depth: 55,
      relevance: 75,
    },
  }));
  const report = buildReport(sampleQuestions, answers);
  assert.equal(report.overallScore, 65);
  assert.match(report.priorityImprovement, /backend|nodejs/);
  assert.ok(
    report.recommendations.every((item) =>
      item.includes(report.priorityImprovement),
    ),
  );
});
