import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import authRoutes from "./routes/authRoutes.js";
import tutorRoutes from "./routes/tutorRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import slotRoutes from "./routes/slotRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import learnerRoutes from "./routes/learnerRoutes.js";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A3 HD Task 1: Locates and serves the compiled Angular application.
const BACKEND_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST_PATH = path.join(
  BACKEND_DIRECTORY,
  "../frontend/dist/frontend/browser",
);
const ANGULAR_ORIGIN = "http://localhost:4200";
const app = express();

// A3 Task 10: Shares one HTTP server between Express and Socket.io.
const httpServer = createServer(app);

// Allows the Angular client to open a socket connection.
const io = new Server(httpServer, {
  cors: {
    origin: ANGULAR_ORIGIN,
  },
});

// Makes Socket.io available inside existing route handlers.
app.set("io", io);

const PORT = process.env.PORT || 8081;
const MONGO_URI = process.env.MONGO_URI;

// Assignment 3: Enable CORS for Angular development server
app.use(
  cors({
    origin: ANGULAR_ORIGIN,
  }),
);

// Task 3: Middleware to parse JSON request bodies
app.use(express.json());

// Task 4: Authentication routes
app.use("/api/35484632/auth", authRoutes);
// Task 5: Tutor Management routes
app.use("/api/35484632/tutors", tutorRoutes);

// Task 6: Subject Catalog routes
app.use("/api/35484632/subjects", subjectRoutes);

// Task 7: Availability Slot routes
app.use("/api/35484632/slots", slotRoutes);

// Task 9: Booking routes
app.use("/api/35484632/bookings", bookingRoutes);

// A2 HD Task 1: Admin routes for analytics
app.use("/api/35484632/admin", adminRoutes);

// A2 HD Task 3: Learner routes for recommendations
app.use("/api/35484632/learners", learnerRoutes);

// Serves compiled Angular files from Express.
app.use(express.static(FRONTEND_DIST_PATH));

// Lets Angular handle client-side routes and page refreshes.
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST_PATH, "index.html"));
});
async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("Connected to MongoDB");

    httpServer.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
}

startServer();
