import mongoose from "mongoose";

const availabilitySlotSchema = new mongoose.Schema({
  tutorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  date: {
    type: Date,
    required: true,
  },

  startTime: {
    type: String,
    required: true,
  },

  durationMinutes: {
    type: Number,
    required: true,
    min: 30,
    max: 180,
  },

  isBooked: {
    type: Boolean,
    default: false,
  },

  createdDate: {
    type: Date,
    default: Date.now,
  },
});

const AvailabilitySlot = mongoose.model(
  "AvailabilitySlot",
  availabilitySlotSchema,
);

export default AvailabilitySlot;
