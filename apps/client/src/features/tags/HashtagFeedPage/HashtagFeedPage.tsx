import { Hash, Loader2, Search, X } from 'lucide-react';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLoaderData, useSearchParams } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import { handleLikeToggleNetwork } from '../../../lib/interactions.js';
import { useUIStore } from '../../../store/uiStore.js';
import { Post } from '../../posts/Post/Post';
import type { TimelinePost } from '../../posts/TimelinePage/timelineLoader.js';
import styles from './HashtagFeedPage.module.css';
import type { HashtagFeedLoaderResult } from './hashtagFeedLoader.js';

export const HashtagFeedPage: FC = () => {
  const initialData = useLoaderData() as HashtagFeedLoaderResult;
  const [searchParams, setSearchParams] = useSearchParams();
  const openCommentModal = useUIStore((state) => state.openCommentModal);

  const [inputBuffer, setInputBuffer] = useState(
    initialData.currentQuery || '',
  );
  const [activeSearchTerm, setActiveSearchTerm] = useState(
    initialData.currentQuery || '',
  );

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [posts, setPosts] = useState<TimelinePost[]>(initialData.items);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [isFetchingPosts, setIsFetchingPosts] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const nextPageRef = useRef(initialData.pagination.page + 1);
  const hasMoreRef = useRef(initialData.pagination.hasMore);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const linkQueryParam = searchParams.get('search') || '';
    setInputBuffer(linkQueryParam);
    setActiveSearchTerm(linkQueryParam);
    setPosts(initialData.items);
    setPagination(initialData.pagination);
    setSuggestions([]);
    setShowDropdown(false);
  }, [initialData, searchParams]);

  useEffect(() => {
    const cleanInput = inputBuffer.trim().replace(/#/g, '');

    if (!cleanInput) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (cleanInput === activeSearchTerm.toLowerCase()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const fetchDropdownSuggestions = async () => {
      setIsFetchingSuggestions(true);
      try {
        const response = await apiFetch(
          `/tags/suggestions?q=${encodeURIComponent(cleanInput)}`,
        );
        if (response.ok) {
          const payload = await response.json();
          setSuggestions(payload.data);
          setShowDropdown(payload.data.length > 0);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setIsFetchingSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(fetchDropdownSuggestions, 250);
    return () => clearTimeout(debounceTimer);
  }, [inputBuffer, activeSearchTerm]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const executeHashtagSearch = async (targetTagName: string) => {
    const cleanTag = targetTagName.trim().replace(/#/g, '').toLowerCase();
    if (!cleanTag) return;

    setIsFetchingPosts(true);
    setShowDropdown(false);
    setActiveSearchTerm(cleanTag);
    setInputBuffer(cleanTag);
    setSearchParams({ search: cleanTag }, { replace: true });

    try {
      const response = await apiFetch(
        `/posts?search=${encodeURIComponent(cleanTag)}&page=1&limit=10`,
      );
      if (response.ok) {
        const payload = await response.json();
        setPosts(payload.data.items);
        setPagination(payload.data.pagination);
      }
    } catch (err) {
      console.error('Failed to retrieve post feed results:', err);
    } finally {
      setIsFetchingPosts(false);
    }
  };

  useEffect(() => {
    nextPageRef.current = pagination.page + 1;
    hasMoreRef.current = pagination.hasMore;
  }, [pagination]);

  const loadMorePosts = useCallback(async () => {
    if (isFetchingMore || !hasMoreRef.current || !activeSearchTerm) return;

    setIsFetchingMore(true);
    try {
      const response = await apiFetch(
        `/posts?search=${encodeURIComponent(activeSearchTerm)}&page=${nextPageRef.current}&limit=10`,
      );
      if (response.ok) {
        const payload = await response.json();
        setPosts((prev) => [...prev, ...payload.data.items]);
        setPagination(payload.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load more posts for hashtag filter:', error);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, activeSearchTerm]);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (isFetchingMore || isFetchingPosts) return;

      const observer = new IntersectionObserver((entries) => {
        if (entries?.at(0)?.isIntersecting && hasMoreRef.current) {
          loadMorePosts();
        }
      });
      if (node) {
        observer.observe(node);
        observerRef.current = observer;
      }
    },
    [isFetchingMore, isFetchingPosts, loadMorePosts],
  );

  const handleClearInputText = () => {
    setInputBuffer('');
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleLikeToggle = (postId: string) => {
    handleLikeToggleNetwork(postId, setPosts);
  };

  const handlePostUpdated = (updatedPost: TimelinePost) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)),
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h2 className={styles.title}>Explore Hashtags</h2>

        <div className={styles.searchBarContainer} ref={dropdownContainerRef}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search realm hashtags... (e.g. tech, music)"
            value={inputBuffer}
            onChange={(e) => setInputBuffer(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
          />
          {isFetchingSuggestions && (
            <Loader2
              className={`${styles.spinner} ${styles.inputLoader}`}
              size={16}
            />
          )}
          {inputBuffer && !isFetchingSuggestions && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClearInputText}
              title="Clear text input"
            >
              <X size={16} />
            </button>
          )}

          {showDropdown && (
            <ul className={styles.suggestionsDropdown}>
              {(() => {
                let dropdownItemCounter = 0;
                return suggestions.map((tagName) => {
                  dropdownItemCounter += 1;
                  return (
                    <li
                      key={`sug-item-${tagName}-${dropdownItemCounter}`}
                      className={styles.suggestionItem}
                    >
                      <button
                        type="button"
                        className={styles.suggestionBtn}
                        onClick={() => executeHashtagSearch(tagName)}
                      >
                        <Hash size={14} className={styles.itemHashIcon} />
                        <span>{tagName}</span>
                      </button>
                    </li>
                  );
                });
              })()}
            </ul>
          )}
        </div>
      </header>

      {isFetchingPosts ? (
        <div className={styles.centerLoader}>
          <Loader2
            className={`${styles.spinner} ${styles.accentSpinner}`}
            size={32}
          />
          <span>Searching the archives...</span>
        </div>
      ) : (
        <div className={styles.postsFeed}>
          {!activeSearchTerm.trim() ? (
            <div className={styles.emptyState}>
              <p>Type a hashtag keyword above to query Odinum archives.</p>
            </div>
          ) : posts.length === 0 ? (
            <div className={styles.emptyState}>
              <p>
                No chronicles found matching the hashtag "#
                {activeSearchTerm.replace(/#/g, '')}".
              </p>
            </div>
          ) : (
            <>
              <div className={styles.resultsHeading}>
                <Hash size={16} />
                <span>
                  Showing results for{' '}
                  <strong>{activeSearchTerm.replace(/#/g, '')}</strong>
                </span>
              </div>
              {posts.map((post) => (
                <Post
                  key={post.id}
                  post={post}
                  onLikeToggle={handleLikeToggle}
                  onCommentClick={(id) => openCommentModal(id)}
                  onPostUpdated={handlePostUpdated}
                  onPostDeleted={(id) =>
                    setPosts((prev) => prev.filter((p) => p.id !== id))
                  }
                />
              ))}
            </>
          )}
        </div>
      )}

      <div ref={sentinelRef} className={styles.infiniteTrigger}>
        {isFetchingMore && (
          <div className={styles.scrollLoader}>
            <Loader2 className={styles.spinner} size={24} />
            <span>Summoning matching chronicles...</span>
          </div>
        )}
      </div>
    </div>
  );
};
