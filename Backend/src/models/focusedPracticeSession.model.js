const mongoose = require("mongoose");

const answerEvaluationSchema = new mongoose.Schema(
  {
    score: { type: Number, min: 0, max: 100 },
    technicalAccuracy: { type: Number, min: 0, max: 100 },
    communication: { type: Number, min: 0, max: 100 },
    clarity: { type: Number, min: 0, max: 100 },
    depth: { type: Number, min: 0, max: 100 },
    relevance: { type: Number, min: 0, max: 100 },
    completeness: { type: Number, min: 0, max: 100 },
    categoryScores: {
      situation: Number,
      task: Number,
      action: Number,
      result: Number,
      specificity: Number,
      technicalUnderstanding: Number,
      ownership: Number,
      implementationKnowledge: Number,
      decisionMaking: Number,
      tradeoffs: Number,
      problemSolving: Number,
      architecture: Number,
      scalability: Number,
      reliability: Number,
      database: Number,
      caching: Number,
      security: Number,
    },
    strengths: [String],
    weaknesses: [String],
    feedback: String,
    recommendedImprovement: String,
  },
  { _id: false },
);

const focusedAnswerSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewQuestion",
      required: true,
    },
    answer: { type: String, default: "" },
    startedAt: { type: Date, required: true },
    submittedAt: { type: Date, required: true },
    timeTaken: { type: Number, required: true },
    timeLimit: { type: Number, required: true },
    submittedAutomatically: { type: Boolean, default: false },
    evaluation: answerEvaluationSchema,
  },
  { _id: false },
);

const reportSchema = new mongoose.Schema(
  {
    difficultyPerformance: { easy: Number, medium: Number, hard: Number },
    dimensions: {
      technicalAccuracy: Number,
      communication: Number,
      clarity: Number,
      depth: Number,
      relevance: Number,
    },
    strongestAreas: [String],
    weakAreas: [String],
    priorityImprovement: String,
    recommendations: [String],
  },
  { _id: false },
);

const focusedPracticeSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    sourceType: {
      type: String,
      enum: ["resume", "project", "job-description", "topic", "interview-plan"],
      required: true,
    },
    sourceText: { type: String, required: true, select: false },
    sourceKey: { type: String, required: true },
    canonicalTopic: { type: String, required: true },
    displayTopic: { type: String, required: true },
    mode: {
      type: String,
      enum: ["technical", "behavioral", "project", "mixed"],
      required: true,
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InterviewQuestion",
        required: true,
      },
    ],
    answers: { type: [focusedAnswerSchema], default: [] },
    currentQuestionIndex: { type: Number, default: 0 },
    currentQuestionStartedAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["in-progress", "evaluating", "completed", "abandoned"],
      default: "in-progress",
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    overallScore: { type: Number, min: 0, max: 100 },
    report: reportSchema,
  },
  { timestamps: true },
);

focusedPracticeSessionSchema.index({ user: 1, createdAt: -1 });
focusedPracticeSessionSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model(
  "FocusedPracticeSession",
  focusedPracticeSessionSchema,
);
