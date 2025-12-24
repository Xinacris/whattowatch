import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import SearchContainer from '../components/SearchContainer';
import MovieCard from '../components/MovieCard';
import { detectUserCountry, detectUserCountrySync } from '../utils/countryDetection';
import { searchTitles } from '../services/tmdbApi';
import styles from './SearchResults.module.css';

const SearchResults = () => {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState(
    searchParams.get('country') || detectUserCountrySync()
  );
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('q') || ''
  );
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const query = searchParams.get('q');
    const urlCountry = searchParams.get('country');
    
    if (query) {
      setSearchQuery(query);
      
      // Update selectedCountry from URL if present
      if (urlCountry) {
        setSelectedCountry(urlCountry);
      }
      
      // Fetch search results
      const fetchResults = async () => {
        setLoading(true);
        setError(null);
        try {
          const countryToUse = urlCountry || selectedCountry;
          const data = await searchTitles(query, countryToUse);
          
          // Console log raw API response
          console.log('=== TMDB API RAW RESPONSE ===');
          console.log('Query:', query);
          console.log('Country:', countryToUse);
          console.log('Full Response:', data);
          console.log('===================================');
          
          // TMDB API returns: { title_results: [...], people_results: [...] }
          let processedResults = [];
          
          if (data && data.title_results && Array.isArray(data.title_results)) {
            processedResults = data.title_results;
          } else if (data && Array.isArray(data)) {
            processedResults = data;
          } else if (data && data.results) {
            processedResults = data.results;
          } else {
            processedResults = [];
          }
          
          console.log('=== PROCESSED RESULTS ===');
          console.log('Results Count:', processedResults.length);
          console.log('Results:', processedResults);
          console.log('=========================');
          
          setResults(processedResults);
        } catch (err) {
          console.error('=== SEARCH ERROR ===');
          console.error('Error:', err);
          console.error('Error Message:', err.message);
          console.error('Error Stack:', err.stack);
          console.error('====================');
          setError(err.response?.data?.error || err.message || 'Failed to search. Please try again.');
          setResults([]);
        } finally {
          setLoading(false);
        }
      };

      fetchResults();
    } else {
      // If no query, try to detect country if not in URL
      if (!urlCountry) {
        const detectCountry = async () => {
          const detectedCountry = await detectUserCountry();
          setSelectedCountry(detectedCountry);
        };
        detectCountry();
      }
    }
  }, [searchParams]); // Only depend on searchParams to avoid infinite loops

  const handleSearch = (query) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}&country=${selectedCountry}`);
    }
  };

  const handleCountryChange = (countryCode) => {
    setSelectedCountry(countryCode);
    if (searchQuery) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&country=${countryCode}`);
    }
  };

  return (
    <div className={styles.page}>
      {/* Search Container */}
      <div className={styles.searchContainerWrapper}>
        <SearchContainer
          onSearch={handleSearch}
          onCountryChange={handleCountryChange}
          selectedCountry={selectedCountry}
        />
      </div>

      {/* Search Results */}
      <div className={styles.resultsSection}>
        {loading && (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>{t('common.searching')}</p>
          </div>
        )}

        {error && (
          <div className={styles.errorContainer}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && searchQuery && (
          <div>
            <h2 className={styles.resultsHeader}>
              {t('common.searchResultsFor')} "{searchQuery}"
            </h2>
            {results.length === 0 ? (
              <div className={styles.noResultsContainer}>
                <p className={styles.noResultsText}>
                  {t('common.noResults')}
                </p>
              </div>
            ) : (
              <div className={styles.resultsGrid}>
                {results.map((title) => (
                  <MovieCard 
                    key={title.id || title.tmdb_id} 
                    title={title} 
                    selectedCountry={selectedCountry}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!searchQuery && (
          <div className={styles.emptyStateContainer}>
            <p className={styles.emptyStateText}>
              {t('common.enterSearchTerm')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
