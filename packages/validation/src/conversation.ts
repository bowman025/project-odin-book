import { z } from 'zod';

export const ConversationIdParamSchema = z.object({
  conversationId: z.cuid2({ error: 'Invalid conversation identifier format' }),
});

export type ConversationIdParamInput = z.infer<
  typeof ConversationIdParamSchema
>;

export const TypingStatusSchema = ConversationIdParamSchema.extend({
  isTyping: z.boolean({ error: 'Typing status must be a boolean flag' }),
});

export type TypingStatusInput = z.infer<typeof TypingStatusSchema>;

export const JoinConversationsSchema = z.object({
  conversationIds: z.array(z.cuid2()).max(100),
});

export type JoinConversationsInput = z.infer<typeof JoinConversationsSchema>;

export const SearchConnectionsSchema = z.object({
  q: z.string().trim().default(''),
});

export type SearchConnectionsInput = z.infer<typeof SearchConnectionsSchema>;
