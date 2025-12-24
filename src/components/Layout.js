import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import LocaleToggle from './LocaleToggle';
import { useLocale } from '../context/LocaleContext';
import styles from './Layout.module.css';

const Layout = ({ children }) => {
  const { t } = useLocale();

  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div></div>
            <div className={styles.headerControls}>
              <LocaleToggle />
              <ThemeToggle />
            </div>
          </div>
          <Link to="/" className={styles.logoLink}>
            <h1 className={styles.title}>
              🎬 {t('layout.title')}
            </h1>
          </Link>
          <p className={styles.subtitle}>
            {t('layout.subtitle')}
          </p>
        </header>

        {/* Main Content */}
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
