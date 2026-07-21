import type { FC } from 'react';
import styles from './LoadingScreen.module.css';

export const LoadingScreen: FC = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>odinum</h1>
    </div>
  );
};
