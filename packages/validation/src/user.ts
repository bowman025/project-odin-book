import { z } from 'zod';
import { positiveIntFromString } from './common.js';

export const UsernameParamSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, { error: 'Username is required' })
    .transform((val) => val.toLowerCase()),
});

export type UsernameParamInput = z.infer<typeof UsernameParamSchema>;

export const UpdateProfileSchema = z.object({
  bio: z
    .string()
    .trim()
    .max(160, { error: 'Bio cannot exceed 160 characters' })
    .transform((val) => (val === '' ? null : val))
    .optional()
    .nullable(),

  profilePicture: z
    .url({
      protocol: /^https$/,
      hostname: /^(.*\.)?cloudinary\.com$/,
      error: 'Profile picture URL must be a valid Cloudinary HTTPS URL',
    })
    .nullable()
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const FollowActionSchema = z.object({
  receiverId: z.cuid2({ error: 'Invalid user identifier format' }),
});

export type FollowActionInput = z.infer<typeof FollowActionSchema>;

export const UpdateFollowStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED'], {
    error: 'Status must be either ACCEPTED or REJECTED',
  }),
});

export type UpdateFollowStatusInput = z.infer<typeof UpdateFollowStatusSchema>;

export const UserDirectoryQuerySchema = z.object({
  page: positiveIntFromString(1),
  limit: positiveIntFromString(12),
  q: z.string().trim().optional(),
  sortBy: z
    .preprocess((val) => val || 'alphabetical', z.string())
    .refine((val) => ['alphabetical', 'newest', 'followers'].includes(val), {
      message: 'Invalid sorting modifier criterion token selection',
    })
    .default('alphabetical') as z.ZodType<
    'alphabetical' | 'newest' | 'followers'
  >,
  letter: z
    .string()
    .length(1)
    .regex(
      /^[a-zA-Z#]$/,
      'Must be a single alphabetical character or symbol indicator',
    )
    .transform((val) => val.toUpperCase())
    .optional(),
});

export type UserDirectoryQueryInput = z.infer<typeof UserDirectoryQuerySchema>;
