import React from 'react';
import styles from './SkeletonCard.module.css';

const SkeletonCard = () => (
  <div className={styles.card}>
    <div className={styles.imagePlaceholder} />
    <div className={styles.content}>
      <div className={`${styles.line} ${styles.lineLong}`} />
      <div className={`${styles.line} ${styles.lineShort}`} />
      <div className={`${styles.line} ${styles.lineMid}`} />
    </div>
  </div>
);

export default SkeletonCard;
