import { UsernameParamSchema } from '@project-odin-book/validation';
import type { LoaderFunctionArgs } from 'react-router';
import { ensureAuthHydrated } from '../../layouts/RootLayout/rootLoader.js';
import { apiFetch } from '../../lib/api.js';

export type ConnectionUserRow = {
  id: string;
  username: string;
  profilePicture: string | null;
  bio: string | null;
};

export type ConnectionsLoaderResult = {
  targetUsername: string;
  items: ConnectionUserRow[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

const fetchConnections = async (
  username: string,
  type: 'followers' | 'following',
  page: string,
): Promise<ConnectionsLoaderResult> => {
  const response = await apiFetch(
    `/follows/${username}/${type}?page=${page}&limit=12`,
  );

  if (!response.ok) {
    throw new Response(
      `Failed to load network ${type} metrics from registries.`,
      {
        status: response.status,
      },
    );
  }

  const payload = await response.json();
  return {
    targetUsername: username,
    items: payload.data.items,
    pagination: payload.data.pagination,
  };
};

export const followersLoader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<ConnectionsLoaderResult> => {
  await ensureAuthHydrated();
  const result = UsernameParamSchema.safeParse(params);
  if (!result.success)
    throw new Error('Username context token parameters required');

  const page = new URL(request.url).searchParams.get('page') || '1';
  return fetchConnections(result.data.username, 'followers', page);
};

export const followingLoader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<ConnectionsLoaderResult> => {
  await ensureAuthHydrated();
  const result = UsernameParamSchema.safeParse(params);
  if (!result.success)
    throw new Error('Username context token parameters required');

  const page = new URL(request.url).searchParams.get('page') || '1';
  return fetchConnections(result.data.username, 'following', page);
};
