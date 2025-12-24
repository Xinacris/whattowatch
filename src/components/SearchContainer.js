import React, { useState } from 'react';
import { useLocale } from '../context/LocaleContext';
import styles from './SearchContainer.module.css';

const SearchContainer = ({ onSearch, onCountryChange, selectedCountry }) => {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCountryOpen, setIsCountryOpen] = useState(false);

  // Popüler ülkeler listesi
  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'TR', name: 'Turkey' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'IT', name: 'Italy' },
    { code: 'ES', name: 'Spain' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' },
    { code: 'BR', name: 'Brazil' },
    { code: 'MX', name: 'Mexico' },
    { code: 'IN', name: 'India' },
    { code: 'CN', name: 'China' },
  ];

  const selectedCountryData = countries.find(c => c.code === selectedCountry) || countries[0];
  const selectedCountryName = t(`countries.${selectedCountryData.code}`) || selectedCountryData.name;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleCountrySelect = (countryCode) => {
    onCountryChange(countryCode);
    setIsCountryOpen(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.content}>
          {/* Country Selector */}
          <div className={styles.selector}>
            <button
              type="button"
              onClick={() => setIsCountryOpen(!isCountryOpen)}
              className={styles.countryButton}
            >
              <span className={styles.countryName}>{selectedCountryName}</span>
              <span className={styles.countryCode}>{selectedCountryData.code}</span>
              <svg
                className={`${styles.arrow} ${isCountryOpen ? styles.arrowOpen : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isCountryOpen && (
              <>
                <div
                  className={styles.overlay}
                  onClick={() => setIsCountryOpen(false)}
                />
                <div className={styles.dropdown}>
                  {countries.map((country) => {
                    const countryName = t(`countries.${country.code}`) || country.name;
                    return (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => handleCountrySelect(country.code)}
                        className={`${styles.countryItem} ${
                          selectedCountry === country.code ? styles.countryItemSelected : ''
                        }`}
                      >
                        <span className={styles.countryItemName}>{countryName}</span>
                        {selectedCountry === country.code && (
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
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <input
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              placeholder={t('common.searchPlaceholder')}
              className={styles.input}
            />
            <button
              type="submit"
              className={styles.searchButton}
            >
              {t('common.search')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SearchContainer;
