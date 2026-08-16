import { Edit2, MoreHorizontal, Trash2 } from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AccessibleModal } from '../../../components/AccessibleModal/AccessibleModal.jsx';
import { useAuthStore } from '../../../store/authStore.js';
import type { PostComment } from '../../posts/PostDetailPage/postDetailLoader.js';
import { CommentEditor } from '../CommentEditor/CommentEditor.jsx';
import styles from './Comment.module.css';

type CommentProps = {
  postId: string;
  comment: PostComment;
  onCommentDeleted: (commentId: string) => void;
  onCommentUpdated: (updatedComment: PostComment) => void;
};

export const Comment: FC<CommentProps> = ({
  postId,
  comment,
  onCommentDeleted,
  onCommentUpdated,
}) => {
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  const isOwner = currentUserId === comment.author.id;
  const initialChar = comment.author.username.charAt(0);

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

  const handleEditSuccess = (updatedComment: PostComment) => {
    setIsEditing(false);
    onCommentUpdated(updatedComment);
  };

  return (
    <article className={styles.commentCard}>
      <header className={styles.commentHeader}>
        <div className={styles.headerLeft}>
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
              <div className={styles.miniAvatarFallback}>{initialChar}</div>
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
            {comment.edited && (
              <span className={styles.editedBadge}>(edited)</span>
            )}
          </div>
        </div>

        {isOwner && !isEditing && (
          <div className={styles.menuContainer} ref={menuRef}>
            <button
              type="button"
              className={styles.menuTriggerBtn}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Open comment actions"
            >
              <MoreHorizontal size={14} />
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
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  className={`${styles.menuItem} ${styles.itemDelete}`}
                  onClick={() => {
                    setIsDeleteModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                >
                  <Trash2 size={12} />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {isEditing ? (
        <CommentEditor
          postId={postId}
          comment={comment}
          onCancel={() => setIsEditing(false)}
          onCommentUpdated={handleEditSuccess}
        />
      ) : (
        <p className={styles.commentContentText}>{comment.content}</p>
      )}

      <AccessibleModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        titleId={`comment-del-title-${comment.id}`}
        descriptionId={`comment-del-desc-${comment.id}`}
      >
        <div className={styles.deleteDialogContent}>
          <header className={styles.modalHeader}>
            <h3
              id={`comment-del-title-${comment.id}`}
              className={styles.sectionTitle}
            >
              Delete Comment
            </h3>
          </header>

          <p
            id={`comment-del-desc-${comment.id}`}
            className={styles.deleteWarningText}
          >
            Are you sure you want to permanently remove this comment? This
            action is absolute.
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
              onClick={() => {
                setIsDeleteModalOpen(false);
                onCommentDeleted(comment.id);
              }}
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </AccessibleModal>
    </article>
  );
};
