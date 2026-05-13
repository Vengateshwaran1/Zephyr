import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getGroups,
  getGroupMessages,
  sendGroupMessage,
  addMember,
  removeMember,
  deleteGroup,
  toggleAdminStatus,
} from "../controllers/group.controller.js";

const router = express.Router();

router.post("/create", protectRoute, createGroup);
router.get("/all", protectRoute, getGroups);
router.get("/:groupId/messages", protectRoute, getGroupMessages);
router.post("/:groupId/send", protectRoute, sendGroupMessage);
router.post("/:groupId/add-member", protectRoute, addMember);
router.post("/:groupId/remove-member", protectRoute, removeMember);
router.post("/:groupId/toggle-admin", protectRoute, toggleAdminStatus);
router.delete("/:groupId", protectRoute, deleteGroup);

export default router;
