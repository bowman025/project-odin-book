import 'dotenv/config';
import { createServer } from 'node:http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isProduction } from './config/env.js';
import { initSocket } from './config/socket.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { authRouter } from './routes/authRoutes.js';
import { cloudinaryRouter } from './routes/cloudinaryRoutes.js';
import { conversationRouter } from './routes/conversationRoutes.js';
import { followRouter } from './routes/followRoutes.js';
import { postRouter } from './routes/postRoutes.js';
import { userRouter } from './routes/userRoutes.js';

const app = express();
const httpServer = createServer(app);

initSocket(httpServer);

const PORT = env.PORT;

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

httpServer.listen(PORT, () => {
  console.log(`Odin-Book Server running on port ${PORT}`);
  console.log('Real-time Socket.io engine engaged over Websockets');
});
