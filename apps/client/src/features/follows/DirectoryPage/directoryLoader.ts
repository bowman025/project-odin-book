import type { LoaderFunctionArgs } from 'react-router';
import { ensureAuthHydrated } from '../../../layouts/RootLayout/rootLoader.js';
import { apiFetch } from '../../../lib/api.js';
import type { FollowStatus } from '../../profiles/ProfilePage/profileLoader.js';

export type DirectoryUser = {
  id: string;
  username: string;
  profilePicture: string | null;
  bio: string | null;
  followStatus: FollowStatus;
  isSender?: boolean;
};

export type DirectoryLoaderResult = {
  items: DirectoryUser[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
  filters: {
    q: string;
    sortBy: 'alphabetical' | 'newest' | 'followers';
    letter: string;
  };
};

export const directoryLoader = async ({
  request,
}: LoaderFunctionArgs): Promise<DirectoryLoaderResult> => {
  await ensureAuthHydrated();

  const url = new URL(request.url);
  const page = url.searchParams.get('page') || '1';
  const limit = url.searchParams.get('limit') || '12';

  const q = url.searchParams.get('q') || '';
  const sortBy = url.searchParams.get('sortBy') || 'alphabetical';
  const letter = url.searchParams.get('letter') || '';

  let apiPath = `/users?page=${page}&limit=${limit}&sortBy=${sortBy}`;

  if (q.trim()) {
    apiPath += `&q=${encodeURIComponent(q.trim())}`;
  }

  if (letter.trim()) {
    apiPath += `&letter=${encodeURIComponent(letter.trim())}`;
  }

  const response = await apiFetch(apiPath);

  if (!response.ok) {
    throw new Response('Failed to sync general realm directory metrics', {
      status: response.status,
    });
  }

  const payload = await response.json();

  return {
    items: payload.data.items,
    pagination: payload.data.pagination,
    filters: {
      q,
      sortBy: sortBy as 'alphabetical' | 'newest' | 'followers',
      letter,
    },
  };
};
