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
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerControls}>
              <LocaleToggle />
              <ThemeToggle />
            </div>
          </div>
          <Link to="/" className={styles.logoLink}>
            <h1 className={styles.title}>
              🎬 <span className={styles.titleText}>{t('layout.title')}</span>
            </h1>
          </Link>
          <p className={styles.subtitle}>{t('layout.subtitle')}</p>
        </header>

        <main className={styles.main}>
          {children}
        </main>
      </div>

      <footer className={styles.footer}>
        Data provided by{' '}
        <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.footerLink}
        >
          TMDB
        </a>
        {' '}· Xinny&apos;s WhereToWatch
      </footer>
    </div>
  );
};

export default Layout;
