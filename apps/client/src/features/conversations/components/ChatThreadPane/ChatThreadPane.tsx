import { Loader2, Send } from 'lucide-react';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLoaderData, useParams } from 'react-router';
import { apiFetch } from '../../../../lib/api.js';
import { useAuthStore } from '../../../../store/authStore.js';
import { useChatStore } from '../../../../store/chatStore.js';
import type { MessageHistoryLoaderResult } from '../../messageHistoryLoader.js';
import styles from './ChatThreadPane.module.css';

export const ChatThreadPane: FC = () => {
  const initialHistoryData = useLoaderData() as MessageHistoryLoaderResult;
  const { conversationId } = useParams();

  const currentUserId = useAuthStore((state) => state.user?.id);

  const socket = useChatStore((state) => state.socket);
  const setActiveRoom = useChatStore((state) => state.setActiveRoom);
  const inbox = useChatStore((state) => state.inbox);

  const messageCache = useChatStore((state) => state.messageCache);
  const setMessageHistory = useChatStore((state) => state.setMessageHistory);
  const pushIncomingMessage = useChatStore(
    (state) => state.pushIncomingMessage,
  );

  const onlineUsers = useChatStore((state) => state.onlineUsers);
  const typingUsers = useChatStore((state) => state.typingUsers);

  const [typedMessageInput, setTypedMessageInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const localIsTypingStateRef = useRef(false);

  useEffect(() => {
    if (initialHistoryData && conversationId) {
      setMessageHistory(conversationId, initialHistoryData.items);
      setActiveRoom(conversationId);
    }
  }, [initialHistoryData, conversationId, setMessageHistory, setActiveRoom]);

  const scrollChatViewportToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    },
    [],
  );

  useEffect(() => {
    if (conversationId && messageCache[conversationId]) {
      scrollChatViewportToBottom('instant');
    }
  }, [conversationId, messageCache, scrollChatViewportToBottom]);

  const handleUserKeystrokeActivity = (textValue: string) => {
    setTypedMessageInput(textValue);
    if (!socket?.connected || !conversationId) return;

    if (!localIsTypingStateRef.current) {
      localIsTypingStateRef.current = true;
      socket.emit('typing_status', { conversationId, isTyping: true });
    }

    if (typingDebounceTimeoutRef.current) {
      clearTimeout(typingDebounceTimeoutRef.current);
    }

    typingDebounceTimeoutRef.current = setTimeout(() => {
      localIsTypingStateRef.current = false;
      socket.emit('typing_status', { conversationId, isTyping: false });
    }, 2000);
  };

  const executeFormMessageBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = typedMessageInput.trim();
    if (!cleanText || !conversationId || isSendingMessage) return;

    setIsSendingMessage(true);
    if (typingDebounceTimeoutRef.current)
      clearTimeout(typingDebounceTimeoutRef.current);
    localIsTypingStateRef.current = false;
    socket?.emit('typing_status', { conversationId, isTyping: false });

    try {
      const response = await apiFetch(
        `/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ content: cleanText }),
        },
      );

      if (response.ok) {
        const payload = await response.json();
        const authoredMessage = payload.data.message;

        pushIncomingMessage(authoredMessage);
        setTypedMessageInput('');
        setTimeout(() => scrollChatViewportToBottom('smooth'), 50);
      }
    } catch (error) {
      console.error(
        'Failed to dispatch real-time conversational data packet:',
        error,
      );
    } finally {
      setIsSendingMessage(false);
    }
  };

  const currentRoomMessages = conversationId
    ? messageCache[conversationId] || []
    : [];
  const currentRoomTypingRegistry = conversationId
    ? typingUsers[conversationId] || {}
    : {};

  const activeChatSessionMeta = inbox.find(
    (chat) => chat.id === conversationId,
  );
  const foreignChatTargetCitizen = activeChatSessionMeta?.participants.at(0);

  if (!foreignChatTargetCitizen) return null;

  const partnerInitial = foreignChatTargetCitizen.username.charAt(0);
  const isPartnerOnline = onlineUsers.has(foreignChatTargetCitizen.id);

  return (
    <div className={styles.activeChannelBoxStructure}>
      <header className={styles.threadHeaderSubBar}>
        <div className={styles.headerPartnerMetaBox}>
          <div className={styles.avatarWrapper}>
            {foreignChatTargetCitizen.profilePicture ? (
              <img
                src={foreignChatTargetCitizen.profilePicture}
                alt={foreignChatTargetCitizen.username}
                className={styles.threadHeaderAvatar}
              />
            ) : (
              <div className={styles.threadHeaderAvatarFallback}>
                {partnerInitial}
              </div>
            )}
            {isPartnerOnline && (
              <span className={styles.onlineBadgeDotMarker} />
            )}
          </div>
          <div className={styles.headerLabelStrings}>
            <span className={styles.threadHeaderTargetName}>
              @{foreignChatTargetCitizen.username}
            </span>
            <span className={styles.presenceSubLabelText}>
              {isPartnerOnline ? 'Online in Realm' : 'Offline'}
            </span>
          </div>
        </div>
      </header>

      <div className={styles.dialogueScrollFeedBody}>
        {currentRoomMessages.length === 0 ? (
          <div className={styles.emptyThreadPromptBlock}>
            <p>
              This is the start of your secure chat narrative channel with @
              {foreignChatTargetCitizen.username}.
            </p>
          </div>
        ) : (
          currentRoomMessages.map((msg) => {
            const isMyOwnMessage = msg.senderId === currentUserId;
            return (
              <div
                key={`msg-row-${msg.id}`}
                className={`${styles.messageRowBubbleWrapper} ${isMyOwnMessage ? styles.rowMine : styles.rowForeign}`}
              >
                <div
                  className={`${styles.messageTextBubbleCell} ${isMyOwnMessage ? styles.bubbleMine : styles.bubbleForeign}`}
                >
                  <p className={styles.messageContentTextString}>
                    {msg.content}
                  </p>
                  <div className={styles.messageMetaBadgeStrip}>
                    {msg.edited && (
                      <span className={styles.editedTextLabel}>edited</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {Object.entries(currentRoomTypingRegistry).some(
          ([uId, isTyping]) => uId !== currentUserId && isTyping,
        ) && (
          <div className={styles.typingFeedbackRowBubble}>
            <div className={styles.typingBubbleIndicatorCell}>
              <span className={styles.typingTextFeedback}>
                @{foreignChatTargetCitizen.username} is typing...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <footer className={styles.threadInputConsoleTray}>
        <form
          onSubmit={executeFormMessageBroadcastSubmit}
          className={styles.messageComposerFormStructure}
        >
          <input
            type="text"
            className={styles.messagePayloadTextInputField}
            placeholder={`Send message to @${foreignChatTargetCitizen.username}...`}
            value={typedMessageInput}
            onChange={(e) => handleUserKeystrokeActivity(e.target.value)}
            disabled={isSendingMessage}
            maxLength={500}
          />
          <button
            type="submit"
            className={styles.dispatchMessagePayloadBtn}
            disabled={!typedMessageInput.trim() || isSendingMessage}
          >
            {isSendingMessage ? (
              <Loader2 className={styles.spinner} size={16} />
            ) : (
              <Send size={16} />
            )}
          </button>
        </form>
      </footer>
    </div>
  );
};
