import { formatDistanceToNow } from 'date-fns';
import { Heart, Loader2, MessageSquare } from 'lucide-react';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLoaderData } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import { useUIStore } from '../../../store/uiStore.js';
import { Post } from '../Post/Post';
import styles from './PostDetailPage.module.css';
import type {
  PostComment,
  PostDetailLoaderResult,
} from './postDetailLoader.js';

export const PostDetailPage: FC = () => {
  const initialData = useLoaderData() as PostDetailLoaderResult;
  const openCommentModal = useUIStore((state) => state.openCommentModal);
  const [parentPost, setParentPost] = useState(initialData.post);
  const [comments, setComments] = useState<PostComment[]>(
    initialData.initialComments.items,
  );
  const [pagination, setPagination] = useState(
    initialData.initialComments.pagination,
  );
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isLikedLocally, setIsLikedLocally] = useState(false);
  const nextPageRef = useRef(initialData.initialComments.pagination.page + 1);
  const hasMoreRef = useRef(initialData.initialComments.pagination.hasMore);

  useEffect(() => {
    setParentPost(initialData.post);
    setComments(initialData.initialComments.items);
    setPagination(initialData.initialComments.pagination);
    nextPageRef.current = initialData.initialComments.pagination.page + 1;
    hasMoreRef.current = initialData.initialComments.pagination.hasMore;
    setIsLikedLocally(false);
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
          stats: {
            ...prev.stats,
            comments: prev.stats.comments + 1,
          },
        }));
      }
    };

    window.addEventListener('odinum_global_comment_added', handleGlobalComment);
    return () => {
      window.removeEventListener(
        'odinum_global_comment_added',
        handleGlobalComment,
      );
    };
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
      if (isFetchingMore) return;

      const observer = new IntersectionObserver((entries) => {
        if (entries?.at(0)?.isIntersecting && hasMoreRef.current) {
          loadMoreComments();
        }
      });

      if (node) observer.observe(node);
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
          stats: {
            ...prev.stats,
            likes: likeCount,
          },
        }));
        setIsLikedLocally(liked);
      }
    } catch (error) {
      console.error(
        'Failed to execute direct like interaction over network:',
        error,
      );
    }
  };

  return (
    <div className={styles.container}>
      <Post post={parentPost} isDetailView={true} />

      <div className={styles.actionControlRow}>
        <button
          type="button"
          className={`${styles.likeCtaButton} ${isLikedLocally ? styles.likeCtaActive : ''}`}
          onClick={handleLikeToggle}
        >
          <Heart size={16} fill={isLikedLocally ? 'currentColor' : 'none'} />
          <span>{isLikedLocally ? 'Liked' : 'Like'}</span>
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
              <p>
                No answers have been recorded yet. Be the first to share your
                thoughts!
              </p>
            </div>
          ) : (
            comments.map((comment) => {
              const replyChar = comment.author.username.charAt(0);
              const replyTime = formatDistanceToNow(
                new Date(comment.createdAt),
                { addSuffix: true },
              );

              return (
                <article key={comment.id} className={styles.commentCard}>
                  <header className={styles.commentHeader}>
                    <Link
                      to={`/users/${comment.author.username}`}
                      className={styles.avatarLink}
                    >
                      {comment.author.profilePicture ? (
                        <img
                          src={comment.author.profilePicture}
                          alt={comment.author.username}
                          className={styles.miniAvatar}
                        />
                      ) : (
                        <div className={styles.miniAvatarFallback}>
                          {replyChar}
                        </div>
                      )}
                    </Link>
                    <div className={styles.commentMeta}>
                      <Link
                        to={`/users/${comment.author.username}`}
                        className={styles.profileLink}
                      >
                        <span className={styles.commentUsername}>
                          {comment.author.username}
                        </span>
                      </Link>
                      <span className={styles.commentTime}>{replyTime}</span>
                    </div>
                  </header>
                  <p className={styles.commentContentText}>{comment.content}</p>
                </article>
              );
            })
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
