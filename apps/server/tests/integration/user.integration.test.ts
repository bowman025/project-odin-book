import crypto from 'node:crypto';
import { db } from '@project-odin-book/db';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/app.js';

describe('Users Module: End-to-End API Integration Suites', () => {
  const dummyPassword = 'SecureUserTester123!';
  let primaryUser: { id: string; username: string; email: string };
  let primaryToken: string;

  beforeEach(async () => {
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const passwordHash = await bcrypt.hash(dummyPassword, 10);

    primaryUser = await db.user.create({
      data: {
        username: `primary_${uniqueId}`,
        email: `primary_${uniqueId}@odinum.com`,
        passwordHash,
      },
      select: { id: true, username: true, email: true },
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: primaryUser.email, password: dummyPassword });

    primaryToken = loginResponse.body.accessToken || '';
  });

  describe('GET /api/users/:username - Public User Profile Details View', () => {
    it('should locate an existing user by username and return a 200 status with profile', async () => {
      const response = await request(app).get(
        `/api/users/${primaryUser.username}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          profile: expect.objectContaining({
            id: primaryUser.id,
            username: primaryUser.username,
          }),
        },
      });
    });

    it('should return a 404 status if the target username does not exist', async () => {
      const response = await request(app).get(
        '/api/users/non_existent_username',
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'error',
          message: "User '@non_existent_username' not found",
        }),
      );
    });
  });

  describe('PATCH /api/users/me - Protected Profile Mutation Gate', () => {
    it('should update partial profile parameters and return the modified object', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${primaryToken}`)
        .send({
          bio: 'Exploring the digital realms of project odin-book.',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'success',
          message: 'Profile updated successfully',
          data: {
            profile: expect.objectContaining({
              id: primaryUser.id,
              username: primaryUser.username,
              bio: 'Exploring the digital realms of project odin-book.',
            }),
          },
        }),
      );
    });

    it('should return a 400 status if the update request body is empty', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${primaryToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No fields to update');
    });

    it('should block the profile update request with a 401 status if the Bearer authentication token is missing', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .send({ bio: 'An unauthorized bio change attempt' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/users - Protected Paginated User Directory Index', () => {
    it('should return a paginated listing of directory profiles without the current user', async () => {
      const secondaryUser = await db.user.create({
        data: {
          username: 'directory_neighbor',
          email: 'neighbor@odinum.com',
          passwordHash: 'mock_placeholder',
        },
      });

      const response = await request(app)
        .get('/api/users?page=1&limit=10')
        .set('Authorization', `Bearer ${primaryToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          items: [
            {
              id: secondaryUser.id,
              username: 'directory_neighbor',
              bio: null,
              profilePicture: null,
              relationshipStatus: 'NONE',
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

      const userList = response.body.data.items as Array<{ id: string }>;
      const selfIsPresent = userList.some((u) => u.id === primaryUser.id);
      expect(selfIsPresent).toBe(false);
    });
  });

  describe('GET /api/users/:username/posts - Public Paginated User Posts Feed', () => {
    beforeEach(async () => {
      await db.post.deleteMany();
      await db.post.createMany({
        data: [
          {
            content: 'Chronicle alpha content logs',
            authorId: primaryUser.id,
            createdAt: new Date('2026-01-01T10:00:00Z'),
          },
          {
            content: 'Chronicle beta content logs',
            authorId: primaryUser.id,
            createdAt: new Date('2026-01-02T10:00:00Z'),
          },
          {
            content: 'Chronicle gamma content logs',
            authorId: primaryUser.id,
            createdAt: new Date('2026-01-03T10:00:00Z'),
          },
        ],
      });
    });

    it('should return a paginated collection of posts matching the target username sorted newest first', async () => {
      const response = await request(app).get(
        `/api/users/${primaryUser.username}/posts?page=1&limit=2`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          pagination: {
            page: 1,
            limit: 2,
            hasMore: true,
          },
          items: [
            expect.objectContaining({
              content: 'Chronicle gamma content logs',
              author: expect.objectContaining({
                id: primaryUser.id,
                username: primaryUser.username,
              }),
            }),
            expect.objectContaining({
              content: 'Chronicle beta content logs',
              author: expect.objectContaining({
                id: primaryUser.id,
                username: primaryUser.username,
              }),
            }),
          ],
        },
      });
    });

    it('should correctly evaluate hasMore as false when hitting the final page layer boundary', async () => {
      const response = await request(app).get(
        `/api/users/${primaryUser.username}/posts?page=2&limit=2`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.pagination).toEqual({
        page: 2,
        limit: 2,
        hasMore: false,
      });
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0]?.content).toBe(
        'Chronicle alpha content logs',
      );
    });

    it('should respond with a 404 status code if the username slug parameter is non-existent', async () => {
      const response = await request(app).get(
        '/api/users/non_existent_username_slug/posts?page=1&limit=10',
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'error',
          message: "User '@non_existent_username_slug' not found",
        }),
      );
    });
  });
});
