import type { FC } from 'react';
import { useEffect } from 'react';
import { Outlet, useLoaderData, useParams } from 'react-router';
import { apiFetch } from '../../lib/api.js';
import { useChatStore } from '../../store/chatStore.js';
import styles from './ConversationsPage.module.css';
import { InboxSidebar } from './components/InboxSidebar/InboxSidebar';
import type { InboxLoaderResult } from './conversationsLoader.js';

export const ConversationsPage: FC = () => {
  const initialInboxData = useLoaderData() as InboxLoaderResult;
  const { conversationId } = useParams();

  const inbox = useChatStore((state) => state.inbox);
  const setInbox = useChatStore((state) => state.setInbox);
  const prependNewConversationToInbox = useChatStore(
    (state) => state.prependNewConversationToInbox,
  );
  const activeRoomId = useChatStore((state) => state.activeConversationId);
  const setActiveRoom = useChatStore((state) => state.setActiveRoom);
  const socket = useChatStore((state) => state.socket);

  useEffect(() => {
    if (initialInboxData?.items) {
      setInbox(initialInboxData.items);
    }
  }, [initialInboxData, setInbox]);

  useEffect(() => {
    if (
      !conversationId ||
      initialInboxData?.items.some((chat) => chat.id === conversationId)
    )
      return;

    const hydrateEmptyConversationShell = async () => {
      try {
        const response = await apiFetch(`/conversations/${conversationId}`);
        if (response.ok) {
          const payload = await response.json();
          prependNewConversationToInbox(payload.data.conversation);
        }
      } catch (error) {
        console.error(
          'Failed to pre-hydrate empty conversation sidebar row:',
          error,
        );
      }
    };

    hydrateEmptyConversationShell();
  }, [conversationId, initialInboxData, prependNewConversationToInbox]);

  useEffect(() => {
    if (!socket || inbox.length === 0) return;

    const visibleRoomsIds = inbox.map((chat) => chat.id);

    const joinRooms = () => {
      socket.emit('join_conversations', { conversationIds: visibleRoomsIds });
    };

    if (socket.connected) {
      joinRooms();
    } else {
      socket.once('connect', joinRooms);
    }

    return () => {
      socket.off('connect', joinRooms);
    };
  }, [inbox, socket]);

  useEffect(() => {
    if (conversationId) {
      setActiveRoom(conversationId);
    } else if (activeRoomId) {
      setActiveRoom(null);
    }
  }, [conversationId, activeRoomId, setActiveRoom]);

  return (
    <div className={styles.workspaceContainer}>
      <InboxSidebar />

      <main className={styles.chatViewportContainer}>
        {conversationId ? (
          <div
            key={conversationId}
            className={styles.activeChannelWrapperChassis}
          >
            <Outlet />
          </div>
        ) : (
          <div className={styles.unselectedChannelEmptyStateBox}>
            <h4 className={styles.emptyStateTitleHeadline}>Your Messages</h4>
            <p className={styles.emptyStateDescriptionSummary}>
              Select a conversation from the sidebar or start a new chat to
              begin messaging.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
