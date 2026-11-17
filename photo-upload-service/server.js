import { randomUUID } from "node:crypto";

import { Storage } from "@google-cloud/storage";
import cors from "cors";
import express from "express";
import multer from "multer";

const app = express();
const storage = new Storage();

const PORT = process.env.PORT || 8080;
const BUCKET_NAME = process.env.GCS_BUCKET_NAME;

// A3 HD Task 3: Uploads validated tutor photos to public Cloud Storage.
app.use(cors());

// Keeps the uploaded image in memory before sending it to Cloud Storage.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    callback(null, allowedTypes.includes(file.mimetype));
  },
});

// Uploads one tutor image and returns its public Cloud Storage URL.
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!BUCKET_NAME) {
      return res.status(500).json({
        error: "GCS_BUCKET_NAME is not configured",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "a JPEG, PNG, or WebP image is required",
      });
    }

    const extensionByType = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };

    const objectName =
      `tutor-photos/${randomUUID()}` + extensionByType[req.file.mimetype];

    const bucket = storage.bucket(BUCKET_NAME);
    const object = bucket.file(objectName);

    await object.save(req.file.buffer, {
      resumable: false,
      metadata: {
        contentType: req.file.mimetype,
        cacheControl: "public, max-age=31536000",
      },
    });

    const encodedObjectName = objectName
      .split("/")
      .map(encodeURIComponent)
      .join("/");

    return res.status(201).json({
      url: `https://storage.googleapis.com/${BUCKET_NAME}/${encodedObjectName}`,
    });
  } catch (error) {
    console.error("Photo upload failed:", error);

    return res.status(500).json({
      error: "photo upload failed",
    });
  }
});

// Returns JSON for file-size and Multer processing errors.

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      error:
        error.code === "LIMIT_FILE_SIZE"
          ? "image must not exceed 5 MB"
          : error.message,
    });
  }

  return res.status(500).json({
    error: "photo upload failed",
  });
});

app.listen(PORT, () => {
  console.log(`Photo upload service listening on port ${PORT}`);
});
