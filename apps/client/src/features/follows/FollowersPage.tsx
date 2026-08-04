import { ArrowLeft, Loader2, User } from 'lucide-react';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLoaderData, useNavigate } from 'react-router';
import { apiFetch } from '../../lib/api.js';
import styles from '../follows/DirectoryPage/DirectoryPage.module.css';
import type {
  ConnectionsLoaderResult,
  ConnectionUserRow,
} from './connectionsLoader.js';

export const FollowersPage: FC = () => {
  const initialData = useLoaderData() as ConnectionsLoaderResult;
  const navigate = useNavigate();

  const [users, setUsers] = useState<ConnectionUserRow[]>(initialData.items);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const nextPageRef = useRef(initialData.pagination.page + 1);
  const hasMoreRef = useRef(initialData.pagination.hasMore);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    setUsers(initialData.items);
    setPagination(initialData.pagination);
    nextPageRef.current = initialData.pagination.page + 1;
    hasMoreRef.current = initialData.pagination.hasMore;
  }, [initialData]);

  useEffect(() => {
    nextPageRef.current = pagination.page + 1;
    hasMoreRef.current = pagination.hasMore;
  }, [pagination]);

  const loadMoreFollowers = useCallback(async () => {
    if (isFetchingMore || !hasMoreRef.current) return;

    setIsFetchingMore(true);
    try {
      const response = await apiFetch(
        `/follows/${initialData.targetUsername}/followers?page=${nextPageRef.current}&limit=12`,
      );
      if (response.ok) {
        const payload = await response.json();
        setUsers((prev) => [...prev, ...payload.data.items]);
        setPagination(payload.data.pagination);
      }
    } catch (error) {
      console.error('Failed to stream subsequent followers block:', error);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, initialData.targetUsername]);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (isFetchingMore) return;

      const observer = new IntersectionObserver((entries) => {
        if (entries?.at(0)?.isIntersecting && hasMoreRef.current) {
          loadMoreFollowers();
        }
      });
      if (node) observer.observe(node);
      observerRef.current = observer;
    },
    [isFetchingMore, loadMoreFollowers],
  );

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <button
          type="button"
          className={styles.backToProfileBtn}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={14} />
          <span>Back to Profile</span>
        </button>
        <h2 className={styles.title}>
          @{initialData.targetUsername}'s Followers
        </h2>
        <p className={styles.subtitle}>
          Citizens who subscribe to this timeline chronicle
        </p>
      </header>

      {users.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No citizens have connected to this network node chronicle yet.</p>
        </div>
      ) : (
        <div className={styles.gridViewport}>
          {users.map((profile) => {
            const initial = profile.username.charAt(0);
            return (
              <Link
                to={`/users/${profile.username}`}
                key={`follower-row-${profile.id}`}
                className={styles.userCard}
              >
                {profile.profilePicture ? (
                  <img
                    src={profile.profilePicture}
                    alt={profile.username}
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarFallback}>{initial}</div>
                )}
                <div className={styles.profileSummary}>
                  <span className={styles.username}>@{profile.username}</span>
                  <p className={styles.bio}>
                    {profile.bio || 'Exploring the boundaries of Odinum...'}
                  </p>
                </div>
                <div className={styles.actionSlot}>
                  <span className={styles.viewProfileBtn}>
                    <User size={12} />
                    <span>View Profile</span>
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
            <span>Retrieving following citizens...</span>
          </div>
        )}
      </div>
    </div>
  );
};
