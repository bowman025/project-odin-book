import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLoaderData } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import { useAuthStore } from '../../../store/authStore.js';
import { useInteractionStore } from '../../../store/interactionStore.js';
import { useUIStore } from '../../../store/uiStore.js';
import { Comment } from '../../comments/Comment/Comment';
import { Post } from '../../posts/Post/Post';
import type { PostComment } from '../../posts/PostDetailPage/postDetailLoader.js';
import type { TimelinePost } from '../../posts/TimelinePage/timelineLoader.js';
import { EditProfileModal } from '../EditProfileModal/EditProfileModal';
import { ProfileHeader } from '../ProfileHeader/ProfileHeader';
import styles from './ProfilePage.module.css';
import type {
  ProfileLoaderResult,
  UserProfile,
  UserProfileCommentItem,
} from './profileLoader.js';

type ProfileTab = 'chronicles' | 'comments' | 'likes';

export const ProfilePage: FC = () => {
  const initialData = useLoaderData() as ProfileLoaderResult;

  const currentLoggedInUser = useAuthStore((state) => state.user);

  const openCommentModal = useUIStore((state) => state.openCommentModal);
  const addToast = useUIStore((state) => state.addToast);

  const seedPostMeta = useInteractionStore((state) => state.seedPostMeta);
  const toggleRegistryLike = useInteractionStore(
    (state) => state.toggleRegistryLike,
  );
  const decrementRegistryCommentCount = useInteractionStore(
    (state) => state.decrementRegistryCommentCount,
  );

  const seedProfileStats = useInteractionStore(
    (state) => state.seedProfileStats,
  );
  const decrementProfilePostCount = useInteractionStore(
    (state) => state.decrementProfilePostCount,
  );

  const [activeTab, setActiveTab] = useState<ProfileTab>('chronicles');
  const [profile, setProfile] = useState<UserProfile>(initialData.profile);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [posts, setPosts] = useState<TimelinePost[]>(
    initialData.initialPosts.items,
  );
  const [likes, setLikes] = useState<TimelinePost[]>([]);
  const [comments, setComments] = useState<UserProfileCommentItem[]>([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const activeTabRef = useRef<ProfileTab>('chronicles');

  const nextPagesRef = useRef({ chronicles: 2, likes: 1, comments: 1 });
  const hasMoreFlagsRef = useRef({
    chronicles: initialData.initialPosts.pagination.hasMore,
    likes: true,
    comments: true,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveTab('chronicles');
    activeTabRef.current = 'chronicles';
    setProfile(initialData.profile);
    seedProfileStats(
      initialData.profile.username,
      initialData.profile.stats.posts,
    );
    setPosts(initialData.initialPosts.items);
    seedPostMeta(initialData.initialPosts.items);
    setLikes([]);
    setComments([]);

    nextPagesRef.current = {
      chronicles: initialData.initialPosts.pagination.page + 1,
      likes: 1,
      comments: 1,
    };
    hasMoreFlagsRef.current = {
      chronicles: initialData.initialPosts.pagination.hasMore,
      likes: true,
      comments: true,
    };
  }, [initialData, seedPostMeta, seedProfileStats]);

  const fetchNextSegmentChunkBatch = useCallback(
    async (targetType: ProfileTab, isInitialTabLoad = false) => {
      if (isFetchingMore) return;

      const pageToFetch = isInitialTabLoad
        ? 1
        : nextPagesRef.current[targetType];
      const hasMoreToFetch = isInitialTabLoad
        ? true
        : hasMoreFlagsRef.current[targetType];

      if (!hasMoreToFetch) return;

      setIsFetchingMore(true);
      try {
        const endpoint = `/users/${profile.username}/${targetType === 'chronicles' ? 'posts' : targetType}?page=${pageToFetch}&limit=10`;
        const response = await apiFetch(endpoint);

        if (response.ok) {
          const payload = await response.json();
          const incomingItems = payload.data.items;
          const incomingPagination = payload.data.pagination;

          if (targetType === 'chronicles') {
            setPosts((prev) =>
              isInitialTabLoad ? incomingItems : [...prev, ...incomingItems],
            );
            seedPostMeta(incomingItems);
          } else if (targetType === 'likes') {
            setLikes((prev) =>
              isInitialTabLoad ? incomingItems : [...prev, ...incomingItems],
            );
            seedPostMeta(incomingItems);
          } else if (targetType === 'comments') {
            const incomingComments = incomingItems as UserProfileCommentItem[];
            setComments((prev) =>
              isInitialTabLoad
                ? incomingComments
                : [...prev, ...incomingComments],
            );
            const embeddedPosts = incomingComments
              .map((comment) => comment.post)
              .filter(
                (post): post is typeof post =>
                  post !== null && post !== undefined,
              );
            seedPostMeta(embeddedPosts);
          }

          nextPagesRef.current[targetType] = incomingPagination.page + 1;
          hasMoreFlagsRef.current[targetType] = incomingPagination.hasMore;
        }
      } catch (error) {
        console.error(
          `Failed to stream profile activity feed subset [${targetType}]:`,
          error,
        );
      } finally {
        setIsFetchingMore(false);
      }
    },
    [isFetchingMore, profile.username, seedPostMeta],
  );

  const handleTabSelectionToggle = async (targetTab: ProfileTab) => {
    if (targetTab === activeTab) return;
    setActiveTab(targetTab);
    activeTabRef.current = targetTab;

    if (targetTab === 'chronicles') {
      await fetchNextSegmentChunkBatch('chronicles', true);
    } else if (targetTab === 'likes') {
      await fetchNextSegmentChunkBatch('likes', true);
    } else if (targetTab === 'comments') {
      await fetchNextSegmentChunkBatch('comments', true);
    }
  };

  const loadMoreDataContextWorker = useCallback(async () => {
    await fetchNextSegmentChunkBatch(activeTabRef.current);
  }, [fetchNextSegmentChunkBatch]);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (isFetchingMore) return;

      const observer = new IntersectionObserver((entries) => {
        const activeFeedType = activeTabRef.current;
        if (
          entries?.at(0)?.isIntersecting &&
          hasMoreFlagsRef.current[activeFeedType]
        ) {
          loadMoreDataContextWorker();
        }
      });
      if (node) {
        observer.observe(node);
        observerRef.current = observer;
      }
    },
    [isFetchingMore, loadMoreDataContextWorker],
  );

  const isOwnProfile = currentLoggedInUser?.id === profile.id;
  const handleProfileUpdateSuccess = (updatedProfile: UserProfile) =>
    setProfile(updatedProfile);

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
    const patchRowMatch = (prev: TimelinePost[]) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p));
    setPosts(patchRowMatch);
    setLikes(patchRowMatch);
  };

  const handlePostDeleted = async (deletedId: string) => {
    try {
      const response = await apiFetch(`/posts/${deletedId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        addToast('Chronicle removed from the archives.', 'success');
        decrementProfilePostCount(profile.username);
        setPosts((prev) => prev.filter((p) => p.id !== deletedId));
        setLikes((prev) => prev.filter((p) => p.id !== deletedId));
      } else {
        addToast('Failed to delete chronicle.', 'error');
      }
    } catch {
      addToast('Network error.', 'error');
    }
  };

  const handleCommentUpdatedInline = (updatedComment: PostComment) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === updatedComment.id
          ? {
              ...c,
              content: updatedComment.content,
              edited: true,
              post: c.post,
            }
          : c,
      ),
    );
  };

  const handleCommentDeletedInline = async (
    postId: string,
    commentId: string,
  ) => {
    try {
      const response = await apiFetch(
        `/posts/${postId}/comments/${commentId}`,
        { method: 'DELETE' },
      );
      if (response.ok) {
        addToast('Comment removed from the archives.', 'success');
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        decrementRegistryCommentCount(postId);
      }
    } catch {
      addToast('Network error.', 'error');
    }
  };

  return (
    <div className={styles.container}>
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        onEditClick={() => setIsEditModalOpen(true)}
      />

      <div className={styles.tabDeckRibbon}>
        <button
          type="button"
          className={`${styles.profileTabBtn} ${activeTab === 'chronicles' ? styles.profileTabActive : ''}`}
          onClick={() => handleTabSelectionToggle('chronicles')}
        >
          <span>Chronicles</span>
        </button>
        <button
          type="button"
          className={`${styles.profileTabBtn} ${activeTab === 'comments' ? styles.profileTabActive : ''}`}
          onClick={() => handleTabSelectionToggle('comments')}
        >
          <span>Comments</span>
        </button>
        <button
          type="button"
          className={`${styles.profileTabBtn} ${activeTab === 'likes' ? styles.profileTabActive : ''}`}
          onClick={() => handleTabSelectionToggle('likes')}
        >
          <span>Likes</span>
        </button>
      </div>

      <section className={styles.postsSection}>
        <div className={styles.feedStack}>
          {activeTab === 'chronicles' &&
            (posts.length === 0 ? (
              <div className={styles.emptyState}>
                <p>This citizen has not written any chronicles yet.</p>
              </div>
            ) : (
              posts.map((post) => (
                <Post
                  key={`profile-chronicle-${post.id}`}
                  post={post}
                  onLikeToggle={handleLikeToggle}
                  onCommentClick={(id) => openCommentModal(id)}
                  onPostUpdated={handlePostUpdated}
                  onPostDeleted={handlePostDeleted}
                />
              ))
            ))}

          {activeTab === 'comments' &&
            (comments.length === 0 ? (
              <div className={styles.emptyState}>
                <p>This citizen has not written any comments yet.</p>
              </div>
            ) : (
              comments.map((item) => {
                const compliantCommentShape: PostComment = {
                  id: item.id,
                  content: item.content,
                  createdAt: item.createdAt,
                  edited: item.edited,
                  author: {
                    id: profile.id,
                    username: profile.username,
                    profilePicture: profile.profilePicture,
                  },
                };

                return (
                  <div
                    key={`profile-activity-comment-${item.id}`}
                    className={styles.commentActivityCard}
                  >
                    <Comment
                      postId={item.post.id}
                      comment={compliantCommentShape}
                      onCommentDeleted={(cId) =>
                        handleCommentDeletedInline(item.post.id, cId)
                      }
                      onCommentUpdated={(updatedC) =>
                        handleCommentUpdatedInline(updatedC)
                      }
                    />

                    <Link
                      to={`/posts/${item.post.id}`}
                      className={styles.parentPostPreviewBannerBox}
                    >
                      <span className={styles.parentAuthorLabel}>
                        In response to @{item.post.author.username}:
                      </span>
                      <p className={styles.parentSnippetPreviewText}>
                        {item.post.content}
                      </p>
                    </Link>
                  </div>
                );
              })
            ))}

          {activeTab === 'likes' &&
            (likes.length === 0 ? (
              <div className={styles.emptyState}>
                <p>This citizen has not liked any chronicles yet.</p>
              </div>
            ) : (
              likes.map((post) => (
                <Post
                  key={`profile-liked-${post.id}`}
                  post={post}
                  onLikeToggle={handleLikeToggle}
                  onCommentClick={(id) => openCommentModal(id)}
                  onPostUpdated={handlePostUpdated}
                  onPostDeleted={handlePostDeleted}
                />
              ))
            ))}
        </div>
      </section>

      <div ref={sentinelRef} className={styles.infiniteTrigger}>
        {isFetchingMore && (
          <div className={styles.scrollLoader}>
            <span>Retrieving content...</span>
          </div>
        )}
      </div>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentProfile={profile}
        onProfileUpdated={handleProfileUpdateSuccess}
      />
    </div>
  );
};
