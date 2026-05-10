import rateLimit from "express-rate-limit";

const submissionLimiter = rateLimit({
    windowMs: 2000,
    max: 1, //1 user, 1 request per window per 2 seconds
    message: { error: "You are submitting too fast. Please wait a moment." },
    // IP nahi chalega na baccha, key generator use karo
    keyGenerator: (req) => {
        return req.user?.id ? req.user.id.toString() : req.ip;
    }
});

export default submissionLimiter;