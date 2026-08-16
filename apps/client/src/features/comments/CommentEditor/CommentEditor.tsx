import { zodResolver } from '@hookform/resolvers/zod';
import type { CreateCommentInput } from '@project-odin-book/validation';
import { CreateCommentSchema } from '@project-odin-book/validation';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../../lib/api.js';
import { useUIStore } from '../../../store/uiStore.js';
import type { PostComment } from '../../posts/PostDetailPage/postDetailLoader.js';
import styles from './CommentEditor.module.css';

type CommentEditorProps = {
  postId: string;
  comment: PostComment;
  onCancel: () => void;
  onCommentUpdated: (updatedComment: PostComment) => void;
};

export const CommentEditor: FC<CommentEditorProps> = ({
  postId,
  comment,
  onCancel,
  onCommentUpdated,
}) => {
  const addToast = useUIStore((state) => state.addToast);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCommentInput>({
    resolver: zodResolver(CreateCommentSchema),
    defaultValues: { content: comment.content },
  });

  useEffect(() => {
    reset({ content: comment.content });
  }, [comment.content, reset]);

  const handleEditSubmit = async (payload: CreateCommentInput) => {
    setIsSubmitting(true);
    try {
      const response = await apiFetch(
        `/posts/${postId}/comments/${comment.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        const body = await response.json();
        addToast('Comment updated!', 'success');
        onCommentUpdated(body.data.comment);
      } else {
        addToast('Server rejected comment update.', 'error');
      }
    } catch {
      addToast('Network connection link failure.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contentField = register('content');

  return (
    <form onSubmit={handleSubmit(handleEditSubmit)} className={styles.editForm}>
      <textarea
        className={styles.editTextarea}
        disabled={isSubmitting}
        {...contentField}
        ref={(el) => {
          contentField.ref(el);
        }}
      />
      {errors.content && (
        <span className={styles.fieldError}>{errors.content.message}</span>
      )}

      <div className={styles.editActionRow}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.saveBtn}
          disabled={isSubmitting}
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};
