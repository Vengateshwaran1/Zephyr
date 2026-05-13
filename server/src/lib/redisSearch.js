import { redisClient } from "./redis.js";

// ══════════════════════════════════════════════════════════
//  REDISEARCH MODULE
//  Provides ultra-fast full-text search indexing for chat msgs
// ══════════════════════════════════════════════════════════

export let isRedisSearchAvailable = false;

export const initRedisSearch = async () => {
  try {
    // Attempt to create the index
    await redisClient.call(
      "FT.CREATE",
      "idx:messages",
      "ON",
      "HASH",
      "PREFIX",
      "1",
      "msg:",
      "SCHEMA",
      "text",
      "TEXT",
      "WEIGHT",
      "5.0",
      "senderId",
      "TAG",
      "receiverId",
      "TAG",
      "groupId",
      "TAG",
      "createdAt",
      "NUMERIC",
      "SORTABLE"
    );
    await redisClient.call("FT.CONFIG", "SET", "MINPREFIX", "1");
    isRedisSearchAvailable = true;
    console.log("✅ RediSearch index 'idx:messages' created successfully.");
  } catch (error) {
    if (error.message.includes("Index already exists")) {
      isRedisSearchAvailable = true;
      console.log("✅ RediSearch index 'idx:messages' already exists.");
    } else if (error.message.includes("unknown command")) {
      // RediSearch module is not installed (e.g. Render's standard Redis)
      isRedisSearchAvailable = false;
      console.log("ℹ️  RediSearch not available on this Redis instance. Falling back to MongoDB search.");
    } else {
      isRedisSearchAvailable = false;
      console.error("❌ Failed to create RediSearch index:", error.message);
    }
  }
};

export const addMessageToIndex = async (msg) => {
  if (!isRedisSearchAvailable || !msg || !msg.text) return; // Only index if available

  const msgId = msg._id.toString();
  const args = [
    `msg:${msgId}`,
    "text", msg.text,
    "senderId", msg.senderId.toString(),
    "createdAt", new Date(msg.createdAt).getTime(),
  ];

  if (msg.receiverId) {
     args.push("receiverId", msg.receiverId.toString());
  }
  if (msg.groupId) {
     args.push("groupId", msg.groupId.toString());
  }

  try {
    await redisClient.hset(...args);
  } catch (err) {
    console.error("❌ Failed to add message to RediSearch:", err.message);
  }
};

export const searchMessagesInIndex = async (searchQuery, myId, chatPartnerId) => {
  if (!isRedisSearchAvailable) return null; // Return null to trigger fallback

  try {
    let queryStr = "";
    if (chatPartnerId) {
      queryStr = `@text:(${searchQuery}*) ((@senderId:{${myId}} @receiverId:{${chatPartnerId}}) | (@senderId:{${chatPartnerId}} @receiverId:{${myId}}))`;
    } else {
      queryStr = `@text:(${searchQuery}*) ((@senderId:{${myId}}) | (@receiverId:{${myId}}))`;
    }

    const result = await redisClient.call(
      "FT.SEARCH", 
      "idx:messages", 
      queryStr, 
      "SORTBY", "createdAt", "DESC", 
      "LIMIT", "0", "50"
    );

    if (!result || result.length <= 1) return [];

    const messages = [];
    for (let i = 1; i < result.length; i += 2) {
      const key = result[i];
      const fieldsArray = result[i + 1];
      
      const msgObj = { _id: key.replace("msg:", "") };
      for (let j = 0; j < fieldsArray.length; j += 2) {
        msgObj[fieldsArray[j]] = fieldsArray[j + 1];
      }
      
      if (msgObj.createdAt) {
        msgObj.createdAt = new Date(parseInt(msgObj.createdAt)).toISOString();
      }
      
      messages.push(msgObj);
    }

    return messages.reverse();
  } catch (err) {
    if (!err.message.includes("unknown command")) {
      console.error("❌ RedisSearch FT.SEARCH error:", err.message);
    }
    return null; // Return null to trigger fallback
  }
};
