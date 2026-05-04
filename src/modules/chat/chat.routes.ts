import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { chatController } from './chat.controller';

const chatRouter = Router();

// Rate limiting: 5 requests per minute
const chatRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Limit each IP to 5 requests per `window` (here, per 1 minute)
    message: { error: "You're sending requests too quickly. Please wait a few seconds and try again." },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

chatRouter.post('/', chatRateLimiter, chatController);

export { chatRouter };
