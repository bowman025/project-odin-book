import { z } from 'zod';

const baseTokenPayloadSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.email(),
});

export const accessTokenPayloadSchema = baseTokenPayloadSchema.extend({
  type: z.literal('access'),
});

export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;

export const refreshTokenPayloadSchema = baseTokenPayloadSchema.extend({
  type: z.literal('refresh'),
});

export type RefreshTokenPayload = z.infer<typeof refreshTokenPayloadSchema>;

export const tokenPayloadSchema = z.union([
  accessTokenPayloadSchema,
  refreshTokenPayloadSchema,
]);

export type TokenPayload = z.infer<typeof tokenPayloadSchema>;
