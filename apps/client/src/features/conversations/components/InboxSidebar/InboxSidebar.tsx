import { Inbox, MessageSquarePlus } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useChatStore } from '../../../../store/chatStore.js';
import { NewChatModal } from '../NewChatModal/NewChatModal';
import styles from './InboxSidebar.module.css';

export const InboxSidebar: FC = () => {
  const navigate = useNavigate();
  const { conversationId: activeUrlRoomId } = useParams();

  const inbox = useChatStore((state) => state.inbox);
  const onlineUsers = useChatStore((state) => state.onlineUsers);

  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <aside className={styles.inboxSidebar}>
      <header className={styles.sidebarHeader}>
        <div className={styles.headerLeftTitle}>
          <Inbox size={18} className={styles.inboxIcon} />
          <h3 className={styles.sidebarTitle}>Inbox</h3>
        </div>

        <button
          type="button"
          className={styles.newChatTriggerBtn}
          onClick={() => setIsModalOpen(true)}
          title="Start new conversation"
        >
          <MessageSquarePlus size={18} />
        </button>
      </header>

      <div className={styles.inboxScrollStack}>
        {inbox.length === 0 ? (
          <div className={styles.emptyInboxState}>
            <p>Your inbox is quiet.</p>
            <span className={styles.subtext}>Start a conversation.</span>
          </div>
        ) : (
          inbox.map((chat) => {
            const partner = chat.participants.at(0);
            if (!partner) return null;

            const initial = partner.username.charAt(0);
            const isSelected = chat.id === activeUrlRoomId;
            const isPartnerOnline = onlineUsers.has(partner.id);

            return (
              <button
                key={`inbox-row-${chat.id}`}
                type="button"
                className={`${styles.inboxRowCard} ${isSelected ? styles.rowSelected : ''}`}
                onClick={() => navigate(`/conversations/${chat.id}`)}
              >
                <div className={styles.avatarWrapper}>
                  {partner.profilePicture ? (
                    <img
                      src={partner.profilePicture}
                      alt={partner.username}
                      className={styles.sidebarAvatar}
                    />
                  ) : (
                    <div className={styles.sidebarAvatarFallback}>
                      {initial}
                    </div>
                  )}
                  {isPartnerOnline && (
                    <span className={styles.onlineBadgeDotMarker} />
                  )}
                </div>

                <div className={styles.inboxCardSummary}>
                  <div className={styles.summaryTopRow}>
                    <span className={styles.rowUsername}>
                      @{partner.username}
                    </span>
                  </div>
                  <p className={styles.previewSnippetText}>
                    {chat.lastMessage
                      ? chat.lastMessage.content
                      : 'Conversation started...'}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      <NewChatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </aside>
  );
};
