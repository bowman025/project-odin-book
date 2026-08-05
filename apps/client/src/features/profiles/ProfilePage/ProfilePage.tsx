import { Heart, Loader2, MessageSquare } from 'lucide-react';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLoaderData } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import { handleLikeToggleNetwork } from '../../../lib/interactions.js';
import { useAuthStore } from '../../../store/authStore.js';
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
    setPosts(initialData.initialPosts.items);
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
  }, [initialData]);

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
          } else if (targetType === 'likes') {
            setLikes((prev) =>
              isInitialTabLoad ? incomingItems : [...prev, ...incomingItems],
            );
          } else if (targetType === 'comments') {
            setComments((prev) =>
              isInitialTabLoad ? incomingItems : [...prev, ...incomingItems],
            );
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
    [isFetchingMore, profile.username],
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

  useEffect(() => {
    const handleGlobalComment = (e: Event) => {
      const customEvent = e as CustomEvent<{
        postId: string;
        comment: PostComment;
      }>;
      const { postId } = customEvent.detail;

      const updateFeedCounters = (prevPosts: TimelinePost[]) =>
        prevPosts.map((post) =>
          post.id !== postId
            ? post
            : {
                ...post,
                stats: { ...post.stats, comments: post.stats.comments + 1 },
              },
        );

      setPosts(updateFeedCounters);
      setLikes(updateFeedCounters);
    };

    window.addEventListener('odinum_global_comment_added', handleGlobalComment);
    return () =>
      window.removeEventListener(
        'odinum_global_comment_added',
        handleGlobalComment,
      );
  }, []);

  const isOwnProfile = currentLoggedInUser?.id === profile.id;
  const handleProfileUpdateSuccess = (updatedProfile: UserProfile) =>
    setProfile(updatedProfile);

  const handleLikeToggle = async (postId: string) => {
    if (activeTab === 'likes') {
      await handleLikeToggleNetwork(postId, setLikes);

      setLikes((currentLikes) => {
        const matchingPost = currentLikes.find((p) => p.id === postId);
        if (matchingPost) {
          setPosts((prevPosts) =>
            prevPosts.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    isLiked: matchingPost.isLiked,
                    stats: { ...p.stats, likes: matchingPost.stats.likes },
                  }
                : p,
            ),
          );
        }
        return currentLikes;
      });
    } else {
      await handleLikeToggleNetwork(postId, setPosts);

      setPosts((currentChronicles) => {
        const matchingPost = currentChronicles.find((p) => p.id === postId);
        if (matchingPost) {
          setLikes((prevLikes) =>
            prevLikes.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    isLiked: matchingPost.isLiked,
                    stats: { ...p.stats, likes: matchingPost.stats.likes },
                  }
                : p,
            ),
          );
        }
        return currentChronicles;
      });
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
        addToast(
          'Chronicle successfully removed from the archives.',
          'success',
        );
        setPosts((prev) => prev.filter((p) => p.id !== deletedId));
        setLikes((prev) => prev.filter((p) => p.id !== deletedId));
      } else {
        addToast('Failed to delete chronicle.', 'error');
      }
    } catch {
      addToast('Network transmission failure.', 'error');
    }
  };

  const handleCommentUpdatedInline = (updatedComment: PostComment) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === updatedComment.id
          ? { ...c, content: updatedComment.content, edited: true }
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
        {
          method: 'DELETE',
        },
      );

      if (response.ok) {
        addToast('Comment deleted.', 'success');
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      } else {
        addToast('Server rejected comment deletion.', 'error');
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
          <MessageSquare size={16} />
          <span>Chronicles</span>
        </button>
        <button
          type="button"
          className={`${styles.profileTabBtn} ${activeTab === 'comments' ? styles.profileTabActive : ''}`}
          onClick={() => handleTabSelectionToggle('comments')}
        >
          <MessageSquare size={16} style={{ transform: 'scaleX(-1)' }} />
          <span>Comments</span>
        </button>
        <button
          type="button"
          className={`${styles.profileTabBtn} ${activeTab === 'likes' ? styles.profileTabActive : ''}`}
          onClick={() => handleTabSelectionToggle('likes')}
        >
          <Heart size={16} />
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
                  key={`profile-chronicle-${post.id}-${post.isLiked}`}
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
                <p>This citizen has not appended any commentary logs yet.</p>
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
                <p>No chronicles found in this citizen's collection yet.</p>
              </div>
            ) : (
              likes.map((post) => (
                <Post
                  key={`profile-liked-${post.id}-${post.isLiked}`}
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
            <Loader2 className={styles.spinner} size={24} />
            <span>Retrieving additional content segments...</span>
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
