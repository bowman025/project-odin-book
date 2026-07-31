import { ArrowUpRight, Loader2 } from 'lucide-react';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLoaderData } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import styles from './DirectoryPage.module.css';
import type {
  DirectoryLoaderResult,
  DirectoryUser,
} from './directoryLoader.js';

export const DirectoryPage: FC = () => {
  const initialData = useLoaderData() as DirectoryLoaderResult;

  const [users, setUsers] = useState<DirectoryUser[]>(initialData.items);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const nextPageRef = useRef(initialData.pagination.page + 1);
  const hasMoreRef = useRef(initialData.pagination.hasMore);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    nextPageRef.current = pagination.page + 1;
    hasMoreRef.current = pagination.hasMore;
  }, [pagination]);

  const loadMoreUsers = useCallback(async () => {
    if (isFetchingMore || !hasMoreRef.current) return;

    setIsFetchingMore(true);
    try {
      const response = await apiFetch(
        `/users?page=${nextPageRef.current}&limit=12`,
      );
      if (response.ok) {
        const payload = await response.json();
        const data: DirectoryLoaderResult = payload.data;

        setUsers((prev) => [...prev, ...data.items]);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to load user directory batch:', error);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore]);

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

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h2 className={styles.title}>User Realm</h2>
        <p className={styles.subtitle}>
          Discover and view profiles across Odinum
        </p>
      </header>

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
                  {profile.bio || 'Exploring the boundaries of Odinum...'}
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
