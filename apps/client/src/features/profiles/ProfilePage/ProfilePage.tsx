import { Loader2 } from 'lucide-react';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLoaderData } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import { handleLikeToggleNetwork } from '../../../lib/interactions.js';
import { useAuthStore } from '../../../store/authStore.js';
import { useUIStore } from '../../../store/uiStore.js';
import { Post } from '../../posts/Post/Post.jsx';
import type { PostComment } from '../../posts/PostDetailPage/postDetailLoader.js';
import type { TimelinePost } from '../../posts/TimelinePage/timelineLoader.js';
import { ProfileHeader } from '../ProfileHeader/ProfileHeader.jsx';
import styles from './ProfilePage.module.css';
import type { ProfileLoaderResult, UserProfile } from './profileLoader.js';

export const ProfilePage: FC = () => {
  const initialData = useLoaderData() as ProfileLoaderResult;
  const currentLoggedInUser = useAuthStore((state) => state.user);
  const openCommentModal = useUIStore((state) => state.openCommentModal);
  const addToast = useUIStore((state) => state.addToast);

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
  const observerRef = useRef<IntersectionObserver | null>(null);

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
            stats: { ...post.stats, comments: post.stats.comments + 1 },
          };
        }),
      );
    };

    window.addEventListener('odinum_global_comment_added', handleGlobalComment);
    return () =>
      window.removeEventListener(
        'odinum_global_comment_added',
        handleGlobalComment,
      );
  }, []);

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

  const isOwnProfile = currentLoggedInUser?.id === profile.id;

  const handleLikeToggle = (postId: string) => {
    handleLikeToggleNetwork(postId, setPosts);
  };

  const handlePostUpdated = (updatedPost: TimelinePost) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)),
    );
  };

  const handlePostDeleted = async (deletedId: string) => {
    try {
      const response = await apiFetch(`/posts/${deletedId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        addToast(
          'Chronicle successfully removed from the archives.',
          'success',
        );
        setPosts((prev) => prev.filter((p) => p.id !== deletedId));
      } else {
        addToast('Failed to delete chronicle.', 'error');
      }
    } catch {
      addToast('Network transmission failure.', 'error');
    }
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
                onCommentClick={(id) => openCommentModal(id)}
                onPostUpdated={handlePostUpdated}
                onPostDeleted={handlePostDeleted}
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
