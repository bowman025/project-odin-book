import 'dotenv/config';
import crypto from 'node:crypto';
import { faker } from '@faker-js/faker';
import { db } from '@project-odin-book/db';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Initiating database seeding sequence...');
  console.log(
    'Note: Generating 200 crypto hashes will take up to 20 seconds. Please hold...',
  );

  await db.$transaction(
    async (tx) => {
      const guestUser = await tx.user.upsert({
        where: { email: 'user@example' },
        update: {},
        create: {
          username: 'guest',
          email: 'user@example.com',
          passwordHash: 'GUEST_ACCOUNT_BYPASS_NO_HASH_REQUIRED',
          bio: 'Welcome! I am a guest exploring this social network.',
        },
        select: { id: true },
      });

      const userIds: string[] = [];

      for (let i = 0; i < 200; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const username = faker.internet
          .username({ firstName, lastName })
          .replace(/[^a-zA-z0-9_]/g, '_')
          .toLowerCase()
          .slice(0, 30);
        const email = faker.internet
          .email({ firstName, lastName })
          .toLowerCase();
        const uniqueRandomPassword = crypto.randomUUID();
        const passwordHash = await bcrypt.hash(uniqueRandomPassword, 10);
        const newUser = await tx.user.create({
          data: {
            username,
            email,
            passwordHash,
            bio: faker.person.bio(),
            profilePicture: faker.image.avatar(),
          },
          select: { id: true },
        });

        userIds.push(newUser.id);
      }

      console.log(`Successfully seeded ${userIds.length} unique user profiles`);
      console.log('Structuring guest user follows...');

      const shuffledUsers = faker.helpers.shuffle([...userIds]);
      const usersToAcceptGuest = shuffledUsers.slice(0, 30);
      const usersPendingGuest = shuffledUsers.slice(30, 40);
      const usersRejectedByGuest = shuffledUsers.slice(40, 50);
      const generalNetworkUsers = shuffledUsers.slice(50);

      for (const targetId of usersToAcceptGuest) {
        await tx.follow.create({
          data: {
            senderId: guestUser.id,
            receiverId: targetId,
            status: 'ACCEPTED',
          },
        });
      }

      for (const targetId of usersPendingGuest) {
        await tx.follow.create({
          data: {
            senderId: targetId,
            receiverId: guestUser.id,
            status: 'PENDING',
          },
        });
      }

      for (const targetId of usersRejectedByGuest) {
        await tx.follow.create({
          data: {
            senderId: targetId,
            receiverId: guestUser.id,
            status: 'REJECTED',
          },
        });
      }

      for (const peerId of generalNetworkUsers) {
        const peerOptions = userIds.filter((id) => id !== peerId);
        const randomConnections = faker.helpers.arrayElements(peerOptions, 5);

        for (const connId of randomConnections) {
          await tx.follow.create({
            data: { senderId: peerId, receiverId: connId, status: 'ACCEPTED' },
          });
        }
      }

      const entireUserPool = [guestUser.id, ...userIds];

      console.log('Publishing 1000 posts spanning a 14-day window...');
      const postIds: string[] = [];

      for (let i = 0; i < 1000; i++) {
        const authorId = faker.helpers.arrayElement(entireUserPool);
        const hasImage = Math.random() < 0.3;
        const imageUrl = hasImage
          ? faker.image.urlPicsumPhotos({ width: 640, height: 480 })
          : null;

        const post = await tx.post.create({
          data: {
            authorId,
            content: faker.lorem.paragraph({ min: 1, max: 4 }),
            imageUrl,
            createdAt: faker.date.recent({ days: 14 }),
          },
          select: { id: true },
        });
        postIds.push(post.id);
      }

      console.log('Injecting 5000 random engagement likes...');
      const existingLikesTracker = new Set<string>();
      let seededLikesCount = 0;

      while (
        seededLikesCount < 5000 &&
        existingLikesTracker.size < entireUserPool.length * postIds.length
      ) {
        const userId = faker.helpers.arrayElement(entireUserPool);
        const postId = faker.helpers.arrayElement(postIds);
        const compoundKey = `${userId}_${postId}`;

        if (!existingLikesTracker.has(compoundKey)) {
          existingLikesTracker.add(compoundKey);

          await tx.like.create({
            data: { userId, postId },
          });

          seededLikesCount++;
        }
      }

      console.log('Creating 3000 comments across posts...');
      for (let i = 0; i < 3000; i++) {
        const authorId = faker.helpers.arrayElement(entireUserPool);
        const postId = faker.helpers.arrayElement(postIds);

        await tx.comment.create({
          data: {
            postId,
            authorId,
            content: faker.lorem.sentence({ min: 5, max: 15 }),
            createdAt: faker.date.recent({ days: 7 }),
          },
        });
      }
      console.log('Transaction complete! Database successfully seeded!');
    },
    {
      timeout: 45000,
    },
  );
}

main().catch((error) => {
  console.error('Database seeding sequence failed and rolled back:', error);
  process.exit(1);
});
