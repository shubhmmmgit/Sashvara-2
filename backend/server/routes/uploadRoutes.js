import express from "express";
import multer from "multer";
import fs from "fs";
//import { processImage } from "../utils/imageProcessor.js";
import { uploadSingle, uploadMultiple, handleUploadError, getFileUrls } from "../middleware/multer.js";

const router = express.Router();


router.post("/", uploadSingle, handleUploadError, async (req, res) => {
  try {
    const rawUrl = req.file.path; // Cloudinary secure_url
    const optimizedUrl = rawUrl.replace("/upload/", "/upload/f_auto,q_auto,w_800/");
    res.json({ success: true, url: optimizedUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Image upload failed" });
  }
});


router.post("/multiple", uploadMultiple, handleUploadError, async (req, res) => {
  try {
    const rawUrls = getFileUrls(req.files); // <- missing in your code
    const optimizedUrls = rawUrls.map(url =>
      url.replace("/upload/", "/upload/f_auto,q_auto,w_800/")
    );
    res.json({ success: true, urls: optimizedUrls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Image upload failed" });
  }
});


export default router;
