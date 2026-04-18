
const Job = require("../models/Job");
const Student = require("../models/Student");
const Employer = require("../models/Employer");
const Notification = require("../models/Notification");


// ===============================
// CREATE JOB (EMPLOYER)
// ===============================
const createJob = async (req, res) => {
  try {
    const { title, description, requiredSkills, requiredEducation, github, linkedin, portfolio } = req.body;
    const resume = req.file || req.files;


    const job = await Job.create({
      title,
      description,
      requiredSkills,
      requiredEducation,
      employerId: req.employer._id, // ✅ FIXED
      resume: req.file ? req.file.path : "",
      github,
      linkedin,
      portfolio,
    });


    const matchedStudents = await Student.find({
      $or: [
        { skills: { $in: requiredSkills } },
        { education: requiredEducation },
      ],
    });



    // 🔔 BULK NOTIFICATIONS (STUDENTS)
    const notifications = matchedStudents.map((student) => ({
      studentId: student._id,
      jobId: job._id,
      message: `New job "${title}" matches your profile`,
      type: "job_post",
    }));

    await Notification.insertMany(notifications);

    // 🚀 SOCKET
    const io = req.app.get("io");
    const users = req.app.get("users");

    matchedStudents.forEach((student) => {
      const socketUser = users[student._id.toString()];

      if (socketUser?.socketId) {
        io.to(socketUser.socketId).emit("student-notification", {
          message: `New job "${title}" matches your profile`,
          jobId: job._id,
          type: "job_post",
        });
      }
    });

    res.status(201).json(job);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating job" });
  }
};





// ===============================
// GET ALL JOBS
// ===============================
const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find().populate("employerId", "name company");
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ===============================
// GET SINGLE JOB
// ===============================
const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId)
      .populate("employerId", "name company")
      .populate("applicants", "name email skills education");

    if (!job) return res.status(404).json({ message: "Job not found" });

    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ===============================
// UPDATE JOB (EMPLOYER ONLY)
// ===============================
const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);

    if (!job) return res.status(404).json({ message: "Job not found" });

    if (job.employerId.toString() !== req.employer._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.jobId,
      req.body,
      { new: true }
    );

    res.json(updatedJob);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ===============================
// DELETE JOB
// ===============================
const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);

    if (!job) return res.status(404).json({ message: "Job not found" });

    if (job.employerId.toString() !== req.employer._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await job.deleteOne();

    await Employer.findByIdAndUpdate(req.employer._id, {
      $pull: { postedJobs: job._id },
    });

    res.json({ message: "Job deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ===============================
// GET EMPLOYER JOBS
// ===============================
const getEmployerJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ employerId: req.employer._id }).sort({ _id: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ===============================
// GET APPLICANTS
// ===============================
const getApplicants = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId)
      .populate("applicants", "name email skills education");

    if (!job) return res.status(404).json({ message: "Job not found" });

    res.json(job.applicants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ===============================
// UPDATE APPLICANT STATUS
// ===============================
const updateApplicantStatus = async (req, res) => {
  try {
    const { jobId, studentId } = req.params;

    const job = await Job.findById(jobId);

    if (!job) return res.status(404).json({ message: "Job not found" });

    // Example logic (you can extend schema later)
    res.json({
      message: "Applicant status updated (logic not implemented yet)",
      jobId,
      studentId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const allJobs = async (req, res) => {
  try {
    const jobs = await Job.find({}).sort({ createdAt: -1 });

    if (!jobs) {
      return res.status(400).json({
        success: false,
        message: "No Jobs"
      })
    }

    return res.status(200).json({
      success: true,
      message: "Fetch All Jobs Successfully",
      jobs
    })
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}


module.exports = {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
  getApplicants,
  updateApplicantStatus,
  getEmployerJobs,
  allJobs
};