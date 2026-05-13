import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import {
  getCachedUser,
  setCachedUser,
  invalidateUserCache,
} from "../lib/redisCache.js";
import { trackDailyActiveUser } from "../lib/analytics.js";

// ══════════════════════════════════════════════════════════
//  AUTH CONTROLLER — REDIS ENHANCED
//  Now with user caching and analytics tracking
// ══════════════════════════════════════════════════════════

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });

    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      generateToken(newUser._id, res);
      await newUser.save();

      const userData = {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
        role: newUser.role,
      };

      // Cache the new user in Redis
      await setCachedUser(newUser._id.toString(), userData);

      // Track as daily active user
      await trackDailyActiveUser(newUser._id.toString());

      res.status(201).json(userData);
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    const userData = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      role: user.role,
    };

    // Cache user profile in Redis
    await setCachedUser(user._id.toString(), userData);

    // Track as daily active user
    await trackDailyActiveUser(user._id.toString());

    res.status(200).json(userData);
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.cookies.jwt;

    // Revoke the token mathematically by putting it in Redis waitlist
    if (token) {
      const { redisClient, REDIS_KEYS } = await import("../lib/redis.js");
      if (redisClient && redisClient.status === "ready") {
        // Block the token for 7 days (maximum possible lifetime of our JWTs)
        await redisClient.setex(
          REDIS_KEYS.BLACKLIST_TOKEN(token),
          7 * 24 * 60 * 60,
          "revoked",
        );
      }
    }

    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true },
    );

    // Invalidate user cache so fresh data is served
    await invalidateUserCache(userId.toString());

    // Re-cache with updated data
    const userData = {
      _id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      profilePic: updatedUser.profilePic,
      role: updatedUser.role,
    };
    await setCachedUser(userId.toString(), userData);

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // Track as daily active user
    await trackDailyActiveUser(userId);

    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
