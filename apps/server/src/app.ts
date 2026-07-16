import 'dotenv/config';
import { createServer } from 'node:http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRouter } from './modules/auth/authRoutes.js';
import { conversationRouter } from './modules/conversations/conversationRoutes.js';
import { followRouter } from './modules/follows/followRoutes.js';
import { postRouter } from './modules/posts/postRoutes.js';
import { cloudinaryRouter } from './modules/uploads/cloudinaryRoutes.js';
import { userRouter } from './modules/users/userRoutes.js';
import { env, isProduction } from './shared/config/env.js';
import { initSocket } from './shared/config/socket.js';
import { errorHandler } from './shared/middleware/errorHandler.js';
import { notFound } from './shared/middleware/notFound.js';

const app = express();
export const httpServer = createServer(app);

initSocket(httpServer);

app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

if (!isProduction) {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser(env.COOKIE_SECRET));

app.use('/auth', authRouter);
app.use('/users', userRouter);
app.use('/posts', postRouter);
app.use('/follows', followRouter);
app.use('/conversations', conversationRouter);
app.use('/uploads', cloudinaryRouter);

app.get('/status', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use(notFound);
app.use(errorHandler);

export default app;
