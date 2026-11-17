import bcrypt from "bcrypt";
import mongoose from "mongoose";

import AvailabilitySlot from "./models/AvailabilitySlot.js";
import Review from "./models/Review.js";
import SessionBooking from "./models/SessionBooking.js";
import User from "./models/User.js";
import Subject from "./models/Subject.js";
import TutorProfile from "./models/TutorProfile.js";

const MONGO_URI = process.env.MONGO_URI;

const ADMIN_EMAIL = "admin@studybridge.com";
const ADMIN_PASSWORD = "Admin#2026";
const LEARNER_EMAIL = "task4.learner@studybridge.test";
const LEARNER_PASSWORD = "Learner#2026";
const TUTOR_PASSWORD = "Tutor#2026";

const subjects = [
  {
    name: "Linear Algebra",
    category: "Mathematics",
    description: "Vectors, matrices, and linear systems.",
  },
  {
    name: "Calculus",
    category: "Mathematics",
    description: "Differentiation and integration.",
  },
  {
    name: "Data Structures",
    category: "Computer Science",
    description: "Core data structures and algorithms.",
  },
  {
    name: "Web Development",
    category: "Computer Science",
    description: "Modern frontend and backend web development.",
  },
  {
    name: "Academic English",
    category: "Languages",
    description: "Academic writing and communication skills.",
  },
];

const tutors = [
  {
    fullName: "Alice Chen",
    email: "alice.chen@studybridge.test",
    bio: "Mathematics tutor specialising in calculus and linear algebra.",
    hourlyRate: 45,
    subjects: ["Linear Algebra", "Calculus"],
    openSlots: [
      { daysFromNow: 1, startTime: "10:00", durationMinutes: 60 },
      { daysFromNow: 3, startTime: "14:00", durationMinutes: 90 },
    ],
    reviews: [
      { rating: 5, comment: "Clear explanations and useful examples." },
      { rating: 4, comment: "Very helpful with exam preparation." },
    ],
  },
  {
    fullName: "Ben Carter",
    email: "ben.carter@studybridge.test",
    bio: "Software engineering tutor focused on practical coding skills.",
    hourlyRate: 60,
    subjects: ["Data Structures", "Web Development"],
    openSlots: [
      { daysFromNow: 2, startTime: "09:30", durationMinutes: 60 },
    ],
    reviews: [],
  },
  {
    fullName: "Priya Nair",
    email: "priya.nair@studybridge.test",
    bio: "Patient tutor for academic writing and introductory web development.",
    hourlyRate: 50,
    subjects: ["Academic English", "Web Development"],
    openSlots: [
      { daysFromNow: 5, startTime: "16:00", durationMinutes: 60 },
    ],
    reviews: [
      { rating: 5, comment: "Excellent feedback on my assignment writing." },
    ],
  },
  {
    fullName: "Liam Wong",
    email: "liam.wong@studybridge.test",
    bio: "Affordable tutoring for calculus and data structures.",
    hourlyRate: 35,
    subjects: ["Calculus", "Data Structures"],
    openSlots: [
      { daysFromNow: 9, startTime: "11:00", durationMinutes: 120 },
    ],
    reviews: [
      { rating: 3, comment: "Good session, but the pace was a little fast." },
    ],
  },
  {
    fullName: "Sofia Martinez",
    email: "sofia.martinez@studybridge.test",
    bio: "Experienced English tutor with a focus on confident communication.",
    hourlyRate: 70,
    subjects: ["Academic English"],
    openSlots: [
      { daysFromNow: 4, startTime: "13:00", durationMinutes: 60 },
      { daysFromNow: 6, startTime: "15:30", durationMinutes: 30 },
    ],
    reviews: [
      { rating: 4, comment: "Friendly and well prepared." },
      { rating: 4, comment: "The lesson structure was easy to follow." },
      { rating: 5, comment: "My presentation skills improved a lot." },
    ],
  },
];

function futureDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(0, 0, 0, 0);
  return date;
}

function pastDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function removePreviousSeedData(emails) {
  const users = await User.find({ email: { $in: emails } }).select("_id");
  const userIds = users.map((user) => user._id);

  const bookings = await SessionBooking.find({
    $or: [
      { learnerId: { $in: userIds } },
      { tutorId: { $in: userIds } },
    ],
  }).select("_id");
  const bookingIds = bookings.map((booking) => booking._id);

  await Review.deleteMany({
    $or: [
      { bookingId: { $in: bookingIds } },
      { learnerId: { $in: userIds } },
      { tutorId: { $in: userIds } },
    ],
  });
  await SessionBooking.deleteMany({ _id: { $in: bookingIds } });
  await AvailabilitySlot.deleteMany({ tutorId: { $in: userIds } });
  await TutorProfile.deleteMany({ userId: { $in: userIds } });
  await User.deleteMany({ email: { $in: emails } });
}

async function upsertSubjects() {
  const subjectMap = new Map();

  for (const fixture of subjects) {
    const subject = await Subject.findOneAndUpdate(
      { name: fixture.name },
      { $set: fixture },
      { upsert: true, returnDocument: "after" },
    );
    subjectMap.set(subject.name, subject);
  }

  return subjectMap;
}

async function createTutorData(fixture, learner, subjectMap, passwordHash) {
  const tutor = await User.create({
    fullName: fixture.fullName,
    email: fixture.email,
    passwordHash,
    role: "tutor",
  });

  const subjectIds = fixture.subjects.map(
    (name) => subjectMap.get(name)._id,
  );

  await TutorProfile.create({
    userId: tutor._id,
    bio: fixture.bio,
    hourlyRate: fixture.hourlyRate,
    subjects: subjectIds,
  });

  for (const slot of fixture.openSlots) {
    await AvailabilitySlot.create({
      tutorId: tutor._id,
      date: futureDate(slot.daysFromNow),
      startTime: slot.startTime,
      durationMinutes: slot.durationMinutes,
      isBooked: false,
    });
  }

  for (let index = 0; index < fixture.reviews.length; index++) {
    const reviewFixture = fixture.reviews[index];
    const bookedSlot = await AvailabilitySlot.create({
      tutorId: tutor._id,
      date: pastDate(index + 2),
      startTime: "12:00",
      durationMinutes: 60,
      isBooked: true,
    });

    const booking = await SessionBooking.create({
      learnerId: learner._id,
      tutorId: tutor._id,
      subjectId: subjectIds[0],
      slotId: bookedSlot._id,
      agreedRate: fixture.hourlyRate,
      status: "completed",
    });

    await Review.create({
      bookingId: booking._id,
      learnerId: learner._id,
      tutorId: tutor._id,
      rating: reviewFixture.rating,
      comment: reviewFixture.comment,
    });
  }
}

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const seedEmails = [
      ADMIN_EMAIL,
      LEARNER_EMAIL,
      ...tutors.map((tutor) => tutor.email),
    ];
    await removePreviousSeedData(seedEmails);

    const subjectMap = await upsertSubjects();

    await User.create({
      fullName: "StudyBridge Admin",
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      role: "admin",
    });

    const learner = await User.create({
      fullName: "Task Four Learner",
      email: LEARNER_EMAIL,
      passwordHash: await bcrypt.hash(LEARNER_PASSWORD, 10),
      role: "learner",
    });

    const tutorPasswordHash = await bcrypt.hash(TUTOR_PASSWORD, 10);
    for (const tutor of tutors) {
      await createTutorData(tutor, learner, subjectMap, tutorPasswordHash);
    }

    console.log("Database seeded successfully");
    console.log(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log(`Learner: ${LEARNER_EMAIL} / ${LEARNER_PASSWORD}`);
    console.log(`Tutor password for all seeded tutors: ${TUTOR_PASSWORD}`);
  } catch (error) {
    console.error("Failed to seed database:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase();
