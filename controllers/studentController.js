const Student = require("../models/Student");
const Job = require("../models/Job");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const mongoose = require('mongoose');
const Notification = require("../models/Notification");


// Register a student
const registerStudent = async (req, res) => {
  try {
    const { name, email, password, education, skills, experience } = req.body;

    // Fix 5: validate required fields before hitting the DB
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const student = await Student.create({
      name,
      email,
      passwordHash,
      education,
      skills,
      experience,
    });

    res.status(201).json({
      _id: student._id,
      name: student.name,
      email: student.email,
      token: generateToken(student._id),
    });
  } catch (error) {
    // Fix 1: catch and forward errors
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Login student
const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const student = await Student.findOne({ email });

    // Fix 6: guard against null student before bcrypt.compare
    if (!student) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, student.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      _id: student._id,
      name: student.name,
      email: student.email,
      token: generateToken(student._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get student profile
const getProfile = async (req, res) => {
  try {
    res.json(req.student);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update student profile
const updateProfile = async (req, res) => {
  try {
    const student = req.student;
    const { name, education, skills, experience } = req.body;

    // Fix 3: use explicit undefined checks instead of || so users can clear fields
    if (name !== undefined) student.name = name;
    if (education !== undefined) student.education = education;
    if (skills !== undefined) student.skills = skills;
    if (experience !== undefined) student.experience = experience;

    const updatedStudent = await student.save();
    res.json(updatedStudent);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Suggested jobs based on skills & education
const suggestedJobs = async (req, res) => {
  try {
    const student = req.student;

    // Flatten the skills array if it's a double array (array inside an array)
    const skills = student.skills.flat();


    const jobs = await Job.find({
      $or: [
        {
          requiredSkills: {
            $regex: skills.join("|"),   // Match any of the student skills
            $options: "i"               // Case-insensitive search
          }
        },
        { requiredEducation: student.education }
      ],
    }).sort({ createdAt: -1 });


    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const applyJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    // 🔍 find job
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // 🚫 prevent duplicate apply
    const alreadyApplied = job.applicants?.some(
      (id) => id.toString() === req.student._id.toString()
    );

    if (alreadyApplied) {
      return res.status(400).json({ message: "Already applied" });
    }

    // 👤 authenticated student (trusted)
    const student = req.student;

    // 📄 optional form fields (safe access)
    const phone = req.body?.phone || "";
    const github = req.body?.github || "";
    const linkedin = req.body?.linkedin || "";
    const portfolio = req.body?.portfolio || "";
    const coverLetter = req.body?.coverLetter || "";

    // 📁 resume (multer)
    const resume = req.file ? req.file.path : "";

    // ✅ ensure arrays exist (VERY IMPORTANT)
    if (!job.applicants) {
      job.applicants = [];
    }

    if (!job.applications) {
      job.applications = [];
    }

    // ➕ push applicant ID
    job.applicants.push(student._id);

    // ➕ push full application data
    job.applications.push({
      studentId: student._id,
      name: student.name,
      email: student.email,
      phone,
      github,
      linkedin,
      portfolio,
      coverLetter,
      resume,
      appliedAt: new Date(),
    });

    // 💾 save to DB
    await job.save();

    // 🔔 create notification
    await Notification.create({
      employerId: job.employerId,
      studentId: student._id,
      jobId: job._id,
      message: `New application received for "${job.title}"`,
      read: false,
      type: "application",
    });

    // ⚡ socket notification
    const io = req.app.get("io");
    const users = req.app.get("users");

    const employerSocket = users?.[job.employerId.toString()];

    if (employerSocket?.socketId) {
      io.to(employerSocket.socketId).emit("employer-notification", {
        message: `New application received for "${job.title}"`,
        jobId: job._id,
        type: "application",
      });
    }

    // ✅ response
    return res.status(200).json({
      success: true,
      message: "Applied successfully",
    });

  } catch (err) {
    console.error("Apply Job Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};





const getNotifications = async (req, res) => {
  try {
    const studentId = req.student._id;

    const notifications = await Notification.find({
      studentId,
      type: "job_post",
      read: false,   // 🔥 KEY FIX
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
    const studentId = req.student._id;

    await Notification.updateMany(
      { studentId: studentId },
      { $set: { read: true } }
    );

    return res.json({ success: true });
  } catch (error) {
    // console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  getProfile,
  updateProfile,
  suggestedJobs,
  applyJob,
  getNotifications,
  markNotificationSeen
};