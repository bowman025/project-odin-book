import { Clock, Flame, Globe, History, Loader2, Users } from 'lucide-react';
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

type DiscoverySortMode = 'latest' | 'popular' | 'oldest';

export const TimelinePage: FC = () => {
  const initialData = useLoaderData() as TimelineLoaderResult;
  const [searchParams, setSearchParams] = useSearchParams();

  const activeFeed = searchParams.get('feed') || 'general';
  const activeSort = (searchParams.get('sort') ||
    'latest') as DiscoverySortMode;

  const openCommentModal = useUIStore((state) => state.openCommentModal);
  const addToast = useUIStore((state) => state.addToast);

  const seedPostMeta = useInteractionStore((state) => state.seedPostMeta);
  const toggleRegistryLike = useInteractionStore(
    (state) => state.toggleRegistryLike,
  );
  const evictPostMeta = useInteractionStore((state) => state.evictPostMeta);

  const [posts, setPosts] = useState<TimelinePost[]>(initialData.items);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const nextPageRef = useRef(2);
  const hasMoreRef = useRef(initialData.pagination.hasMore);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    setPosts(initialData.items);
    seedPostMeta(initialData.items);

    nextPageRef.current = 2;
    hasMoreRef.current = initialData.pagination.hasMore;
  }, [initialData, seedPostMeta]);

  const handleFeedChangeToggle = (feedType: 'general' | 'following') => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', '1');
    nextParams.set('feed', feedType);
    if (feedType === 'following') {
      nextParams.delete('sort');
    }
    setSearchParams(nextParams);
  };

  const handleDiscoverySortToggle = (sortMode: DiscoverySortMode) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', '1');
    nextParams.set('sort', sortMode);
    setSearchParams(nextParams);
  };

  const loadMorePosts = useCallback(async () => {
    if (isFetchingMore || !hasMoreRef.current) return;
    setIsFetchingMore(true);

    try {
      const apiPath =
        activeFeed === 'following'
          ? `/posts/following?page=${nextPageRef.current}&limit=10`
          : `/posts?page=${nextPageRef.current}&limit=10&sort=${activeSort}`;

      const response = await apiFetch(apiPath);
      if (response.ok) {
        const payload = await response.json();
        const data: TimelineLoaderResult = payload.data;

        setPosts((prev) => {
          const distinctIds = new Set(prev.map((p) => p.id));
          const filteredIncoming = data.items.filter(
            (p) => !distinctIds.has(p.id),
          );
          return [...prev, ...filteredIncoming];
        });

        seedPostMeta(data.items);
        hasMoreRef.current = data.pagination.hasMore;
        nextPageRef.current += 1;
      }
    } catch (error) {
      console.error('Failed to load infinite scroll batch:', error);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, activeFeed, activeSort, seedPostMeta]);

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

  const handlePostCreated = (newPost: TimelinePost) => {
    if (activeSort === 'latest' || activeFeed === 'following') {
      setPosts((prev) => [newPost, ...prev]);
    }
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
      console.error('Failed to toggle like:', error);
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
        evictPostMeta(deletedId);
        setPosts((prev) => prev.filter((p) => p.id !== deletedId));
      } else {
        addToast('Failed to remove chronicle.', 'error');
      }
    } catch {
      addToast('Network error.', 'error');
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
            onClick={() => handleFeedChangeToggle('general')}
          >
            <Globe size={16} />
            <span>Global Realm</span>
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeFeed === 'following' ? styles.tabButtonActive : ''}`}
            onClick={() => handleFeedChangeToggle('following')}
          >
            <Users size={16} />
            <span>Personal Realm</span>
          </button>
        </div>

        {activeFeed === 'general' && (
          <div className={styles.discoveryLanesBar}>
            <button
              type="button"
              className={`${styles.laneBtn} ${activeSort === 'latest' ? styles.laneBtnActive : ''}`}
              onClick={() => handleDiscoverySortToggle('latest')}
            >
              <Clock size={14} />
              <span>Latest</span>
            </button>
            <button
              type="button"
              className={`${styles.laneBtn} ${activeSort === 'popular' ? styles.laneBtnActive : ''}`}
              onClick={() => handleDiscoverySortToggle('popular')}
            >
              <Flame size={14} />
              <span>Popular</span>
            </button>
            <button
              type="button"
              className={`${styles.laneBtn} ${activeSort === 'oldest' ? styles.laneBtnActive : ''}`}
              onClick={() => handleDiscoverySortToggle('oldest')}
            >
              <History size={14} />
              <span>Oldest</span>
            </button>
          </div>
        )}

        <PostComposer onPostCreated={handlePostCreated} />
      </header>

      <div className={styles.postsFeed}>
        {posts.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              {activeFeed === 'following'
                ? 'Your connections haven’t posted recently.'
                : 'The selected timeline discovery lane is completely quiet.'}
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
