import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import SearchContainer from '../components/SearchContainer';
import MovieCard from '../components/MovieCard';
import { detectUserCountry, detectUserCountrySync } from '../utils/countryDetection';
import { searchTitles } from '../services/tmdbApi';
import '../styles/SearchResults.scss';

const SearchResults = () => {
  const { t, locale } = useLocale();
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
      
      // Update selectedCountry from URL if present (only if different to avoid infinite loop)
      if (urlCountry && urlCountry !== selectedCountry) {
        setSelectedCountry(urlCountry);
      }
      
      // Fetch search results
      const fetchResults = async () => {
        setLoading(true);
        setError(null);
        try {
          const countryToUse = urlCountry || selectedCountry;
          
          // Map locale to TMDB language code
          const localeToLanguage = {
            'en': 'en-US',
            'tr': 'tr-TR',
          };
          const language = localeToLanguage[locale] || 'en-US';
          
          const data = await searchTitles(query, countryToUse, language);
          
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
          
          setResults(processedResults);
        } catch (err) {
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
  }, [searchParams, selectedCountry, locale]); // Include locale to reload when language changes

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
    <div className="py-8">
      {/* Search Container */}
      <div className="mb-8">
        <SearchContainer
          onSearch={handleSearch}
          onCountryChange={handleCountryChange}
          selectedCountry={selectedCountry}
        />
      </div>

      {/* Search Results */}
      <div className="mt-8">
        {loading && (
          <div className="text-center py-12">
            <div className="spinner"></div>
            <p className="mt-4 text-[var(--text-secondary)]">{t('common.searching')}</p>
          </div>
        )}

        {error && (
          <div className="errorContainer bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] px-4 py-3 rounded-lg">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && searchQuery && (
          <div>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">
              {t('common.searchResultsFor')} "{searchQuery}"
            </h2>
            {results.length === 0 ? (
              <div className="text-center py-12 bg-[var(--bg-primary)] rounded-lg shadow-[var(--shadow)] border border-[var(--border-color)]">
                <p className="text-[var(--text-secondary)]">
                  {t('common.noResults')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
          <div className="text-center py-12 bg-[var(--bg-primary)] rounded-lg shadow-[var(--shadow)] border border-[var(--border-color)]">
            <p className="text-[var(--text-secondary)]">
              {t('common.enterSearchTerm')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
