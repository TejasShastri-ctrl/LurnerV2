import * as authService from "./auth.service.js";
import prisma from "../../config/prisma.js";

/**
 * Handle user registration request.
 */
export const register = async (req, res) => {
    const { username, email, password } = req.body;
    
    try {
        const user = await authService.registerUser(username, email, password);
        // Don't send password back
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    } catch (e) {
        if (e.code === 'P2002') {
            return res.status(400).json({ error: "Email or username already exists" });
        }
        res.status(500).json({ error: e.message });
    }
};

/**
 * Handle user login request.
 */
export const login = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const { user, token } = await authService.loginUser(email, password);
        
        // Set HTTP-only cookie with signed token
        res.cookie("access_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days matching JWT expiration
        });

        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token });
    } catch (e) {
        res.status(401).json({ error: e.message });
    }
};

/**
 * Handle user logout request.
 */
export const logout = async (req, res) => {
    res.clearCookie("access_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    });
    res.json({ message: "Logged out successfully" });
};

/**
 * Get current user profile (for auth verification).
 */
export const me = async (req, res) => {
    try {
        // Fetch full profile once on session validation
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
