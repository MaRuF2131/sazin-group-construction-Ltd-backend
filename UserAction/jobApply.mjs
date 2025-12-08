import express from "express";
import multer from "multer";
import dotenv from "dotenv";
dotenv.config();
import { mailSender } from "../utils/mailSender.mjs";

const router = express.Router();

// ---------- Multer for CV Upload ----------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ---------- Job Apply Route ----------
router.post("/apply-job", upload.single("cv"), async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      deadline,
      jobType,
      job,
      description,
      location,
      salary,
    } = req.body;

    // --- Basic validation ---
    if (!name || !email || !phone || !req.file) {
      return res.status(400).json({
        success: false,
        message: "All fields including CV are required",
      });
    }

    // ============================================
    // 🔥 1️⃣ DEADLINE CHECK
    // ============================================
    const today = new Date();
    const jobDeadline = new Date(deadline);

    if (isNaN(jobDeadline.getTime())) {
      return res.json({
        success: false,
        message: "Invalid deadline format",
      });
    }

    if (today > jobDeadline) {
      return res.json({
        success: false,
        message: "Application deadline has already passed",
      });
    }

    // ============================================
    // 2️⃣ Prepare mail transporter
    // ============================================
    const transporter = await mailSender();

    // ============================================
    // 3️⃣ SEND MAIL TO ADMIN WITH CV
    // ============================================
    const adminMail = {
      from: process.env.EMAIL_USER,
      to: process.env.TO_EMAIL,
      subject: `New Job Application: ${job}`,
      html: `
        <h2>New Job Application Received</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>

        <h3>Job Info</h3>
        <p><b>Position:</b> ${job}</p>
        <p><b>Type:</b> ${jobType}</p>
        <p><b>Deadline:</b> ${jobDeadline.toLocaleDateString()}</p>
        <p><b>Location:</b> ${location}</p>
        <p><b>Salary:</b> ${salary}</p>
        <p><b>Description:</b> ${description}</p>
      `,
      attachments: [
        {
          filename: req.file.originalname,
          content: req.file.buffer,
        },
      ],
    };

    await transporter.sendMail(adminMail);

    // ============================================
    // 4️⃣ SEND FEEDBACK MAIL TO APPLICANT
    // ============================================
    const userMail = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Your Application for ${job} Received`,
        html: `
        <h3>Job Info</h3>
        <p><b>Position:</b> ${job}</p>
        <p><b>Type:</b> ${jobType}</p>
        <p><b>Deadline:</b> ${jobDeadline.toLocaleDateString()}</p>
        <p><b>Location:</b> ${location}</p>
        <p><b>Salary:</b> ${salary}</p>
        <p><b>Description:</b> ${description}</p>
        <p>
          Hi ${name},

Thank you for applying for the position of "${job}".

We have received your application successfully.
Our HR team will review it and contact you if you are shortlisted.

Best Regards,
HR Team
        </p>
      `

    };

    await transporter.sendMail(userMail);

    return res.json({
      success: true,
      message: "Application submitted successfully. Check your email!",
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Mail sending failed.",
    });
  }
});

export default router;
