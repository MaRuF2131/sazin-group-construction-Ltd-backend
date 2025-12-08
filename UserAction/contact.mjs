import express from "express";
import dotenv from "dotenv";
dotenv.config();
import{ mailSender} from "../utils/mailSender.mjs";  // Make sure this exists

const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));
// -------------------- Contact Form Route --------------------

router.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // -------------------- Validation --------------------
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // -------------------- Prepare Emails --------------------
    const transporter = await mailSender();
    if (!transporter) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to configure mail server." });
    }

    // Email to ADMIN (YOU)
    const adminMail = {
      from: process.env.EMAIL_USER,
      to: process.env.TO_EMAIL, // admin email from .env
      subject: `New Contact Message from ${name}`,
      text: `
You received a new message from your website contact form:

---------------------------------------
Name: ${name}
Email: ${email}
---------------------------------------

Message:
${message}

---------------------------------------
Generated at: ${new Date().toLocaleString()}
      `,
    };

    // Auto-reply email to USER
    const userMail = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Thank you for contacting us!",
      text: `
Hi ${name},

Thank you for reaching out to us! We have received your message and our team will get back to you as soon as possible.

---------------------------------------
Your Message:
${message}
---------------------------------------

If you didn’t send this message, please ignore.

— Best regards,
Sazin Construction Ltd
      `,
    };


    // -------------------- Send Emails --------------------
    try {
      await transporter.sendMail(adminMail); // mail to admin
      await transporter.sendMail(userMail);  // confirmation to user
    } catch (err) {
      console.error("❌ Failed to send emails:", err);
      return res.status(500).json({
        success: false,
        message: "Message saved but email sending failed. Try again later.",
      });
    }

    // -------------------- Success Response --------------------
    return res.status(200).json({
      success: true,
      message: "Message sent successfully. We will contact you soon!",
    });

  } catch (error) {
    console.error("❌ Contact Form Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

export default router;
