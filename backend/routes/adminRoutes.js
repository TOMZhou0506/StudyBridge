import express from "express";
import SessionBooking from "../models/SessionBooking.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// A2 HD Task 1: GET /admin/analytics - marketplace analytics
router.get(
  "/analytics",
  verifyToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      // Aggregation pipeline will be added next
      // Marketplace analytics using one aggregation pipeline
      const result = await SessionBooking.aggregate([
        {
          // $facet allows us to perform multiple
          // aggregations in parallel and return
          // the results in a single document
          $facet: {
            // Total number of bookings
            topSubjects: [
              {
                $group: {
                  _id: "$subjectId",
                  bookingCount: {
                    $sum: 1,
                  },
                },
              },
              {
                $sort: {
                  bookingCount: -1,
                },
              },
              {
                $limit: 5,
              },
              {
                $lookup: {
                  from: "subjects",
                  localField: "_id",
                  foreignField: "_id",
                  as: "subject",
                },
              },
              {
                $unwind: "$subject",
              },
              {
                $project: {
                  _id: 0,
                  subjectId: "$_id",
                  subjectName: "$subject.name",
                  bookingCount: 1,
                },
              },
            ],
            // Top 5 tutors with the most completed bookings
            topTutors: [
              {
                $match: {
                  status: "completed",
                },
              },
              {
                $group: {
                  _id: "$tutorId",
                  completedBookingCount: {
                    $sum: 1,
                  },
                },
              },
              {
                $sort: {
                  completedBookingCount: -1,
                },
              },
              {
                $limit: 5,
              },
              {
                $lookup: {
                  from: "users",
                  localField: "_id",
                  foreignField: "_id",
                  as: "tutor",
                },
              },
              {
                $unwind: "$tutor",
              },
              {
                $project: {
                  _id: 0,
                  tutorId: "$_id",
                  fullName: "$tutor.fullName",
                  completedBookingCount: 1,
                },
              },
            ],
            // total number of bookings, completed bookings,
            // cancelled bookings, completion rate, and cancellation rate
            rates: [
              {
                $group: {
                  _id: null,
                  totalBookings: {
                    $sum: 1,
                  },
                  completedBookings: {
                    $sum: {
                      $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
                    },
                  },
                  cancelledBookings: {
                    $sum: {
                      $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  totalBookings: 1,
                  // Calculate completion rate as a percentage
                  completionRate: {
                    $cond: [
                      { $gt: ["$totalBookings", 0] },
                      {
                        $multiply: [
                          {
                            $divide: ["$completedBookings", "$totalBookings"],
                          },
                          100,
                        ],
                      },
                      0,
                    ],
                  },
                  // Calculate cancellation rate as a percentage
                  cancellationRate: {
                    $cond: [
                      { $gt: ["$totalBookings", 0] },
                      {
                        $multiply: [
                          {
                            $divide: ["$cancelledBookings", "$totalBookings"],
                          },
                          100,
                        ],
                      },
                      0,
                    ],
                  },
                },
              },
            ],
            // total revenue generated from completed bookings
            revenue: [
              {
                $match: {
                  status: "completed",
                },
              },
              {
                $lookup: {
                  from: "availabilityslots",
                  localField: "slotId",
                  foreignField: "_id",
                  as: "slot",
                },
              },
              {
                $unwind: "$slot",
              },
              {
                $group: {
                  _id: null,
                  estimatedRevenue: {
                    $sum: {
                      $multiply: [
                        "$agreedRate",
                        {
                          $divide: ["$slot.durationMinutes", 60],
                        },
                      ],
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  estimatedRevenue: 1,
                },
              },
            ],
          },
        },
      ]);

      // Extract the analytics data from the result
      const analytics = result[0];

      return res.status(200).json({
        topSubjects: analytics.topSubjects,
        topTutors: analytics.topTutors,

        totalBookings: analytics.rates[0]?.totalBookings ?? 0,
        completionRate: analytics.rates[0]?.completionRate ?? 0,
        cancellationRate: analytics.rates[0]?.cancellationRate ?? 0,

        estimatedRevenue: analytics.revenue[0]?.estimatedRevenue ?? 0,
      });
    } catch (error) {
      return res.status(500).json({
        error: error.message,
      });
    }
  },
);

export default router;
