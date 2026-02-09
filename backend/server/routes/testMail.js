// backend/routes/testMail.js
import express from "express";
import { sendEmail } from "../../utils/sendEmail.js";

const router = express.Router();

router.get("/", async (req, res) => {
  await sendEmail(
    "yourownermail@gmail.com",
    "Test Email from Sashvara",
    "Plain text body",
    "<b>HTML version works!</b>"
  );
  res.json({ success: true });
});

export default router;
