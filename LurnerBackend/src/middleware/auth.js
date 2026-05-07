import { verifyToken } from "../modules/auth/auth.service.js";
import prisma from "../config/prisma.js";

/**
 * Middleware to verify JWT and attach user to the request.
 */
export const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = verifyToken(token);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        // Attach user to request for use in controllers
        const { password: _, ...userWithoutPassword } = user;
        req.user = userWithoutPassword;
        next();
    } catch (e) {
        res.status(401).json({ error: "Invalid or expired token." });
    }
};
