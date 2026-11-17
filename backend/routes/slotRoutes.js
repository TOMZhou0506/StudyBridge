import express from "express";
import AvailabilitySlot from "../models/AvailabilitySlot.js";
import TutorProfile from "../models/TutorProfile.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// Task 7: Helper function to convert time string (HH:mm) to minutes
function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Task 7: POST /slots - create an availability slot (tutor only)
router.post("/", verifyToken, requireRole("tutor"), async (req, res) => {
  try {
    // Extract date, startTime, and durationMinutes from the request body
    const { date, startTime, durationMinutes } = req.body;

    if (!date || !startTime || durationMinutes === undefined) {
      return res.status(400).json({
        error: "date, startTime, and durationMinutes are required",
      });
    }
    // Check if the tutor has a profile
    const tutorProfile = await TutorProfile.findOne({
      userId: req.user.userId,
    });

    if (!tutorProfile) {
      return res.status(409).json({
        error: "tutor profile must be created before publishing slots",
      });
    }
    // Validate durationMinutes
    if (durationMinutes < 30 || durationMinutes > 180) {
      return res.status(400).json({
        error: "durationMinutes must be between 30 and 180",
      });
    }

    const newStart = timeToMinutes(startTime);
    const newEnd = newStart + durationMinutes;

    const existingSlots = await AvailabilitySlot.find({
      tutorId: req.user.userId,
      date: new Date(date),
    });

    // Check for overlapping slots
    for (const slot of existingSlots) {
      const existingStart = timeToMinutes(slot.startTime);
      const existingEnd = existingStart + slot.durationMinutes;

      const overlaps = newStart < existingEnd && newEnd > existingStart;

      if (overlaps) {
        return res.status(409).json({
          error: `this overlaps your existing slot on ${date} at ${slot.startTime} (${slot.durationMinutes} minutes)`,
        });
      }
    }

    const slot = await AvailabilitySlot.create({
      tutorId: req.user.userId,
      date,
      startTime,
      durationMinutes,
    });

    return res.status(201).json(slot);
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
});

// Task 7: GET /slots/mine - list all slots owned by the current tutor
router.get("/mine", verifyToken, requireRole("tutor"), async (req, res) => {
  try {
    const slots = await AvailabilitySlot.find({
      tutorId: req.user.userId,
    });

    return res.status(200).json(slots);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

// Task 7: DELETE /slots/:slotId - delete own unbooked slot (tutor only)
router.delete(
  "/:slotId",
  verifyToken,
  requireRole("tutor"),
  async (req, res) => {
    try {
      const slot = await AvailabilitySlot.findById(req.params.slotId);

      if (!slot) {
        return res.status(404).json({
          error: "slot not found",
        });
      }

      if (slot.tutorId.toString() !== req.user.userId.toString()) {
        return res.status(403).json({
          error: "you can only delete your own slots",
        });
      }

      if (slot.isBooked) {
        return res.status(409).json({
          error: "booked slots cannot be deleted directly",
        });
      }

      await AvailabilitySlot.findByIdAndDelete(req.params.slotId);

      return res.status(200).json({
        message: "slot deleted",
      });
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  },
);
export default router;
