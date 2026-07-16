import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit';

const FIFTEEN_MIN = 15 * 60 * 1000;

export const createHandler: Options['handler'] = (
  _req,
  res,
  _next,
  options,
) => {
  const retryAfterMinutes = Math.ceil(options.windowMs / 1000 / 60);

  res.status(options.statusCode).json({
    status: 'error',
    message: `Too many requests, try again in ${retryAfterMinutes} minutes`,
  });
};

export const keyGenerator: Options['keyGenerator'] = (req) => {
  if (req.user?.id) return req.user.id;
  if (req.ip) return ipKeyGenerator(req.ip);
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
    skip: () => process.env.NODE_ENV === 'test',
  });
};

export const authLimiter = createLimiter(20);
export const apiLimiter = createLimiter(500);
export const uploadLimiter = createLimiter(15);
