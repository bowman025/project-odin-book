import {
  ArrowLeft,
  Check,
  Inbox,
  Loader2,
  Send,
  ShieldAlert,
  UserMinus,
  X,
} from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { Link, useLoaderData, useNavigate } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import { useUIStore } from '../../../store/uiStore.js';
import styles from './PendingRequestsPage.module.css';
import type { PendingRequestsLoaderResult } from './pendingRequestsLoader.js';

export const PendingRequestsPage: FC = () => {
  const initialData = useLoaderData() as PendingRequestsLoaderResult;
  const navigate = useNavigate();
  const addToast = useUIStore((state) => state.addToast);

  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'revoke'>(
    'received',
  );
  const [receivedItems, setReceivedItems] = useState(
    initialData.initialReceived.items,
  );
  const [sentItems, setSentItems] = useState(initialData.initialSent.items);
  const [approvedFollowers, setApprovedFollowers] = useState(
    initialData.initialFollowers.items,
  );
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/follows/requests/${requestId}/accept`, {
        method: 'PATCH',
      });

      if (response.ok) {
        addToast('Citizen welcomed into your chronicle network.', 'success');

        const acceptedItem = receivedItems.find(
          (item) => item.id === requestId,
        );

        if (acceptedItem) {
          setApprovedFollowers((prev) => [
            {
              requestId: acceptedItem.id,
              id: acceptedItem.sender.id,
              username: acceptedItem.sender.username,
              profilePicture: acceptedItem.sender.profilePicture,
              bio: null,
            },
            ...prev,
          ]);
        }

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
        addToast('Invitation removed from your queue.', 'info');
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
        addToast('Outgoing follow request retracted.', 'info');
        setSentItems((prev) => prev.filter((item) => item.id !== requestId));
      }
    } catch {
      addToast('Network pipeline error.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevokeApproval = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const response = await apiFetch(`/follows/requests/${requestId}/revoke`, {
        method: 'PATCH',
      });
      if (response.ok) {
        addToast('Citizen authorization revoked.', 'success');
        setApprovedFollowers((prev) =>
          prev.filter((item) => item.requestId !== requestId),
        );
      }
    } catch {
      addToast('Network link failure.', 'error');
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
          Audit incoming requests, track outbound hooks, or manage and revoke
          active connections.
        </p>
      </header>

      <div className={styles.tabBarLayoutRow}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'received' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('received')}
        >
          <Inbox size={14} />
          <span>Received ({receivedItems.length})</span>
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'sent' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          <Send size={14} />
          <span>Sent ({sentItems.length})</span>
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'revoke' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('revoke')}
        >
          <ShieldAlert size={14} />
          <span>Revoke ({approvedFollowers.length})</span>
        </button>
      </div>

      <div className={styles.listContainerStack}>
        {activeTab === 'received' &&
          (receivedItems.length === 0 ? (
            <div className={styles.emptyCardState}>
              <p>No incoming invitations remain.</p>
            </div>
          ) : (
            receivedItems.map((item) => (
              <div
                key={`received-${item.id}`}
                className={styles.requestRowCard}
              >
                <Link
                  to={`/users/${item.sender.username}`}
                  className={styles.profileMetaGroup}
                >
                  {item.sender.profilePicture ? (
                    <img
                      src={item.sender.profilePicture}
                      alt={item.sender.username}
                      className={styles.rowAvatar}
                    />
                  ) : (
                    <div className={styles.rowAvatarFallback}>
                      {item.sender.username.charAt(0)}
                    </div>
                  )}
                  <span className={styles.rowUsername}>
                    @{item.sender.username}
                  </span>
                </Link>

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
                    className={styles.rejectTextActionBtn}
                    disabled={processingId === item.id}
                    onClick={() => handleRejectRequest(item.id)}
                  >
                    <X size={12} />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))
          ))}

        {activeTab === 'sent' &&
          (sentItems.length === 0 ? (
            <div className={styles.emptyCardState}>
              <p>No active outbound requests pending response.</p>
            </div>
          ) : (
            sentItems.map((item) => (
              <div key={`sent-${item.id}`} className={styles.requestRowCard}>
                <Link
                  to={`/users/${item.receiver.username}`}
                  className={styles.profileMetaGroup}
                >
                  {item.receiver.profilePicture ? (
                    <img
                      src={item.receiver.profilePicture}
                      alt={item.receiver.username}
                      className={styles.rowAvatar}
                    />
                  ) : (
                    <div className={styles.rowAvatarFallback}>
                      {item.receiver.username.charAt(0)}
                    </div>
                  )}
                  <span className={styles.rowUsername}>
                    @{item.receiver.username}
                  </span>
                </Link>
                <div className={styles.rowActionsBlock}>
                  <button
                    type="button"
                    className={styles.cancelRequestBtn}
                    disabled={processingId === item.id}
                    onClick={() =>
                      handleCancelSentRequest(item.receiver.username, item.id)
                    }
                  >
                    <span>Retract Request</span>
                  </button>
                </div>
              </div>
            ))
          ))}

        {activeTab === 'revoke' &&
          (approvedFollowers.length === 0 ? (
            <div className={styles.emptyCardState}>
              <p>No active approved followers found.</p>
            </div>
          ) : (
            approvedFollowers.map((item) => (
              <div
                key={`revoke-${item.requestId}`}
                className={styles.requestRowCard}
              >
                <Link
                  to={`/users/${item.username}`}
                  className={styles.profileMetaGroup}
                >
                  {item.profilePicture ? (
                    <img
                      src={item.profilePicture}
                      alt={item.username}
                      className={styles.rowAvatar}
                    />
                  ) : (
                    <div className={styles.rowAvatarFallback}>
                      {item.username.charAt(0)}
                    </div>
                  )}
                  <span className={styles.rowUsername}>@{item.username}</span>
                </Link>
                <div className={styles.rowActionsBlock}>
                  <button
                    type="button"
                    className={styles.rejectTextActionBtn}
                    disabled={processingId === item.requestId}
                    onClick={() => handleRevokeApproval(item.requestId)}
                  >
                    <UserMinus size={12} />
                    <span>Revoke Access</span>
                  </button>
                </div>
              </div>
            ))
          ))}
      </div>
    </div>
  );
};
