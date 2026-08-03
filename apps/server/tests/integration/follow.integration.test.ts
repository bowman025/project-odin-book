import crypto from 'node:crypto';
import { db } from '@project-odin-book/db';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/app.js';

describe('Follows Module: End-to-End API Integration Suites', () => {
  const dummyPassword = 'SecureFollowTester123!';
  let senderUser: { id: string; username: string; email: string };
  let receiverUser: { id: string; username: string; email: string };
  let senderToken: string;
  let receiverToken: string;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash(dummyPassword, 10);

    const uid1 = crypto.randomUUID().slice(0, 8);
    senderUser = await db.user.create({
      data: {
        username: `sender_${uid1}`,
        email: `sender_${uid1}@odinum.com`,
        passwordHash,
      },
      select: { id: true, username: true, email: true },
    });

    const uid2 = crypto.randomUUID().slice(0, 8);
    receiverUser = await db.user.create({
      data: {
        username: `receiver_${uid2}`,
        email: `receiver_${uid2}@odinum.com`,
        passwordHash,
      },
      select: { id: true, username: true, email: true },
    });

    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ username: senderUser.email, password: dummyPassword });
    senderToken = login1.body.accessToken || '';

    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ username: receiverUser.email, password: dummyPassword });
    receiverToken = login2.body.accessToken || '';
  });

  describe('POST /api/follows/:username - Toggle Relationship Link', () => {
    it('should dispatch a pending follow request to a target profile and return 200', async () => {
      const response = await request(app)
        .post(`/api/follows/${receiverUser.username}`)
        .set('Authorization', `Bearer ${senderToken}`);

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        status: 'success',
        message: 'Follow request sent',
        data: {
          status: 'PENDING',
        },
      });
    });

    it('should intercept the query with a 401 status if the Bearer authentication token is missing', async () => {
      const response = await request(app)
        .post(`/api/follows/${receiverUser.username}`)
        .send();

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/follows/requests - View Inbound Invites', () => {
    it('should fetch paginated inbound pending requests for the authenticated user', async () => {
      const seededFollow = await db.follow.create({
        data: {
          senderId: senderUser.id,
          receiverId: receiverUser.id,
          status: 'PENDING',
        },
      });

      const response = await request(app)
        .get('/api/follows/requests?page=1&limit=10')
        .set('Authorization', `Bearer ${receiverToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          items: [
            {
              id: seededFollow.id,
              createdAt: expect.any(String),
              sender: {
                id: senderUser.id,
                username: senderUser.username,
                profilePicture: null,
              },
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            hasMore: false,
          },
        },
      });

      const leakedSender = response.body.data.items[0]?.sender;

      expect(leakedSender).toBeDefined();
      expect(leakedSender?.passwordHash).toBeUndefined();
      expect(leakedSender?.refreshToken).toBeUndefined();
      expect(leakedSender?.email).toBeUndefined();
    });
  });

  describe('PATCH /api/follows/requests/:requestId/accept - Approve Connection', () => {
    it('should accept an inbound connection request and update the status code to ACCEPTED', async () => {
      const pendingFollow = await db.follow.create({
        data: {
          senderId: senderUser.id,
          receiverId: receiverUser.id,
          status: 'PENDING',
        },
      });

      const response = await request(app)
        .patch(`/api/follows/requests/${pendingFollow.id}/accept`)
        .set('Authorization', `Bearer ${receiverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Followed successfully');
      expect(response.body.data.status).toBe('ACCEPTED');

      const verifiedFollow = await db.follow.findUnique({
        where: { id: pendingFollow.id },
      });
      expect(verifiedFollow?.status).toBe('ACCEPTED');
    });
  });

  describe('PATCH /api/follows/requests/:requestId/reject - Decline Connection', () => {
    it('should reject an inbound follow request, changing status elements accordingly', async () => {
      const pendingFollow = await db.follow.create({
        data: {
          senderId: senderUser.id,
          receiverId: receiverUser.id,
          status: 'PENDING',
        },
      });

      const response = await request(app)
        .patch(`/api/follows/requests/${pendingFollow.id}/reject`)
        .set('Authorization', `Bearer ${receiverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('REJECTED');
    });
  });

  describe('PATCH /api/follows/requests/:requestId/revoke - Revoke Approved Connection', () => {
    it('should revoke a previously approved follow relation and return a 200 response', async () => {
      const approvedFollow = await db.follow.create({
        data: {
          senderId: senderUser.id,
          receiverId: receiverUser.id,
          status: 'ACCEPTED',
        },
      });

      const response = await request(app)
        .patch(`/api/follows/requests/${approvedFollow.id}/revoke`)
        .set('Authorization', `Bearer ${receiverToken}`);

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        status: 'success',
        message: 'Follow request rejected',
        data: {
          status: 'REJECTED',
        },
      });

      const verifiedFollow = await db.follow.findUnique({
        where: { id: approvedFollow.id },
      });
      expect(verifiedFollow?.status).toBe('REJECTED');
    });
  });

  describe('GET /api/follows/:username/followers & following - Public Connection Indexes', () => {
    beforeEach(async () => {
      await db.follow.create({
        data: {
          senderId: senderUser.id,
          receiverId: receiverUser.id,
          status: 'ACCEPTED',
        },
      });
    });

    it('should fetch the paginated followers list and enforce a strict public data profile shape', async () => {
      const response = await request(app).get(
        `/api/follows/${receiverUser.username}/followers?page=1&limit=10`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          items: [
            {
              id: senderUser.id,
              username: senderUser.username,
              bio: null,
              profilePicture: null,
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            hasMore: false,
          },
        },
      });

      const leakedUser = response.body.data.items[0];
      expect(leakedUser.passwordHash).toBeUndefined();
      expect(leakedUser.refreshToken).toBeUndefined();
      expect(leakedUser.email).toBeUndefined();
    });

    it('should fetch the paginated following list and enforce a strict public data profile shape', async () => {
      const response = await request(app).get(
        `/api/follows/${senderUser.username}/following?page=1&limit=10`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          items: [
            {
              id: receiverUser.id,
              username: receiverUser.username,
              bio: null,
              profilePicture: null,
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            hasMore: false,
          },
        },
      });

      const leakedUser = response.body.data.items[0];
      expect(leakedUser.passwordHash).toBeUndefined();
      expect(leakedUser.refreshToken).toBeUndefined();
      expect(leakedUser.email).toBeUndefined();
    });
  });
});
