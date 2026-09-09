const mongoose = require("mongoose");

const savedJobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

savedJobSchema.index({ user: 1, job: 1 }, { unique: true });
module.exports = mongoose.model("SavedJob", savedJobSchema);
