import { db } from '@project-odin-book/db';
import { afterAll, beforeAll, beforeEach } from 'vitest';

beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Tests must run with NODE_ENV=test');
  }

  if (process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) {
    throw new Error('Tests must run on against TEST_DATABASE_URL');
  }

  await db.$connect();
});

beforeEach(async () => {
  await db.$executeRaw`
    TRUNCATE TABLE
    "Message",
    "Participant",
    "Conversation",
    "Comment",
    "Like",
    "Post",
    "Follow",
    "User"
    CASCADE;
  `;
});

afterAll(async () => {
  await db.$disconnect();
});
