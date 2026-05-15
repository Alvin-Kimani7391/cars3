import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

// 🔍 TEMP DEBUG
console.log("UPLOAD.JS LOADED");
console.log("Cloudinary config:", cloudinary.config());

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "products",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ quality: "auto", fetch_format: "auto" }]
  }
});

export const upload = multer({ storage });