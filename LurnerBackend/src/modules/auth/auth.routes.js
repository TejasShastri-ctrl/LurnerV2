import { Router } from "express";
import * as authController from "./auth.controller.js";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);

// We'll add the /me route later once middleware is ready
// router.get("/me", authMiddleware, authController.me);

export default router;
