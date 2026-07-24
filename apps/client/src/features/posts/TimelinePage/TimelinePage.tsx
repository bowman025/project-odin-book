import { Globe, Loader2, Users } from 'lucide-react';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLoaderData, useSearchParams } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import { handleLikeToggleNetwork } from '../../../lib/interactions.js';
import { useUIStore } from '../../../store/uiStore.js';
import { Post } from '../Post/Post.jsx';
import { PostComposer } from '../PostComposer/PostComposer.jsx';
import type { PostComment } from '../PostDetailPage/postDetailLoader.js';
import styles from './TimelinePage.module.css';
import type { TimelineLoaderResult, TimelinePost } from './timelineLoader.js';

export const TimelinePage: FC = () => {
  const initialData = useLoaderData() as TimelineLoaderResult;
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFeed = searchParams.get('feed') || 'general';
  const openCommentModal = useUIStore((state) => state.openCommentModal);
  const [posts, setPosts] = useState<TimelinePost[]>(initialData.items);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const nextPageRef = useRef(initialData.pagination.page + 1);
  const hasMoreRef = useRef(initialData.pagination.hasMore);

  useEffect(() => {
    setPosts(initialData.items);
    setPagination(initialData.pagination);
    nextPageRef.current = initialData.pagination.page + 1;
    hasMoreRef.current = initialData.pagination.hasMore;
  }, [initialData]);

  useEffect(() => {
    nextPageRef.current = pagination.page + 1;
    hasMoreRef.current = pagination.hasMore;
  }, [pagination]);

  useEffect(() => {
    const handleGlobalComment = (e: Event) => {
      const customEvent = e as CustomEvent<{
        postId: string;
        comment: PostComment;
      }>;
      const { postId } = customEvent.detail;

      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id !== postId) return post;
          return {
            ...post,
            stats: {
              ...post.stats,
              comments: post.stats.comments + 1,
            },
          };
        }),
      );
    };

    window.addEventListener('odinum_global_comment_added', handleGlobalComment);
    return () => {
      window.removeEventListener(
        'odinum_global_comment_added',
        handleGlobalComment,
      );
    };
  }, []);

  const loadMorePosts = useCallback(async () => {
    if (isFetchingMore || !hasMoreRef.current) return;

    setIsFetchingMore(true);
    try {
      const apiPath =
        activeFeed === 'following'
          ? `/posts/following?page=${nextPageRef.current}&limit=10`
          : `/posts?page=${nextPageRef.current}&limit=10`;

      const response = await apiFetch(apiPath);

      if (response.ok) {
        const payload = await response.json();
        const data: TimelineLoaderResult = payload.data;

        setPosts((prev) => [...prev, ...data.items]);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to load infinite scroll batch:', error);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, activeFeed]);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries?.at(0)?.isIntersecting && hasMoreRef.current) {
          loadMorePosts();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isFetchingMore, loadMorePosts],
  );

  const handleFeedToggle = (feedType: 'general' | 'following') => {
    setSearchParams({ feed: feedType });
  };

  const handlePostCreated = (newPost: TimelinePost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handleLikeToggle = (postId: string) => {
    handleLikeToggleNetwork(postId, setPosts);
  };

  return (
    <div className={styles.container}>
      <header className={styles.feedHeader}>
        <h2 className={styles.title}>Home Feed</h2>

        <div className={styles.tabsContainer}>
          <button
            type="button"
            className={`${styles.tabButton} ${activeFeed === 'general' ? styles.tabButtonActive : ''}`}
            onClick={() => handleFeedToggle('general')}
          >
            <Globe size={16} />
            <span>Global Realm</span>
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeFeed === 'following' ? styles.tabButtonActive : ''}`}
            onClick={() => handleFeedToggle('following')}
          >
            <Users size={16} />
            <span>Personal Realm</span>
          </button>
        </div>

        <PostComposer onPostCreated={handlePostCreated} />
      </header>

      <div className={styles.postsFeed}>
        {posts.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              {activeFeed === 'following'
                ? 'Your connections have no recent posts. Explore the Global Realm to follow more creators!'
                : 'The realm is completely quiet. Be the first to publish a post!'}
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <Post
              key={post.id}
              post={post}
              onLikeToggle={handleLikeToggle}
              onCommentClick={(id) => openCommentModal(id)}
            />
          ))
        )}
      </div>

      <div ref={sentinelRef} className={styles.infiniteTrigger}>
        {isFetchingMore && (
          <div className={styles.scrollLoader}>
            <Loader2 className={styles.spinner} size={24} />
            <span>Summoning more chronicles...</span>
          </div>
        )}
      </div>
    </div>
  );
};
