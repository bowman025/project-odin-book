import 'dotenv/config';
import { createServer } from 'node:http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server } from 'socket.io';
import { env, isProduction } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/authRoutes.js';
import { postRouter } from './routes/postRoutes.js';
import { userRouter } from './routes/userRoutes.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

const PORT = env.PORT || 3000;

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);

if (!isProduction) {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(cookieParser(env.COOKIE_SECRET));

app.use('/auth', authRouter);
app.use('/users', userRouter);
app.use('/posts', postRouter);

app.get('/status', (_, res: Response) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, httpServer, io };
