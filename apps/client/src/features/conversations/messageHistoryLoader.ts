import type { LoaderFunctionArgs } from 'react-router';
import { ensureAuthHydrated } from '../../layouts/RootLayout/rootLoader.js';
import { apiFetch } from '../../lib/api.js';
import type { MessagePayload } from './conversationsLoader.js';

export type MessageHistoryLoaderResult = {
  items: MessagePayload[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
  conversationId: string;
};

export const messageHistoryLoader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<MessageHistoryLoaderResult> => {
  await ensureAuthHydrated();

  const { conversationId } = params;

  if (!conversationId) {
    throw new Response(
      'Malformed URL state: Missing active conversation identifier context',
      {
        status: 400,
      },
    );
  }

  const url = new URL(request.url);
  const page = url.searchParams.get('page') || '1';
  const limit = url.searchParams.get('limit') || '30';

  const response = await apiFetch(
    `/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
  );

  if (!response.ok) {
    throw new Response('Failed to synchronize dialogue history context logs', {
      status: response.status,
    });
  }

  const payload = await response.json();

  return {
    items: payload.data.items,
    pagination: payload.data.pagination,
    conversationId,
  };
};
