import { format } from 'date-fns';
import {
  Calendar,
  Settings,
  UserCheck,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import { useInteractionStore } from '../../../store/interactionStore.js';
import { useUIStore } from '../../../store/uiStore.js';
import styles from '../ProfilePage/ProfilePage.module.css';
import type {
  FollowStatus,
  UserProfile,
} from '../ProfilePage/profileLoader.js';

type ProfileHeaderProps = {
  profile: UserProfile;
  isOwnProfile: boolean;
  onEditClick: () => void;
};

export const ProfileHeader: FC<ProfileHeaderProps> = ({
  profile,
  isOwnProfile,
  onEditClick,
}) => {
  const addToast = useUIStore((state) => state.addToast);
  const initialChar = profile.username.charAt(0);
  const joinDateLabel = format(new Date(profile.createdAt), 'MMMM yyyy');

  const [currentStatus, setCurrentStatus] = useState(profile.followStatus);
  const [followerCount, setFollowerCount] = useState(profile.stats.followers);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHoveringFollowing, setIsHoveringFollowing] = useState(false);

  const profileMeta = useInteractionStore(
    (state) => state.profileStatsRegistry[profile.username.toLowerCase()],
  );
  const postsCount = profileMeta ? profileMeta.postsCount : profile.stats.posts;

  useEffect(() => {
    setCurrentStatus(profile.followStatus);
    setFollowerCount(profile.stats.followers);
  }, [profile]);

  const handleFollowActionToggle = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const response = await apiFetch(`/follows/${profile.username}`, {
        method: 'POST',
      });
      const payload = await response.json();

      if (response.ok) {
        const nextStatus: FollowStatus = payload.data.status;
        setCurrentStatus(nextStatus);
        addToast(payload.message || 'Social connection updated.', 'info');

        if (nextStatus === 'ACCEPTED') {
          setFollowerCount((prev) => prev + 1);
        } else if (currentStatus === 'ACCEPTED' && nextStatus === 'NONE') {
          setFollowerCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        addToast(
          payload.message || 'Failed to submit follow status request.',
          'error',
        );
      }
    } catch {
      addToast('Network transmission graph connection failure.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderFollowButtonState = () => {
    if (currentStatus === 'NONE' || currentStatus === 'REJECTED') {
      return (
        <button
          type="button"
          className={styles.followBtn}
          disabled={isProcessing}
          onClick={handleFollowActionToggle}
        >
          <UserPlus size={14} />
          <span>Follow</span>
        </button>
      );
    }

    if (currentStatus === 'PENDING') {
      return (
        <button
          type="button"
          className={`${styles.followBtn} ${styles.followBtnPending}`}
          disabled={isProcessing}
          onClick={handleFollowActionToggle}
        >
          <UserCheck size={14} />
          <span>Requested</span>
        </button>
      );
    }

    if (currentStatus === 'ACCEPTED') {
      return (
        <button
          type="button"
          className={`${styles.followBtn} ${styles.followBtnActive}`}
          disabled={isProcessing}
          onClick={handleFollowActionToggle}
          onMouseEnter={() => setIsHoveringFollowing(true)}
          onMouseLeave={() => setIsHoveringFollowing(false)}
        >
          {isHoveringFollowing ? (
            <>
              <UserMinus size={14} />
              <span>Unfollow</span>
            </>
          ) : (
            <>
              <UserCheck size={14} />
              <span>Following</span>
            </>
          )}
        </button>
      );
    }

    return null;
  };

  return (
    <header className={styles.profileHeaderCard}>
      <div className={styles.headerTopRow}>
        {profile.profilePicture ? (
          <img
            src={profile.profilePicture}
            alt={profile.username}
            className={styles.largeAvatar}
          />
        ) : (
          <div className={styles.largeAvatarFallback}>{initialChar}</div>
        )}

        {isOwnProfile ? (
          <button
            type="button"
            className={styles.editProfileTriggerCta}
            onClick={onEditClick}
          >
            <Settings size={14} />
            <span>Edit Profile</span>
          </button>
        ) : (
          renderFollowButtonState()
        )}
      </div>

      <h2 className={styles.usernameTitle}>@{profile.username}</h2>
      <div className={styles.joinDateContainer}>
        <Calendar size={14} />
        <span>Joined {joinDateLabel}</span>
      </div>
      <p className={styles.bioText}>
        {profile.bio ||
          'This citizen has yet to script a chronicle biography...'}
      </p>

      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <span className={styles.statCount}>{postsCount}</span>
          <span className={styles.statLabel}>Chronicles</span>
        </div>
        <Link to={`/users/${profile.username}/followers`}>
          <div className={styles.statBox}>
            <span className={styles.statCount}>{followerCount}</span>
            <span className={styles.statLabel}>Followers</span>
          </div>
        </Link>
        <Link to={`/users/${profile.username}/following`}>
          <div className={styles.statBox}>
            <span className={styles.statCount}>{profile.stats.following}</span>
            <span className={styles.statLabel}>Following</span>
          </div>
        </Link>
      </div>
    </header>
  );
};
