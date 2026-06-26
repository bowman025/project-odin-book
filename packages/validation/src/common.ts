import { z } from 'zod';

export const IdParamSchema = z.object({
  id: z.cuid2({ error: 'Invalid identifier format' }),
});

export type IdParamInput = z.infer<typeof IdParamSchema>;

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
