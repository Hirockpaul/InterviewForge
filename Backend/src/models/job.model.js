const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    source: { type: String, required: true, index: true },
    sourceJobId: { type: String, required: true },
    sourceHandle: { type: String, default: "" },
    sourceReferences: [{ source: String, sourceJobId: String }],
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    responsibilities: [{ type: String }],
    requirements: [{ type: String }],
    qualifications: [{ type: String }],
    benefits: [{ type: String }],
    derivedFields: [
      {
        type: String,
        enum: [
          "experience",
          "responsibilities",
          "requirements",
          "qualifications",
          "benefits",
        ],
      },
    ],
    niceToHaveSkills: [{ type: String }],
    educationRequirements: [{ type: String }],
    locations: [{ type: String }],
    countries: [{ type: String }],
    remoteType: {
      type: String,
      enum: ["remote", "hybrid", "on-site", ""],
      default: "",
    },
    location: {
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      country: { type: String, default: "" },
      display: { type: String, default: "" },
      remote: { type: Boolean, default: false },
      remoteType: {
        type: String,
        enum: ["remote", "hybrid", "on-site", ""],
        default: "",
      },
    },
    employmentType: { type: String, default: "" },
    seniority: { type: String, default: "" },
    experience: {
      minYears: Number,
      maxYears: Number,
      text: { type: String, default: "" },
      source: {
        type: String,
        enum: ["provider", "description", ""],
        default: "",
      },
    },
    salary: {
      min: Number,
      max: Number,
      currency: { type: String, default: "" },
      period: { type: String, default: "" },
    },
    salaryMin: Number,
    salaryMax: Number,
    salaryCurrency: { type: String, default: "" },
    skills: [{ type: String }],
    postedAt: Date,
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    applyUrl: { type: String, default: "" },
    sourceUrl: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    fingerprint: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

jobSchema.index({ source: 1, sourceJobId: 1 }, { unique: true });
jobSchema.index({
  title: "text",
  company: "text",
  description: "text",
  skills: "text",
});
jobSchema.index({ "location.display": 1, postedAt: -1 });
jobSchema.index({ locations: 1, postedAt: -1 });
jobSchema.index({ countries: 1, postedAt: -1 });
jobSchema.index({ skills: 1 });

module.exports = mongoose.model("Job", jobSchema);
