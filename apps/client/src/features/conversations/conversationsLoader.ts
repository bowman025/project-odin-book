import type { LoaderFunctionArgs } from 'react-router';
import { ensureAuthHydrated } from '../../layouts/RootLayout/rootLoader.js';
import { apiFetch } from '../../lib/api.js';

export type ChatParticipant = {
  id: string;
  username: string;
  profilePicture: string | null;
};

export type MessagePayload = {
  id: string;
  content: string;
  senderId: string | null;
  conversationId: string;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
};

export type InboxConversation = {
  id: string;
  updatedAt: string;
  participants: ChatParticipant[];
  lastMessage: MessagePayload | null;
};

export type InboxLoaderResult = {
  items: InboxConversation[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

export const conversationsLoader = async ({
  request,
}: LoaderFunctionArgs): Promise<InboxLoaderResult> => {
  await ensureAuthHydrated();

  const url = new URL(request.url);
  const page = url.searchParams.get('page') || '1';
  const limit = url.searchParams.get('limit') || '20';

  const response = await apiFetch(`/conversations?page=${page}&limit=${limit}`);

  if (!response.ok) {
    throw new Response('Failed to synchronize messaging workspace index', {
      status: response.status,
    });
  }

  const payload = await response.json();
  return payload.data;
};
