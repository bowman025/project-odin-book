import { z } from 'zod';

export const CreatePostSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { error: 'Post content cannot be empty' })
    .max(280, { error: 'Post cannot exceed 280 characters' }),

  imageUrl: z
    .url({
      protocol: /^https$/,
      hostname: /^(.*\.)?cloudinary\.com$/,
      error: 'Image URL must be a valid Cloudinary HTTPS URL',
    })
    .optional()
    .nullable(),

  tags: z.array(z.string()).optional(),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;

export const CreateCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { error: 'Comment content cannot be empty' })
    .max(280, { error: 'Comment cannot exceed 280 characters' }),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
