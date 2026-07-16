import crypto from 'node:crypto';
import { db } from '@project-odin-book/db';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/app.js';

describe('Uploads Module: End-to-End API Integration Suites', () => {
  const dummyPassword = 'SecureUploadTester123!';
  let activeUser: { id: string; username: string; email: string };
  let validAccessToken: string;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash(dummyPassword, 10);
    const uniqueId = crypto.randomUUID().slice(0, 8);

    activeUser = await db.user.create({
      data: {
        username: `uploader_${uniqueId}`,
        email: `uploader_${uniqueId}@odin.com`,
        passwordHash,
      },
      select: { id: true, username: true, email: true },
    });

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ username: activeUser.email, password: dummyPassword });

    validAccessToken = loginResponse.body.accessToken || '';
  });

  describe('GET /uploads/signature - Secure Token Signing Gate', () => {
    it('should compute a valid Cloudinary signature when provided authentic tokens and a correct folder query string', async () => {
      const response = await request(app)
        .get('/uploads/signature?folder=profiles')
        .set('Authorization', `Bearer ${validAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          uploadConfig: expect.objectContaining({
            signature: expect.any(String),
            timestamp: expect.any(Number),
            apiKey: expect.any(String),
            cloudName: expect.any(String),
            folder: `odin-book/profiles`,
            publicId: expect.stringContaining(`user_${activeUser.id}_`),
            allowedFormats: ['gif', 'jpeg', 'jpg', 'png', 'webp'],
            maxFileSize: 5_000_000,
          }),
        },
      });

      const hexSignature = response.body.data.uploadConfig.signature;
      expect(hexSignature).toMatch(/^[a-f0-9]{40}$/);
    });

    it('should catch an invalid or missing folder configuration query parameter, returning 400', async () => {
      const response = await request(app)
        .get('/uploads/signature?folder=invalid_folder_name_choice')
        .set('Authorization', `Bearer ${validAccessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should intercept signature generation with a 401 status if the Bearer authentication token is missing', async () => {
      const response = await request(app)
        .get('/uploads/signature?folder=posts')
        .send();

      expect(response.status).toBe(401);
    });
  });
});
