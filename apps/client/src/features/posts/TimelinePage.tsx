import { formatDistanceToNow } from 'date-fns';
import { Heart, Loader2, MessageCircle, Plus } from 'lucide-react';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLoaderData } from 'react-router';
import { apiFetch } from '../../lib/api.js';
import styles from './TimelinePage.module.css';
import type { TimelineLoaderResult, TimelinePost } from './timelineLoader.js';

export const TimelinePage: FC = () => {
  const initialData = useLoaderData() as TimelineLoaderResult;

  // 🧱 Manage state data locally to allow incremental array updates
  const [posts, setPosts] = useState<TimelinePost[]>(initialData.items);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Keep a mutable reference track of the next page target sequence
  const nextPageRef = useRef(initialData.pagination.page + 1);
  const hasMoreRef = useRef(initialData.pagination.hasMore);

  // Sync refs whenever pagination state shifts to avoid stale closure scopes in our observer
  useEffect(() => {
    nextPageRef.current = pagination.page + 1;
    hasMoreRef.current = pagination.hasMore;
  }, [pagination]);

  // 💡 THE FETCHING ENGINE: Dispatches background requests for subsequent batches
  const loadMorePosts = useCallback(async () => {
    if (isFetchingMore || !hasMoreRef.current) return;

    setIsFetchingMore(true);
    try {
      const response = await apiFetch(
        `/posts?page=${nextPageRef.current}&limit=10`,
      );

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
  }, [isFetchingMore]);

  // 🛰️ THE INTERSECTION OBSERVER HOOK: Binds to the sentinel DOM node layout
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        // Trigger data retrieval the exact millisecond the target boundary crosses the viewport threshold
        if (entries[0]?.isIntersecting && hasMoreRef.current) {
          loadMorePosts();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isFetchingMore, loadMorePosts],
  );

  return (
    <div className={styles.container}>
      <header className={styles.feedHeader}>
        <h2 className={styles.title}>Home Feed</h2>
        <div className={styles.composerPlaceholder}>
          <div className={styles.composerInputMock}>
            What's unfolding in the realm?
          </div>
          <button type="button" className={styles.composerBtnMock}>
            <Plus size={18} />
            <span>Publish</span>
          </button>
        </div>
      </header>

      <div className={styles.postsFeed}>
        {posts.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              The realm is quiet. Follow more profiles to populate your feed
              updates!
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

      {/* 💡 THE SENTINEL ANCHOR: Invisible trigger tracking point or active loading wheel */}
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
