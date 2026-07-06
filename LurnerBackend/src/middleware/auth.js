import { verifyToken } from "../modules/auth/auth.service.js";

/**
 * Middleware to verify JWT and attach user to the request.
 */
export const authMiddleware = async (req, res, next) => {
    let token = req.cookies?.access_token;

    // Fallback to Bearer token header if cookie is missing (useful for API testing/clients)
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }
    }

    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    try {
        const decoded = verifyToken(token);
        // Stateless assignment: trust the payload fields signed by the server
        req.user = {
            id: decoded.userId,
            email: decoded.email
        };
        next();
    } catch (e) {
        res.status(401).json({ error: "Invalid or expired token." });
    }
};
