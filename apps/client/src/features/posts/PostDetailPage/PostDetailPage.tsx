import { Heart, Loader2, MessageSquare } from 'lucide-react';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import { useUIStore } from '../../../store/uiStore.js';
import { Comment } from '../../comments/Comment/Comment';
import { Post } from '../Post/Post.jsx';
import type { TimelinePost } from '../TimelinePage/timelineLoader.js';
import styles from './PostDetailPage.module.css';
import type {
  PostComment,
  PostDetailLoaderResult,
} from './postDetailLoader.js';

export const PostDetailPage: FC = () => {
  const initialData = useLoaderData() as PostDetailLoaderResult;
  const openCommentModal = useUIStore((state) => state.openCommentModal);
  const addToast = useUIStore((state) => state.addToast);
  const navigate = useNavigate();

  const [parentPost, setParentPost] = useState(initialData.post);
  const [comments, setComments] = useState<PostComment[]>(
    initialData.initialComments.items,
  );
  const [pagination, setPagination] = useState(
    initialData.initialComments.pagination,
  );
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const nextPageRef = useRef(initialData.initialComments.pagination.page + 1);
  const hasMoreRef = useRef(initialData.initialComments.pagination.hasMore);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    setParentPost(initialData.post);
    setComments(initialData.initialComments.items);
    setPagination(initialData.initialComments.pagination);
    nextPageRef.current = initialData.initialComments.pagination.page + 1;
    hasMoreRef.current = initialData.initialComments.pagination.hasMore;
  }, [initialData]);

  useEffect(() => {
    const handleGlobalComment = (e: Event) => {
      const customEvent = e as CustomEvent<{
        postId: string;
        comment: PostComment;
      }>;
      if (customEvent.detail.postId === parentPost.id) {
        setComments((prev) => [customEvent.detail.comment, ...prev]);
        setParentPost((prev) => ({
          ...prev,
          stats: { ...prev.stats, comments: prev.stats.comments + 1 },
        }));
      }
    };
    window.addEventListener('odinum_global_comment_added', handleGlobalComment);
    return () =>
      window.removeEventListener(
        'odinum_global_comment_added',
        handleGlobalComment,
      );
  }, [parentPost.id]);

  useEffect(() => {
    nextPageRef.current = pagination.page + 1;
    hasMoreRef.current = pagination.hasMore;
  }, [pagination]);

  const loadMoreComments = useCallback(async () => {
    if (isFetchingMore || !hasMoreRef.current) return;
    setIsFetchingMore(true);
    try {
      const response = await apiFetch(
        `/posts/${parentPost.id}/comments?page=${nextPageRef.current}&limit=10`,
      );
      if (response.ok) {
        const payload = await response.json();
        setComments((prev) => [...prev, ...payload.data.items]);
        setPagination(payload.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load incremental commentary items:', error);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, parentPost.id]);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (isFetchingMore) return;

      const observer = new IntersectionObserver((entries) => {
        if (entries?.at(0)?.isIntersecting && hasMoreRef.current) {
          loadMoreComments();
        }
      });
      if (node) {
        observer.observe(node);
        observerRef.current = observer;
      }
    },
    [isFetchingMore, loadMoreComments],
  );

  const handleLikeToggle = async () => {
    try {
      const response = await apiFetch(`/posts/${parentPost.id}/likes`, {
        method: 'POST',
      });
      if (response.ok) {
        const body = await response.json();
        const { likeCount, liked } = body.data;
        setParentPost((prev) => ({
          ...prev,
          isLiked: liked,
          stats: { ...prev.stats, likes: likeCount },
        }));
      }
    } catch (error) {
      console.error(
        'Failed to execute direct like interaction over network:',
        error,
      );
    }
  };

  const handleDetailPostUpdated = (updatedPost: TimelinePost) => {
    setParentPost(updatedPost);
  };

  const handleDetailPostDeleted = async () => {
    try {
      const response = await apiFetch(`/posts/${parentPost.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        addToast(
          'Chronicle successfully removed from the archives.',
          'success',
        );
        navigate('/', { replace: true });
      } else {
        addToast('Failed to delete chronicle thread.', 'error');
      }
    } catch {
      addToast('Network error during deletion pass.', 'error');
    }
  };

  const handleCommentDeleted = async (commentId: string) => {
    try {
      const response = await apiFetch(
        `/posts/${parentPost.id}/comments/${commentId}`,
        {
          method: 'DELETE',
        },
      );
      if (response.ok) {
        addToast('Comment successfully deleted from thread.', 'success');
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setParentPost((prev) => ({
          ...prev,
          stats: {
            ...prev.stats,
            comments: Math.max(0, prev.stats.comments - 1),
          },
        }));
      } else {
        addToast('Server rejected comment deletion.', 'error');
      }
    } catch {
      addToast('Network link connection failure.', 'error');
    }
  };

  const handleCommentUpdated = (updatedComment: PostComment) => {
    setComments((prev) =>
      prev.map((c) => (c.id === updatedComment.id ? updatedComment : c)),
    );
  };

  if (!parentPost) return null;

  return (
    <div className={styles.container}>
      <Post
        post={parentPost}
        isDetailView={true}
        onLikeToggle={handleLikeToggle}
        onPostUpdated={handleDetailPostUpdated}
        onPostDeleted={handleDetailPostDeleted}
      />

      <div className={styles.actionControlRow}>
        <button
          type="button"
          className={`${styles.likeCtaButton} ${parentPost.isLiked ? styles.likeCtaActive : ''}`}
          onClick={handleLikeToggle}
        >
          <Heart
            size={16}
            fill={parentPost.isLiked ? 'var(--color-error-base)' : 'none'}
            className={parentPost.isLiked ? styles.heartActive : ''}
          />
          <span>{parentPost.isLiked ? 'Liked' : 'Like'}</span>
        </button>

        <button
          type="button"
          className={styles.commentCtaButton}
          onClick={() => openCommentModal(parentPost.id)}
        >
          <MessageSquare size={16} />
          <span>Comment</span>
        </button>
      </div>

      <section className={styles.repliesStreamSection}>
        <h4 className={styles.streamHeadline}>Responses</h4>
        <div className={styles.commentsStack}>
          {comments.length === 0 ? (
            <div className={styles.emptyCommentsState}>
              <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <Comment
                key={comment.id}
                postId={parentPost.id}
                comment={comment}
                onCommentDeleted={handleCommentDeleted}
                onCommentUpdated={handleCommentUpdated}
              />
            ))
          )}
        </div>
      </section>

      <div ref={sentinelRef} className={styles.infiniteTrigger}>
        {isFetchingMore && (
          <div className={styles.scrollLoader}>
            <Loader2 className={styles.spinner} size={22} />
            <span>Summoning dialogue...</span>
          </div>
        )}
      </div>
    </div>
  );
};
