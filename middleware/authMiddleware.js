const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const Employer = require("../models/Employer");

const protectStudent = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);


    const student = await Student.findById(decoded.id).select("-passwordHash");
    if (!student) {
      return res.status(401).json({ message: "Student not found" });
    }

    req.student = student;
    next();
  } catch (error) {
    console.log(error)
    res.status(401).json({ message: "Not authorized, invalid token" });
  }
};

const protectEmployer = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);



    const employer = await Employer.findById(decoded.id).select("-passwordHash");
    if (!employer) {
      return res.status(401).json({ message: "Employer not found" });
    }

    req.employer = employer;
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, invalid token" });
  }
};

module.exports = { protectStudent, protectEmployer };