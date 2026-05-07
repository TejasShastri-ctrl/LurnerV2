import express from "express";
import * as socialController from "./social.controller.js";
import { authMiddleware } from "../../middleware/auth.js";

const router = express.Router();

/**
 * Social & Invite Routes
 */

// Send friend invite via code
router.post("/invite", authMiddleware, socialController.sendInviteHandler);

// Get pending invites for current user
router.get("/invites/pending", authMiddleware, socialController.getPendingInvitesHandler);

// Accept friend invite
router.post("/invite/:inviteId/accept", authMiddleware, socialController.acceptInviteHandler);

// Decline friend invite
router.post("/invite/:inviteId/decline", authMiddleware, socialController.declineInviteHandler);

// Unfriend a user
router.delete("/unfriend/:id", authMiddleware, socialController.unfollowHandler);

// Get current user's friends (following/followers)
router.get("/friends", authMiddleware, socialController.getFollowingHandler);

export default router;
