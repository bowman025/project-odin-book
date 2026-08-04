import { ArrowLeft, Check, Inbox, Loader2, Send, X } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import { useUIStore } from '../../../store/uiStore.js';
import styles from './PendingRequestsPage.module.css';
import type { PendingRequestsLoaderResult } from './pendingRequestsLoader.js';

export const PendingRequestsPage: FC = () => {
  const initialData = useLoaderData() as PendingRequestsLoaderResult;
  const navigate = useNavigate();
  const addToast = useUIStore((state) => state.addToast);

  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [receivedItems, setReceivedItems] = useState(
    initialData.initialReceived.items,
  );
  const [sentItems, setSentItems] = useState(initialData.initialSent.items);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/follows/requests/${requestId}/accept`, {
        method: 'PATCH',
      });
      if (response.ok) {
        addToast(
          'Citizen successfully welcomed into your chronicle network.',
          'success',
        );
        setReceivedItems((prev) =>
          prev.filter((item) => item.id !== requestId),
        );
      }
    } catch {
      addToast('Network pipeline error.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/follows/requests/${requestId}/reject`, {
        method: 'PATCH',
      });
      if (response.ok) {
        addToast('Invitation removed from your pending queue.', 'info');
        setReceivedItems((prev) =>
          prev.filter((item) => item.id !== requestId),
        );
      }
    } catch {
      addToast('Network pipeline error.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelSentRequest = async (
    targetUsername: string,
    requestId: string,
  ) => {
    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/follows/${targetUsername}`, {
        method: 'POST',
      });
      if (response.ok) {
        addToast('Outgoing follow request successfully retracted.', 'info');
        setSentItems((prev) => prev.filter((item) => item.id !== requestId));
      }
    } catch {
      addToast('Network pipeline error.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate('/settings')}
        >
          <ArrowLeft size={14} />
          <span>Back to Settings</span>
        </button>
        <h2 className={styles.title}>Connection Requests</h2>
        <p className={styles.subtitle}>
          Audit and govern incoming invites or track outbound relationship
          statuses.
        </p>
      </header>

      <div className={styles.tabBarLayoutRow}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'received' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('received')}
        >
          <Inbox size={16} />
          <span>Received Requests ({receivedItems.length})</span>
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'sent' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          <Send size={16} />
          <span>Sent Requests ({sentItems.length})</span>
        </button>
      </div>

      <div className={styles.listContainerStack}>
        {activeTab === 'received' ? (
          receivedItems.length === 0 ? (
            <div className={styles.emptyCardState}>
              <p>
                Your inbox queue is completely clear. No incoming requests
                remain.
              </p>
            </div>
          ) : (
            receivedItems.map((item) => {
              const letter = item.sender.username.charAt(0);
              return (
                <div
                  key={`received-${item.id}`}
                  className={styles.requestRowCard}
                >
                  {item.sender.profilePicture ? (
                    <img
                      src={item.sender.profilePicture}
                      alt={item.sender.username}
                      className={styles.rowAvatar}
                    />
                  ) : (
                    <div className={styles.rowAvatarFallback}>{letter}</div>
                  )}
                  <span className={styles.rowUsername}>
                    @{item.sender.username}
                  </span>

                  <div className={styles.rowActionsBlock}>
                    <button
                      type="button"
                      className={styles.acceptActionBtn}
                      disabled={processingId === item.id}
                      onClick={() => handleAcceptRequest(item.id)}
                    >
                      {processingId === item.id ? (
                        <Loader2 size={12} className={styles.spin} />
                      ) : (
                        <Check size={12} />
                      )}
                      <span>Accept</span>
                    </button>
                    <button
                      type="button"
                      className={styles.rejectActionBtn}
                      disabled={processingId === item.id}
                      onClick={() => handleRejectRequest(item.id)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )
        ) : sentItems.length === 0 ? (
          <div className={styles.emptyCardState}>
            <p>
              You do not have any active outgoing follow requests pending
              response.
            </p>
          </div>
        ) : (
          sentItems.map((item) => {
            const letter = item.receiver.username.charAt(0);
            return (
              <div key={`sent-${item.id}`} className={styles.requestRowCard}>
                {item.receiver.profilePicture ? (
                  <img
                    src={item.receiver.profilePicture}
                    alt={item.receiver.username}
                    className={styles.rowAvatar}
                  />
                ) : (
                  <div className={styles.rowAvatarFallback}>{letter}</div>
                )}
                <span className={styles.rowUsername}>
                  @{item.receiver.username}
                </span>

                <div className={styles.rowActionsBlock}>
                  <button
                    type="button"
                    className={styles.cancelRequestBtn}
                    disabled={processingId === item.id}
                    onClick={() =>
                      handleCancelSentRequest(item.receiver.username, item.id)
                    }
                  >
                    {processingId === item.id ? (
                      <Loader2 size={12} className={styles.spin} />
                    ) : (
                      <X size={12} />
                    )}
                    <span>Retract Request</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
