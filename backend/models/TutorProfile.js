import mongoose from "mongoose";

const tutorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },

  bio: {
    type: String,
    maxlength: 500,
    trim: true,
  },

  hourlyRate: {
    type: Number,
    required: true,
    min: 5,
    max: 200,
  },

  subjects: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
  ],

  // A3 HD Task 3: Stores the tutor's public Cloud Storage photo URL.
  photoUrl: {
    type: String,
    trim: true,
  },

  createdDate: {
    type: Date,
    default: Date.now,
  },
});

const TutorProfile = mongoose.model("TutorProfile", tutorProfileSchema);

export default TutorProfile;
