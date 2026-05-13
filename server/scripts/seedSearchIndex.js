import mongoose from "mongoose";
import dotenv from "dotenv";
import Message from "../src/models/message.model.js";
import { initRedisSearch, addMessageToIndex } from "../src/lib/redisSearch.js";
import { connectDB } from "../src/lib/db.js";

dotenv.config();

const seed = async () => {
  console.log("Connecting to Database...");
  await connectDB();
  
  console.log("Initializing RedisSearch index...");
  await initRedisSearch();
  
  console.log("Fetching messages from MongoDB...");
  const messages = await Message.find({});
  console.log(`Found ${messages.length} messages. Indexing...`);
  
  let count = 0;
  for (const msg of messages) {
    if (msg.text) {
      await addMessageToIndex(msg);
      count++;
    }
  }
  
  console.log(`✅ Successfully indexed ${count} text messages.`);
  process.exit(0);
};

seed();
