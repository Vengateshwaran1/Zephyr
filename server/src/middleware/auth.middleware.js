import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { getCachedUser, setCachedUser } from "../lib/redisCache.js";

// ══════════════════════════════════════════════════════════
//  AUTH MIDDLEWARE — REDIS ENHANCED
//  Checks Redis cache before hitting MongoDB for user data.
// ══════════════════════════════════════════════════════════

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized - No Token Provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    // Try Redis cache first for user lookup
    let user = await getCachedUser(decoded.userId);

    if (!user) {
      // Cache miss — fetch from MongoDB
      user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Cache the user for future requests
      await setCachedUser(decoded.userId, {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.log("Error in protectRoute middleware: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
