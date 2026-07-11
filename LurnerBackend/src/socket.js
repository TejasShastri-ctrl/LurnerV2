import { Server } from "socket.io";
import { verifyToken } from "./modules/auth/auth.service.js";
import * as socialService from "./modules/social/social.service.js";

let io;
const onlineUsers = new Map(); // userId -> socketId

const parseCookies = (cookieString) => {
    if (!cookieString) return {};
    return cookieString.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.split('=').map(c => c.trim());
        if (key && value) {
            acc[key] = decodeURIComponent(value);
        }
        return acc;
    }, {});
};

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "http://localhost:5173",
            credentials: true,
            methods: ["GET", "POST"]
        }
    });

    // Authentication Middleware for Sockets
    io.use((socket, next) => {
        let token = socket.handshake.auth?.token;

        if (!token && socket.handshake.headers.cookie) {
            const cookies = parseCookies(socket.handshake.headers.cookie);
            token = cookies.access_token;
        }

        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }

        try {
            const decoded = verifyToken(token);
            socket.userId = decoded.userId;
            socket.userName = decoded.email || "";
            next();
        } catch (err) {
            next(new Error("Authentication error: Invalid token"));
        }
    });

    io.on("connection", async (socket) => {
        const userId = socket.userId;
        console.log(`📡 User connected: ${userId} (Socket: ${socket.id})`);

        // Join a private room for targeted notifications
        socket.join(`user_${userId}`);

        // ── Social: online presence ──────────────────────────────────────────
        onlineUsers.set(userId, socket.id);

        try {
            const followers = await socialService.getFollowers(userId);
            followers.forEach(f => {
                const followerSocketId = onlineUsers.get(f.followerId);
                if (followerSocketId) {
                    io.to(followerSocketId).emit("friend_status", { userId, status: "online" });
                }
            });
        } catch (e) {
            console.error("Error notifying followers:", e);
        }

        try {
            const following = await socialService.getFollowing(userId);
            const onlineFollowing = following
                .filter(f => onlineUsers.has(f.followingId))
                .map(f => f.followingId);
            socket.emit("initial_online_friends", onlineFollowing);
        } catch (e) {
            console.error("Error fetching following status:", e);
        }

        // ── Contests: real-time room management ──────────────────────────────
        /**
         * Client emits this after joining/loading a contest workspace.
         * Puts the socket in a shared room so score_update broadcasts reach it.
         */
        socket.on("join_contest_room", (contestId) => {
            if (!contestId) return;
            const room = `contest_${contestId}`;
            socket.join(room);
            console.log(`🏆 User ${userId} joined contest room: ${room}`);
        });

        socket.on("leave_contest_room", (contestId) => {
            if (!contestId) return;
            socket.leave(`contest_${contestId}`);
        });

        // ── Disconnect ───────────────────────────────────────────────────────
        socket.on("disconnect", async () => {
            console.log(`🔌 User disconnected: ${userId}`);
            onlineUsers.delete(userId);

            try {
                const followers = await socialService.getFollowers(userId);
                followers.forEach(f => {
                    const followerSocketId = onlineUsers.get(f.followerId);
                    if (followerSocketId) {
                        io.to(followerSocketId).emit("friend_status", { userId, status: "offline" });
                    }
                });
            } catch (e) {
                console.error("Error notifying followers on disconnect:", e);
            }
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

/**
 * Broadcast an event to all sockets in a contest room.
 * Used by the contest controller to push leaderboard updates.
 */
export const emitToContestRoom = (contestId, event, payload) => {
    try {
        getIO().to(`contest_${contestId}`).emit(event, payload);
    } catch (e) {
        console.error(`emitToContestRoom failed for contest ${contestId}:`, e.message);
    }
};
