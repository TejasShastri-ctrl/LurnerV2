import * as authService from "./auth.service.js";

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
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token });
    } catch (e) {
        res.status(401).json({ error: e.message });
    }
};

/**
 * Get current user profile (for auth verification).
 */
export const me = async (req, res) => {
    // This assumes authMiddleware has already attached the user to req
    res.json(req.user);
};
