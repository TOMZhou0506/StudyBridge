import express from "express";
import TutorProfile from "../models/TutorProfile.js";
import Subject from "../models/Subject.js";
import User from "../models/User.js";
import AvailabilitySlot from "../models/AvailabilitySlot.js";
import Review from "../models/Review.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// Task 5: POST /tutors/profile - create tutor profile
router.post("/profile", verifyToken, requireRole("tutor"), async (req, res) => {
  try {
    // Validate required fields
    const { bio, hourlyRate, subjects } = req.body;

    // Check if a tutor profile already exists for the user
    const existingProfile = await TutorProfile.findOne({
      userId: req.user.userId,
    });
    // already exists, return 409 Conflict
    if (existingProfile) {
      return res.status(409).json({
        error: "tutor profile already exists",
      });
    }
    // undefined check for hourlyRate and subjects
    if (hourlyRate === undefined || !subjects) {
      return res.status(400).json({
        error: "hourlyRate and subjects are required",
      });
    }

    // Validate subjects is an array and not empty
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        error: "at least one subject is required",
      });
    }

    if (hourlyRate < 5 || hourlyRate > 200) {
      return res.status(400).json({
        error: "hourlyRate must be between 5 and 200",
      });
    }
    // Check if all subjects exist in the database
    const foundSubjects = await Subject.find({
      _id: { $in: subjects },
    });

    if (foundSubjects.length !== subjects.length) {
      return res.status(400).json({
        error: "one or more subjects do not exist",
      });
    }

    const profile = await TutorProfile.create({
      userId: req.user.userId,
      bio,
      hourlyRate,
      subjects,
    });

    return res.status(201).json(profile);
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
});

// Task 5: PUT /tutors/profile - replace tutor profile
router.put("/profile", verifyToken, requireRole("tutor"), async (req, res) => {
  try {
    const { bio, hourlyRate, subjects, photoUrl } = req.body;
    // Validate required fields
    if (hourlyRate === undefined || subjects === undefined) {
      return res.status(400).json({
        error: "hourlyRate and subjects are required",
      });
    }
    // Validate subjects is an array and not empty
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        error: "at least one subject is required",
      });
    }
    // Validate hourlyRate is within the allowed range
    if (hourlyRate < 5 || hourlyRate > 200) {
      return res.status(400).json({
        error: "hourlyRate must be between 5 and 200",
      });
    }
    // Find the tutor profile for the authenticated user
    const profile = await TutorProfile.findOne({
      userId: req.user.userId,
    });

    if (!profile) {
      return res.status(404).json({
        error: "tutor profile not found",
      });
    }
    // Check if all subjects exist in the database
    const foundSubjects = await Subject.find({
      _id: { $in: subjects },
    });
    // If the number of found subjects does not match the number of provided subjects, return an error
    if (foundSubjects.length !== subjects.length) {
      return res.status(400).json({
        error: "one or more subjects do not exist",
      });
    }
    // Update the tutor profile with the new data
    profile.bio = bio ?? "";
    profile.hourlyRate = hourlyRate;
    profile.subjects = subjects;
    // A3 HD Task 3: Updates the photo only when a new URL is explicitly provided.
    if (photoUrl !== undefined) {
      if (typeof photoUrl !== "string" || photoUrl.trim() === "") {
        return res.status(400).json({
          error: "photoUrl must be a non-empty string",
        });
      }

      profile.photoUrl = photoUrl.trim();
    }
    // Save the updated profile to the database
    await profile.save();

    return res.status(200).json(profile);
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
});

