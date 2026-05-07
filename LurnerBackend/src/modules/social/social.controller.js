import * as socialService from "./social.service.js";
import { getIO } from "../../socket.js";

/**
 * Send a friend invite via code.
 */
export const sendInviteHandler = async (req, res) => {
    const senderId = req.user.id;
    const { code } = req.body;

    try {
        const invite = await socialService.sendInvite(senderId, code);
        
        // Real-time Notification
        const io = getIO();
        io.to(`user_${invite.receiverId}`).emit("notification:new_invite", {
            senderName: req.user.name
        });

        res.status(201).json({ message: "Invite sent successfully", invite });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Get all pending invites for the logged-in user.
 */
export const getPendingInvitesHandler = async (req, res) => {
    const userId = req.user.id;

    try {
        const invites = await socialService.getPendingInvites(userId);
        res.json(invites);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Accept a friend invite.
 */
export const acceptInviteHandler = async (req, res) => {
    const userId = req.user.id;
    const { inviteId } = req.params;

    try {
        await socialService.acceptInvite(parseInt(inviteId), userId);
        res.json({ message: "Invite accepted! You are now friends." });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Decline a friend invite.
 */
export const declineInviteHandler = async (req, res) => {
    const userId = req.user.id;
    const { inviteId } = req.params;

    try {
        await socialService.declineInvite(parseInt(inviteId), userId);
        res.json({ message: "Invite declined." });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Unfollow/Unfriend a user (Mutual).
 */
export const unfollowHandler = async (req, res) => {
    const userId = req.user.id;
    const followingId = parseInt(req.params.id);

    try {
        await socialService.unfollowUser(userId, followingId);
        res.json({ message: "Removed from friends." });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const getFollowersHandler = async (req, res) => {
    const userId = req.user.id;

    try {
        const followers = await socialService.getFollowers(userId);
        res.json(followers.map(f => f.follower));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getFollowingHandler = async (req, res) => {
    const userId = req.user.id;

    try {
        const following = await socialService.getFollowing(userId);
        res.json(following.map(f => f.following));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
