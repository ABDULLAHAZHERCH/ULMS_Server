import cloudinary from "cloudinary";
// import Razorpay from 'razorpay';

import connectionToDB from "./config/dbConnection.js";
import app from "./app.js";

const PORT = process.env.PORT;

/**
 * @Cloudinary configuration for file storage service
 */
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: process.env.CLOUDINARY_SECURE,
});

try {
  await connectionToDB();
} catch (err) {
  console.log(err);
}

export default (req, res) => {
  app(req, res);
};
