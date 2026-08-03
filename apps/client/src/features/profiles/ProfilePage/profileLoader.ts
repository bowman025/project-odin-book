import { UsernameParamSchema } from '@project-odin-book/validation';
import type { LoaderFunctionArgs } from 'react-router';
import { ensureAuthHydrated } from '../../../layouts/RootLayout/rootLoader.js';
import { apiFetch } from '../../../lib/api.js';
import type { TimelinePost } from '../../posts/TimelinePage/timelineLoader.js';

export type FollowStatus = 'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED';

export type UserProfile = {
  id: string;
  username: string;
  profilePicture: string | null;
  bio: string | null;
  createdAt: string;
  followStatus: FollowStatus;
  stats: {
    posts: number;
    followers: number;
    following: number;
  };
};

export type ProfileLoaderResult = {
  profile: UserProfile;
  initialPosts: {
    items: TimelinePost[];
    pagination: {
      page: number;
      limit: number;
      hasMore: boolean;
    };
  };
};

export const profileLoader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<ProfileLoaderResult> => {
  await ensureAuthHydrated();

  const paramResult = UsernameParamSchema.safeParse(params);

  if (!paramResult.success) {
    const validationMessage =
      paramResult.error.issues[0]?.message || 'Username is required';
    throw new Error(validationMessage);
  }

  const { username } = paramResult.data;
  const url = new URL(request.url);
  const page = url.searchParams.get('page') || '1';

  const profileRes = await apiFetch(`/users/${username}`);
  if (!profileRes.ok) {
    throw new Response('Profile not found in Odinum archives', {
      status: profileRes.status,
    });
  }

  const profilePayload = await profileRes.json();
  const profile: UserProfile = profilePayload.data.profile;

  const postsRes = await apiFetch(
    `/users/${profile.username}/posts?page=${page}&limit=10`,
  );

  if (!postsRes.ok) {
    throw new Response('Failed to load user chronicles', {
      status: postsRes.status,
    });
  }
  const postsPayload = await postsRes.json();

  return {
    profile,
    initialPosts: postsPayload.data,
  };
};
