import express from "express";
import SessionBooking from "../models/SessionBooking.js";
import TutorProfile from "../models/TutorProfile.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// A2 HD Task 3: GET /learners/me/recommendations - recommend tutors to learner
router.get(
  "/me/recommendations",
  verifyToken,
  requireRole("learner"),
  async (req, res) => {
    try {
      // Step 1: Find the learner's completed bookings
      const completedBookings = await SessionBooking.find({
        learnerId: req.user.userId,
        status: "completed",
      });

      // Step 2: Extract unique subject IDs from completed bookings
      const subjectIds = [
        ...new Set(
          completedBookings.map((booking) => booking.subjectId.toString()),
        ),
      ];

      // Step 3: Find all tutors the learner has booked before
      const previousBookings = await SessionBooking.find({
        learnerId: req.user.userId,
      });

      const bookedTutorIds = [
        ...new Set(
          previousBookings.map((booking) => booking.tutorId.toString()),
        ),
      ];

      // Step 4: Find candidate tutors who teach completed subjects
      // and have never been booked by this learner
      const candidateTutors = await TutorProfile.find({
        subjects: { $in: subjectIds },
        userId: { $nin: bookedTutorIds },
      });

      let recommendations;

      // Step 5: Use matching tutors if any exist
      if (candidateTutors.length > 0) {
        const candidateIds = candidateTutors.map((profile) => profile.userId);

        recommendations = await TutorProfile.aggregate([
          {
            $match: {
              userId: { $in: candidateIds },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $unwind: "$user",
          },
          {
            $lookup: {
              from: "subjects",
              localField: "subjects",
              foreignField: "_id",
              as: "subjectDocs",
            },
          },
          {
            $lookup: {
              from: "reviews",
              localField: "userId",
              foreignField: "tutorId",
              as: "reviewDocs",
            },
          },
          {
            $project: {
              _id: 0,
              userId: 1,
              fullName: "$user.fullName",
              bio: 1,
              hourlyRate: 1,
              subjects: "$subjectDocs.name",

              averageRating: {
                $cond: [
                  {
                    $gt: [
                      {
                        $size: "$reviewDocs",
                      },
                      0,
                    ],
                  },
                  {
                    $avg: "$reviewDocs.rating",
                  },
                  null,
                ],
              },

              reviewCount: {
                $size: "$reviewDocs",
              },
            },
          },
          {
            $sort: {
              averageRating: -1,
            },
          },
          {
            $limit: 5,
          },
        ]);
      } else {
        // Step 6: Fallback
        // If there are no completed subjects or no new matching tutors,
        // return the highest-rated tutors across the marketplace.
        recommendations = await TutorProfile.aggregate([
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $unwind: "$user",
          },
          {
            $lookup: {
              from: "subjects",
              localField: "subjects",
              foreignField: "_id",
              as: "subjectDocs",
            },
          },
          {
            $lookup: {
              from: "reviews",
              localField: "userId",
              foreignField: "tutorId",
              as: "reviewDocs",
            },
          },
          {
            $project: {
              _id: 0,
              userId: 1,
              fullName: "$user.fullName",
              bio: 1,
              hourlyRate: 1,
              subjects: "$subjectDocs.name",

              averageRating: {
                $cond: [
                  {
                    $gt: [
                      {
                        $size: "$reviewDocs",
                      },
                      0,
                    ],
                  },
                  {
                    $avg: "$reviewDocs.rating",
                  },
                  null,
                ],
              },

              reviewCount: {
                $size: "$reviewDocs",
              },
            },
          },
          {
            $sort: {
              averageRating: -1,
            },
          },
          {
            $limit: 5,
          },
        ]);
      }

      return res.status(200).json(recommendations);
    } catch (error) {
      return res.status(500).json({
        error: error.message,
      });
    }
  },
);

export default router;
