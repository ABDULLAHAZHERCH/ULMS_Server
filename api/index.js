import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "dotenv";
import express from "express";
import morgan from "morgan";

import connectionToDB from "../config/dbConnection.js"; // Ensure correct path
import cloudinary from "cloudinary"; // Cloudinary import
import errorMiddleware from "../middlewares/error.middleware.js"; // Ensure correct path
import courseRoutes from "../routes/course.Routes.js"; // Ensure correct path
import miscRoutes from "../routes/miscellanous.routes.js"; // Ensure correct path
import paymentRoutes from "../routes/payment.routes.js"; // Ensure correct path
import userRoutes from "../routes/user.Routes.js"; // Ensure correct path

// Load environment variables
config();

// Cloudinary configuration
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: process.env.CLOUDINARY_SECURE,
});

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOptions = {
  origin: ["https://ulms-client.vercel.app"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
  credentials: true,
};

app.use(cors(corsOptions)); // Enable CORS
app.use(cookieParser()); // Cookie parser for request handling
app.use(morgan("dev")); // Logging requests

// Connect to the database
(async () => {
  try {
    await connectionToDB();
  } catch (error) {
    console.error("Failed to connect to the database:", error);
  }
})();

// Basic route to test the server
app.use("/ping", (_req, res) => {
  res.send("Pong");
});

app.get("/", (_req, res) => {
  res.status(200).json({
    message:
      "Welcome to the Learning Management System API! Please refer to the documentation for proper usage.",
  });
});

// Routes
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/course", courseRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1", miscRoutes);

// Catch-all route for undefined paths
app.all("*", (_req, res) => {
  res.status(404).send("OOPS!!  404 page not found ");
});

// Error middleware
app.use(errorMiddleware);

// Export the Express app as a serverless function for Vercel
export default (req, res) => {
  app(req, res); // Pass request and response to Express app
};
