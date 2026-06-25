import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
// 💡 THE FIX: Import explicitly from client.js (resolves client.ts)
import { Prisma, PrismaClient } from './generated/prisma/client.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const db = new PrismaClient({ adapter });
// 💡 THE FIX: Export explicitly from client.js
export { PrismaClient } from './generated/prisma/client.js';
export { Prisma };
