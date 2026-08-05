import { format, formatDistanceToNow } from 'date-fns';
import {
  Edit2,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AccessibleModal } from '../../../components/AccessibleModal/AccessibleModal.jsx';
import { useAuthStore } from '../../../store/authStore.js';
import { useInteractionStore } from '../../../store/interactionStore.js';
import { PostEditor } from '../PostEditor/PostEditor.jsx';
import type { TimelinePost } from '../TimelinePage/timelineLoader.js';
import styles from './Post.module.css';

type PostProps = {
  post: TimelinePost;
  isDetailView?: boolean;
  onLikeToggle: (postId: string) => void;
  onCommentClick?: (postId: string) => void;
  onPostDeleted: (postId: string) => void;
  onPostUpdated: (updatedPost: TimelinePost) => void;
};

export const Post: FC<PostProps> = ({
  post,
  isDetailView = false,
  onLikeToggle,
  onCommentClick,
  onPostDeleted,
  onPostUpdated,
}) => {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const meta = useInteractionStore((state) => state.postRegistry[post.id]);
  const evictPostMeta = useInteractionStore((state) => state.evictPostMeta);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  const isOwner = currentUserId === post.author.id;
  const authorInitial = post.author.username.charAt(0);

  const isLiked = meta ? meta.isLiked : post.isLiked;
  const likesCount = meta ? meta.likesCount : post.stats.likes;
  const commentsCount = meta ? meta.commentsCount : post.stats.comments;

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
  });
  const isEdited =
    post.updatedAt &&
    new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() >
      1000;

  const shouldTruncate =
    !isDetailView && post.content.length > 200 && !isEditing;
  const displayedContent = shouldTruncate
    ? `${post.content.slice(0, 200)}...`
    : post.content;

  const cardClassName = `${styles.postCard} ${isDetailView ? styles.postCardDetail : ''}`;

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMenuOpen]);

  const handleConfirmedDelete = () => {
    setIsDeleteModalOpen(false);
    evictPostMeta(post.id);

    if (onPostDeleted) {
      onPostDeleted(post.id);
    }
  };

  return (
    <article className={cardClassName}>
      <header className={styles.postHeader}>
        <div className={styles.headerLeft}>
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
        </div>

        {isOwner && !isEditing && (
          <div className={styles.menuContainer} ref={menuRef}>
            <button
              type="button"
              className={styles.menuTriggerBtn}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Open post actions"
            >
              <MoreHorizontal size={18} />
            </button>

            {isMenuOpen && (
              <div className={styles.dropdownMenu}>
                <button
                  type="button"
                  className={styles.menuItem}
                  onClick={() => {
                    setIsEditing(true);
                    setIsMenuOpen(false);
                  }}
                >
                  <Edit2 size={14} />
                  <span>Edit Post</span>
                </button>
                <button
                  type="button"
                  className={`${styles.menuItem} ${styles.itemDelete}`}
                  onClick={() => {
                    setIsDeleteModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <div className={styles.postBody}>
        {!isDetailView && !isEditing && (
          <Link
            to={`/posts/${post.id}`}
            className={styles.stretchedCardLink}
            aria-label={`View full conversation for post authored by ${post.author.username}`}
          />
        )}

        {isEditing ? (
          <PostEditor
            post={post}
            onCancel={() => setIsEditing(false)}
            onPostUpdated={(updated) => {
              setIsEditing(false);
              onPostUpdated(updated);
            }}
          />
        ) : (
          <p className={styles.content}>
            {(() => {
              let textNodePointer = 0;

              return displayedContent.split(/(\s+)/).map((word) => {
                textNodePointer += 1;

                if (word.startsWith('#') && word.length > 1) {
                  const cleanTagName = word
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .toLowerCase();

                  if (!cleanTagName) return word;

                  return (
                    <Link
                      key={`ht-anchor-${post.id}-${cleanTagName}-${textNodePointer}`}
                      to={`/tags?search=${cleanTagName}`}
                      className={styles.textHashtagLink}
                    >
                      {`#${cleanTagName}`}
                    </Link>
                  );
                }
                return word;
              });
            })()}

            {shouldTruncate && (
              <Link to={`/posts/${post.id}`} className={styles.readMoreLink}>
                Read More
              </Link>
            )}
          </p>
        )}

        {!isEditing && post.imageUrl && (
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
                fill={isLiked ? 'var(--color-error-base)' : 'none'}
                className={isLiked ? styles.heartActive : ''}
              />
              <span>{likesCount} likes</span>
            </div>
            <div className={styles.interactionBtn}>
              <MessageCircle size={18} />
              <span>{commentsCount} comments</span>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`${styles.interactionBtn} ${isLiked ? styles.heartActive : ''}`}
              onClick={(e) => {
                e.preventDefault();
                onLikeToggle(post.id);
              }}
            >
              <Heart
                size={18}
                fill={isLiked ? 'var(--color-error-base)' : 'none'}
              />
              <span>{likesCount}</span>
            </button>
            {onCommentClick && (
              <button
                type="button"
                className={styles.interactionBtn}
                onClick={(e) => {
                  e.preventDefault();
                  onCommentClick(post.id);
                }}
              >
                <MessageCircle size={18} />
                <span>{commentsCount}</span>
              </button>
            )}
          </>
        )}
      </footer>

      <AccessibleModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        titleId={`delete-title-${post.id}`}
        descriptionId={`delete-desc-${post.id}`}
      >
        <div className={styles.deleteDialogContent}>
          <header className={styles.modalHeader}>
            <h3 id={`delete-title-${post.id}`} className={styles.sectionTitle}>
              Delete Chronicle
            </h3>
          </header>

          <p id={`delete-desc-${post.id}`} className={styles.deleteWarningText}>
            Are you sure you want to permanently remove this chronicle from
            Odinum? This action cannot be undone.
          </p>

          <div className={styles.deleteModalActions}>
            <button
              type="button"
              className={styles.keepBtn}
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.confirmDeleteBtn}
              onClick={handleConfirmedDelete}
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </AccessibleModal>
    </article>
  );
};
