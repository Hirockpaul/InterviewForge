const mongoose = require("mongoose");

const jobAnalysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    contentHash: { type: String, required: true },
    matchScore: { type: Number, min: 0, max: 100, required: true },
    strengths: [String],
    skillGaps: [String],
    requiredSkills: [String],
    niceToHave: [String],
    interviewTopics: [String],
    difficulty: { type: Number, min: 1, max: 10 },
    likelyRounds: [String],
    analysisCreatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

jobAnalysisSchema.index({ user: 1, job: 1, contentHash: 1 }, { unique: true });

module.exports = mongoose.model("JobAnalysis", jobAnalysisSchema);
