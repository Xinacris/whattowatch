import React, { useState } from 'react';
import { useLocale } from '../context/LocaleContext';
import styles from './LocaleToggle.module.css';

const LocaleToggle = () => {
  const { locale, changeLocale, availableLocales } = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const localeNames = {
    en: 'English',
    tr: 'Türkçe',
  };

  const handleLocaleSelect = (newLocale) => {
    changeLocale(newLocale);
    setIsOpen(false);
  };

  return (
    <div className={styles.selector}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.button}
        aria-label="Change language"
        title="Change language"
      >
        <span className={styles.localeName}>{localeNames[locale] || locale}</span>
        <svg
          className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className={styles.overlay}
            onClick={() => setIsOpen(false)}
          />
          <div className={styles.dropdown}>
            {availableLocales.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => handleLocaleSelect(loc)}
                className={`${styles.localeItem} ${
                  locale === loc ? styles.localeItemSelected : ''
                }`}
              >
                <span className={styles.localeItemName}>{localeNames[loc] || loc}</span>
                {locale === loc && (
                  <svg
                    className={styles.checkIcon}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LocaleToggle;

