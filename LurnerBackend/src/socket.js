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
            origin: "http://localhost:5173", // Keep CORS strict matching app.js
            credentials: true,
            methods: ["GET", "POST"]
        }
    });

    // Authentication Middleware for Sockets
    io.use((socket, next) => {
        let token = socket.handshake.auth?.token;

        // Try to read token from cookies sent in handshake headers
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

        // 1. Mark as online
        onlineUsers.set(userId, socket.id);

        // 2. Notify followers that this user is online
        try {
            const followers = await socialService.getFollowers(userId);
            followers.forEach(f => {
                const followerSocketId = onlineUsers.get(f.followerId);
                if (followerSocketId) {
                    io.to(followerSocketId).emit("friend_status", {
                        userId: userId,
                        status: "online"
                    });
                }
            });
        } catch (e) {
            console.error("Error notifying followers:", e);
        }

        // 3. Send current online status of all followed users back to the connected user
        try {
            const following = await socialService.getFollowing(userId);
            const onlineFollowing = following
                .filter(f => onlineUsers.has(f.followingId))
                .map(f => f.followingId);
            
            socket.emit("initial_online_friends", onlineFollowing);
        } catch (e) {
            console.error("Error fetching following status:", e);
        }

        socket.on("disconnect", async () => {
            console.log(`🔌 User disconnected: ${userId}`);
            onlineUsers.delete(userId);

            // Notify followers that this user is offline
            try {
                const followers = await socialService.getFollowers(userId);
                followers.forEach(f => {
                    const followerSocketId = onlineUsers.get(f.followerId);
                    if (followerSocketId) {
                        io.to(followerSocketId).emit("friend_status", {
                            userId: userId,
                            status: "offline"
                        });
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
