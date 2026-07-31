import type { LoaderFunctionArgs } from 'react-router';
import { ensureAuthHydrated } from '../../../layouts/RootLayout/rootLoader.js';
import { apiFetch } from '../../../lib/api.js';

export type DirectoryUser = {
  id: string;
  username: string;
  profilePicture: string | null;
  bio: string | null;
  followStatus: 'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED';
  isSender?: boolean;
};

export type DirectoryLoaderResult = {
  items: DirectoryUser[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

export const directoryLoader = async ({
  request,
}: LoaderFunctionArgs): Promise<DirectoryLoaderResult> => {
  await ensureAuthHydrated();

  const url = new URL(request.url);
  const page = url.searchParams.get('page') || '1';
  const limit = url.searchParams.get('limit') || '12';

  const response = await apiFetch(`/users?page=${page}&limit=${limit}`);

  if (!response.ok) {
    throw new Response('Failed to sync general realm directory metrics', {
      status: response.status,
    });
  }

  const payload = await response.json();
  return payload.data;
};
