import { Check, Edit2, Loader2, Trash2, X } from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../../../../../lib/api.js';
import type { MessagePayload } from '../../../../conversationsLoader.js';
import styles from './MessageBubble.module.css';

type MessageBubbleProps = {
  msg: MessagePayload;
  isMyOwnMessage: boolean;
  conversationId: string;
};

export const MessageBubble: FC<MessageBubbleProps> = ({
  msg,
  isMyOwnMessage,
  conversationId,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTextBuffer, setEditTextBuffer] = useState(msg.content);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const editInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
      setLocalError(null);
    }
  }, [isEditing]);

  useEffect(() => {
    setEditTextBuffer(msg.content);
  }, [msg.content]);

  const handleToggleMenu = () => {
    if (!isMyOwnMessage || isEditing || isSubmitting) return;
    setIsMenuOpen((prev) => !prev);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditTextBuffer(msg.content);
    setLocalError(null);
  };

  const handleExecuteSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = editTextBuffer.trim();
    if (!cleanText || cleanText === msg.content || isSubmitting) {
      setIsEditing(false);
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);

    try {
      const response = await apiFetch(
        `/conversations/${conversationId}/messages/${msg.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ content: cleanText }),
        },
      );

      if (response.ok) {
        setIsEditing(false);
        setIsMenuOpen(false);
      } else {
        const body = await response.json();
        setLocalError(body.message || 'Failed to update entry.');
      }
    } catch {
      setLocalError('Network connection link failure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setLocalError(null);

    try {
      const response = await apiFetch(
        `/conversations/${conversationId}/messages/${msg.id}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        setLocalError('Failed to remove entry from archives.');
        setIsSubmitting(false);
      }
    } catch {
      setLocalError('Network connection link failure.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`${styles.messageRowBubbleWrapper} ${isMyOwnMessage ? styles.rowMine : styles.rowForeign}`}
    >
      <div className={styles.bubbleInteractionCell}>
        {isEditing ? (
          <form
            onSubmit={handleExecuteSaveEdit}
            className={styles.inlineEditFormStructure}
          >
            <input
              ref={editInputRef}
              type="text"
              className={styles.inlineEditInputField}
              value={editTextBuffer}
              onChange={(e) => setEditTextBuffer(e.target.value)}
              maxLength={500}
              disabled={isSubmitting}
            />
            <div className={styles.inlineEditActionsStrip}>
              <button
                type="submit"
                className={styles.actionIconButtonSave}
                disabled={!editTextBuffer.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className={styles.spinner} size={14} />
                ) : (
                  <Check size={14} />
                )}
              </button>
              <button
                type="button"
                className={styles.actionIconButtonCancel}
                onClick={handleCancelEdit}
                disabled={isSubmitting}
              >
                <X size={14} />
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className={`${styles.messageTextBubbleCell} ${isMyOwnMessage ? styles.bubbleMine : styles.bubbleForeign} ${isMyOwnMessage ? styles.clickableBubble : ''}`}
            onClick={handleToggleMenu}
            disabled={isSubmitting}
          >
            <p className={styles.messageContentTextString}>{msg.content}</p>
            <div className={styles.messageMetaBadgeStrip}>
              {msg.edited && (
                <span className={styles.editedTextLabel}>edited</span>
              )}
            </div>
          </button>
        )}

        {localError && (
          <div className={styles.bubbleLocalErrorText}>{localError}</div>
        )}

        {isMenuOpen && !isEditing && (
          <div className={styles.inlineManagementRibbonStrip}>
            <button
              type="button"
              className={styles.ribbonActionBtnEdit}
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              disabled={isSubmitting}
            >
              <Edit2 size={12} />
              <span>Edit</span>
            </button>
            <button
              type="button"
              className={styles.ribbonActionBtnDelete}
              onClick={handleExecuteDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className={styles.spinner} size={12} />
              ) : (
                <Trash2 size={12} />
              )}
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
