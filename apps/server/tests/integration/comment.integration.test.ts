import crypto from 'node:crypto';
import { db } from '@project-odin-book/db';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/app.js';

describe('Comments Module: End-to-End API Integration Suites', () => {
  const dummyPassword = 'SecureCommentTester123!';
  let authorUser: { id: string; username: string; email: string };
  let testPost: { id: string };
  let authorToken: string;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash(dummyPassword, 10);
    const uniqueId = crypto.randomUUID().slice(0, 8);

    authorUser = await db.user.create({
      data: {
        username: `commenter_${uniqueId}`,
        email: `commenter_${uniqueId}@odin.com`,
        passwordHash,
      },
      select: { id: true, username: true, email: true },
    });

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ username: authorUser.email, password: dummyPassword });

    authorToken = loginResponse.body.accessToken || '';

    testPost = await db.post.create({
      data: {
        authorId: authorUser.id,
        content: 'Thread post content placeholder',
      },
      select: { id: true },
    });
  });

  describe('POST /posts/:postId/comments - Comment Creation Gate', () => {
    it('should append a new comment to a post and return a 201 status', async () => {
      const response = await request(app)
        .post(`/posts/${testPost.id}/comments`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({
          content: 'This is a test comment.',
        });

      expect(response.status).toBe(201);

      expect(response.body).toEqual({
        status: 'success',
        message: 'Comment created successfully',
        data: {
          comment: expect.objectContaining({
            id: expect.any(String),
            postId: testPost.id,
            content: 'This is a test comment.',
            author: expect.objectContaining({
              id: authorUser.id,
              username: authorUser.username,
            }),
          }),
        },
      });
    });

    it('should block comment creation with a 401 status if the authorization header is absent', async () => {
      const response = await request(app)
        .post(`/posts/${testPost.id}/comments`)
        .send({ content: 'Unauthorized comment' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /posts/:postId/comments - Public Feed Index Lookup', () => {
    it('should return a paginated listing of comments matching the parent post identifier', async () => {
      const seededComment = await db.comment.create({
        data: {
          postId: testPost.id,
          authorId: authorUser.id,
          content: 'Publicly indexed response content',
        },
      });

      const response = await request(app).get(
        `/posts/${testPost.id}/comments?page=1&limit=5`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          items: [
            expect.objectContaining({
              id: seededComment.id,
              postId: testPost.id,
              content: 'Publicly indexed response content',
              author: expect.objectContaining({
                id: authorUser.id,
                username: authorUser.username,
              }),
            }),
          ],
          pagination: {
            page: 1,
            limit: 5,
            hasMore: false,
          },
        },
      });

      const commentItem = response.body.data.items[0];
      expect(commentItem.passwordHash).toBeUndefined();
      expect(commentItem.email).toBeUndefined();
    });
  });

  describe('PATCH /posts/:postId/comments/:commentId - Text Content Modification', () => {
    it('should edit comment string values and return a 200 status', async () => {
      const targetComment = await db.comment.create({
        data: {
          postId: testPost.id,
          authorId: authorUser.id,
          content: 'Original comment text',
        },
      });

      const response = await request(app)
        .patch(`/posts/${testPost.id}/comments/${targetComment.id}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({
          content: 'Updated comment text',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Comment updated successfully');
      expect(response.body.data.comment.content).toBe('Updated comment text');
    });

    it('should return a 400 bad request error if the patch content parameters are left blank', async () => {
      const targetComment = await db.comment.create({
        data: {
          postId: testPost.id,
          authorId: authorUser.id,
          content: 'Initial state',
        },
      });

      const response = await request(app)
        .patch(`/posts/${testPost.id}/comments/${targetComment.id}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No fields to update');
    });
  });

  describe('DELETE /posts/:postId/comments/:commentId - Destruction Gate', () => {
    it('should remove the comment row from the database and return a 204 status', async () => {
      const targetComment = await db.comment.create({
        data: {
          postId: testPost.id,
          authorId: authorUser.id,
          content: 'Content to be destroyed',
        },
      });

      const response = await request(app)
        .delete(`/posts/${testPost.id}/comments/${targetComment.id}`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(response.status).toBe(204);
      expect(response.text).toBe('');

      const dbSearch = await db.comment.findUnique({
        where: { id: targetComment.id },
      });
      expect(dbSearch).toBeNull();
    });
  });
});
