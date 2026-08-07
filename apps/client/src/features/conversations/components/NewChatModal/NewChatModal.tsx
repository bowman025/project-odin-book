import { Loader2, Search, X } from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AccessibleModal } from '../../../../components/AccessibleModal/AccessibleModal';
import { apiFetch } from '../../../../lib/api.js';
import styles from './NewChatModal.module.css';

type EligiblePartner = {
  id: string;
  username: string;
  profilePicture: string | null;
  bio: string | null;
};

type NewChatModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const NewChatModal: FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const [inputBuffer, setInputBuffer] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [results, setResults] = useState<EligiblePartner[]>([]);

  const [isSearching, setIsSearching] = useState(false);
  const [isInitializingThread, setIsInitializingThread] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInputBuffer('');
      setActiveSearch('');
      setResults([]);
      setGlobalError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const cleanInput = inputBuffer.trim();
    if (cleanInput === activeSearch) return;

    const delayTimer = setTimeout(() => {
      setActiveSearch(cleanInput);
    }, 350);

    return () => clearTimeout(delayTimer);
  }, [inputBuffer, activeSearch]);

  useEffect(() => {
    if (!activeSearch) {
      setResults([]);
      return;
    }

    const fetchEligiblePartners = async () => {
      setIsSearching(true);
      setGlobalError(null);
      try {
        const response = await apiFetch(
          `/conversations/eligible-partners?q=${encodeURIComponent(activeSearch)}`,
        );
        if (response.ok) {
          const payload = await response.json();
          setResults(payload.data.items);
        } else {
          setGlobalError('Failed to fetch connections archive.');
        }
      } catch {
        setGlobalError('Network connection link failure.');
      } finally {
        setIsSearching(false);
      }
    };

    fetchEligiblePartners();
  }, [activeSearch]);

  const handleSelectPartner = async (username: string) => {
    if (isInitializingThread) return;
    setIsInitializingThread(true);
    setGlobalError(null);

    try {
      const response = await apiFetch(`/conversations/${username}`, {
        method: 'POST',
      });

      if (response.ok) {
        const payload = await response.json();
        const conversationId = payload.data.conversation.id;

        onClose();
        navigate(`/conversations/${conversationId}`);
      } else {
        const body = await response.json();
        setGlobalError(body.message || 'Could not initialize chat channel.');
      }
    } catch {
      setGlobalError('Network error initializing channel.');
    } finally {
      setIsInitializingThread(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      titleId="new-chat-title"
      descriptionId="new-chat-desc"
    >
      <div className={styles.modalContentWrapper}>
        <header className={styles.modalHeaderRow}>
          <h3 id="new-chat-title" className={styles.modalHeadingTitle}>
            New Message
          </h3>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            disabled={isInitializingThread}
          >
            <X size={16} />
          </button>
        </header>

        <p id="new-chat-desc" className="sr-only">
          Search and choose a user from your connections to start a message
          thread.
        </p>

        {globalError && (
          <div className={styles.modalErrorBanner}>{globalError}</div>
        )}

        <div className={styles.modalSearchBox}>
          <Search size={16} className={styles.modalSearchIcon} />
          <input
            type="text"
            className={styles.modalInputField}
            placeholder="Type a connection's username..."
            value={inputBuffer}
            onChange={(e) => setInputBuffer(e.target.value)}
            disabled={isInitializingThread}
          />
          {isSearching && (
            <Loader2
              className={`${styles.spinner} ${styles.modalLoader}`}
              size={16}
            />
          )}
        </div>

        <div className={styles.modalResultsContainer}>
          {isSearching ? (
            <div className={styles.modalCenterStatus}>
              <span>Searching your connections...</span>
            </div>
          ) : results.length === 0 && activeSearch ? (
            <div className={styles.modalCenterStatus}>
              <p>No matching connections found.</p>
              <span className={styles.modalSubtextHint}>
                You can only message users you have a mutual follow connection
                with.
              </span>
            </div>
          ) : results.length === 0 && !activeSearch ? (
            <div className={styles.modalCenterStatus}>
              <span className={styles.modalSubtextHint}>
                Type a username above.
              </span>
            </div>
          ) : (
            <ul className={styles.modalResultsList}>
              {results.map((user) => {
                const initial = user.username.charAt(0);
                return (
                  <li
                    key={`eligible-user-${user.id}`}
                    className={styles.modalResultItemRow}
                  >
                    <button
                      type="button"
                      className={styles.modalResultCardTrigger}
                      onClick={() => handleSelectPartner(user.username)}
                      disabled={isInitializingThread}
                    >
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={user.username}
                          className={styles.modalCardAvatar}
                        />
                      ) : (
                        <div className={styles.modalCardAvatarFallback}>
                          {initial}
                        </div>
                      )}

                      <div className={styles.modalCardTextStrings}>
                        <span className={styles.modalCardUsername}>
                          @{user.username}
                        </span>
                        <p className={styles.modalCardBioText}>
                          {user.bio || 'Exploring Odinum archives...'}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AccessibleModal>
  );
};