// Task 8: GET /tutors/search - search and discover tutor profiles
router.get("/search", verifyToken, async (req, res) => {
  try {
    // Extract query parameters for filtering tutors
    const { subject, minPrice, maxPrice, minRating, availableThisWeek } =
      req.query;
    // Build the aggregation pipeline for searching tutors
    const pipeline = [
      {
        // similar to join in SQL, this stage joins the TutorProfile collection with the User collection based on userId
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
        $lookup: {
          from: "availabilityslots",
          localField: "userId",
          foreignField: "tutorId",
          as: "slotDocs",
        },
      },
      // HD Task 2: Load bookings involving each tutor
      {
        $lookup: {
          from: "sessionbookings",
          localField: "userId",
          foreignField: "tutorId",
          as: "bookingDocs",
        },
      },
    ];

    // Task 8: Exact subject name match, case-insensitive
    if (subject) {
      pipeline.push({
        $match: {
          "subjectDocs.name": {
            $regex: `^${subject}$`, //^ starts with, $ ends with, so this regex matches the exact subject name
            $options: "i", // ignore uppercase/lowercase
          },
        },
      });
    }

    // Task 8: Filter tutors with an unbooked slot in the next 7 days
    if (availableThisWeek === "true") {
      const now = new Date();
      const sevenDaysLater = new Date();

      sevenDaysLater.setDate(now.getDate() + 7);

      pipeline.push({
        $match: {
          slotDocs: {
            $elemMatch: {
              isBooked: false,
              date: {
                $gte: now,
                $lte: sevenDaysLater,
              },
            },
          },
        },
      });
    }

    // Task 8: Price filters
    const minPriceNumber = Number(minPrice);
    const maxPriceNumber = Number(maxPrice);

    if (minPrice && !Number.isNaN(minPriceNumber)) {
      pipeline.push({
        $match: {
          hourlyRate: {
            $gte: minPriceNumber, // greater than or equal to minPrice
          },
        },
      });
    }

    if (maxPrice && !Number.isNaN(maxPriceNumber)) {
      pipeline.push({
        $match: {
          hourlyRate: {
            $lte: maxPriceNumber, // less than or equal to maxPrice
          },
        },
      });
    }

    // Task 8: Build the required tutor summary and calculate live ratings
    pipeline.push({
      $project: {
        _id: 0,
        userId: "$userId",
        fullName: "$user.fullName",
        // HD Task 2: Include the tutor's bio
        bio: 1,
        hourlyRate: 1,
        subjects: "$subjectDocs.name",

        // Includes the persisted tutor photo in search results.
        photoUrl: {
          $ifNull: ["$photoUrl", null],
        },
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
        // $gt  → greater than
        // $gte → greater than or equal to
        // $lt  → less than
        // $lte → less than or equal to
        // $eq  → equal to
        // $ne  → not equal to

        // HD Task 2: Calculate tutor reliability score
        reliabilityScore: {
          $cond: [
            {
              $eq: [{ $size: "$bookingDocs" }, 0], // If there are no bookings, reliability score is 100
            },
            100,
            {
              $round: [
                // Round the score to the nearest integer
                {
                  $subtract: [
                    // Subtract the percentage of bookings cancelled by the tutor from 100
                    100,
                    {
                      $multiply: [
                        // Calculate the percentage of bookings cancelled by the tutor
                        {
                          $divide: [
                            // Count the number of bookings cancelled by the tutor and divide by the total number of bookings
                            {
                              $size: {
                                $filter: {
                                  // Filter bookings that were cancelled by the tutor
                                  input: "$bookingDocs",
                                  as: "booking",
                                  cond: {
                                    $and: [
                                      {
                                        $eq: ["$$booking.status", "cancelled"],
                                      },
                                      {
                                        $eq: ["$$booking.cancelledBy", "tutor"],
                                      },
                                    ],
                                  },
                                },
                              },
                            },
                            {
                              $size: "$bookingDocs",
                            },
                          ],
                        },
                        100,
                      ],
                    },
                  ],
                },
                0,
              ],
            },
          ],
        },
      },
    });

    // Task 8: Filter by minimum rating after averageRating is calculated
    const minRatingNumber = Number(minRating);

    if (minRating && !Number.isNaN(minRatingNumber)) {
      pipeline.push({
        $match: {
          averageRating: {
            $gte: minRatingNumber,
          },
        },
      });
    }

    // Task 8: Sort by average rating from highest to lowest
    pipeline.push({
      $sort: {
        averageRating: -1,
      },
    });

    const tutors = await TutorProfile.aggregate(pipeline);

    return res.status(200).json(tutors);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

// Task 5: GET /tutors/:userId - get public tutor profile
router.get("/:userId", verifyToken, async (req, res) => {
  try {
    // Find the tutor profile for the given userId and populate subjects
    const profile = await TutorProfile.findOne({
      userId: req.params.userId,
    }).populate("subjects", "name");
    // Check if the profile exists
    if (!profile) {
      return res.status(404).json({
        error: "tutor profile not found",
      });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        error: "user not found",
      });
    }
    // Find available slots for the tutor that are not booked
    const availableSlots = await AvailabilitySlot.find({
      tutorId: req.params.userId,
      isBooked: false,
    });
    // Find reviews for the tutor and calculate average rating and review count
    const reviews = await Review.find({
      tutorId: req.params.userId,
    }).select("rating comment createdDate");
    // Calculate average rating and review count using aggregation
    const ratingSummary = await Review.aggregate([
      {
        // Match the tutor id
        $match: {
          tutorId: user._id,
        },
      },
      {
        // Group by tutorId and calculate average rating and review count
        $group: {
          _id: "$tutorId",
          averageRating: {
            $avg: "$rating",
          },
          reviewCount: {
            $sum: 1,
          },
        },
      },
    ]);

    // Get average rating and review count from the aggregation result
    const averageRating =
      ratingSummary.length > 0 ? ratingSummary[0].averageRating : null;
    // Round average rating to 1 decimal place if it exists
    const reviewCount =
      ratingSummary.length > 0 ? ratingSummary[0].reviewCount : 0;

    return res.status(200).json({
      userId: user._id,
      fullName: user.fullName,
      bio: profile.bio,
      hourlyRate: profile.hourlyRate,
      subjects: profile.subjects.map((subject) => subject.name),
      photoUrl: profile.photoUrl ?? null,
      averageRating,
      reviewCount,
      availableSlots,
      reviews,
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
});

export default router;
