import { z } from 'zod';

export const MessageIdParamSchema = z.object({
  messageId: z.cuid2({ error: 'Invalid message identifier format' }),
});

export type MessageIdParamInput = z.infer<typeof MessageIdParamSchema>;

export const SendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { error: 'Message content cannot be empty' })
    .max(500, { error: 'Message cannot exceed 500 characters' }),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
