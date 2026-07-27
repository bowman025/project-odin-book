import { zodResolver } from '@hookform/resolvers/zod';
import type { UpdatePostInput } from '@project-odin-book/validation';
import { UpdatePostSchema } from '@project-odin-book/validation';
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
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { AccessibleModal } from '../../../components/AccessibleModal/AccessibleModal';
import { apiFetch } from '../../../lib/api.js';
import { useAuthStore } from '../../../store/authStore.js';
import { useUIStore } from '../../../store/uiStore.js';
import type { TimelinePost } from '../TimelinePage/timelineLoader.js';

import styles from './Post.module.css';

type PostProps = {
  post: TimelinePost;
  isDetailView?: boolean;
  onLikeToggle?: (postId: string) => void;
  onCommentClick?: (postId: string) => void;
  onPostDeleted?: (postId: string) => void;
  onPostUpdated?: (updatedPost: TimelinePost) => void;
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
  const addToast = useUIStore((state) => state.addToast);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isOwner = currentUserId === post.author.id;
  const authorInitial = post.author.username.charAt(0);
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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdatePostInput>({
    resolver: zodResolver(UpdatePostSchema),
    defaultValues: { content: post.content },
  });

  useEffect(() => {
    reset({ content: post.content });
  }, [post.content, reset]);

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

  const handleDeleteAction = async () => {
    setIsMenuOpen(false);
    try {
      const response = await apiFetch(`/posts/${post.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        addToast(
          'Chronicle successfully removed from the archives.',
          'success',
        );
        if (onPostDeleted) onPostDeleted(post.id);
      } else {
        addToast('Failed to delete chronicle.', 'error');
      }
    } catch {
      addToast('Network transmission error during deletion.', 'error');
    }
  };

  const handleEditSubmit = async (payload: UpdatePostInput) => {
    setIsSubmittingEdit(true);
    try {
      const response = await apiFetch(`/posts/${post.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const body = await response.json();
        addToast('Chronicle log updated.', 'success');
        setIsEditing(false);
        if (onPostUpdated) onPostUpdated(body.data.post);
      } else {
        addToast('Server rejected modifications.', 'error');
      }
    } catch {
      addToast('Network link connection failure.', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const contentField = register('content');

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
                    reset();
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
          <form
            onSubmit={handleSubmit(handleEditSubmit)}
            className={styles.editForm}
          >
            <textarea
              className={styles.editTextarea}
              disabled={isSubmittingEdit}
              {...contentField}
              ref={(el) => {
                contentField.ref(el);
              }}
            />
            {errors.content && (
              <span className={styles.fieldError}>
                {errors.content.message}
              </span>
            )}

            <div className={styles.editActionRow}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setIsEditing(false)}
                disabled={isSubmittingEdit}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.saveBtn}
                disabled={isSubmittingEdit}
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <p className={styles.content}>
            {displayedContent}
            {shouldTruncate && (
              <Link to={`/posts/${post.id}`} className={styles.readMoreLink}>
                Read More
              </Link>
            )}
          </p>
        )}

        {!isEditing && post.tags && post.tags.length > 0 && (
          <div className={styles.tagsContainer}>
            {post.tags.map((tag) => (
              <span key={tag} className={styles.tagBadge}>
                #{tag}
              </span>
            ))}
          </div>
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
              onClick={handleDeleteAction}
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </AccessibleModal>
    </article>
  );
};
