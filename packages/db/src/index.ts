import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { Prisma, PrismaClient } from './generated/prisma/client.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const db = new PrismaClient({ adapter });
export { PrismaClient } from './generated/prisma/client.js';
export { Prisma };
