import { redisClient } from "./redis.js";

// ══════════════════════════════════════════════════════════
//  REDISEARCH MODULE
//  Provides ultra-fast full-text search indexing for chat msgs
// ══════════════════════════════════════════════════════════

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
    // Override RediSearch default minimum prefix length (which is usually 2)
    // to allow searching for a single character (e.g. "h*" matching "hello")
    await redisClient.call("FT.CONFIG", "SET", "MINPREFIX", "1");
    console.log("✅ RediSearch index 'idx:messages' created successfully.");
  } catch (error) {
    if (error.message.includes("Index already exists")) {
      console.log("✅ RediSearch index 'idx:messages' already exists.");
    } else {
      console.error("❌ Failed to create RediSearch index:", error.message);
    }
  }
};

export const addMessageToIndex = async (msg) => {
  if (!msg || !msg.text) return; // Only index text messages

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
    // Optional: set expiry to avoid filling RAM with very old messages (e.g., 30 days)
    // await redisClient.expire(`msg:${msgId}`, 30 * 24 * 60 * 60); 
  } catch (err) {
    console.error("❌ Failed to add message to RediSearch:", err.message);
  }
};

export const searchMessagesInIndex = async (searchQuery, myId, chatPartnerId) => {
  try {
    // NOTE: RediSearch tag matching removes hyphens, hyphens need escaping in query if raw, 
    // but object IDs don't have hyphens.
    let queryStr = "";
    if (chatPartnerId) {
      // To find messages between myId and chatPartnerId:
      queryStr = `@text:(${searchQuery}*) ((@senderId:{${myId}} @receiverId:{${chatPartnerId}}) | (@senderId:{${chatPartnerId}} @receiverId:{${myId}}))`;
    } else {
      // Global search for any message I sent or received:
      queryStr = `@text:(${searchQuery}*) ((@senderId:{${myId}}) | (@receiverId:{${myId}}))`;
    }

    // Execute FT.SEARCH
    const result = await redisClient.call(
      "FT.SEARCH", 
      "idx:messages", 
      queryStr, 
      "SORTBY", "createdAt", "DESC", 
      "LIMIT", "0", "50"
    );

    if (!result || result.length <= 1) return [];

    const messages = [];
    // The first element is the number of total responses
    // Then pairs of [key, [array of fields]]
    for (let i = 1; i < result.length; i += 2) {
      const key = result[i]; // e.g. "msg:66a123..."
      const fieldsArray = result[i + 1];
      
      const msgObj = { _id: key.replace("msg:", "") };
      for (let j = 0; j < fieldsArray.length; j += 2) {
        msgObj[fieldsArray[j]] = fieldsArray[j + 1];
      }
      
      // Convert createdAt back to ISO string for frontend compatibility
      if (msgObj.createdAt) {
        msgObj.createdAt = new Date(parseInt(msgObj.createdAt)).toISOString();
      }
      
      messages.push(msgObj);
    }

    // Sort ascending for chat UI display (oldest to newest locally inside the chat)
    return messages.reverse();
  } catch (err) {
    console.error("❌ RedisSearch FT.SEARCH error:", err.message);
    return [];
  }
};
