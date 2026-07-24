import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import type { FC } from 'react';
import { useUIStore } from '../../store/uiStore.js';
import styles from './ToastContainer.module.css';

export const ToastContainer: FC = () => {
  const toasts = useUIStore((state) => state.toasts);
  const removeToast = useUIStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((toast) => {
        let typeClassName = styles.typeInfo;
        let Icon = Info;

        if (toast.type === 'success') {
          typeClassName = styles.typeSuccess;
          Icon = CheckCircle;
        } else if (toast.type === 'error') {
          typeClassName = styles.typeError;
          Icon = AlertCircle;
        }

        const cardClassName = `${styles.toastCard} ${typeClassName}`;

        return (
          <div key={toast.id} className={cardClassName} role="alert">
            <div className={styles.toastContent}>
              <span className={styles.iconWrapper}>
                <Icon size={18} />
              </span>
              <span>{toast.message}</span>
            </div>

            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss alert notification"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
