import prisma from "../../config/prisma.js";
import crypto from "crypto";

/**
 * Generate a unique 8-character friend code.
 */
export const generateFriendCode = () => {
    return `LURN-${crypto.randomBytes(2).toString("hex").toUpperCase()}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
};

/**
 * Find a user by their unique friend code.
 */
export const getUserByFriendCode = async (code) => {
    return prisma.user.findUnique({
        where: { friendCode: code },
        select: { id: true, name: true, friendCode: true }
    });
};

/**
 * Send a friend invite using a friend code.
 */
export const sendInvite = async (senderId, receiverCode) => {
    const receiver = await getUserByFriendCode(receiverCode);
    if (!receiver) {
        throw new Error("Invalid friend code.");
    }

    if (senderId === receiver.id) {
        throw new Error("You cannot invite yourself.");
    }

    // Check if already friends
    const existingFollow = await prisma.follows.findUnique({
        where: { followerId_followingId: { followerId: senderId, followingId: receiver.id } }
    });
    if (existingFollow) {
        throw new Error("You are already friends with this user.");
    }

    // Create the invite
    return prisma.friendInvite.create({
        data: {
            senderId,
            receiverId: receiver.id,
            status: "PENDING"
        }
    });
};

/**
 * Accept a friend invite and establish mutual friendship.
 */
export const acceptInvite = async (inviteId, userId) => {
    const invite = await prisma.friendInvite.findUnique({
        where: { id: inviteId }
    });

    if (!invite || invite.receiverId !== userId || invite.status !== "PENDING") {
        throw new Error("Invalid or expired invite.");
    }

    // Use a transaction to:
    // 1. Mark invite as ACCEPTED
    // 2. Create mutual follow records
    return prisma.$transaction([
        prisma.friendInvite.update({
            where: { id: inviteId },
            data: { status: "ACCEPTED" }
        }),
        prisma.follows.upsert({
            where: { followerId_followingId: { followerId: invite.senderId, followingId: invite.receiverId } },
            update: {},
            create: { followerId: invite.senderId, followingId: invite.receiverId }
        }),
        prisma.follows.upsert({
            where: { followerId_followingId: { followerId: invite.receiverId, followingId: invite.senderId } },
            update: {},
            create: { followerId: invite.receiverId, followingId: invite.senderId }
        })
    ]);
};

/**
 * Decline a friend invite.
 */
export const declineInvite = async (inviteId, userId) => {
    return prisma.friendInvite.updateMany({
        where: { 
            id: inviteId,
            receiverId: userId,
            status: "PENDING"
        },
        data: { status: "DECLINED" }
    });
};

/**
 * Get all pending invites for a user.
 */
export const getPendingInvites = async (userId) => {
    return prisma.friendInvite.findMany({
        where: { 
            receiverId: userId,
            status: "PENDING"
        },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    });
};

/**
 * Get users following this user (Friends)
 */
export const getFollowers = async (userId) => {
    return prisma.follows.findMany({
        where: { followingId: userId },
        include: {
            follower: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });
};

/**
 * Get users this user is following (Friends)
 */
export const getFollowing = async (userId) => {
    return prisma.follows.findMany({
        where: { followerId: userId },
        include: {
            following: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });
};

/**
 * Unfollow a user (Mutual)
 */
export const unfollowUser = async (followerId, followingId) => {
    return prisma.$transaction([
        prisma.follows.deleteMany({
            where: {
                OR: [
                    { followerId, followingId },
                    { followerId: followingId, followingId: followerId }
                ]
            }
        })
    ]);
};
