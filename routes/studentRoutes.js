const express = require("express");
const router = express.Router();
const {
  registerStudent,
  loginStudent,
  getProfile,
  updateProfile,
  suggestedJobs,
  applyJob,
  getNotifications,
  markNotificationSeen,
} = require("../controllers/studentController");
const { protectStudent } = require("../middleware/authMiddleware");
const upload = require("../utils/multer");

router.post("/register", registerStudent);
router.post("/login", loginStudent);
router.get("/profile", protectStudent, getProfile);
router.put("/profile", protectStudent, updateProfile);
router.get("/jobs",protectStudent, suggestedJobs);
router.post("/apply/:jobId", protectStudent, upload.single("resume"), applyJob);
router.get("/notifications", protectStudent, getNotifications);
router.patch("/notifications", protectStudent, markNotificationSeen);



module.exports = router;