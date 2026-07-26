import { PostIdParamSchema } from '@project-odin-book/validation';
import type { LoaderFunctionArgs } from 'react-router';
import { ensureAuthHydrated } from '../../../layouts/RootLayout/rootLoader.js';
import { apiFetch } from '../../../lib/api.js';
import type { TimelinePost } from '../TimelinePage/timelineLoader.js';

export type PostComment = {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    profilePicture: string | null;
  };
};

export type CommentsLoaderResult = {
  items: PostComment[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

export type PostDetailLoaderResult = {
  post: TimelinePost;
  initialComments: CommentsLoaderResult;
};

export const postDetailLoader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<PostDetailLoaderResult> => {
  await ensureAuthHydrated();

  const paramResult = PostIdParamSchema.safeParse(params);
  if (!paramResult.success) {
    const validationMessage =
      paramResult.error.issues?.[0]?.message ||
      'Invalid post identifier format';
    throw new Error(validationMessage);
  }

  const { postId } = paramResult.data;
  const url = new URL(request.url);
  const page = url.searchParams.get('page') || '1';

  const postRes = await apiFetch(`/posts/${postId}`);
  if (!postRes.ok) {
    throw new Response('Chronicle thread not found in Odinum', {
      status: postRes.status,
    });
  }
  const postPayload = await postRes.json();
  const post: TimelinePost = postPayload.data.post;

  const commentsRes = await apiFetch(
    `/posts/${postId}/comments?page=${page}&limit=10`,
  );
  if (!commentsRes.ok) {
    throw new Response('Failed to sync thread commentary streams', {
      status: commentsRes.status,
    });
  }
  const commentsPayload = await commentsRes.json();

  return {
    post,
    initialComments: commentsPayload.data,
  };
};
