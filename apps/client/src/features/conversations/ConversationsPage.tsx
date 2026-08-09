import type { FC } from 'react';
import { useEffect } from 'react';
import { Outlet, useLoaderData, useParams } from 'react-router';
import { useChatStore } from '../../store/chatStore.js';
import styles from './ConversationsPage.module.css';
import { InboxSidebar } from './components/InboxSidebar/InboxSidebar';
import type { InboxLoaderResult } from './conversationsLoader.js';

export const ConversationsPage: FC = () => {
  const initialInboxData = useLoaderData() as InboxLoaderResult;
  const { conversationId } = useParams();

  const setInbox = useChatStore((state) => state.setInbox);
  const activeRoomId = useChatStore((state) => state.activeConversationId);
  const setActiveRoom = useChatStore((state) => state.setActiveRoom);
  const socket = useChatStore((state) => state.socket);

  useEffect(() => {
    if (!initialInboxData?.items || !socket) return;

    setInbox(initialInboxData.items);

    const visibleRoomIds = initialInboxData.items.map((chat) => chat.id);
    if (visibleRoomIds.length === 0) return;

    const joinRooms = () => {
      socket.emit('join_conversations', { conversationIds: visibleRoomIds });
    };

    if (socket.connected) {
      joinRooms();
    } else {
      socket.once('connect', joinRooms);
    }

    return () => {
      socket.off('connect', joinRooms);
    };
  }, [initialInboxData, setInbox, socket]);

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
