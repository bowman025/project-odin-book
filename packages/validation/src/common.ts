import { z } from 'zod';

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

export const TagSuggestionQuerySchema = z.object({
  q: z.string().trim().min(1, 'Query string cannot be empty').max(30),
});

export type TagSuggestionQueryInput = z.infer<typeof TagSuggestionQuerySchema>;
