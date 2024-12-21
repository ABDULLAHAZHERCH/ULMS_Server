import connectionToDB from "./config/dbConnection.js";
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: process.env.CLOUDINARY_SECURE,
});

export default async function handler(req, res) {
  await connectionToDB();
  res.status(200).json({ message: "App is running!" });
}
