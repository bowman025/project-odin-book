import { LogOut, Moon, Sun } from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { apiFetch } from '../../lib/api.js';
import { useAuthStore } from '../../store/authStore.js';
import { useThemeStore } from '../../store/themeStore.js';
import styles from './Header.module.css';

export const Header: FC = () => {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const navigate = useNavigate();

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (!user) return;

    const handleScrollTracking = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setIsVisible(true);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      if (currentScrollY > lastScrollYRef.current) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScrollTracking, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollTracking);
  }, [user]);

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  if (!user) return null;

  const headerClassName = `${styles.mobileHeader} ${!isVisible ? styles.headerHidden : ''}`;

  return (
    <header className={headerClassName}>
      <Link to="/" className={styles.brandLink} title="Return to home timeline">
        <div className={styles.brand}>Odinum</div>
      </Link>

      <div className={styles.utilityControls}>
        <button
          type="button"
          className={styles.headerControlBtn}
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button
          type="button"
          className={styles.headerControlBtn}
          onClick={handleLogout}
          title="Log Out"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};
