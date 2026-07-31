import type { LoaderFunctionArgs } from 'react-router';
import { ensureAuthHydrated } from '../../../layouts/RootLayout/rootLoader.js';
import { apiFetch } from '../../../lib/api.js';
import type { TimelinePost } from '../../posts/TimelinePage/timelineLoader.js';

export type HashtagFeedLoaderResult = {
  items: TimelinePost[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
  currentQuery: string | null;
};

export const hashtagFeedLoader = async ({
  request,
}: LoaderFunctionArgs): Promise<HashtagFeedLoaderResult> => {
  await ensureAuthHydrated();

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const page = url.searchParams.get('page') || '1';
  const limit = url.searchParams.get('limit') || '10';

  if (!search.trim()) {
    return {
      items: [],
      pagination: { page: 1, limit: parseInt(limit, 10), hasMore: false },
      currentQuery: null,
    };
  }

  const response = await apiFetch(
    `/posts?search=${encodeURIComponent(search.toLowerCase())}&page=${page}&limit=${limit}`,
  );

  if (!response.ok) {
    throw new Response('Failed to load hashtag results.', {
      status: response.status,
    });
  }

  const payload = await response.json();

  return {
    items: payload.data.items,
    pagination: {
      page: payload.data.pagination.page,
      limit: payload.data.pagination.limit,
      hasMore: payload.data.pagination.hasMore,
    },
    currentQuery: search,
  };
};
