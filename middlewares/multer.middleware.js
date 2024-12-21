import multer from "multer";
import path from "path";

/**
 * @upload - Middleware to handle file uploads using multer with memory storage.
 * This configuration supports serverless environments like Vercel.
 */
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB size max limit
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    // Check for allowed file types
    if (![".jpg", ".jpeg", ".webp", ".png", ".mp4"].includes(ext)) {
      cb(new Error(`Unsupported file type! ${ext}`), false);
      return;
    }

    cb(null, true); // Accept the file
  },
});

export default upload;
