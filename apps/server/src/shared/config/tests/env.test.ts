import { describe, expect, it } from 'vitest';
import { envSchema } from '../env.js';

describe('Shared Environment Schema Validation Engine', () => {
  const pristineMockEnv = {
    NODE_ENV: 'development',
    PORT: '3000',
    CLIENT_URL: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://localhost:5432/project_odin_book',
    JWT_ACCESS_SECRET:
      '2614ee80c6fc4313172ab768de8d561d8dd56f04daa588663ea7552da2280529',
    JWT_REFRESH_SECRET:
      '3795d0d9e466a7c0293fea6d659db56d92638227bdb4cac259769962953bf641',
    COOKIE_SECRET:
      '7c9fe87ae203aa72b94c05546125929a1b9921276f5923581011d79215ff80b1',
    CLOUDINARY_CLOUD_NAME: 'project_odin_book',
    CLOUDINARY_API_KEY: '123456789',
    CLOUDINARY_API_SECRET: 'abcdefg',
  };

  describe('Success Assertions', () => {
    it('should successfully pass parsing when all mandatory keys are pristine', () => {
      const result = envSchema.safeParse(pristineMockEnv);
      expect(result.success).toBe(true);
    });

    it('should natively coerce string numbers to integers and apply default values', () => {
      const { NODE_ENV, PORT, ...customEnv } = pristineMockEnv;

      const result = envSchema.safeParse(customEnv);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
        expect(result.data.PORT).toBe(3000);
      }
    });
  });

  describe('Failure & Constraint Assertions', () => {
    it('should reject parsing if a required parameter is missing', () => {
      const { DATABASE_URL, ...flawedEnv } = pristineMockEnv;

      const result = envSchema.safeParse(flawedEnv);
      expect(result.success).toBe(false);

      if (!result.success) {
        const hasError = result.error.issues.some((i) =>
          i.path.includes('DATABASE_URL'),
        );
        expect(hasError).toBe(true);
      }
    });

    it('should flag an error if CLIENT_URL is not a valid URL', () => {
      const flawedEnv = {
        ...pristineMockEnv,
        CLIENT_URL: 'not-a-valid-url-string',
      };

      const result = envSchema.safeParse(flawedEnv);
      expect(result.success).toBe(false);

      if (!result.success) {
        const issue = result.error.issues.find((i) =>
          i.path.includes('CLIENT_URL'),
        );
        expect(issue?.code).toBe('invalid_format');
      }
    });

    it('should enforce a minimum character limit of 32 for tokens and hashes', () => {
      const vulnerableEnv = {
        ...pristineMockEnv,
        JWT_ACCESS_SECRET: 'vulnerable__jwt_secret',
      };

      const result = envSchema.safeParse(vulnerableEnv);
      expect(result.success).toBe(false);

      if (!result.success) {
        const issue = result.error.issues.find((i) =>
          i.path.includes('JWT_ACCESS_SECRET'),
        );
        expect(issue?.code).toBe('too_small');
      }
    });

    it('should reject non-whitelisted enum entries for NODE_ENV', () => {
      const invalidEnv = {
        ...pristineMockEnv,
        NODE_ENV: 'staging',
      };

      const result = envSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);

      if (!result.success) {
        const issue = result.error.issues.find((i) =>
          i.path.includes('NODE_ENV'),
        );
        expect(issue?.code).toBe('invalid_value');
      }
    });

    it('should trigger rule requiring TEST_DATABASE_URL if NODE_ENV is set to test', () => {
      const incompleteTestEnv = {
        ...pristineMockEnv,
        NODE_ENV: 'test',
      };

      const result = envSchema.safeParse(incompleteTestEnv);
      expect(result.success).toBe(false);

      if (!result.success) {
        const issue = result.error.issues.find((i) =>
          i.path.includes('TEST_DATABASE_URL'),
        );
        expect(issue?.message).toBe(
          'TEST_DATABASE_URL is required in test environment',
        );
      }
    });
  });
});
