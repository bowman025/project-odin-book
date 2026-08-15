import { ArrowLeft, Loader2, Send } from 'lucide-react';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLoaderData, useNavigate, useParams } from 'react-router';
import { apiFetch } from '../../../../lib/api.js';
import { useAuthStore } from '../../../../store/authStore.js';
import { useChatStore } from '../../../../store/chatStore.js';
import type { MessageHistoryLoaderResult } from '../../messageHistoryLoader.js';
import styles from './ChatThreadPane.module.css';
import { MessageBubble } from './components/MessageBubble/MessageBubble';

export const ChatThreadPane: FC = () => {
  const initialHistoryData = useLoaderData() as MessageHistoryLoaderResult;
  const { conversationId } = useParams();
  const navigate = useNavigate();

  const currentUserId = useAuthStore((state) => state.user?.id);

  const socket = useChatStore((state) => state.socket);
  const setActiveRoom = useChatStore((state) => state.setActiveRoom);
  const inbox = useChatStore((state) => state.inbox);

  const messageCache = useChatStore((state) => state.messageCache);
  const setMessageHistory = useChatStore((state) => state.setMessageHistory);
  const prependMessageHistory = useChatStore(
    (state) => state.prependMessageHistory,
  );
  const pushIncomingMessage = useChatStore(
    (state) => state.pushIncomingMessage,
  );

  const onlineUsers = useChatStore((state) => state.onlineUsers);
  const typingUsers = useChatStore((state) => state.typingUsers);

  const [typedMessageInput, setTypedMessageInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isFetchingOlder, setIsFetchingOlder] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const currentPageRef = useRef(2);
  const hasMoreRef = useRef(initialHistoryData.pagination.hasMore);
  const previousCacheCountRef = useRef(initialHistoryData.items.length);
  const previousScrollHeightRef = useRef(0);
  const topObserverRef = useRef<IntersectionObserver | null>(null);

  const isPrependActionRef = useRef(false);

  const typingDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const localIsTypingStateRef = useRef(false);

  const currentRoomMessages = conversationId
    ? messageCache[conversationId] || []
    : [];

  useEffect(() => {
    if (initialHistoryData && conversationId) {
      setMessageHistory(conversationId, initialHistoryData.items);
      setActiveRoom(conversationId);

      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      });
    }
  }, [conversationId, initialHistoryData, setMessageHistory, setActiveRoom]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || currentRoomMessages.length === 0) return;

    const currentCount = currentRoomMessages.length;
    const previousCount = previousCacheCountRef.current;

    if (isPrependActionRef.current && currentCount > previousCount) {
      const newScrollHeight = scrollContainer.scrollHeight;
      scrollContainer.scrollTop =
        newScrollHeight - previousScrollHeightRef.current;

      isPrependActionRef.current = false;
    } else if (currentCount > previousCount) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    previousCacheCountRef.current = currentCount;
    previousScrollHeightRef.current = scrollContainer.scrollHeight;
  }, [currentRoomMessages.length]);

  const fetchOlderDialogueHistory = useCallback(async () => {
    if (isFetchingOlder || !hasMoreRef.current || !conversationId) return;
    setIsFetchingOlder(true);

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      previousScrollHeightRef.current = scrollContainer.scrollHeight;
    }

    try {
      const response = await apiFetch(
        `/conversations/${conversationId}/messages?page=${currentPageRef.current}&limit=30`,
      );

      if (response.ok) {
        const payload = await response.json();
        const olderMessages = payload.data.items;

        hasMoreRef.current = payload.data.pagination.hasMore;
        currentPageRef.current += 1;

        isPrependActionRef.current = true;
        prependMessageHistory(conversationId, olderMessages);
      }
    } catch (error) {
      console.error(
        'Failed to parse previous text logs history sequence:',
        error,
      );
    } finally {
      setIsFetchingOlder(false);
    }
  }, [conversationId, isFetchingOlder, prependMessageHistory]);

  const topSentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || isFetchingOlder || !hasMoreRef.current || !conversationId)
        return;

      if (topObserverRef.current) {
        topObserverRef.current.disconnect();
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.at(0)?.isIntersecting && hasMoreRef.current) {
            fetchOlderDialogueHistory();
          }
        },
        { threshold: 0.1 },
      );

      observer.observe(node);
      topObserverRef.current = observer;

      return () => {
        observer.disconnect();
        topObserverRef.current = null;
      };
    },
    [conversationId, isFetchingOlder, fetchOlderDialogueHistory],
  );

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

  const executeFormMessageBroadcastSubmit = async (e: React.SubmitEvent) => {
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
          <button
            type="button"
            className={styles.mobileBackBtn}
            onClick={() => navigate('/conversations')}
            title="Back to inbox"
          >
            <ArrowLeft size={18} />
          </button>
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
              {isPartnerOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </header>

      <div ref={scrollContainerRef} className={styles.dialogueScrollFeedBody}>
        <div ref={topSentinelRef} className={styles.topPaginationTrigger}>
          {isFetchingOlder && (
            <div className={styles.topLoaderRow}>
              <Loader2 className={styles.spinner} size={16} />
              <span>Fetching older history...</span>
            </div>
          )}
        </div>

        {currentRoomMessages.map((msg) => {
          const isMyOwnMessage = msg.senderId === currentUserId;
          return (
            <MessageBubble
              key={`msg-row-${msg.id}`}
              msg={msg}
              isMyOwnMessage={isMyOwnMessage}
              conversationId={conversationId || ''}
            />
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      <footer className={styles.threadInputConsoleTray}>
        {Object.entries(currentRoomTypingRegistry).some(
          ([uId, isTyping]) => uId !== currentUserId && isTyping,
        ) && (
          <div className={styles.typingFloatingTextStrip}>
            <span className={styles.typingTextFeedback}>
              @{foreignChatTargetCitizen.username} is typing...
            </span>
          </div>
        )}

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
