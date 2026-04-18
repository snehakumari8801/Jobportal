const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  education: String,
  skills: [String],
  experience: Number,
  appliedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
}, { timestamps: true });

module.exports = mongoose.model("Student", studentSchema);