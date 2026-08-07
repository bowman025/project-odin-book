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
    if (initialInboxData?.items) {
      setInbox(initialInboxData.items);

      const visibleRoomIds = initialInboxData.items.map((chat) => chat.id);
      if (socket?.connected && visibleRoomIds.length > 0) {
        socket.emit('join_conversations', { conversationIds: visibleRoomIds });
      }
    }
  }, [initialInboxData, setInbox, socket]);

  useEffect(() => {
    if (!conversationId && activeRoomId) {
      setActiveRoom(null);
    }
  }, [conversationId, activeRoomId, setActiveRoom]);

  return (
    <div className={styles.workspaceContainer}>
      <InboxSidebar />

      <main className={styles.chatViewportContainer}>
        {conversationId ? (
          <Outlet />
        ) : (
          <div className={styles.unselectedChannelEmptyStateBox}>
            <h4 className={styles.emptyStateTitleHeadline}>
              Communication Center
            </h4>
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
