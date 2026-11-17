import express from "express";
import SessionBooking from "../models/SessionBooking.js";
import AvailabilitySlot from "../models/AvailabilitySlot.js";
import TutorProfile from "../models/TutorProfile.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import Review from "../models/Review.js";
import { GoogleGenAI } from "@google/genai";
const router = express.Router();

// Task 9: POST /bookings - atomically book an available slot
router.post("/", verifyToken, requireRole("learner"), async (req, res) => {
  try {
    const { slotId, subjectId } = req.body;

    if (!slotId || !subjectId) {
      return res.status(400).json({
        error: "slotId and subjectId are required",
      });
    }

    // Step 1: Load the slot
    const existingSlot = await AvailabilitySlot.findById(slotId);

    if (!existingSlot) {
      return res.status(404).json({
        error: "slot not found",
      });
    }

    // Step 2: Check that the tutor teaches the submitted subject
    const tutorProfile = await TutorProfile.findOne({
      userId: existingSlot.tutorId,
    });

    const teachesSubject = tutorProfile?.subjects.some(
      (id) => id.toString() === subjectId.toString(),
    );

    if (!teachesSubject) {
      return res.status(400).json({
        error: "tutor does not teach this subject",
      });
    }

    // Step 3: Atomically reserve the slot
    const reservedSlot = await AvailabilitySlot.findOneAndUpdate(
      {
        _id: slotId,
        isBooked: false,
      },
      {
        $set: {
          isBooked: true,
        },
      },
      {
        new: true,
      },
    );

    if (!reservedSlot) {
      return res.status(409).json({
        error: "slot no longer available",
      });
    }

    // Step 4: Create the booking
    const booking = await SessionBooking.create({
      learnerId: req.user.userId,
      tutorId: existingSlot.tutorId,
      subjectId,
      slotId: existingSlot._id,
      agreedRate: tutorProfile.hourlyRate,
      status: "requested",
    });

    // A3 Task 10: Broadcasts successful slot reservations and releases.
    const io = req.app.get("io");
    io.emit("slot:booked", {
      slotId: existingSlot._id.toString(),
      tutorId: existingSlot.tutorId.toString(),
    });

    return res.status(201).json(booking);
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
});

// Task 10: GET /bookings/mine - list bookings for the authenticated user
router.get("/mine", verifyToken, async (req, res) => {
  try {
    const filter =
      req.user.role === "learner"
        ? { learnerId: req.user.userId }
        : { tutorId: req.user.userId };

    const bookings = await SessionBooking.find(filter);

    return res.status(200).json(bookings);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

// Task 10: PATCH /bookings/:bookingId/confirm - tutor confirms a requested booking
router.patch(
  "/:bookingId/confirm",
  verifyToken,
  requireRole("tutor"),
  async (req, res) => {
    try {
      const booking = await SessionBooking.findById(req.params.bookingId);

      if (!booking) {
        return res.status(404).json({
          error: "booking not found",
        });
      }

      if (booking.tutorId.toString() !== req.user.userId.toString()) {
        return res.status(403).json({
          error: "you can only confirm your own bookings",
        });
      }

      if (booking.status !== "requested") {
        return res.status(409).json({
          error: "only requested bookings can be confirmed",
        });
      }

      booking.status = "confirmed";
      await booking.save();

      return res.status(200).json(booking);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  },
);

// Task 10: PATCH /bookings/:bookingId/complete - tutor completes a confirmed booking
router.patch(
  "/:bookingId/complete",
  verifyToken,
  requireRole("tutor"),
  async (req, res) => {
    try {
      const booking = await SessionBooking.findById(req.params.bookingId);

      if (!booking) {
        return res.status(404).json({
          error: "booking not found",
        });
      }

      if (booking.tutorId.toString() !== req.user.userId.toString()) {
        return res.status(403).json({
          error: "you can only complete your own bookings",
        });
      }

      if (booking.status !== "confirmed") {
        return res.status(409).json({
          error: "only confirmed bookings can be completed",
        });
      }

      booking.status = "completed";
      await booking.save();

      return res.status(200).json(booking);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  },
);

// Task 10: PATCH /bookings/:bookingId/cancel - cancel a booking
router.patch(
  "/:bookingId/cancel",
  verifyToken,
  requireRole("learner", "tutor"),
  async (req, res) => {
    try {
      const booking = await SessionBooking.findById(req.params.bookingId);

      if (!booking) {
        return res.status(404).json({
          error: "booking not found",
        });
      }

      const isLearner =
        booking.learnerId.toString() === req.user.userId.toString();

      const isTutor = booking.tutorId.toString() === req.user.userId.toString();

      if (!isLearner && !isTutor) {
        return res.status(403).json({
          error: "you are not part of this booking",
        });
      }

      if (booking.status !== "requested" && booking.status !== "confirmed") {
        return res.status(409).json({
          error: `booking cannot be cancelled from status ${booking.status}`,
        });
      }

      // HD Task 2: Record who cancelled the booking
      booking.status = "cancelled";
      booking.cancelledBy = req.user.role;

      await booking.save();

      await AvailabilitySlot.findByIdAndUpdate(booking.slotId, {
        $set: {
          isBooked: false,
        },
      });

      // Broadcast the successfully released slot.
      const io = req.app.get("io");
      io.emit("slot:freed", {
        slotId: booking.slotId.toString(),
        tutorId: booking.tutorId.toString(),
      });

      return res.status(200).json(booking);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  },
);

// Task 11: POST /bookings/:bookingId/review - learner reviews a completed booking
router.post(
  "/:bookingId/review",
  verifyToken,
  requireRole("learner"),
  async (req, res) => {
    try {
      const { rating, comment } = req.body;

      if (rating === undefined) {
        return res.status(400).json({
          error: "rating is required",
        });
      }
      // Validate rating is an integer between 1 and 5
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({
          error: "rating must be an integer between 1 and 5",
        });
      }

      const booking = await SessionBooking.findById(req.params.bookingId);

      if (!booking) {
        return res.status(404).json({
          error: "booking not found",
        });
      }

      if (booking.learnerId.toString() !== req.user.userId.toString()) {
        return res.status(403).json({
          error: "you can only review your own booking",
        });
      }

      if (booking.status !== "completed") {
        return res.status(409).json({
          error: `booking cannot be reviewed from status ${booking.status}`,
        });
      }
      // Check if a review already exists for this booking
      const existingReview = await Review.findOne({
        bookingId: booking._id,
      });

      if (existingReview) {
        return res.status(409).json({
          error: "booking has already been reviewed",
        });
      }

      const review = await Review.create({
        bookingId: booking._id,
        learnerId: booking.learnerId,
        tutorId: booking.tutorId,
        rating,
        comment,
      });

      return res.status(201).json(review);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  },
);
// A3 HD Task 5: Generates an ephemeral Gemini recap for an owned completed session.
router.post(
  "/:bookingId/recap",
  verifyToken,
  requireRole("tutor"),
  async (req, res) => {
    try {
      const { notes } = req.body;

      // Validate the tutor notes
      if (typeof notes !== "string" || !notes.trim()) {
        return res.status(400).json({
          error: "notes are required",
        });
      }

      // Load the requested booking
      const booking = await SessionBooking.findById(req.params.bookingId);

      if (!booking) {
        return res.status(404).json({
          error: "booking not found",
        });
      }

      // Ensure the authenticated tutor owns the booking
      if (booking.tutorId.toString() !== req.user.userId.toString()) {
        return res.status(403).json({
          error: "you can only generate recaps for your own bookings",
        });
      }

      // Recaps are available only after the session is completed
      if (booking.status !== "completed") {
        return res.status(409).json({
          error: "only completed bookings can have a recap",
        });
      }

      // Ensure the Gemini API key is configured on the server
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "Gemini API key is not configured",
        });
      }

      // Create the Gemini client using the server-side API key
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });

      // Generate a concise recap without inventing extra information
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: `
Create a short tutoring session recap from the tutor notes below.

Requirements:
- Summarise the main topics covered.
- Mention the learner's progress when stated.
- Include any next steps when stated.
- Use plain text only.
- Start each point with the • character.
- Do not use Markdown syntax such as asterisks or headings.
- Do not invent information that is not in the notes.

Tutor notes:
${notes.trim()}
        `.trim(),
      });

      const recap = response.text?.trim();

      if (!recap) {
        return res.status(502).json({
          error: "Gemini returned an empty recap",
        });
      }

      // Return the recap without saving it to MongoDB
      return res.status(200).json({
        recap,
      });
    } catch (error) {
      console.error("Failed to generate session recap:", error);

      if (error.name === "CastError") {
        return res.status(400).json({
          error: "invalid booking ID",
        });
      }

      return res.status(502).json({
        error: "failed to generate session recap",
      });
    }
  },
);
export default router;
