import express from "express";
import {
  checkAuth,
  login,
  logout,
  signup,
  updateProfile,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  authRateLimiter,
  profileRateLimiter,
} from "../middleware/rateLimiter.middleware.js";

const router = express.Router();

// Auth routes with rate limiting
router.post("/signup", authRateLimiter, signup);
router.post("/login", authRateLimiter, login);
router.post("/logout", logout);

// Protected routes
router.put("/update-profile", protectRoute, profileRateLimiter, updateProfile);
router.get("/check", protectRoute, checkAuth);

export default router;
