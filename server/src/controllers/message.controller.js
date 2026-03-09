import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import {
  getCachedSidebarUsers,
  setCachedSidebarUsers,
  getCachedMessages,
  setCachedMessages,
  invalidateMessageCache,
} from "../lib/redisCache.js";
import { queueImageUpload, queueNotification } from "../lib/messageQueue.js";
import { trackMessage } from "../lib/analytics.js";

// ══════════════════════════════════════════════════════════
//  MESSAGE CONTROLLER — REDIS ENHANCED
//  Now with caching, background image processing,
//  message analytics, and notification queuing.
// ══════════════════════════════════════════════════════════

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id.toString();

    // Try Redis cache first
    const cachedUsers = await getCachedSidebarUsers(loggedInUserId);
    if (cachedUsers) {
      return res.status(200).json(cachedUsers);
    }

    // Cache miss — query MongoDB
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    // Cache the result
    await setCachedSidebarUsers(loggedInUserId, filteredUsers);

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id.toString();

    // Try Redis cache first
    let messages = await getCachedMessages(myId, userToChatId);

    if (!messages) {
      // Cache miss — query MongoDB
      messages = await Message.find({
        $or: [
          { senderId: myId, receiverId: userToChatId },
          { senderId: userToChatId, receiverId: myId },
        ],
      });
    }

    // Check for unread messages sent by the other user to me
    const unreadMessages = messages.filter(
      (m) => m.senderId.toString() === userToChatId && !m.isRead,
    );

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        { senderId: userToChatId, receiverId: myId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } },
      );

      // Mutate fetched array so the response is up-to-date
      messages.forEach((m) => {
        if (m.senderId.toString() === userToChatId && !m.isRead) {
          m.isRead = true;
          m.readAt = new Date();
        }
      });

      // Notify the sender that we read their messages via Socket.IO
      const senderSocketId = await getReceiverSocketId(userToChatId);
      if (senderSocketId) {
        unreadMessages.forEach((msg) => {
          io.to(senderSocketId).emit("messageReadReceipt", {
            messageId: msg._id,
            readBy: myId,
            readAt: new Date().toISOString(),
          });
        });
      }

      // Update the cache with the read states
      await invalidateMessageCache(myId, userToChatId);
      await setCachedMessages(myId, userToChatId, messages);
    } else {
      // Make sure we cache the result if there were no unread changes
      await setCachedMessages(myId, userToChatId, messages);
    }

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id.toString();

    let imageUrl = null;

    // If there's an image, we have two options:
    // 1. Immediate upload (small images) — for instant preview
    // 2. Queue-based upload (large images) — background processing
    if (image) {
      // Check image size (base64 length as rough proxy)
      const imageSizeKB = (image.length * 3) / 4 / 1024;

      if (imageSizeKB < 500) {
        // Small image — upload immediately for instant delivery
        const uploadResponse = await cloudinary.uploader.upload(image, {
          folder: "zephyr_messages",
          quality: "auto:good",
        });
        imageUrl = uploadResponse.secure_url;
      }
      // Large images will be handled by the queue after message creation
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl, // Will be null for queued images
    });

    await newMessage.save();

    // If large image, queue it for background processing
    if (image && !imageUrl) {
      await queueImageUpload(
        newMessage._id.toString(),
        image,
        senderId,
        receiverId,
      );
    }

    // Invalidate message cache for this conversation
    await invalidateMessageCache(senderId, receiverId);

    // Track message in Redis analytics
    await trackMessage(senderId, receiverId);

    // Queue notification for the receiver
    await queueNotification("new_message", receiverId, {
      senderId,
      messageId: newMessage._id,
      preview: text?.substring(0, 100),
    });

    // Send via Socket.IO in real-time
    const receiverSocketId = await getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
