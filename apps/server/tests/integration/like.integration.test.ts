import crypto from 'node:crypto';
import { db } from '@project-odin-book/db';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/app.js';

describe('Likes Module: End-to-End API Integration Suites', () => {
  const dummyPassword = 'SecureLikeTester123!';
  let activeUser: { id: string; username: string; email: string };
  let targetPost: { id: string };
  let validAccessToken: string;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash(dummyPassword, 10);
    const uniqueId = crypto.randomUUID().slice(0, 8);

    activeUser = await db.user.create({
      data: {
        username: `liker_${uniqueId}`,
        email: `liker_${uniqueId}@odinum.com`,
        passwordHash,
      },
      select: { id: true, username: true, email: true },
    });

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ username: activeUser.email, password: dummyPassword });

    validAccessToken = loginResponse.body.accessToken || '';

    targetPost = await db.post.create({
      data: {
        authorId: activeUser.id,
        content: 'This is an awesome post ready for engagement tracking.',
      },
      select: { id: true },
    });
  });

  describe('POST /posts/:postId/likes - Toggle Engagement Link Gate', () => {
    it('should add a like to a post on the first call and increment the count', async () => {
      const response = await request(app)
        .post(`/posts/${targetPost.id}/likes`)
        .set('Authorization', `Bearer ${validAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        message: 'Post liked',
        data: {
          liked: true,
          likeCount: 1,
        },
      });

      const rowSearch = await db.like.findUnique({
        where: {
          userId_postId: {
            userId: activeUser.id,
            postId: targetPost.id,
          },
        },
      });
      expect(rowSearch).not.toBeNull();
    });

    it('should remove a like from a post on a consecutive call and decrement the count', async () => {
      await db.like.create({
        data: {
          userId: activeUser.id,
          postId: targetPost.id,
        },
      });

      const response = await request(app)
        .post(`/posts/${targetPost.id}/likes`)
        .set('Authorization', `Bearer ${validAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        message: 'Post unliked',
        data: {
          liked: false,
          likeCount: 0,
        },
      });

      const rowSearch = await db.like.findUnique({
        where: {
          userId_postId: {
            userId: activeUser.id,
            postId: targetPost.id,
          },
        },
      });
      expect(rowSearch).toBeNull();
    });

    it('should intercept toggles with a 401 status if the Bearer authentication token is missing', async () => {
      const response = await request(app)
        .post(`/posts/${targetPost.id}/likes`)
        .send();

      expect(response.status).toBe(401);
    });

    it('should catch an invalid postId identifier and return a 400 status', async () => {
      const faultyCuidId = 'invalid_id_format_trace';
      const response = await request(app)
        .post(`/posts/${faultyCuidId}/likes`)
        .set('Authorization', `Bearer ${validAccessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });
  });
});
