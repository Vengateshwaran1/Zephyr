import express from "express";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import {
  getDashboard,
  getHealth,
} from "../controllers/analytics.controller.js";

const router = express.Router();

// Health check (no auth required)
router.get("/health", getHealth);

// Full analytics dashboard (auth required)
router.get("/dashboard", protectRoute, adminRoute, getDashboard);

export default router;
