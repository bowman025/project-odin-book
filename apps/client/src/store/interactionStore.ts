import { create } from 'zustand';

export type PostMeta = {
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
};

type ProfileStats = {
  postsCount: number;
};

type InteractionState = {
  postRegistry: Record<string, PostMeta>;
  profileStatsRegistry: Record<string, ProfileStats>;

  seedPostMeta: (
    posts: Array<{
      id: string;
      isLiked: boolean;
      stats: { likes: number; comments: number };
    }>,
  ) => void;
  toggleRegistryLike: (
    postId: string,
    isLiked: boolean,
    likesCount: number,
  ) => void;
  incrementRegistryCommentCount: (postId: string) => void;
  decrementRegistryCommentCount: (postId: string) => void;
  evictPostMeta: (postId: string) => void;

  seedProfileStats: (username: string, postsCount: number) => void;
  decrementProfilePostCount: (username: string) => void;
  incrementProfilePostCount: (username: string) => void;
};

export const useInteractionStore = create<InteractionState>((set) => ({
  postRegistry: {},
  profileStatsRegistry: {},

  seedPostMeta: (posts) =>
    set((state) => {
      const updatedRegistry = { ...state.postRegistry };

      posts.forEach((post) => {
        updatedRegistry[post.id] = {
          isLiked: post.isLiked,
          likesCount: post.stats.likes,
          commentsCount: post.stats.comments,
        };
      });

      return { postRegistry: updatedRegistry };
    }),

  toggleRegistryLike: (postId, isLiked, likesCount) =>
    set((state) => {
      const current = state.postRegistry[postId];
      const baseCommentsCount = current ? current.commentsCount : 0;

      return {
        postRegistry: {
          ...state.postRegistry,
          [postId]: {
            isLiked,
            likesCount,
            commentsCount: baseCommentsCount,
          },
        },
      };
    }),

  incrementRegistryCommentCount: (postId) =>
    set((state) => {
      const current = state.postRegistry[postId];
      if (!current) return {};

      return {
        postRegistry: {
          ...state.postRegistry,
          [postId]: {
            isLiked: current.isLiked,
            likesCount: current.likesCount,
            commentsCount: current.commentsCount + 1,
          },
        },
      };
    }),

  decrementRegistryCommentCount: (postId) =>
    set((state) => {
      const current = state.postRegistry[postId];
      if (!current) return {};

      return {
        postRegistry: {
          ...state.postRegistry,
          [postId]: {
            isLiked: current.isLiked,
            likesCount: current.likesCount,
            commentsCount: Math.max(0, current.commentsCount - 1),
          },
        },
      };
    }),

  evictPostMeta: (postId) =>
    set((state) => {
      const updatedRegistry = { ...state.postRegistry };
      delete updatedRegistry[postId];
      return { postRegistry: updatedRegistry };
    }),

  seedProfileStats: (username, postsCount) =>
    set((state) => ({
      profileStatsRegistry: {
        ...state.profileStatsRegistry,
        [username.toLowerCase()]: { postsCount },
      },
    })),

  incrementProfilePostCount: (username) =>
    set((state) => {
      const key = username.toLowerCase();
      const current = state.profileStatsRegistry[key];
      if (!current) return {};
      return {
        profileStatsRegistry: {
          ...state.profileStatsRegistry,
          [key]: { postsCount: current.postsCount + 1 },
        },
      };
    }),

  decrementProfilePostCount: (username) =>
    set((state) => {
      const key = username.toLowerCase();
      const current = state.profileStatsRegistry[key];
      if (!current) return {};
      return {
        profileStatsRegistry: {
          ...state.profileStatsRegistry,
          [key]: { postsCount: Math.max(0, current.postsCount - 1) },
        },
      };
    }),
}));
