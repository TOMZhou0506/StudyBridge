import express from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import SessionBooking from "../models/SessionBooking.js";

const router = express.Router();

// Task 2: User Registration
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    // Validate required fields
    if (!fullName || !email || !password || !role) {
      return res.status(400).json({
        error: "fullName, email, password, and role are required",
      });
    }
    // Validate role
    if (role !== "learner" && role !== "tutor") {
      return res.status(400).json({
        error: "role must be learner or tutor",
      });
    }
    // Validate password complexity
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      return res.status(400).json({
        error:
          "password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        error: "email already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email,
      passwordHash,
      role,
    });

    const responseUser = user.toObject();
    delete responseUser.passwordHash;

    return res.status(201).json(responseUser);
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
});

// Task 3: User Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "email and password are required",
      });
    }

    // Find user by email (case-insensitive)
    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        error: "invalid email or password",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        error: "invalid email or password",
      });
    }
    // Generate JWT token with userId, role, and tokenVersion
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        tokenVersion: user.tokenVersion,
      },
      process.env.JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "2h",
      },
    );

    return res.status(200).json({ token });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

// Task 3: Get Current User Info
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-passwordHash");

    if (!user) {
      return res.status(404).json({
        error: "user not found",
      });
    }

    const firstName = user.fullName.trim().split(/\s+/)[0];

    // HD Task 2: Calculate reliability score based on user's booking history
    const bookings = await SessionBooking.find({
      $or: [{ learnerId: user._id }, { tutorId: user._id }],
    });

    let reliabilityScore = 100;

    if (bookings.length > 0) {
      const cancelledByThisUser = bookings.filter((booking) => {
        if (booking.status !== "cancelled") {
          return false;
        }

        if (
          user.role === "learner" &&
          booking.learnerId.toString() === user._id.toString() &&
          booking.cancelledBy === "learner"
        ) {
          return true;
        }

        if (
          user.role === "tutor" &&
          booking.tutorId.toString() === user._id.toString() &&
          booking.cancelledBy === "tutor"
        ) {
          return true;
        }

        return false;
      }).length;

      reliabilityScore = Math.round(
        100 - (cancelledByThisUser / bookings.length) * 100,
      );
    }
    return res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      createdDate: user.createdDate,
      greeting: `Welcome back, ${firstName}!`,
      reliabilityScore,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

// Task 3: User Logout
router.post("/logout", verifyToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { tokenVersion: 1 },
    });

    return res.status(200).json({
      message: "logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

// Task 4: Role-Based Access Control (RBAC) Test Endpoint
// This endpoint was used only to test verifyToken + requireRole("tutor").
// It is not part of the Assignment 2 required routes.
//
// router.get("/tutor-test", verifyToken, requireRole("tutor"), (req, res) => {
//   return res.status(200).json({
//     message: "tutor access granted",
//   });
// });

export default router;
