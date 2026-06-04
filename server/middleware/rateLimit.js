const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  max: 5,                    // 5 attempts per minute
  message: { error: 'Too many login attempts. Try again later.' }
});

const translateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Translation rate limit exceeded.' }
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: 'Too many messages sent. Try again later.' }
});

const anonymousLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many anonymous messages. Try again later.' }
});

module.exports = { loginLimiter, translateLimiter, messageLimiter, anonymousLimiter };
