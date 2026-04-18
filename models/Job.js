
const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  name: String,
  email: String,
  phone: String,
  github: String,
  linkedin: String,
  portfolio: String,
  coverLetter: String,
  resume: String,
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  appliedAt: { type: Date, default: Date.now }
});

const jobSchema = new mongoose.Schema({
  title: String,
  description: String,
  requiredSkills: [String],
  requiredEducation: String,
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer" },

  // 🔹 just IDs (fast lookup)
  applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],

  // 🔹 full application details
  applications: [applicationSchema]

}, { timestamps: true });

module.exports = mongoose.model("Job", jobSchema);