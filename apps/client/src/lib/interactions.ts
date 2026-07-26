import type { TimelinePost } from '../features/posts/TimelinePage/timelineLoader.js';
import { apiFetch } from './api.js';

export const handleLikeToggleNetwork = async (
  postId: string,
  setPostsState: React.Dispatch<React.SetStateAction<TimelinePost[]>>,
): Promise<void> => {
  try {
    const response = await apiFetch(`/posts/${postId}/likes`, {
      method: 'POST',
    });

    if (!response.ok) {
      console.error('Like mutation rejected by server gateway.');
      return;
    }

    const body = await response.json();
    const { likeCount, liked } = body.data;

    setPostsState((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) return post;
        return {
          ...post,
          isLiked: liked,
          stats: {
            ...post.stats,
            likes: likeCount,
          },
        };
      }),
    );
  } catch (error) {
    console.error('Failed to sync interaction layer over HTTP:', error);
  }
};
