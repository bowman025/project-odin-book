import { z } from 'zod';

export const CreateCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { error: 'Comment content cannot be empty' })
    .max(1000, { error: 'Comment cannot exceed 1000 characters' }),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

export const UpdateCommentSchema = CreateCommentSchema.partial();

export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
