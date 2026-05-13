import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/user.model.js";
import { connectDB } from "../src/lib/db.js";
import dotenv from "dotenv";

dotenv.config(); // Because we will run this script from the server root
// Let's make sure dotenv config is correct when running from server root

const seedAdmin = async () => {
  try {
    await connectDB();

    // Check if admin already exists
    let admin = await User.findOne({ email: "admin@zephyr.com" });
    if (admin) {
      console.log("Admin user already exists");
      process.exit(0);
    }

    // Create new admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin123", salt);

    admin = new User({
      fullName: "System Admin",
      email: "admin@zephyr.com",
      password: hashedPassword,
      role: "admin",
    });

    await admin.save();
    console.log(
      "Admin user created successfully! Email: admin@zephyr.com, Password: admin123",
    );
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
