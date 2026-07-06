import { z } from 'zod';

export const CommentIdParamSchema = z.object({
  commentId: z.cuid2({ error: 'Invalid comment identifier format' }),
});

export type CommentIdParamInput = z.infer<typeof CommentIdParamSchema>;

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
