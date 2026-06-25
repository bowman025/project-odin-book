import rateLimit, { type Options } from 'express-rate-limit';

const FIFTEEN_MIN = 15 * 60 * 1000;

const createHandler: Options['handler'] = (_req, res, _next, options) => {
  const retryAfterSeconds = Math.ceil(options.windowMs / 1000);

  res.status(options.statusCode).json({
    status: 'error',
    message: `Too many requests, try again in ${Math.ceil(
      retryAfterSeconds / 60,
    )} minutes`,
  });
};

const keyGenerator: Options['keyGenerator'] = (req) => {
  if (req.user?.id) return req.user.id;
  if (req.ip) return req.ip;
  return 'anonymous';
};

const createLimiter = (max: number, windowMs = FIFTEEN_MIN) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    handler: createHandler,
  });
};

export const authLimiter = createLimiter(20);
export const apiLimiter = createLimiter(500);
export const uploadLimiter = createLimiter(15);
