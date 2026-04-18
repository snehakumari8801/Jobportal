const express = require("express");
const router = express.Router();
const {
  registerEmployer,
  loginEmployer,
  createJob,
  getMyJobs,
  getJobById,
  getJobApplicants,
  updateApplicantStatus,
  deleteJob,
  getEmployerNotifications,
  markNotificationSeen,
  getApplication,
} = require("../controllers/employerController");
const { protectEmployer } = require("../middleware/authMiddleware");



router.post("/register", registerEmployer);
router.post("/login", loginEmployer);
router.post("/createJob", protectEmployer, createJob);
router.get("/notifications", protectEmployer, getEmployerNotifications);
router.patch("/notifications", protectEmployer, markNotificationSeen);
router.get("/jobs/mine", protectEmployer, getMyJobs);
router.get("/jobs/:id", protectEmployer, getJobById);
router.delete("/jobs/:id", protectEmployer, deleteJob);
router.get("/jobs/:jobId/applicants", protectEmployer, getJobApplicants);
router.get(
  "/jobs/:jobId/applicants/:studentId",
  protectEmployer,
  getApplication
);


router.patch(
  "/jobs/:jobId/applicants/:studentId",
  protectEmployer,
  updateApplicantStatus
);


module.exports = router;