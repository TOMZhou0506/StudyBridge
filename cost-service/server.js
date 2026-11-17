import cors from "cors";
import express from "express";

const app = express();
const PORT = process.env.PORT || 8082;

// A3 Task 12: Implements the standalone session cost calculation service.
app.use(cors());

// Parses the JSON request body.
app.use(express.json());

// Rounds a completed calculation to two decimal places.
function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Calculates the session subtotal, platform fee, and total.
app.post("/calculate-cost", (req, res) => {
  const { agreedRate, durationMinutes } = req.body ?? {};

  // Rejects missing input values.
  if (agreedRate === undefined || durationMinutes === undefined) {
    return res.status(400).json({
      error: "agreedRate and durationMinutes are required",
    });
  }

  // Rejects values that are not finite numbers.
  if (
    typeof agreedRate !== "number" ||
    typeof durationMinutes !== "number" ||
    !Number.isFinite(agreedRate) ||
    !Number.isFinite(durationMinutes)
  ) {
    return res.status(400).json({
      error: "agreedRate and durationMinutes must be numbers",
    });
  }

  // Rejects a zero or negative hourly rate.
  if (agreedRate <= 0) {
    return res.status(400).json({
      error: "agreedRate must be greater than 0",
    });
  }

  // Applies the same duration range used by Assignment 2.
  if (durationMinutes < 30 || durationMinutes > 180) {
    return res.status(400).json({
      error: "durationMinutes must be between 30 and 180",
    });
  }

  // Calculates every value at full precision before rounding the response.
  const subtotal = agreedRate * (durationMinutes / 60);
  const platformFee = subtotal * 0.1;
  const total = subtotal + platformFee;

  return res.status(200).json({
    subtotal: roundCurrency(subtotal),
    platformFee: roundCurrency(platformFee),
    total: roundCurrency(total),
  });
});

// Uses Cloud Run's PORT value or port 8082 during local development.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Cost service listening on port ${PORT}`);
});
