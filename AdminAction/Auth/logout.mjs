// logout.js (or inside your auth routes)
import express from "express";

const router = express.Router();

router.post("/logout", async (req, res) => {
  try {
    // Clear the auth token from cookies
    res.clearCookie("token", {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              path: '/',
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully ✅",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Logout failed. Try again later.",
    });
  }
});

export default router;
