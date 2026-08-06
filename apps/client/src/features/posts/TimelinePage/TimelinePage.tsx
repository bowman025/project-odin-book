import { Globe, Loader2, Users } from 'lucide-react';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLoaderData, useSearchParams } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import { useInteractionStore } from '../../../store/interactionStore.js';
import { useUIStore } from '../../../store/uiStore.js';
import { Post } from '../Post/Post';
import { PostComposer } from '../PostComposer/PostComposer';
import styles from './TimelinePage.module.css';
import type { TimelineLoaderResult, TimelinePost } from './timelineLoader.js';

export const TimelinePage: FC = () => {
  const initialData = useLoaderData() as TimelineLoaderResult;
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFeed = searchParams.get('feed') || 'general';

  const openCommentModal = useUIStore((state) => state.openCommentModal);
  const addToast = useUIStore((state) => state.addToast);

  const seedPostMeta = useInteractionStore((state) => state.seedPostMeta);
  const toggleRegistryLike = useInteractionStore(
    (state) => state.toggleRegistryLike,
  );

  const [posts, setPosts] = useState<TimelinePost[]>(initialData.items);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const nextPageRef = useRef(initialData.pagination.page + 1);
  const hasMoreRef = useRef(initialData.pagination.hasMore);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    setPosts(initialData.items);
    setPagination(initialData.pagination);

    seedPostMeta(initialData.items);

    nextPageRef.current = initialData.pagination.page + 1;
    hasMoreRef.current = initialData.pagination.hasMore;
  }, [initialData, seedPostMeta]);

  useEffect(() => {
    nextPageRef.current = pagination.page + 1;
    hasMoreRef.current = pagination.hasMore;
  }, [pagination]);

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

        seedPostMeta(data.items);
      }
    } catch (error) {
      console.error('Failed to load infinite scroll batch:', error);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, activeFeed, seedPostMeta]);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (isFetchingMore) return;

      const observer = new IntersectionObserver((entries) => {
        if (entries?.at(0)?.isIntersecting && hasMoreRef.current) {
          loadMorePosts();
        }
      });
      if (node) {
        observer.observe(node);
        observerRef.current = observer;
      }
    },
    [isFetchingMore, loadMorePosts],
  );

  const handleFeedToggle = (feedType: 'general' | 'following') => {
    setSearchParams({ feed: feedType });
  };

  const handlePostCreated = (newPost: TimelinePost) => {
    setPosts((prev) => [newPost, ...prev]);
    seedPostMeta([newPost]);
  };

  const handleLikeToggle = async (postId: string) => {
    try {
      const response = await apiFetch(`/posts/${postId}/likes`, {
        method: 'POST',
      });
      if (response.ok) {
        const body = await response.json();
        const { likeCount, liked } = body.data;

        toggleRegistryLike(postId, liked, likeCount);
      }
    } catch (error) {
      console.error('Failed to execute timeline feed like mutation:', error);
    }
  };

  const handlePostUpdated = (updatedPost: TimelinePost) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)),
    );
    seedPostMeta([updatedPost]);
  };

  const handlePostDeleted = async (deletedId: string) => {
    try {
      const response = await apiFetch(`/posts/${deletedId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        addToast('Chronicle removed from the archives.', 'success');
        setPosts((prev) => prev.filter((p) => p.id !== deletedId));
      } else {
        addToast('Failed to remove chronicle.', 'error');
      }
    } catch {
      addToast('Network link transmission failure.', 'error');
    }
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
                ? 'Your connections haven’t posted recently.'
                : 'The realm is completely quiet.'}
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <Post
              key={post.id}
              post={post}
              onLikeToggle={handleLikeToggle}
              onCommentClick={(id) => openCommentModal(id)}
              onPostUpdated={handlePostUpdated}
              onPostDeleted={handlePostDeleted}
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
