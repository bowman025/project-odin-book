import { z } from 'zod';

export const PostIdParamSchema = z.object({
  postId: z.cuid2({ error: 'Invalid post identifier format' }),
});

export type PostIdParamInput = z.infer<typeof PostIdParamSchema>;

export const CreatePostSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { error: 'Post content cannot be empty' })
    .max(1000, { error: 'Post cannot exceed 1000 characters' }),

  imageUrl: z
    .url({
      protocol: /^https$/,
      hostname: /^(.*\.)?cloudinary\.com$/,
      error: 'Image URL must be a valid Cloudinary HTTPS URL',
    })
    .optional()
    .nullable(),

  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1, { error: 'Tag cannot be empty' })
        .max(30, { error: 'Tag cannot exceed 30 characters' }),
    )
    .max(10, { error: 'Maximum of 10 tags allowed' })
    .optional(),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;

export const UpdatePostSchema = CreatePostSchema.partial();

export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
