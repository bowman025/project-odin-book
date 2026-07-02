import { z } from 'zod';

export const PostIdParamSchema = z.object({
  postId: z.cuid2({ error: 'Invalid post identifier format' }),
});

export type PostIdParamInput = z.infer<typeof PostIdParamSchema>;

export const CommentIdParamSchema = z.object({
  commentId: z.cuid2({ error: 'Invalid comment identifier format' }),
});

export type CommentIdParamInput = z.infer<typeof CommentIdParamSchema>;

export const RequestIdParamSchema = z.object({
  requestId: z.cuid2({ error: 'Invalid request identifier format' }),
});

export type RequestIdParamInput = z.infer<typeof RequestIdParamSchema>;

const positiveIntFromString = (defaultValue: number, max?: number) => {
  let numberSchema = z.number().int().positive();

  if (max !== undefined) {
    numberSchema = numberSchema.max(max);
  }

  return z
    .string()
    .optional()
    .default(String(defaultValue))
    .refine((val) => /^[1-9]\d*$/.test(val), {
      error: 'Must be a positive integer',
    })
    .transform(Number)
    .pipe(numberSchema);
};

export const PaginationQuerySchema = z.object({
  page: positiveIntFromString(1),
  limit: positiveIntFromString(10, 50),
});

export type PaginationQueryInput = z.infer<typeof PaginationQuerySchema>;
