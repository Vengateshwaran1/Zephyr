import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";
import { cacheDeletePattern } from "../lib/redisCache.js";
import { queueImageUpload } from "../lib/messageQueue.js";
import { addMessageToIndex } from "../lib/redisSearch.js";
import { trackMessage } from "../lib/analytics.js";

import { markMessagesBulkSeen, getBulkSeenCounts } from "../lib/groupSeenTracker.js";

export const createGroup = async (req, res) => {
  try {
    const { name, members, description, groupPic } = req.body;
    const admin = req.user._id;

    if (!name || !members || members.length === 0) {
      return res.status(400).json({ error: "Name and members are required" });
    }

    // Include admin in members
    const allMembers = [...new Set([...members, admin.toString()])];

    let groupPicUrl = "";
    if (groupPic) {
      const uploadResponse = await cloudinary.uploader.upload(groupPic, {
        folder: "zephyr_groups",
      });
      groupPicUrl = uploadResponse.secure_url;
    }

    const newGroup = new Group({
      name,
      description,
      admins: [admin],
      members: allMembers,
      groupPic: groupPicUrl,
    });

    await newGroup.save();

    // Invalidate sidebar cache for all members
    await Promise.all(
      allMembers.map((memberId) =>
        cacheDeletePattern(`cache:sidebar:${memberId}`),
      ),
    );

    // Notify all online members about the new group
    allMembers.forEach((memberId) => {
      io.to(memberId).emit("newGroupCreated", newGroup);
    });

    res.status(201).json(newGroup);
  } catch (error) {
    console.error("Error in createGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    // We don't use heavy caching here yet as groups change frequently
    const groups = await Group.find({ members: userId })
      .populate("members", "fullName profilePic")
      .populate("admins", "fullName profilePic")
      .populate("lastMessage");

    res.status(200).json(groups);
  } catch (error) {
    console.error("Error in getGroups controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Check if user is member of the group
    const group = await Group.findOne({ _id: groupId, members: userId });
    if (!group) {
      return res.status(403).json({ error: "Not a member of this group" });
    }

    const messages = await Message.find({ groupId })
      .populate("senderId", "fullName profilePic")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getGroupMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { groupId } = req.params;
    const senderId = req.user._id;

    // Check if user is member of the group
    const group = await Group.findOne({ _id: groupId, members: senderId });
    if (!group) {
      return res.status(403).json({ error: "Not a member of this group" });
    }

    let imageUrl = null;
    if (image) {
      const imageSizeKB = (image.length * 3) / 4 / 1024;

      if (imageSizeKB < 500) {
        const uploadResponse = await cloudinary.uploader.upload(image, {
          folder: "zephyr_group_messages",
          quality: "auto:good",
        });
        imageUrl = uploadResponse.secure_url;
      }
    }

    const newMessage = new Message({
      senderId,
      groupId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    // Track in Redis analytics (total counter, hourly, leaderboard, DAU)
    await trackMessage(senderId.toString(), groupId.toString());

    // Index message in RedisSearch immediately
    await addMessageToIndex(newMessage);

    // If large image, queue it for background processing
    if (image && !imageUrl) {
      await queueImageUpload(
        newMessage._id.toString(),
        image,
        senderId,
        null, // No receiverId for groups
        groupId
      );
    }

    // Update last message in group
    await Group.findByIdAndUpdate(groupId, { lastMessage: newMessage._id });

    // Populate sender info for real-time delivery
    const populatedMessage = await Message.findById(newMessage._id).populate(
      "senderId",
      "fullName profilePic",
    );

    // Emit to group room
    io.to(groupId).emit("newGroupMessage", {
      groupId,
      message: populatedMessage,
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error in sendGroupMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userIdToAdd } = req.body;
    const requesterId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (
      !group.admins.some(
        (adminId) => adminId.toString() === requesterId.toString(),
      )
    ) {
      return res.status(403).json({ error: "Only admins can add members" });
    }

    if (group.members.includes(userIdToAdd)) {
      return res.status(400).json({ error: "User already in group" });
    }

    group.members.push(userIdToAdd);
    await group.save();

    await cacheDeletePattern(`cache:sidebar:${userIdToAdd}`);
    io.to(userIdToAdd).emit("addedToGroup", group);
    io.to(groupId).emit("groupUpdate", {
      groupId,
      type: "MEMBER_ADDED",
      userId: userIdToAdd,
    });

    res.status(200).json(group);
  } catch (error) {
    console.error("Error in addMember controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userIdToRemove } = req.body;
    const requesterId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const isRequesterAdmin = group.admins.some(
      (id) => id.toString() === requesterId.toString(),
    );
    const isRemovingSelf = requesterId.toString() === userIdToRemove;

    if (!isRequesterAdmin && !isRemovingSelf) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Remove from members
    group.members = group.members.filter(
      (m) => m.toString() !== userIdToRemove,
    );
    // Remove from admins if they were an admin
    group.admins = group.admins.filter((a) => a.toString() !== userIdToRemove);

    // If no admins left but members exist, make first member admin
    if (group.admins.length === 0 && group.members.length > 0) {
      group.admins.push(group.members[0]);
    } else if (group.members.length === 0) {
      await Group.findByIdAndDelete(groupId);
      return res
        .status(200)
        .json({ message: "Group deleted (last member left)" });
    }

    await group.save();

    await cacheDeletePattern(`cache:sidebar:${userIdToRemove}`);
    io.to(userIdToRemove).emit("removedFromGroup", groupId);
    io.to(groupId).emit("groupUpdate", {
      groupId,
      type: "MEMBER_REMOVED",
      userId: userIdToRemove,
    });

    res.status(200).json(group);
  } catch (error) {
    console.error("Error in removeMember controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const requesterId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Check if user is a member of the group
    if (!group.members.some((id) => id.toString() === requesterId.toString())) {
      return res
        .status(403)
        .json({ error: "Only members can delete this group" });
    }

    const memberIds = group.members;
    await Group.findByIdAndDelete(groupId);

    await Promise.all(
      memberIds.map((id) => cacheDeletePattern(`cache:sidebar:${id}`)),
    );
    io.to(groupId).emit("groupDeleted", groupId);

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error in deleteGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleAdminStatus = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { targetUserId, action } = req.body; // action: 'promote' or 'demote'
    const requesterId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (!group.admins.some((id) => id.toString() === requesterId.toString())) {
      return res
        .status(403)
        .json({ error: "Only admins can manage other admins" });
    }

    if (action === "promote") {
      if (!group.admins.some((id) => id.toString() === targetUserId)) {
        group.admins.push(targetUserId);
      }
    } else if (action === "demote") {
      // Prevent demoting last admin
      if (
        group.admins.length <= 1 &&
        group.admins[0].toString() === targetUserId
      ) {
        return res.status(400).json({ error: "Cannot demote the last admin" });
      }
      group.admins = group.admins.filter(
        (id) => id.toString() !== targetUserId,
      );
    }

    await group.save();
    io.to(groupId).emit("groupUpdate", {
      groupId,
      type: "ADMIN_STATUS_CHANGED",
      userId: targetUserId,
    });

    res.status(200).json(group);
  } catch (error) {
    console.error("Error in toggleAdminStatus: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
