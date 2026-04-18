const express = require("express");
const router = express.Router();
const {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
  getApplicants,
  updateApplicantStatus,
  getEmployerJobs,
  getNotifications,
  allJobs,
} = require("../controllers/jobController");
const { protectStudent, protectEmployer } = require("../middleware/authMiddleware");
const upload = require("../utils/multer");


router.post("/createJob", protectEmployer, upload.single("resume"), createJob);
router.get("/allJob", protectStudent,  allJobs);
router.get("/employer", getAllJobs);
router.get("/employer/mine", protectEmployer, getEmployerJobs);
router.get("/:jobId", getJobById);
router.put("/:jobId", protectEmployer, updateJob);
router.delete("/:jobId", protectEmployer, deleteJob);
router.get("/:jobId/applicants", protectEmployer, getApplicants);
router.put("/:jobId/applicants/:studentId", protectEmployer, updateApplicantStatus);

module.exports = router;