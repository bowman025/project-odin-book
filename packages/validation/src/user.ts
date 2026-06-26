import { z } from 'zod';

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
