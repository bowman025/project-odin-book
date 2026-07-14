import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from './generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const db = new PrismaClient({ adapter });

export type * from './generated/prisma/client.js';
export { PrismaClient } from './generated/prisma/client.js';
export { Prisma };
