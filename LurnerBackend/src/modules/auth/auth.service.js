import prisma from "../../config/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateFriendCode } from "../social/social.service.js";

const JWT_SECRET = process.env.JWT_SECRET || "lurner_secret_key_123";

/**
 * Register a new user with hashed password.
 */
export const registerUser = async (username, email, password) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const friendCode = generateFriendCode();
    
    return prisma.user.create({
        data: {
            name: username, // Mapping username to 'name' in schema
            email,
            password: hashedPassword,
            friendCode
        }
    });
};

/**
 * Authenticate user and return a JWT if successful.
 */
export const loginUser = async (email, password) => {
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "7d" }
    );

    return { user, token };
};

/**
 * Verify a JWT token.
 */
export const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};
