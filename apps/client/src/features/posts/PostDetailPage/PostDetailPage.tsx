import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLoaderData } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import { CommentComposer } from '../../comments/CommentComposer';
import { Post } from '../Post/Post';
import styles from './PostDetailPage.module.css';
import type {
  PostComment,
  PostDetailLoaderResult,
} from './postDetailLoader.js';

export const PostDetailPage: FC = () => {
  const initialData = useLoaderData() as PostDetailLoaderResult;
  const [comments, setComments] = useState<PostComment[]>(
    initialData.initialComments.items,
  );
  const [pagination, setPagination] = useState(
    initialData.initialComments.pagination,
  );
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const nextPageRef = useRef(initialData.initialComments.pagination.page + 1);
  const hasMoreRef = useRef(initialData.initialComments.pagination.hasMore);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setComments(initialData.initialComments.items);
    setPagination(initialData.initialComments.pagination);
    nextPageRef.current = initialData.initialComments.pagination.page + 1;
    hasMoreRef.current = initialData.initialComments.pagination.hasMore;
  }, [initialData]);

  useEffect(() => {
    nextPageRef.current = pagination.page + 1;
    hasMoreRef.current = pagination.hasMore;
  }, [pagination]);

  const loadMoreComments = useCallback(async () => {
    if (isFetchingMore || !hasMoreRef.current) return;

    setIsFetchingMore(true);
    try {
      const response = await apiFetch(
        `/posts/${initialData.post.id}/comments?page=${nextPageRef.current}&limit=10`,
      );
      if (response.ok) {
        const payload = await response.json();
        setComments((prev) => [...prev, ...payload.data.items]);
        setPagination(payload.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load incremental comments:', error);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, initialData.post.id]);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries?.at(0)?.isIntersecting && hasMoreRef.current) {
          loadMoreComments();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isFetchingMore, loadMoreComments],
  );

  const handleCommentCreated = (newComment: PostComment) => {
    setComments((prev) => [newComment, ...prev]);
  };

  const handleLikeToggle = (postId: string) => {
    console.log(
      `Toggling like state interaction within detail screen overlay for post identifier: ${postId}`,
    );
  };

  const handleCommentClick = () => {
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };

  const parent = initialData.post;

  return (
    <div className={styles.container}>
      <Post
        post={parent}
        isDetailView={true}
        onLikeToggle={handleLikeToggle}
        onCommentClick={handleCommentClick}
      />

      <CommentComposer
        postId={parent.id}
        onCommentCreated={handleCommentCreated}
        ref={commentInputRef}
      />

      <section className={styles.repliesStreamSection}>
        <h4 className={styles.streamHeadline}>Responses</h4>

        <div className={styles.commentsStack}>
          {comments.length === 0 ? (
            <div className={styles.emptyCommentsState}>
              <p>
                No comments have been recorded yet. Be the first to share your
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
