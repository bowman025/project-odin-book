import { zodResolver } from '@hookform/resolvers/zod';
import type { CreateCommentInput } from '@project-odin-book/validation';
import { CreateCommentSchema } from '@project-odin-book/validation';
import { Loader2, Send, X } from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AccessibleModal } from '../../../components/AccessibleModal/AccessibleModal';
import { apiFetch } from '../../../lib/api.js';
import { useInteractionStore } from '../../../store/interactionStore.js';
import { useUIStore } from '../../../store/uiStore.js';
import type { PostComment } from '../../posts/PostDetailPage/postDetailLoader.js';
import styles from './CommentComposer.module.css';

export const CommentComposer: FC<{
  onCommentCreated: (postId: string, newComment: PostComment) => void;
}> = ({ onCommentCreated }) => {
  const activeCommentPostId = useUIStore((s) => s.activeCommentPostId);
  const closeCommentModal = useUIStore((s) => s.closeCommentModal);
  const addToast = useUIStore((s) => s.addToast);

  const incrementRegistryCommentCount = useInteractionStore(
    (state) => state.incrementRegistryCommentCount,
  );

  const [globalFormError, setGlobalFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCommentInput>({
    resolver: zodResolver(CreateCommentSchema),
  });

  useEffect(() => {
    if (activeCommentPostId) {
      setGlobalFormError(null);
      reset();
    }
  }, [activeCommentPostId, reset]);

  useEffect(() => {
    if (activeCommentPostId) {
      textareaRef.current?.focus();
    }
  }, [activeCommentPostId]);

  if (!activeCommentPostId) return null;

  const onCommentSubmit = async (payload: CreateCommentInput) => {
    setGlobalFormError(null);
    setIsSubmitting(true);

    try {
      const response = await apiFetch(
        `/posts/${activeCommentPostId}/comments`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      const body = await response.json();

      if (!response.ok) {
        setGlobalFormError(body.message || 'Comment submission was rejected.');
        return;
      }

      const newComment: PostComment = {
        id: body.data.comment.id,
        content: body.data.comment.content,
        createdAt: body.data.comment.createdAt,
        edited: body.data.comment.edited,
        author: {
          id: body.data.comment.author?.id || '',
          username: body.data.comment.author?.username || 'user',
          profilePicture: body.data.comment.author?.profilePicture || null,
        },
      };

      incrementRegistryCommentCount(activeCommentPostId);
      onCommentCreated(activeCommentPostId, newComment);

      window.dispatchEvent(
        new CustomEvent('odinum_ui_comment_appended', {
          detail: { postId: activeCommentPostId, comment: newComment },
        }),
      );

      closeCommentModal();
      addToast('Comment posted successfully!', 'success');
    } catch {
      setGlobalFormError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contentField = register('content');

  return (
    <AccessibleModal
      isOpen={!!activeCommentPostId}
      onClose={closeCommentModal}
      titleId="comment-modal-title"
      descriptionId="comment-modal-description"
    >
      <header className={styles.modalHeader}>
        <h3 id="comment-modal-title" className={styles.sectionTitle}>
          Join the conversation
        </h3>

        <button
          type="button"
          className={styles.closeModalBtn}
          onClick={closeCommentModal}
        >
          <X size={18} />
        </button>
      </header>

      <p id="comment-modal-description" className="sr-only">
        Write and submit a comment for this post
      </p>

      {globalFormError && (
        <div className={styles.composerErrorBlock}>{globalFormError}</div>
      )}

      <form
        onSubmit={handleSubmit(onCommentSubmit)}
        className={styles.composerForm}
      >
        <textarea
          {...contentField}
          ref={(el) => {
            contentField.ref(el);
            textareaRef.current = el;
          }}
          id="content"
          placeholder="Write your response to this chronicle..."
          disabled={isSubmitting}
          className={`${styles.textarea} ${
            errors.content ? styles.textareaError : ''
          }`}
        />

        {errors.content && (
          <span className={styles.errorFieldMessage}>
            {errors.content.message}
          </span>
        )}

        <button
          type="submit"
          className={styles.submitReplyBtn}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className={styles.spinner} size={16} />
          ) : (
            <Send size={16} />
          )}
          <span>{isSubmitting ? 'Broadcasting...' : 'Reply'}</span>
        </button>
      </form>
    </AccessibleModal>
  );
};
