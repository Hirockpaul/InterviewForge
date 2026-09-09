const mongoose = require("mongoose");

const questionAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewQuestion",
      required: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FocusedPracticeSession",
      required: true,
    },
    score: { type: Number, min: 0, max: 100, required: true },
    timeTaken: Number,
    attemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

questionAttemptSchema.index({ user: 1, question: 1, attemptedAt: -1 });
questionAttemptSchema.index({ user: 1, session: 1 });

module.exports = mongoose.model("QuestionAttempt", questionAttemptSchema);
