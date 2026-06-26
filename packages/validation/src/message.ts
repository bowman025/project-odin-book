import { z } from 'zod';

export const SendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { error: 'Message content cannot be empty' })
    .max(500, { error: 'Message cannot exceed 500 characters' }),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
