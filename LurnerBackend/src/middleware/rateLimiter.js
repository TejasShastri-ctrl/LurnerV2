import rateLimit from "express-rate-limit";

const submissionLimiter = rateLimit({
    windowMs: 2000,
    max: 1, // each IP limited to 1 req per windowMs
    message: { error: "You are submitting too fast. Please wait a moment." },
})

export default submissionLimiter;