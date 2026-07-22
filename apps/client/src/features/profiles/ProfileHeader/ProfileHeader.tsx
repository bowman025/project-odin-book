import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import type { FC } from 'react';
import styles from '../ProfilePage/ProfilePage.module.css';
import type { UserProfile } from '../ProfilePage/profileLoader.js';

type ProfileHeaderProps = {
  profile: UserProfile;
  isOwnProfile: boolean;
};

export const ProfileHeader: FC<ProfileHeaderProps> = ({
  profile,
  isOwnProfile,
}) => {
  const initialChar = profile.username.charAt(0);
  const joinDateLabel = format(new Date(profile.createdAt), 'MMMM yyyy');

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

        {isOwnProfile && (
          <span className={styles.ownProfileBadge}>Your Profile</span>
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
          <span className={styles.statCount}>{profile.stats.posts}</span>
          <span className={styles.statLabel}>Chronicles</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statCount}>{profile.stats.followers}</span>
          <span className={styles.statLabel}>Followers</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statCount}>{profile.stats.following}</span>
          <span className={styles.statLabel}>Following</span>
        </div>
      </div>
    </header>
  );
};
