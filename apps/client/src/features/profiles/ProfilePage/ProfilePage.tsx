import { Loader2 } from 'lucide-react';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLoaderData } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import { useAuthStore } from '../../../store/authStore.js';
import { Post } from '../../posts/Post/Post';
import type { TimelinePost } from '../../posts/TimelinePage/timelineLoader.js';
import { ProfileHeader } from '../ProfileHeader/ProfileHeader';
import styles from './ProfilePage.module.css';
import type { ProfileLoaderResult, UserProfile } from './profileLoader.js';

export const ProfilePage: FC = () => {
  const initialData = useLoaderData() as ProfileLoaderResult;
  const currentLoggedInUser = useAuthStore((state) => state.user);

  const [profile, setProfile] = useState<UserProfile>(initialData.profile);
  const [posts, setPosts] = useState<TimelinePost[]>(
    initialData.initialPosts.items,
  );
  const [pagination, setPagination] = useState(
    initialData.initialPosts.pagination,
  );
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const nextPageRef = useRef(initialData.initialPosts.pagination.page + 1);
  const hasMoreRef = useRef(initialData.initialPosts.pagination.hasMore);

  useEffect(() => {
    setProfile(initialData.profile);
    setPosts(initialData.initialPosts.items);
    setPagination(initialData.initialPosts.pagination);
    nextPageRef.current = initialData.initialPosts.pagination.page + 1;
    hasMoreRef.current = initialData.initialPosts.pagination.hasMore;
  }, [initialData]);

  useEffect(() => {
    nextPageRef.current = pagination.page + 1;
    hasMoreRef.current = pagination.hasMore;
  }, [pagination]);

  const loadMorePosts = useCallback(async () => {
    if (isFetchingMore || !hasMoreRef.current) return;

    setIsFetchingMore(true);
    try {
      const response = await apiFetch(
        `/users/${profile.username}/posts?page=${nextPageRef.current}&limit=10`,
      );
      if (response.ok) {
        const payload = await response.json();
        setPosts((prev) => [...prev, ...payload.data.items]);
        setPagination(payload.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load profile infinite posts:', error);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, profile.username]);

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

  const isOwnProfile = currentLoggedInUser?.id === profile.id;

  const handleLikeToggle = (postId: string) => {
    console.log(
      `Toggling like state interaction on profile timeline for post identifier: ${postId}`,
    );
  };

  const handleCommentClick = (postId: string) => {
    console.log(
      `Opening profile timeline commentary modal window for post identifier: ${postId}`,
    );
  };

  return (
    <div className={styles.container}>
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />

      <section className={styles.postsSection}>
        <h3 className={styles.sectionTitle}>Recent Chronicles</h3>

        <div className={styles.feedStack}>
          {posts.length === 0 ? (
            <div className={styles.emptyState}>
              <p>This citizen has not broadcast any records yet.</p>
            </div>
          ) : (
            posts.map((post) => (
              <Post
                key={post.id}
                post={post}
                onLikeToggle={handleLikeToggle}
                onCommentClick={handleCommentClick}
              />
            ))
          )}
        </div>
      </section>

      <div ref={sentinelRef} className={styles.infiniteTrigger}>
        {isFetchingMore && (
          <div className={styles.scrollLoader}>
            <Loader2 className={styles.spinner} size={24} />
            <span>Retrieving archives...</span>
          </div>
        )}
      </div>
    </div>
  );
};
