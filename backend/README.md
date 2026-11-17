# StudyBridge Marketplace Backend

StudyBridge is a RESTful backend API developed for FIT2095 Assignment 2. It supports a tutoring marketplace where learners can find tutors, manage bookings, and submit reviews, while administrators can manage platform data and view marketplace analytics.

**Student ID:** 35484632
**Student Name：** Xiaoyu Zhou

## Technologies

- Node.js
- Express.js
- MongoDB and Mongoose
- JSON Web Token (JWT) authentication
- bcrypt password hashing
- Postman for API testing

## Setup and How to Run

1. Install the project dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file using `.env.example` as the template:

   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/studybridge
   JWT_SECRET=replace-me
   PORT=8081
   ```

3. Seed the database:

   ```bash
   node --env-file=.env seed.js
   ```

4. Start the server:

   ```bash
   node --env-file=.env server.js
   ```

The API base URL is:

```text
http://localhost:8081/api/35484632
```

## Seeded Admin Account

```text
Email: admin@studybridge.com
Password: Admin#2026
```

## Core Tasks

The completed core functionality includes:

- User registration, login, logout, and JWT authentication
- Role-based access control for Learners, Tutors, and Admins
- Tutor profile and availability management
- Subject catalogue management
- Tutor searching and filtering
- Atomic session booking and booking lifecycle management
- Review submission and tutor rating updates

## High Distinction Tasks

### A2 HD Task 1 — Marketplace Analytics

Completed. An Admin-only analytics endpoint provides the top subjects, top tutors, booking completion and cancellation rates, and estimated platform revenue. The results are calculated with a MongoDB aggregation pipeline using `$facet`.

### HD Task 2 — Reliability Scoring

Completed. Learner and Tutor reliability scores are calculated from their cancellation history. Cancellation records identify who cancelled a booking, and Tutor reliability scores are included in Tutor Search results.

### A2 HD Task 3 — Tutor Recommendations

Completed. The recommendation feature suggests suitable Tutors to Learners using relevant marketplace information such as subjects, ratings, reliability, and availability.

### A2 HD Task 4

Not attempted.

### A2 HD Task 5 — Cloud Deployment

Attempted using Google Cloud Platform with Ubuntu 24.04, Node.js 24, MongoDB 8.x, `systemd`, and TCP port `8081`.

The deployment was not fully completed. After the virtual machine rebooted, it started with the `7.0.0-1011-gcp` kernel, which caused a MongoDB startup incompatibility. As a result, the API could not be kept running successfully on the cloud instance.
