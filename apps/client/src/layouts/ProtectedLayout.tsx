import { Compass, Home, LogOut, MessageSquare, Moon, Sun } from 'lucide-react';
import type { FC } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { apiFetch } from '../lib/api.js';
import { useAuthStore, useIsAuthenticated } from '../store/authStore.js';
import { useThemeStore } from '../store/themeStore.js';
import styles from './ProtectedLayout.module.css';

export const ProtectedLayout: FC = () => {
  const isAuthenticated = useIsAuthenticated();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const getLinkClass = (path: string) => {
    const isCurrent = location.pathname === path;
    return `${styles.navLink} ${isCurrent ? styles.navLinkActive : ''}`;
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  const avatarFallbackChar = user.username.charAt(0);

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>odinum</div>

        <nav className={styles.navigation}>
          <Link to="/" className={getLinkClass('/')}>
            <Home size={20} />
            <span>Timeline</span>
          </Link>
          <Link to="/conversations" className={getLinkClass('/conversations')}>
            <MessageSquare size={20} />
            <span>Messages</span>
          </Link>
          <Link to="/users" className={getLinkClass('/users')}>
            <Compass size={20} />
            <span>Explore</span>
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
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            type="button"
            className={styles.controlButton}
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </div>

        <footer className={styles.profileFooter}>
          {user.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={`${user.username}'s profile avatar`}
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

      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
};
