const mongoose = require("mongoose");

const employerSchema = new mongoose.Schema({
  company: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  postedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
}, { timestamps: true });

module.exports = mongoose.model("Employer", employerSchema);