import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { detectUserCountrySync } from '../utils/countryDetection';
import { getTitleDetails, getTitleSources } from '../services/tmdbApi';
import '../styles/TitleDetail.scss';

const TitleDetail = () => {
  const { t, locale } = useLocale();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedCountry, setSelectedCountry] = useState(
    searchParams.get('country') || detectUserCountrySync()
  );
  
  const [title, setTitle] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTitleData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const urlCountry = searchParams.get('country');
        const countryToUse = urlCountry || selectedCountry;
        
        // Get type from URL params, default to 'movie'
        const typeFromUrl = searchParams.get('type');
        const titleType = typeFromUrl || 'movie';
        
        // Map locale to TMDB language code
        const localeToLanguage = {
          'en': 'en-US',
          'tr': 'tr-TR',
        };
        const language = localeToLanguage[locale] || 'en-US';
        
        // Fetch title details with language preference
        const titleData = await getTitleDetails(id, titleType, countryToUse, language);
        setTitle(titleData);
        
        // Fetch sources for the determined type
        const sourcesData = await getTitleSources(id, titleType, countryToUse);
        
        // TMDB already filters by country, so we can use sources directly
        const filteredSources = Array.isArray(sourcesData) ? sourcesData : [];
        
        setSources(filteredSources);
        // Update selectedCountry from URL if present (only if different to avoid infinite loop)
        if (urlCountry && urlCountry !== selectedCountry) {
          setSelectedCountry(urlCountry);
        }
      } catch (err) {
        console.error('Error fetching title data:', err);
        setError(err.message || 'Failed to load title details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTitleData();
    }
  }, [id, searchParams, selectedCountry, locale]); // Include locale to reload when language changes

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-center py-16">
          <div className="spinner"></div>
          <p className="mt-4 text-[var(--text-secondary)]">{t('common.searching')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="text-center p-12 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
          <p className="text-[var(--text-primary)] mb-4">{error}</p>
          <button 
            onClick={() => navigate(-1)} 
            className="bg-transparent border-none text-[var(--accent-color)] text-base cursor-pointer px-4 py-2 mb-8 rounded-lg transition-all duration-200 font-medium hover:bg-[var(--bg-hover)]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!title) {
    return (
      <div className="py-8">
        <div className="text-center p-12 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
          <p className="text-[var(--text-primary)] mb-4">Title not found</p>
          <button 
            onClick={() => navigate(-1)} 
            className="bg-transparent border-none text-[var(--accent-color)] text-base cursor-pointer px-4 py-2 mb-8 rounded-lg transition-all duration-200 font-medium hover:bg-[var(--bg-hover)]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const displayTitle = title.title || title.name;
  const type = title.tmdb_type || title.type || 'movie';
  const rating = title.imdb_rating ? title.imdb_rating.toFixed(1) : null;
  const imageUrl = title.poster || title.poster_url || `https://via.placeholder.com/500x750?text=${encodeURIComponent(displayTitle)}`;

  return (
    <div className="py-8">
      <button 
        onClick={() => navigate(-1)} 
        className="bg-transparent border-none text-[var(--accent-color)] text-base cursor-pointer px-4 py-2 mb-8 rounded-lg transition-all duration-200 font-medium hover:bg-[var(--bg-hover)]"
      >
        ← Back
      </button>

      <div className="max-w-6xl mx-auto px-4">
        <div className="flex gap-8 mb-12 flex-wrap">
          <div className="flex-shrink-0">
            <img 
              src={imageUrl} 
              alt={displayTitle} 
              className="w-[300px] max-w-full rounded-xl shadow-[var(--shadow-lg)] border border-[var(--border-color)] poster" 
            />
          </div>
          
          <div className="flex-1 min-w-[300px]">
            <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4 md:text-5xl">{displayTitle}</h1>
            <div className="flex gap-4 flex-wrap mb-6">
              {title.year && (
                <span className="px-4 py-2 bg-[var(--bg-secondary)] rounded-lg text-sm text-[var(--text-secondary)] border border-[var(--border-color)]">
                  {title.year}
                </span>
              )}
              {type && (
                <span className="px-4 py-2 bg-[var(--bg-secondary)] rounded-lg text-sm text-[var(--text-secondary)] border border-[var(--border-color)]">
                  {type === 'movie' ? '🎬 Movie' : '📺 TV Series'}
                </span>
              )}
              {rating && (
                <span className="px-4 py-2 bg-[rgba(251,191,36,0.1)] rounded-lg text-sm text-[#fbbf24] border border-[rgba(251,191,36,0.3)]">
                  ⭐ {rating}
                </span>
              )}
            </div>
            {title.plot_overview && (
              <p className="text-lg leading-relaxed text-[var(--text-secondary)] max-w-3xl">{title.plot_overview}</p>
            )}
          </div>
        </div>

        {/* Streaming Sources */}
        {sources.length > 0 && (
          <div className="mt-12">
            <h2 className="text-3xl font-semibold text-[var(--text-primary)] mb-6">Available on</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6 sourcesGrid">
              {sources.map((source) => (
                <div key={source.id} className="sourceCard flex flex-col items-center p-6 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-center">
                  {source.logo_100px && (
                    <img
                      src={source.logo_100px}
                      alt={source.name}
                      className="w-[100px] h-[100px] object-contain mb-4 rounded-lg"
                    />
                  )}
                  <div className="w-full">
                    <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{source.name}</h3>
                    <span className="text-sm text-[var(--text-secondary)] capitalize">
                      {t(`providerTypes.${source.type}`) || t('providerTypes.streaming')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {sources.length === 0 && (
          <div className="text-center p-12 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)]">
            <p>No streaming sources available for this title in {selectedCountry}.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TitleDetail;

