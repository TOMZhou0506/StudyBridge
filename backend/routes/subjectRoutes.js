import express from "express";
import Subject from "../models/Subject.js";
import TutorProfile from "../models/TutorProfile.js";
import SessionBooking from "../models/SessionBooking.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
const router = express.Router();

// Task 6: GET /subjects - list all subjects
router.get("/", verifyToken, async (req, res) => {
  try {
    // Fetch all subjects from the database
    const subjects = await Subject.find();

    return res.status(200).json(subjects);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});
// Task 6: GET /subjects/:subjectId - get one subject
router.get("/:subjectId", verifyToken, async (req, res) => {
  try {
    // Fetch the subject by ID from the database
    const subject = await Subject.findById(req.params.subjectId);

    if (!subject) {
      return res.status(404).json({
        error: "subject not found",
      });
    }

    return res.status(200).json(subject);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

// Task 6: POST /subjects - create a subject (admin only)
router.post("/", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    // Extract name, category, and description from the request body
    const { name, category, description } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        error: "name and category are required",
      });
    }

    // Check if a subject with the same name (case-insensitive) already exists
    const existingSubject = await Subject.findOne({
      name: new RegExp(`^${name}$`, "i"), // ignore uppercase and lowercase
    });

    if (existingSubject) {
      return res.status(409).json({
        error: "subject name already exists",
      });
    }

    const subject = await Subject.create({
      name,
      category,
      description,
    });

    return res.status(201).json(subject);
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
});

// Task 6: PUT /subjects/:subjectId - replace a subject (admin only)
router.put(
  "/:subjectId",
  verifyToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      // Extract name, category, and description from the request body
      const { name, category, description } = req.body;

      if (!name || !category) {
        return res.status(400).json({
          error: "name and category are required",
        });
      }

      const subject = await Subject.findById(req.params.subjectId);

      if (!subject) {
        return res.status(404).json({
          error: "subject not found",
        });
      }

      // Check if a subject with the same name (case-insensitive) already exists
      const duplicateSubject = await Subject.findOne({
        _id: { $ne: req.params.subjectId },
        name: new RegExp(`^${name}$`, "i"),
      });

      if (duplicateSubject) {
        return res.status(409).json({
          error: "subject name already exists",
        });
      }

      subject.name = name;
      subject.category = category;
      subject.description = description ?? "";

      await subject.save();

      return res.status(200).json(subject);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  },
);

// Task 6: DELETE /subjects/:subjectId - delete an unused subject (admin only)
router.delete(
  "/:subjectId",
  verifyToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const subject = await Subject.findById(req.params.subjectId);

      if (!subject) {
        return res.status(404).json({
          error: "subject not found",
        });
      }

      // Check if the subject is used by any tutor profile or session booking
      const usedByTutorProfile = await TutorProfile.findOne({
        subjects: req.params.subjectId,
      });

      // Check if the subject is used by any session booking
      const usedByBooking = await SessionBooking.findOne({
        subjectId: req.params.subjectId,
      });

      // Check if the subject is used by any tutor profile or session booking
      if (usedByTutorProfile || usedByBooking) {
        return res.status(409).json({
          error: "subject is in use and cannot be deleted",
        });
      }

      // Delete the subject from the database
      await Subject.findByIdAndDelete(req.params.subjectId);

      return res.status(200).json({
        message: "subject deleted",
      });
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  },
);
export default router;
