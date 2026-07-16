import { db } from '@project-odin-book/db';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app.js';

describe('Auth Module: End-to-End API Integration Suites', () => {
  const pristineRegistrationPayload = {
    username: 'test_user',
    email: 'integration@odin.com',
    password: 'SecureTestPassword123!',
    confirmPassword: 'SecureTestPassword123!',
  };

  describe('POST /auth/register - User Account Provisioning Gate', () => {
    it('should parse a valid payload, commit a new user row to disk, and return a 201 status', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(pristineRegistrationPayload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'success',
        message: 'Account registered successfully',
        user: expect.objectContaining({
          id: expect.any(String),
          username: pristineRegistrationPayload.username,
          email: pristineRegistrationPayload.email,
          createdAt: expect.any(String),
        }),
      });

      const databaseUserRecord = await db.user.findUnique({
        where: { email: pristineRegistrationPayload.email },
        select: { id: true, username: true, passwordHash: true },
      });

      expect(databaseUserRecord).toBeDefined();
      expect(databaseUserRecord?.username).toBe(
        pristineRegistrationPayload.username,
      );

      if (databaseUserRecord?.passwordHash) {
        expect(databaseUserRecord.passwordHash).not.toBe(
          pristineRegistrationPayload.password,
        );

        const isBcryptHash =
          databaseUserRecord.passwordHash.startsWith('$2a$') ||
          databaseUserRecord.passwordHash.startsWith('$2b$');
        expect(isBcryptHash).toBe(true);
      } else {
        expect.fail(
          'Expected databaseUserRecord.passwordHash to be a valid string hash value, received null',
        );
      }
    });

    it('should catch an invalid payload at the Zod firewall and return a 400 status', async () => {
      const flawedPayload = {
        ...pristineRegistrationPayload,
        confirmPassword: 'MismatchedPassword123!',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(flawedPayload);

      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'error',
          message: 'Validation failed',
          errors: expect.any(Array),
        }),
      );
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should prevent duplicate registration attempts on unique columns and return a 409 status', async () => {
      await db.user.create({
        data: {
          username: 'existing_username',
          email: pristineRegistrationPayload.email,
          passwordHash: 'mock_hash',
        },
      });

      const response = await request(app)
        .post('/auth/register')
        .send(pristineRegistrationPayload);

      expect(response.status).toBe(409);
      expect.objectContaining({
        status: 'error',
        message: 'Duplicate value',
      });
    });
  });

  describe('POST /auth/login - Authentication Session Initializer Gate', () => {
    const loginUserPassword = 'SecureTestPassword123!';
    let seededUser: { id: string; username: string; email: string };

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash(loginUserPassword, 10);
      seededUser = await db.user.create({
        data: {
          username: 'test_user',
          email: 'login@odin.com',
          passwordHash: hashedPassword,
        },
        select: {
          id: true,
          username: true,
          email: true,
        },
      });
    });

    it('should authenticate with a valid email, set a refresh cookie, and return an access token', async () => {
      const response = await request(app).post('/auth/login').send({
        username: seededUser.email,
        password: loginUserPassword,
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'success',
          message: 'Logged in successfully',
          accessToken: expect.any(String),
          user: {
            id: seededUser.id,
            username: seededUser.username,
            email: seededUser.email,
          },
        }),
      );

      const cookieHeader = response.headers['set-cookie'];
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader?.[0]).toContain('refreshToken=');
      expect(cookieHeader?.[0]).toContain('HttpOnly');

      const dbUserRecord = await db.user.findUnique({
        where: { id: seededUser.id },
        select: { refreshToken: true },
      });

      expect(dbUserRecord?.refreshToken).toBeTypeOf('string');
      expect(dbUserRecord?.refreshToken).not.toBeNull();
    });

    it('should accept space-padded username strings via internal identifier normalization logic', async () => {
      const response = await request(app).post('/auth/login').send({
        username: '   test_user   ',
        password: loginUserPassword,
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should block incorrect password attempts at the passport strategy firewall and return a 401 status', async () => {
      const response = await request(app).post('/auth/login').send({
        username: seededUser.username,
        password: 'AnIncorrectPasswordAttempt123!',
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'error',
          message: 'Invalid credentials',
        }),
      );
    });

    it('should trigger the timing-attack shield and reject non-existent profile identifiers with a 401 status', async () => {
      const response = await request(app).post('/auth/login').send({
        username: 'ghost_user_profile',
        password: 'AnyPasswordValue123!',
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'error',
          message: 'Invalid credentials',
        }),
      );
    });
  });

  describe('POST /auth/refresh - Session Token Rotation Gate', () => {
    const testerPassword = 'SecureRefreshPassword123!';
    let seededUser: { id: string; username: string; email: string };
    let initialRefreshToken: string;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash(testerPassword, 10);
      seededUser = await db.user.create({
        data: {
          username: 'test_user',
          email: 'refresh@odin.com',
          passwordHash: hashedPassword,
        },
        select: { id: true, username: true, email: true },
      });
      const loginResponse = await request(app).post('/auth/login').send({
        username: seededUser.email,
        password: testerPassword,
      });

      const cookieHeaderArray = loginResponse.headers['set-cookie'];
      expect(cookieHeaderArray).toBeDefined();

      const rawCookieString = cookieHeaderArray?.[0] || '';
      initialRefreshToken = rawCookieString.split(';')[0]?.split('=')[1] || '';
    });

    it('should rotate session credentials cleanly when passed a valid refresh cookie token', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.advanceTimersByTime(5000);

      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', [`refreshToken=${initialRefreshToken}`]);

      vi.useRealTimers();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        accessToken: expect.any(String),
      });

      const newCookieHeader = response.headers['set-cookie'];
      expect(newCookieHeader).toBeDefined();

      const newCookieString = newCookieHeader?.[0] || '';
      const newRefreshToken =
        newCookieString.split(';')[0]?.split('=')[1] || '';

      expect(newRefreshToken).not.toBe(initialRefreshToken);

      const dbUserRecord = await db.user.findUnique({
        where: { id: seededUser.id },
        select: { refreshToken: true },
      });

      expect(dbUserRecord?.refreshToken).toBeTypeOf('string');
      expect(dbUserRecord?.refreshToken).not.toBeNull();
    });

    it('should reject the request with a 401 status if the refresh cookie is missing', async () => {
      const response = await request(app).post('/auth/refresh').send();

      expect(response.status).toBe(401);
      expect(response.body.message).toBe(
        'Refresh token missing. Please log in again',
      );
    });

    it('should reject reuse attempts of old refresh tokens, clear the cookie, and throw a 401 error', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.advanceTimersByTime(5000);

      await request(app)
        .post('/auth/refresh')
        .set('Cookie', [`refreshToken=${initialRefreshToken}`]);

      vi.useRealTimers();

      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', [`refreshToken=${initialRefreshToken}`]);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe(
        'Session invalid or expired. Please log in again.',
      );

      const clearCookieHeader = response.headers['set-cookie'];
      expect(clearCookieHeader?.[0]).toContain('refreshToken=;');
    });
  });

  describe('POST /auth/logout - Session Revocation & Sign-Out Gate', () => {
    const logoutPassword = 'SecureTestPassword123!';
    let seededUser: { id: string; username: string; email: string };
    let activeRefreshToken: string;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash(logoutPassword, 10);
      seededUser = await db.user.create({
        data: {
          username: 'test_user',
          email: 'logout@odin.com',
          passwordHash: hashedPassword,
        },
        select: { id: true, username: true, email: true },
      });

      const loginResponse = await request(app).post('/auth/login').send({
        username: seededUser.email,
        password: logoutPassword,
      });

      const cookieHeaderArray = loginResponse.headers['set-cookie'];
      expect(cookieHeaderArray).toBeDefined();
      const rawCookieString = cookieHeaderArray?.[0] || '';
      activeRefreshToken = rawCookieString.split(';')[0]?.split('=')[1] || '';
    });

    it('should clear out the database token hash and return a cookie erasure directive', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Cookie', [`refreshToken=${activeRefreshToken}`]);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        message: 'Logged out successfully',
      });

      const clearCookieHeader = response.headers['set-cookie'];
      expect(clearCookieHeader?.[0]).toContain('refreshToken=;');

      const dbUserRecord = await db.user.findUnique({
        where: { id: seededUser.id },
        select: { refreshToken: true },
      });

      expect(dbUserRecord?.refreshToken).toBeNull();
    });

    it('should respond with a 200 status and clear the cookie even if invoked without any active cookie attached', async () => {
      const response = await request(app).post('/auth/logout').send();

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');

      const clearCookieHeader = response.headers['set-cookie'];
      expect(clearCookieHeader?.[0]).toContain('refreshToken=;');
    });
  });

  describe('PATCH /auth/change-password - Protected Password Mutation Gate', () => {
    const originalPassword = 'OldSecurePassword123!';
    const brandNewPassword = 'BrandNewSecurePassword123!';
    let seededUser: { id: string; username: string; email: string };
    let validAccessToken: string;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash(originalPassword, 10);
      seededUser = await db.user.create({
        data: {
          username: 'test_user',
          email: 'changer@odin.com',
          passwordHash: hashedPassword,
        },
        select: { id: true, username: true, email: true },
      });

      const loginResponse = await request(app).post('/auth/login').send({
        username: seededUser.email,
        password: originalPassword,
      });

      validAccessToken = loginResponse.body.accessToken;
      expect(validAccessToken).toBeTypeOf('string');
    });

    it('should mutate the user password when provided a valid access token and matching current password', async () => {
      const response = await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({
          currentPassword: originalPassword,
          newPassword: brandNewPassword,
          confirmNewPassword: brandNewPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        message: 'Your password has been changed successfully.',
      });

      const clearCookieHeader = response.headers['set-cookie'];
      expect(clearCookieHeader?.[0]).toContain('refreshToken=;');

      const dbUserRecord = await db.user.findUnique({
        where: { id: seededUser.id },
        select: { passwordHash: true },
      });

      expect(dbUserRecord?.passwordHash).not.toBeNull();
      if (dbUserRecord?.passwordHash) {
        const matchesNewPassword = await bcrypt.compare(
          brandNewPassword,
          dbUserRecord.passwordHash,
        );
        expect(matchesNewPassword).toBe(true);
      }
    });

    it('should intercept the request with a 401 status if the Bearer authentication token is missing', async () => {
      const response = await request(app).patch('/auth/change-password').send({
        currentPassword: originalPassword,
        newPassword: brandNewPassword,
        confirmNewPassword: brandNewPassword,
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe(
        'Authentication token missing or malformed',
      );
    });

    it('should catch a wrong current password at your user service layer and return a 400 status', async () => {
      const response = await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({
          currentPassword: 'ACompletelyWrongCurrentPasswordAttempt123!',
          newPassword: brandNewPassword,
          confirmNewPassword: brandNewPassword,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
    });
  });

  describe('DELETE /auth/delete-account - Protected Account Destruction Gate', () => {
    const deletePassword = 'SecureDeleteUserPassword123!';
    let seededUser: { id: string; username: string; email: string };
    let validAccessToken: string;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash(deletePassword, 10);
      seededUser = await db.user.create({
        data: {
          username: 'test_user',
          email: 'deleter@odin.com',
          passwordHash: hashedPassword,
        },
        select: { id: true, username: true, email: true },
      });

      const loginResponse = await request(app).post('/auth/login').send({
        username: seededUser.email,
        password: deletePassword,
      });

      validAccessToken = loginResponse.body.accessToken;
    });

    it('should purge the user profile from disk and clear the cookie returning a 204 status', async () => {
      const response = await request(app)
        .delete('/auth/delete-account')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({
          password: deletePassword,
        });

      expect(response.status).toBe(204);
      expect(response.text).toBe('');

      const clearCookieHeader = response.headers['set-cookie'];
      expect(clearCookieHeader?.[0]).toContain('refreshToken=;');

      const dbUserRecord = await db.user.findUnique({
        where: { id: seededUser.id },
      });
      expect(dbUserRecord).toBeNull();
    });

    it('should reject the deletion block with a 401 status if the Bearer authentication token is missing', async () => {
      const response = await request(app).delete('/auth/delete-account').send({
        password: deletePassword,
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe(
        'Authentication token missing or malformed',
      );
    });
  });
});
