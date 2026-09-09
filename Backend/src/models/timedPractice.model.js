const mongoose = require("mongoose");

const evaluationSchema = new mongoose.Schema(
  {
    score: Number,
    technicalAccuracy: Number,
    communication: Number,
    clarity: Number,
    depth: Number,
    relevance: Number,
    conciseness: Number,
    strengths: [String],
    improvements: [String],
    feedback: String,
  },
  { _id: false },
);

const timedPracticeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    interviewPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewReport",
      default: null,
    },
    savedQuestion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SavedQuestion",
      default: null,
    },
    questionText: { type: String, required: true },
    category: {
      type: String,
      enum: ["technical", "behavioral", "project", "hr", "system-design"],
      required: true,
    },
    topic: { type: String, default: "General" },
    duration: { type: Number, enum: [30, 60, 90, 120, 180], required: true },
    allowPause: { type: Boolean, default: false },
    startedAt: { type: Date, required: true },
    submittedAt: Date,
    timeUsed: Number,
    answer: { type: String, default: "" },
    status: { type: String, enum: ["active", "completed"], default: "active" },
    evaluation: evaluationSchema,
  },
  { timestamps: true },
);

timedPracticeSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("TimedPractice", timedPracticeSchema);
