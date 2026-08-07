import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Hash,
  Home,
  LogOut,
  MessageSquare,
  Moon,
  Settings,
  Sun,
  User as UserIcon,
} from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { apiFetch } from '../../lib/api.js';
import { useAuthStore } from '../../store/authStore.js';
import { useChatStore } from '../../store/chatStore.js';
import { useThemeStore } from '../../store/themeStore.js';
import { useUIStore } from '../../store/uiStore.js';

import styles from './Sidebar.module.css';

const SIDEBAR_COLLAPSED_KEY = 'odinum_sidebar_collapsed';

export const Sidebar: FC = () => {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const isNavVisible = useUIStore((state) => state.isScrollingUp);

  const disconnectSocket = useChatStore((state) => state.disconnectSocket);

  const location = useLocation();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  });

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const nextState = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(nextState));
      return nextState;
    });
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      clearAuth();
      disconnectSocket();
      navigate('/login', { replace: true });
    }
  };

  if (!user) return null;

  const getLinkClass = (path: string) => {
    const isCurrent = location.pathname === path;
    return `${styles.navLink} ${isCurrent ? styles.navLinkActive : ''}`;
  };

  const avatarFallbackChar = user.username.charAt(0);
  const sidebarClassName = `
  ${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''} 
  ${!isNavVisible ? styles.sidebarHidden : ''}`;

  return (
    <aside className={sidebarClassName}>
      <div className={styles.headerContainer}>
        <div className={styles.brand}>Odinum</div>
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={handleToggleCollapse}
          title={isCollapsed ? 'Expand layout panel' : 'Collapse layout panel'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className={styles.navigation}>
        <Link to="/" className={getLinkClass('/')} title="Timeline">
          <Home size={20} />
          <span className={styles.linkLabel}>Timeline</span>
        </Link>
        <Link to="/tags" className={getLinkClass('/tags')} title="Hashtags">
          <Hash size={20} />
          <span className={styles.linkLabel}>Hashtags</span>
        </Link>
        <Link
          to="/conversations"
          className={getLinkClass('/conversations')}
          title="Messages"
        >
          <MessageSquare size={20} />
          <span className={styles.linkLabel}>Messages</span>
        </Link>
        <Link to="/users" className={getLinkClass('/users')} title="Directory">
          <Compass size={20} />
          <span className={styles.linkLabel}>Directory</span>
        </Link>
        <Link
          to="/settings"
          className={getLinkClass('/settings')}
          title="Settings"
        >
          <Settings size={20} />
          <span className={styles.linkLabel}>Settings</span>
        </Link>
        <Link
          to={`/users/${user.username}`}
          className={`${getLinkClass(`/users/${user.username}`)} ${styles.mobileOnlyLink}`}
          title="My Profile"
        >
          <UserIcon size={20} />
          <span className={styles.linkLabel}>Profile</span>
        </Link>
      </nav>

      <div className={styles.controlPanel}>
        <button
          type="button"
          className={styles.controlButton}
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span className={styles.controlLabel}>
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>

        <button
          type="button"
          className={styles.controlButton}
          onClick={handleLogout}
          title="Log Out"
        >
          <LogOut size={18} />
          <span className={styles.controlLabel}>Log Out</span>
        </button>
      </div>

      <Link
        to={`/users/${user.username}`}
        className={styles.profileFooter}
        title="View your profile page"
      >
        {user.profilePicture ? (
          <img
            src={user.profilePicture}
            alt={user.username}
            className={styles.avatar}
          />
        ) : (
          <div className={styles.fallbackAvatar}>{avatarFallbackChar}</div>
        )}
        <div className={styles.profileDetails}>
          <span className={styles.username}>{user.username}</span>
        </div>
      </Link>
    </aside>
  );
};
