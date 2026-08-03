import crypto from 'node:crypto';
import { db } from '@project-odin-book/db';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/app.js';

describe('Posts Module: End-to-End API Integration Suites', () => {
  const dummyPassword = 'SecurePostTester123!';
  let authorUser: { id: string; username: string; email: string };
  let authorToken: string;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash(dummyPassword, 10);
    const uniqueId = crypto.randomUUID().slice(0, 8);

    authorUser = await db.user.create({
      data: {
        username: `author_${uniqueId}`,
        email: `author_${uniqueId}@odinum.com`,
        passwordHash,
      },
      select: { id: true, username: true, email: true },
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: authorUser.email, password: dummyPassword });

    authorToken = loginResponse.body.accessToken || '';
  });

  describe('POST /api/posts - Content Creation Gate', () => {
    it('should parse a valid payload, commit a new post row, and return a 201 status', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authorToken}`)
        .send({
          content: 'This is my first official post on the platform!',
        });

      expect(response.status).toBe(201);

      expect(response.body).toEqual({
        status: 'success',
        message: 'Post created successfully',
        data: {
          post: expect.objectContaining({
            id: expect.any(String),
            content: 'This is my first official post on the platform!',
            imageUrl: null,
            author: expect.objectContaining({
              id: authorUser.id,
              username: authorUser.username,
            }),
            stats: {
              comments: 0,
              likes: 0,
            },
          }),
        },
      });
    });

    it('should block creation attempts with a 401 status if the Bearer authentication token is missing', async () => {
      const response = await request(app)
        .post('/api/posts')
        .send({ content: 'An unauthorized post mutation attempt' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/posts/:postId - Public Post Retrieval Lookup', () => {
    it('should locate a post by its identifier and return a 200 status without authentication headers', async () => {
      const newPost = await db.post.create({
        data: {
          authorId: authorUser.id,
          content: 'A public look item record entry',
        },
      });
      const response = await request(app).get(`/api/posts/${newPost.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          post: expect.objectContaining({
            id: newPost.id,
            content: 'A public look item record entry',
          }),
        },
      });
    });

    it('should return a 404 response if the targeted post identifier does not exist', async () => {
      const validCuidFormatPlaceholder = 'cld123abc456def789ghi012';
      const response = await request(app).get(
        `/api/posts/${validCuidFormatPlaceholder}`,
      );

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Post not found');
    });
  });

  describe('PATCH /api/posts/:postId - Partial Content Modification Gate', () => {
    it('should edit content text fields and return a updated object wrapper', async () => {
      const initialPost = await db.post.create({
        data: {
          authorId: authorUser.id,
          content: 'Original content string text parameter',
        },
      });

      const response = await request(app)
        .patch(`/api/posts/${initialPost.id}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({
          content: 'Modified and evolved string content',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Post updated successfully');
      expect(response.body.data.post.content).toBe(
        'Modified and evolved string content',
      );
    });

    it('should return a 400 status if the update data is empty', async () => {
      const initialPost = await db.post.create({
        data: { authorId: authorUser.id, content: 'Content state' },
      });

      const response = await request(app)
        .patch(`/api/posts/${initialPost.id}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No fields to update');
    });
  });

  describe('DELETE /api/posts/:postId - Secure Deletion Destruction Gate', () => {
    it('should purge the target post record from disk and return a 204 status', async () => {
      const activePost = await db.post.create({
        data: {
          authorId: authorUser.id,
          content: 'Content to be permanently purged',
        },
      });

      const response = await request(app)
        .delete(`/api/posts/${activePost.id}`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(response.status).toBe(204);
      expect(response.text).toBe('');

      const dbSearch = await db.post.findUnique({
        where: { id: activePost.id },
      });
      expect(dbSearch).toBeNull();
    });
  });

  describe('GET /api/posts - Public Paginated General Timeline Index', () => {
    it('should return a paginated listing of posts and include explicit data shapes', async () => {
      const seededPost = await db.post.create({
        data: {
          authorId: authorUser.id,
          content: 'A timeline item block entry trace',
        },
      });

      const response = await request(app).get('/api/posts?page=1&limit=5');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          items: [
            expect.objectContaining({
              id: seededPost.id,
              content: 'A timeline item block entry trace',
              imageUrl: null,
              author: expect.objectContaining({
                id: authorUser.id,
                username: authorUser.username,
              }),
              stats: {
                comments: 0,
                likes: 0,
              },
            }),
          ],
          pagination: {
            page: 1,
            limit: 5,
            hasMore: false,
          },
        },
      });

      const leakedPostAuthor = response.body.data.items[0].author;
      expect(leakedPostAuthor.passwordHash).toBeUndefined();
      expect(leakedPostAuthor.refreshToken).toBeUndefined();
      expect(leakedPostAuthor.email).toBeUndefined();
    });
  });

  describe('GET /api/posts/following - Protected Personalized Subscription Feed Index', () => {
    let followedUser: { id: string; username: string; email: string };
    let strangerUser: { id: string; username: string; email: string };

    beforeEach(async () => {
      const passwordHash = 'mock_placeholder_hash';
      const uid1 = crypto.randomUUID().slice(0, 8);
      const uid2 = crypto.randomUUID().slice(0, 8);

      followedUser = await db.user.create({
        data: {
          username: `followed_${uid1}`,
          email: `followed_${uid1}@odinum.com`,
          passwordHash,
        },
        select: { id: true, username: true, email: true },
      });

      strangerUser = await db.user.create({
        data: {
          username: `stranger_${uid2}`,
          email: `stranger_${uid2}@odinum.com`,
          passwordHash,
        },
        select: { id: true, username: true, email: true },
      });

      await db.follow.create({
        data: {
          senderId: authorUser.id,
          receiverId: followedUser.id,
          status: 'ACCEPTED',
        },
      });

      await db.post.create({
        data: {
          authorId: followedUser.id,
          content: 'Content from your close friend!',
        },
      });

      await db.post.create({
        data: {
          authorId: strangerUser.id,
          content: 'Spam content from a complete stranger!',
        },
      });
    });

    it('should return posts from followed creators while filtering out non-followed accounts', async () => {
      const response = await request(app)
        .get('/api/posts/following?page=1&limit=10')
        .set('Authorization', `Bearer ${authorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          items: [
            expect.objectContaining({
              content: 'Content from your close friend!',
              author: expect.objectContaining({
                id: followedUser.id,
                username: followedUser.username,
              }),
            }),
          ],
          pagination: {
            page: 1,
            limit: 10,
            hasMore: false,
          },
        },
      });

      const timelineItems = response.body.data.items as Array<{
        content: string;
      }>;
      const strangerPostIsVisible = timelineItems.some((item) =>
        item.content.includes('stranger'),
      );
      expect(strangerPostIsVisible).toBe(false);
    });

    it('should intercept the query with a 401 status if the Bearer authentication token is missing', async () => {
      const response = await request(app)
        .get('/api/posts/following?page=1&limit=10')
        .send();

      expect(response.status).toBe(401);
    });
  });
});
