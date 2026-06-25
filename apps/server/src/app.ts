import 'dotenv/config';
import { createServer } from 'node:http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server } from 'socket.io';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' },
});

const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || 'odin_cookie-secret'));

app.get('/status', (_, res: Response) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
