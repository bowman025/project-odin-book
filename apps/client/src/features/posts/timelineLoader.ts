import type { LoaderFunctionArgs } from 'react-router';
import { apiFetch } from '../../lib/api.js';

export type TimelinePost = {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    profilePicture: string | null;
  };
  _count?: {
    likes: number;
    comments: number;
  };
};

export type TimelineLoaderResult = {
  items: TimelinePost[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

export const timelineLoader = async ({
  request,
}: LoaderFunctionArgs): Promise<TimelineLoaderResult> => {
  const url = new URL(request.url);
  const page = url.searchParams.get('page') || '1';
  const limit = url.searchParams.get('limit') || '10';
  const feedType = url.searchParams.get('feed') || 'general';

  const apiPath =
    feedType === 'following'
      ? `/posts/following?page=${page}&limit=${limit}`
      : `/posts?page=${page}&limit=${limit}`;

  const response = await apiFetch(apiPath);

  if (!response.ok) {
    throw new Response('Failed to synchronize platform timeline feed metrics', {
      status: response.status,
    });
  }

  const payload = await response.json();
  return payload.data;
};
