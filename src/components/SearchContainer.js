import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { searchTitles, searchCollections } from '../services/tmdbApi';
import styles from './SearchContainer.module.css';

const getTranslationOrFallback = (tFunc, key, fallback) => {
  const value = tFunc(key);
  return value === key ? fallback : value;
};

const SearchContainer = ({ onSearch, onCountryChange, selectedCountry }) => {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

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
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleCountrySelect = (countryCode) => {
    onCountryChange(countryCode);
    setIsCountryOpen(false);
  };

  const handleSuggestionClick = (item) => {
    if (item.type === 'collection') {
      navigate(`/collection/${item.id}`);
      setShowSuggestions(false);
      return;
    }

    const title = item.suggestionTitle || item.title || item.name || '';
    setSearchQuery(title);
    setShowSuggestions(false);
    if (title.trim()) {
      onSearch(title.trim());
    }
  };

  // Autocomplete suggestions (debounced)
  useEffect(() => {
    const query = searchQuery.trim();

    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsLoadingSuggestions(true);

        // Search for both collections and individual titles
        const [collectionResults, titleResult] = await Promise.all([
          searchCollections(query, 'en-US'), // Collections often work better with English queries or mixed
          searchTitles(query, selectedCountry)
        ]);

        const rawTitles = (titleResult?.title_results || []).slice(0, 30);

        // Filter titles if they likely belong to a found collection
        let filteredTitles = rawTitles;
        const collectionNames = collectionResults.map(c => c.name.toLowerCase().replace(' collection', '').replace(' serisi', '').trim());

        if (collectionNames.length > 0) {
          filteredTitles = rawTitles.filter(item => {
            const titleLower = (item.title || item.name || '').toLowerCase();
            // If the title contains a collection name (e.g. "Harry Potter"), and it's a movie, check if we should hide it
            // We only hide if we have a matching collection.
            const belongsToCollection = collectionNames.some(cName => titleLower.includes(cName));
            // Show if it does NOT belong to a collection, OR if it's not a movie/tv (unlikely), 
            // OR if the user query is very specific (e.g. full title), but here we are showing suggestions.
            // Let's go with the user's request: "Harry Potter" should showing the collection, not the movies.
            return !belongsToCollection;
          });
        }

        // Combine results: Collections first, then titles
        // Limit total to 8-10 items
        const combined = [
          ...collectionResults.slice(0, 2), // Top 2 collections
          ...filteredTitles
        ].slice(0, 10);

        setSuggestions(combined);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching autocomplete suggestions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCountry]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.content}>
          {/* Search Box with Language Selector */}
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <div className={styles.searchRow}>
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
                            className={`${styles.countryItem} ${selectedCountry === country.code ? styles.countryItemSelected : ''
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

              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleInputChange}
                  placeholder={t('common.searchPlaceholder')}
                  className={styles.input}
                  onFocus={() => {
                    if (suggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                />

                {showSuggestions && (
                  <div className={styles.suggestions}>
                    {isLoadingSuggestions && (
                      <div className={styles.suggestionsStatus}>
                        {t('common.loading') || 'Yükleniyor...'}
                      </div>
                    )}

                    {!isLoadingSuggestions && suggestions.length === 0 && searchQuery.trim().length >= 2 && (
                      <div className={styles.suggestionsStatus}>
                        {t('common.noResults') || 'Sonuç bulunamadı'}
                      </div>
                    )}

                    {!isLoadingSuggestions && suggestions.map((item) => {
                      let typeLabel;
                      if (item.type === 'collection') {
                        typeLabel = t('common.collection') || 'Series';
                      } else {
                        const isMovie = item.type === 'movie';
                        typeLabel = isMovie
                          ? getTranslationOrFallback(t, 'common.movie', 'Film')
                          : getTranslationOrFallback(t, 'common.tvSeries', 'Dizi');
                      }

                      const cleanTitle = (title) => {
                        return title.replace(/ Collection$/i, '').replace(/ Serisi$/i, '').replace(/ Koleksiyonu$/i, '');
                      };

                      const displayTitle = item.type === 'collection'
                        ? cleanTitle(item.suggestionTitle || item.title || item.name)
                        : (item.suggestionTitle || item.title || item.name);

                      return (
                        <button
                          key={`${item.type}-${item.id}`}
                          type="button"
                          className={styles.suggestionItem}
                          onClick={() => handleSuggestionClick(item)}
                        >
                          <span className={styles.suggestionTitle}>
                            {displayTitle}
                          </span>
                          {/* Only show meta if it's NOT a collection, or if collection has a year (unlikely) */}
                          {item.type !== 'collection' && (
                            <span className={styles.suggestionMeta}>
                              {item.year ? `${item.year} - ${typeLabel}` : typeLabel}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

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
