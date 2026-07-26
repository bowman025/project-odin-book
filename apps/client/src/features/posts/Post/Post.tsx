import { format, formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle } from 'lucide-react';
import type { FC } from 'react';
import { Link } from 'react-router';
import type { TimelinePost } from '../TimelinePage/timelineLoader.js';
import styles from './Post.module.css';

type PostProps = {
  post: TimelinePost;
  isDetailView?: boolean;
  onLikeToggle?: (postId: string) => void;
  onCommentClick?: (postId: string) => void;
};

export const Post: FC<PostProps> = ({
  post,
  isDetailView = false,
  onLikeToggle,
  onCommentClick,
}) => {
  const authorInitial = post.author.username.charAt(0);
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
  });
  const isEdited =
    post.updatedAt &&
    new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() >
      1000;

  const shouldTruncate = !isDetailView && post.content.length > 200;
  const displayedContent = shouldTruncate
    ? `${post.content.slice(0, 200)}...`
    : post.content;

  const cardClassName = `${styles.postCard} ${isDetailView ? styles.postCardDetail : ''}`;

  const handleLikeClick = (e: React.MouseEvent) => {
    if (!onLikeToggle) return;
    e.preventDefault();
    onLikeToggle(post.id);
  };

  const handleCommentTrigger = (e: React.MouseEvent) => {
    if (!onCommentClick) return;
    e.preventDefault();
    onCommentClick(post.id);
  };

  return (
    <article className={cardClassName}>
      <header className={styles.postHeader}>
        <Link
          to={`/users/${post.author.username}`}
          className={styles.avatarLink}
        >
          {post.author.profilePicture ? (
            <img
              src={post.author.profilePicture}
              alt={post.author.username}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarFallback}>{authorInitial}</div>
          )}
        </Link>

        <div className={styles.meta}>
          <div className={styles.metaTopRow}>
            <Link
              to={`/users/${post.author.username}`}
              className={styles.profileLink}
            >
              <span className={styles.username}>{post.author.username}</span>
            </Link>
            <span className={styles.timestamp}>{timeAgo}</span>

            {isEdited && (
              <span
                className={styles.editedBadge}
                title={`Edited: ${format(new Date(post.updatedAt), 'PPpp')}`}
              >
                (edited)
              </span>
            )}
          </div>
        </div>
      </header>

      <div className={styles.postBody}>
        {!isDetailView && (
          <Link
            to={`/posts/${post.id}`}
            className={styles.stretchedCardLink}
            aria-label={`View full conversation for post authored by ${post.author.username}`}
          />
        )}

        <p className={styles.content}>
          {displayedContent}
          {shouldTruncate && (
            <Link to={`/posts/${post.id}`} className={styles.readMoreLink}>
              Read More
            </Link>
          )}
        </p>

        {post.tags && post.tags.length > 0 && (
          <div className={styles.tagsContainer}>
            {post.tags.map((tag) => (
              <span key={tag} className={styles.tagBadge}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt="Chronicle media context"
            className={styles.postImage}
          />
        )}
      </div>

      <footer className={styles.postFooter}>
        {isDetailView ? (
          <>
            <div className={styles.interactionBtn}>
              <Heart
                size={18}
                fill={post.isLiked ? 'var(--color-error-base)' : 'none'}
                className={post.isLiked ? styles.heartActive : ''}
              />
              <span>{post.stats.likes} likes</span>
            </div>

            <div className={styles.interactionBtn}>
              <MessageCircle size={18} />
              <span>{post.stats.comments} comments</span>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`${styles.interactionBtn} ${post.isLiked ? styles.heartActive : ''}`}
              onClick={handleLikeClick}
            >
              <Heart
                size={18}
                fill={post.isLiked ? 'var(--color-error-base)' : 'none'}
              />
              <span>{post.stats.likes}</span>
            </button>

            <button
              type="button"
              className={styles.interactionBtn}
              onClick={handleCommentTrigger}
            >
              <MessageCircle size={18} />
              <span>{post.stats.comments}</span>
            </button>
          </>
        )}
      </footer>
    </article>
  );
};
