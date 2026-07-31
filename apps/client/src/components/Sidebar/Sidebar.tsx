import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Home,
  LogOut,
  MessageSquare,
  Moon,
  Sun,
} from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { apiFetch } from '../../lib/api.js';
import { useAuthStore } from '../../store/authStore.js';
import { useThemeStore } from '../../store/themeStore.js';
import styles from './Sidebar.module.css';

const SIDEBAR_COLLAPSED_KEY = 'odinum_sidebar_collapsed';

export const Sidebar: FC = () => {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

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
      navigate('/login', { replace: true });
    }
  };

  if (!user) return null;

  const getLinkClass = (path: string) => {
    const isCurrent = location.pathname === path;
    return `${styles.navLink} ${isCurrent ? styles.navLinkActive : ''}`;
  };

  const avatarFallbackChar = user.username.charAt(0);
  const sidebarClassName = `${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''}`;

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

      <footer className={styles.profileFooter}>
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
      </footer>
    </aside>
  );
};
