import {
  ArrowUpRight,
  Hash,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLoaderData, useSearchParams } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import styles from './DirectoryPage.module.css';
import type {
  DirectoryLoaderResult,
  DirectoryUser,
} from './directoryLoader.js';

const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '#'];

export const DirectoryPage: FC = () => {
  const initialData = useLoaderData() as DirectoryLoaderResult;
  const [searchParams, setSearchParams] = useSearchParams();

  // 🔌 URL AS SINGLE SOURCE OF TRUTH: Derive parameter coordinates natively
  const activeQ = searchParams.get('q') || '';
  const activeSort = searchParams.get('sortBy') || 'alphabetical';
  const activeLetter = searchParams.get('letter') || '';

  // Local state is used ONLY to hold the active rendering array chunk stack
  const [users, setUsers] = useState<DirectoryUser[]>(initialData.items);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [inputBuffer, setInputBuffer] = useState(activeQ);

  const nextPageRef = useRef(2);
  const hasMoreRef = useRef(initialData.pagination.hasMore);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 💡 THE SYNC RESOLUTION: Whenever url query params change, reset states completely!
  // This instantly wipes out old tab records and removes duplication leaks permanently.
  useEffect(() => {
    setUsers(initialData.items);
    setInputBuffer(activeQ);
    nextPageRef.current = 2;
    hasMoreRef.current = initialData.pagination.hasMore;
  }, [initialData, activeQ]);

  // Unified single search parameter mutation state dispatch link
  const updateUrlParams = useCallback(
    (mods: {
      q?: string;
      sortBy?: string;
      letter?: string;
      clearSearch?: boolean;
    }) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('page', '1'); // Any filter modification resets scroll index back to page 1

      if (mods.sortBy !== undefined) nextParams.set('sortBy', mods.sortBy);

      if (mods.q !== undefined) {
        if (mods.q.trim()) {
          nextParams.set('q', mods.q.trim());
          nextParams.delete('letter'); // Typing a keyword clears starting letter index
        } else {
          nextParams.delete('q');
        }
      }

      if (mods.letter !== undefined) {
        if (mods.letter) {
          nextParams.set('letter', mods.letter);
          nextParams.delete('q'); // Selecting a letter clears active string queries
        } else {
          nextParams.delete('letter');
        }
      }

      if (mods.clearSearch) {
        nextParams.delete('q');
      }

      setSearchParams(nextParams);
    },
    [searchParams, setSearchParams],
  );

  // Debounced live string search processing
  useEffect(() => {
    const cleanInput = inputBuffer.trim();
    if (cleanInput === activeQ) return;

    const delayHandler = setTimeout(() => {
      updateUrlParams({ q: cleanInput });
    }, 400);

    return () => clearTimeout(delayHandler);
  }, [inputBuffer, activeQ, updateUrlParams]);

  const loadMoreUsers = useCallback(async () => {
    if (isFetchingMore || !hasMoreRef.current) return;
    setIsFetchingMore(true);

    try {
      let apiPath = `/users?page=${nextPageRef.current}&limit=12&sortBy=${activeSort}`;
      if (activeQ) apiPath += `&q=${encodeURIComponent(activeQ)}`;
      if (activeLetter)
        apiPath += `&letter=${encodeURIComponent(activeLetter)}`;

      const response = await apiFetch(apiPath);
      if (response.ok) {
        const payload = await response.json();
        const incoming = payload.data.items as DirectoryUser[];

        // Append unique entries by verifying IDs cleanly
        setUsers((prev) => {
          const existingIds = new Set(prev.map((u) => u.id));
          const filteredIncoming = incoming.filter(
            (u) => !existingIds.has(u.id),
          );
          return [...prev, ...filteredIncoming];
        });

        hasMoreRef.current = payload.data.pagination.hasMore;
        nextPageRef.current += 1;
      }
    } catch (error) {
      console.error('Failed to parse incremental directory batch:', error);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, activeSort, activeQ, activeLetter]);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (isFetchingMore) return;

      const observer = new IntersectionObserver((entries) => {
        if (entries?.at(0)?.isIntersecting && hasMoreRef.current) {
          loadMoreUsers();
        }
      });
      if (node) {
        observer.observe(node);
        observerRef.current = observer;
      }
    },
    [isFetchingMore, loadMoreUsers],
  );

  const handleClearAllActiveFilters = () => {
    setInputBuffer('');
    setSearchParams({ page: '1', limit: '12', sortBy: 'alphabetical' });
  };

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h2 className={styles.title}>User Realm</h2>
        <p className={styles.subtitle}>
          Discover and view profiles across Odinum archives
        </p>
      </header>

      {/* SEARCH & SORT PANEL */}
      <div className={styles.filterWorkspaceDeck}>
        <div className={styles.searchControlBar}>
          <Search size={16} className={styles.searchSearchIcon} />
          <input
            type="text"
            className={styles.directoryInputText}
            placeholder="Search citizens by username..."
            value={inputBuffer}
            onChange={(e) => setInputBuffer(e.target.value)}
          />
          {inputBuffer && (
            <button
              type="button"
              className={styles.clearTextQueryBtn}
              onClick={() => {
                setInputBuffer('');
                updateUrlParams({ clearSearch: true });
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className={styles.sortingRibbonTray}>
          <SlidersHorizontal size={14} className={styles.controlsIcon} />
          {(['alphabetical', 'newest', 'followers'] as const).map((mode) => (
            <button
              key={`sort-btn-${mode}`}
              type="button"
              className={`${styles.sortTriggerBtn} ${activeSort === mode ? styles.sortBtnActive : ''}`}
              onClick={() => updateUrlParams({ sortBy: mode })}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* A-Z JUMP STRIP */}
      <div className={styles.alphabetIndexGridStrip}>
        {ALPHABET.map((char) => (
          <button
            key={`jump-index-token-${char}`}
            type="button"
            className={`${styles.letterIndexBadgeBtn} ${activeLetter === char ? styles.letterActive : ''}`}
            onClick={() =>
              updateUrlParams({ letter: char === activeLetter ? '' : char })
            }
          >
            {char === '#' ? (
              <Hash size={12} style={{ display: 'inline' }} />
            ) : (
              char
            )}
          </button>
        ))}
      </div>

      {/* ACTIVE LABELS NOTIFICATION */}
      {(activeQ || activeLetter) && (
        <div className={styles.activeFiltersRow}>
          <span className={styles.resultsIndicatorLabel}>
            Filtered by:{' '}
            <strong>
              {activeLetter
                ? `Starts with "${activeLetter}"`
                : `Searching "${activeQ}"`}
            </strong>
          </span>
          <button
            type="button"
            className={styles.resetAllFiltersCta}
            onClick={handleClearAllActiveFilters}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* CARDS VIEWS DISPLAY CONTAINER */}
      {users.length === 0 ? (
        <div className={styles.emptyDirectoryState}>
          <p>No platform citizens found matching those criteria.</p>
          <button
            type="button"
            className={styles.emptyStateResetBtn}
            onClick={handleClearAllActiveFilters}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className={styles.gridViewport}>
          {users.map((profile) => {
            const authorInitial = profile.username.charAt(0);

            return (
              <Link
                to={`/users/${profile.username}`}
                key={profile.id}
                className={styles.userCard}
              >
                {profile.profilePicture ? (
                  <img
                    src={profile.profilePicture}
                    alt={profile.username}
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarFallback}>{authorInitial}</div>
                )}

                <div className={styles.profileSummary}>
                  <span className={styles.username}>@{profile.username}</span>
                  <p className={styles.bio}>
                    {profile.bio ||
                      'This citizen has yet to write a biography...'}
                  </p>
                </div>

                <div className={styles.actionSlot}>
                  <span className={styles.viewProfileBtn}>
                    <span>View Profile</span>
                    <ArrowUpRight size={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div ref={sentinelRef} className={styles.infiniteTrigger}>
        {isFetchingMore && (
          <div className={styles.scrollLoader}>
            <Loader2 className={styles.spinner} size={24} />
            <span>Assembling more citizens...</span>
          </div>
        )}
      </div>
    </div>
  );
};
