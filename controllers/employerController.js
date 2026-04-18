
const Employer = require("../models/Employer");
const Job = require("../models/Job");
const Student = require("../models/Student");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");


// =========================
// REGISTER EMPLOYER
// =========================
const registerEmployer = async (req, res) => {
  try {
    const { company, email, password } = req.body;

    const existing = await Employer.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const employer = await Employer.create({
      company,
      email,
      passwordHash,
      postedJobs: [],
    });

    res.status(201).json({
      _id: employer._id,
      company: employer.company,
      email: employer.email,
      role: "employer",
      token: generateToken(employer._id),
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// =========================
// LOGIN EMPLOYER
// =========================
const loginEmployer = async (req, res) => {
  try {
    const { email, password } = req.body;

    const employer = await Employer.findOne({ email });

    if (!employer) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, employer.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      _id: employer._id,
      company: employer.company,
      email: employer.email,
      role: "employer",
      token: generateToken(employer._id),
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// =========================
// CREATE JOB
// =========================
const createJob = async (req, res) => {
  try {
    const { title, description, requiredSkills, requiredEducation } = req.body;

    const job = await Job.create({
      title,
      description,
      requiredSkills,
      requiredEducation,
      employerId: req._id,
    });


    // 🔥 FIND MATCHING STUDENTS
    const matchedStudents = await Student.find({
      $or: [
        { skills: { $in: requiredSkills } },
        { education: requiredEducation },
      ],
    });

    // 🔔 CREATE NOTIFICATIONS (DB) WITH TYPE FIX
    const notifications = matchedStudents.map((student) => ({
      studentId: student._id,
      jobId: job._id,
      message: `New job "${title}" matches your profile`,
      type: "job_post", // ✅ IMPORTANT FIX
    }));

    await Notification.insertMany(notifications);

    // 🚀 SOCKET.IO REAL-TIME NOTIFICATION
    const io = req.app.get("io");
    const users = req.app.get("users");

    if (io && users) {
      matchedStudents.forEach((student) => {
        const socketUser = users[student._id.toString()];

        if (socketUser && socketUser.socketId) {
          io.to(socketUser.socketId).emit("student-notification", {
            message: `New job "${title}" matches your profile`,
            jobId: job._id,
            type: "job_post", // optional but useful
          });
        }
      });
    }

    return res.status(201).json(job);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error creating job" });
  }
};






// =========================
// GET MY JOBS
// =========================
const getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ employerId: req.employer._id }).sort({ _id: -1 })
      .populate("applicants", "name email skills education");

    res.json(jobs);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// =========================
// GET SINGLE JOB DETAILS
// =========================
const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(job);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// =========================
// GET APPLICANTS OF A JOB
// =========================
const getJobApplicants = async (req, res) => {
  try {
    let jobId = req.params.jobId;
    jobId = new mongoose.Types.ObjectId(jobId);
    const job = await Job.findById(jobId)
      .populate("applicants", "name email skills education");

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // 🔥 merge applications + student data
    const merged = job.applications.map(app => {
      const student = job.applicants.find(
        s => s._id.toString() === app.studentId.toString()
      );

      return {
        ...app.toObject(),
        skills: student?.skills || [],
        education: student?.education || ""
      };
    });

    res.json(merged);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// =========================
// UPDATE APPLICANT STATUS
// (ACCEPT / REJECT)
// =========================
const updateApplicantStatus = async (req, res) => {
  try {
    const { jobId, studentId } = req.params;
    const { status } = req.body; // "accepted" | "rejected"

    // validate status
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // find job
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // find application index
    const appIndex = job.applications.findIndex(
      (app) => app.studentId.toString() === studentId
    );

    if (appIndex === -1) {
      return res.status(404).json({ message: "Application not found" });
    }

    // update status
    job.applications[appIndex].status = status;

    await job.save();

    return res.json({
      message: `Application ${status} successfully`,
      updatedApplication: job.applications[appIndex],
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server error" });
  }
};


// =========================
// DELETE JOB
// =========================
const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

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



const getEmployerNotifications = async (req, res) => {
  try {
    const employerId = req.employer._id;

    const notifications = await Notification.find({
      employerId: employerId,
      read: false,   // 🔥 ONLY UNREAD

    })
      .sort({ createdAt: -1 })
      .lean();


    return res.json(notifications);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};


const markNotificationSeen = async (req, res) => {
  try {
    const employerId = req.employer._id;

    await Notification.updateMany(
      { employerId: employerId },
      { $set: { read: true } }
    );

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};


const getApplication = async (req, res) => {
  try {
    let { jobId, studentId } = req.params;

    // convert to ObjectId
    jobId = new mongoose.Types.ObjectId(jobId);
    studentId = new mongoose.Types.ObjectId(studentId);


    // STEP 1: get job
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }


    // STEP 2: check if student applied
    const isApplicant = job.applicants.some(
      (id) => id.toString() === studentId.toString()
    );

    if (!isApplicant) {
      return res.status(404).json({ message: "Applicant not found in this job" });
    }

    // STEP 3: find student details
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // STEP 4: response
    return res.status(200).json({
      job,
      student,
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server error" });
  }
};







// =========================
module.exports = {
  registerEmployer,
  getEmployerNotifications,
  loginEmployer,
  createJob,
  getMyJobs,
  getJobById,
  getJobApplicants,
  updateApplicantStatus,
  getApplication,
  deleteJob,
  markNotificationSeen
};