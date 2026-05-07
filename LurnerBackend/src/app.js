import express from "express";
import cors from "cors";
import questionRoutes from "./modules/questions/question.routes.js";
import submissionRoutes from "./modules/submissions/submission.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import socialRoutes from "./modules/social/social.routes.js";
import contestRoutes from "./modules/contests/contest.routes.js";
import analyticsRoutes from "./modules/analytics/analytics.routes.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api/analytics", analyticsRoutes);


// Legacy/Root endpoint
app.get("/", (req, res) => {
    res.json({ 
        message: "Lurner API is modular and running",
        version: "1.0.0"
    });
});

export default app;
