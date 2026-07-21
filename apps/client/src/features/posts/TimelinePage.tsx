import { formatDistanceToNow } from 'date-fns';
import { Globe, Heart, Loader2, MessageCircle, Users } from 'lucide-react';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLoaderData, useSearchParams } from 'react-router';
import { apiFetch } from '../../lib/api.js';
import { PostComposer } from './PostComposer.jsx';
import styles from './TimelinePage.module.css';
import type { TimelineLoaderResult, TimelinePost } from './timelineLoader.js';

export const TimelinePage: FC = () => {
  const initialData = useLoaderData() as TimelineLoaderResult;
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<TimelinePost[]>(initialData.items);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const nextPageRef = useRef(initialData.pagination.page + 1);
  const hasMoreRef = useRef(initialData.pagination.hasMore);

  const activeFeed = searchParams.get('feed') || 'general';

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
        if (entries?.[0]?.isIntersecting && hasMoreRef.current) {
          loadMorePosts();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isFetchingMore, loadMorePosts],
  );

  const handlePostCreated = (newPost: TimelinePost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handleFeedToggle = (feedType: 'general' | 'following') => {
    setSearchParams({ feed: feedType });
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
                ? 'Your connections haven’t posted recently. Explore the Global Realm to follow more creators!'
                : 'The realm is completely quiet. Be the first to publish a post!'}
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const authorInitial = post.author.username.charAt(0);
            const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
              addSuffix: true,
            });

            return (
              <article key={post.id} className={styles.postCard}>
                <header className={styles.postHeader}>
                  {post.author.profilePicture ? (
                    <img
                      src={post.author.profilePicture}
                      alt={post.author.username}
                      className={styles.avatar}
                    />
                  ) : (
                    <div className={styles.avatarFallback}>{authorInitial}</div>
                  )}
                  <div className={styles.meta}>
                    <span className={styles.username}>
                      {post.author.username}
                    </span>
                    <span className={styles.timestamp}>{timeAgo}</span>
                  </div>
                </header>

                <div className={styles.postBody}>
                  <p className={styles.content}>{post.content}</p>
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt="Post attachment asset graphic"
                      className={styles.postImage}
                    />
                  )}
                </div>

                <footer className={styles.postFooter}>
                  <button type="button" className={styles.interactionBtn}>
                    <Heart size={18} />
                    <span>{post._count?.likes ?? 0}</span>
                  </button>
                  <button type="button" className={styles.interactionBtn}>
                    <MessageCircle size={18} />
                    <span>{post._count?.comments ?? 0}</span>
                  </button>
                </footer>
              </article>
            );
          })
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
