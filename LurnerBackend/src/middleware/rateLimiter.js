import rateLimit, {ipKeyGenerator} from "express-rate-limit";

const submissionLimiter = rateLimit({
    windowMs: 2000,
    max: 1, //1 user, 1 request per window per 2 seconds
    message: { error: "You are submitting too fast. Please wait a moment." },
    // IP nahi chalega na baccha, key generator use karo
    keyGenerator: (req) => {
        if(req.user?.id) {
            return `user:${req.user.id}`;
        }
        return ipKeyGenerator(req.ip);
    }
});

export default submissionLimiter;