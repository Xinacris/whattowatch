import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import SearchContainer from '../components/SearchContainer';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import { detectUserCountry, detectUserCountrySync } from '../utils/countryDetection';
import { searchTitles } from '../services/tmdbApi';
import '../styles/SearchResults.scss';

const SKELETON_COUNT = 8;
const skeletons = Array.from({ length: SKELETON_COUNT });

const SearchResults = () => {
  const { t, locale } = useLocale();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState(
    searchParams.get('country') || detectUserCountrySync()
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [peopleResults, setPeopleResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      document.title = `${query} · Xinny's WhereToWatch`;
    } else {
      document.title = "Xinny's WhereToWatch";
    }
    return () => { document.title = "Xinny's WhereToWatch"; };
  }, [searchParams]);

  useEffect(() => {
    const query = searchParams.get('q');
    const urlCountry = searchParams.get('country');

    if (query) {
      setSearchQuery(query);

      if (urlCountry && urlCountry !== selectedCountry) {
        setSelectedCountry(urlCountry);
      }

      const fetchResults = async () => {
        setLoading(true);
        setError(null);
        try {
          const countryToUse = urlCountry || selectedCountry;
          const localeToLanguage = { en: 'en-US', tr: 'tr-TR' };
          const language = localeToLanguage[locale] || 'en-US';
          const data = await searchTitles(query, countryToUse, language);

          let processedResults = [];
          if (data && data.title_results && Array.isArray(data.title_results)) {
            processedResults = data.title_results;
          } else if (data && Array.isArray(data)) {
            processedResults = data;
          } else if (data && data.results) {
            processedResults = data.results;
          }

          setResults(processedResults);
          setPeopleResults(data?.people_results || []);
        } catch (err) {
          setError(err.response?.data?.error || err.message || 'Failed to search. Please try again.');
          setResults([]);
        } finally {
          setLoading(false);
        }
      };

      fetchResults();
    } else {
      if (!urlCountry) {
        const detectCountry = async () => {
          const detectedCountry = await detectUserCountry();
          setSelectedCountry(detectedCountry);
        };
        detectCountry();
      }
    }
  }, [searchParams, selectedCountry, locale]);

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

  const filteredResults = results.filter(item => {
    if (activeFilter === 'movie') return item.tmdb_type === 'movie';
    if (activeFilter === 'tv') return item.tmdb_type === 'tv';
    return true;
  });

  const filterBtnClass = (filter) =>
    `px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 cursor-pointer ${
      activeFilter === filter
        ? 'bg-[var(--accent-color)] text-white border-[var(--accent-color)]'
        : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--accent-color)] hover:text-[var(--accent-color)]'
    }`;

  return (
    <div className="py-8">
      <div className="mb-8">
        <SearchContainer
          onSearch={handleSearch}
          onCountryChange={handleCountryChange}
          selectedCountry={selectedCountry}
        />
      </div>

      <div className="mt-8">
        {error && (
          <div className="errorContainer bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] px-4 py-3 rounded-lg mb-6">
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div>
            <div className="h-8 w-48 rounded mb-6 skeleton-line" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {skeletons.map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        )}

        {!loading && !error && searchQuery && (
          <div>
            {/* People results */}
            {peopleResults.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
                  {t('person.people')}
                </h2>
                <div className="flex gap-3 flex-wrap">
                  {peopleResults.map(person => (
                    <button
                      key={person.id}
                      className="personResultCard"
                      onClick={() => navigate(`/person/${person.id}`)}
                    >
                      <div className="personResultPhoto">
                        {person.profile_path ? (
                          <img src={person.profile_path} alt={person.name} />
                        ) : (
                          <span>👤</span>
                        )}
                      </div>
                      <div className="personResultInfo">
                        <p className="personResultName">{person.name}</p>
                        {person.known_for_department && (
                          <p className="personResultDept">{person.known_for_department}</p>
                        )}
                        {person.known_for && (
                          <p className="personResultKnownFor">{person.known_for}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Title results */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                {t('common.searchResultsFor')} &ldquo;{searchQuery}&rdquo;
              </h2>
              <div className="flex gap-2 flex-wrap">
                <button className={filterBtnClass('all')} onClick={() => setActiveFilter('all')}>
                  {t('common.filterAll')}
                  {activeFilter === 'all' && results.length > 0 && (
                    <span className="ml-1.5 opacity-80">({results.length})</span>
                  )}
                </button>
                <button className={filterBtnClass('movie')} onClick={() => setActiveFilter('movie')}>
                  {t('common.filterMovies')}
                </button>
                <button className={filterBtnClass('tv')} onClick={() => setActiveFilter('tv')}>
                  {t('common.filterTV')}
                </button>
              </div>
            </div>

            {filteredResults.length === 0 ? (
              <div className="text-center py-12 bg-[var(--bg-primary)] rounded-lg shadow-[var(--shadow)] border border-[var(--border-color)]">
                <p className="text-[var(--text-secondary)]">{t('common.noResults')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredResults.map((title) => (
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

        {!loading && !searchQuery && (
          <div className="text-center py-12 bg-[var(--bg-primary)] rounded-lg shadow-[var(--shadow)] border border-[var(--border-color)]">
            <p className="text-[var(--text-secondary)]">{t('common.enterSearchTerm')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
