import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },

  category: {
    type: String,
    required: true,
    enum: [
      "Mathematics",
      "Computer Science",
      "Science",
      "Languages",
      "Business",
      "Other",
    ],
  },

  description: {
    type: String,
    trim: true,
  },

  createdDate: {
    type: Date,
    default: Date.now,
  },
});

const Subject = mongoose.model("Subject", subjectSchema);

export default Subject;
