import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { detectUserCountrySync } from '../utils/countryDetection';
import { getTitleDetails, getTitleSources } from '../services/tmdbApi';
import styles from './TitleDetail.module.css';

const TitleDetail = () => {
  const { t } = useLocale();
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
        const countryToUse = searchParams.get('country') || selectedCountry;
        
        // Get type from URL params, default to 'movie'
        const typeFromUrl = searchParams.get('type');
        const titleType = typeFromUrl || 'movie';
        
        // Fetch title details
        const titleData = await getTitleDetails(id, titleType, countryToUse);
        
        console.log('=== TMDB TITLE DETAILS ===');
        console.log('Title Data:', titleData);
        console.log('Type:', titleType);
        console.log('==========================');
        
        setTitle(titleData);
        
        // Fetch sources for the determined type
        const sourcesData = await getTitleSources(id, titleType, countryToUse);
        
        console.log('=== TMDB STREAMING SOURCES ===');
        console.log('Country:', countryToUse);
        console.log('Sources Data:', sourcesData);
        console.log('==============================');
        
        // TMDB already filters by country, so we can use sources directly
        const filteredSources = Array.isArray(sourcesData) ? sourcesData : [];
        
        setSources(filteredSources);
        setSelectedCountry(countryToUse);
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
  }, [id, searchParams]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>{t('common.searching')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!title) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <p>Title not found</p>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
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
    <div className={styles.page}>
      <button onClick={() => navigate(-1)} className={styles.backButton}>
        ← Back
      </button>

      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.posterContainer}>
            <img src={imageUrl} alt={displayTitle} className={styles.poster} />
          </div>
          
          <div className={styles.info}>
            <h1 className={styles.title}>{displayTitle}</h1>
            <div className={styles.meta}>
              {title.year && <span className={styles.year}>{title.year}</span>}
              {type && (
                <span className={styles.type}>
                  {type === 'movie' ? '🎬 Movie' : '📺 TV Series'}
                </span>
              )}
              {rating && (
                <span className={styles.rating}>
                  ⭐ {rating}
                </span>
              )}
            </div>
            {title.plot_overview && (
              <p className={styles.overview}>{title.plot_overview}</p>
            )}
          </div>
        </div>

        {/* Streaming Sources */}
        {sources.length > 0 && (
          <div className={styles.sourcesSection}>
            <h2 className={styles.sectionTitle}>Available on</h2>
            <div className={styles.sourcesGrid}>
              {sources.map((source) => (
                <div key={source.id} className={styles.sourceCard}>
                  {source.logo_100px && (
                    <img
                      src={source.logo_100px}
                      alt={source.name}
                      className={styles.sourceLogo}
                    />
                  )}
                  <div className={styles.sourceInfo}>
                    <h3 className={styles.sourceName}>{source.name}</h3>
                    <span className={styles.sourceType}>
                      {source.type === 'sub' ? 'Subscription' : source.type === 'rent' ? 'Rent' : 'Buy'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {sources.length === 0 && (
          <div className={styles.noSources}>
            <p>No streaming sources available for this title in {selectedCountry}.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TitleDetail;

