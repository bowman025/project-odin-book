import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),

    PORT: z.coerce.number().default(3000),

    CLIENT_URL: z.url(),
    DATABASE_URL: z.string().min(1),
    TEST_DATABASE_URL: z.string().optional(),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    COOKIE_SECRET: z.string().min(32),

    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),

    GITHUB_CLIENT_ID: z
      .string()
      .min(1, { error: 'GitHub Client ID configuration token required' }),
    GITHUB_CLIENT_SECRET: z
      .string()
      .min(1, { error: 'GitHub Client Secret hash is required' }),
  })
  .refine((env) => env.NODE_ENV !== 'test' || !!env.TEST_DATABASE_URL, {
    message: 'TEST_DATABASE_URL is required in test environment',
    path: ['TEST_DATABASE_URL'],
  });

export const env = envSchema.parse(process.env);

export const isProduction = env.NODE_ENV === 'production';
