

const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const studentRoutes = require("./routes/studentRoutes");
const employerRoutes = require("./routes/employerRoutes");
const jobRoutes = require("./routes/jobRoutes");
const connectDB = require("./config/db");
const server = http.createServer(app);
const path = require("path");


const app = express();

connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/students", studentRoutes);
app.use("/api/employers", employerRoutes);
app.use("/api/jobs", jobRoutes);



app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let users = {};

io.on("connection", (socket) => {
  socket.on("register", ({ userId, role }) => {
    users[userId] = {
      socketId: socket.id,
      role
    };
  });

  socket.on("disconnect", () => {
    for (let id in users) {
      if (users[id].socketId === socket.id) {
        delete users[id];
        break;
      }
    }
  });
});

app.set("io", io);
app.set("users", users);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});