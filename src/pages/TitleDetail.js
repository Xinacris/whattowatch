import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { detectUserCountrySync } from '../utils/countryDetection';
import { getTitleDetails, getTitleSources, getTitleCredits, getTitleVideos } from '../services/tmdbApi';
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
  const [cast, setCast] = useState([]);
  const [trailerKey, setTrailerKey] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTitleData = async () => {
      setLoading(true);
      setError(null);

      try {
        const urlCountry = searchParams.get('country');
        const countryToUse = urlCountry || selectedCountry;
        const titleType = searchParams.get('type') || 'movie';
        const localeToLanguage = { en: 'en-US', tr: 'tr-TR' };
        const language = localeToLanguage[locale] || 'en-US';

        const [titleData, sourcesData, creditsData, videoKey] = await Promise.all([
          getTitleDetails(id, titleType, countryToUse, language),
          getTitleSources(id, titleType, countryToUse),
          getTitleCredits(id, titleType, language),
          getTitleVideos(id, titleType),
        ]);

        setTitle(titleData);
        setSources(Array.isArray(sourcesData) ? sourcesData : []);
        setCast(creditsData || []);
        setTrailerKey(videoKey);

        if (urlCountry && urlCountry !== selectedCountry) {
          setSelectedCountry(urlCountry);
        }
      } catch (err) {
        setError(err.message || 'Failed to load title details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTitleData();
    }
  }, [id, searchParams, selectedCountry, locale]);

  useEffect(() => {
    if (title) {
      document.title = `${title.title || title.name} · Xinny's WhereToWatch`;
    }
    return () => { document.title = "Xinny's WhereToWatch"; };
  }, [title]);

  if (loading) {
    return (
      <div>
        <div className="backdropSkeleton" />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="skeletonBlock" style={{ width: 80, height: 20, marginBottom: '1.5rem' }} />
          <div className="skeletonBlock" style={{ width: '60%', height: 36, marginBottom: '1rem' }} />
          <div className="skeletonBlock" style={{ width: '35%', height: 20, marginBottom: '1.25rem' }} />
          <div className="skeletonBlock" style={{ width: '100%', height: 80 }} />
        </div>
      </div>
    );
  }

  if (error || !title) {
    return (
      <div className="py-8">
        <div className="text-center p-12 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
          <p className="text-[var(--text-primary)] mb-4">{error || 'Title not found'}</p>
          <button onClick={() => navigate(-1)} className="backBtn">
            ← {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  const displayTitle = title.title || title.name;
  const type = title.tmdb_type || title.type || 'movie';
  const rating = title.imdb_rating ? title.imdb_rating.toFixed(1) : null;
  const backdropUrl = title.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${title.backdrop_path}`
    : null;
  const posterUrl = title.poster || title.poster_url || null;

  return (
    <div>
      {/* Trailer Modal */}
      {showTrailer && trailerKey && (
        <div className="trailerModal" onClick={() => setShowTrailer(false)}>
          <div className="trailerModalContent" onClick={e => e.stopPropagation()}>
            <button className="trailerClose" onClick={() => setShowTrailer(false)}>
              ✕ {t('titleDetail.closeTrailer')}
            </button>
            <div className="trailerIframeWrapper">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
                title={`${displayTitle} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Backdrop Hero */}
      <div
        className="backdropHero"
        style={backdropUrl ? { backgroundImage: `url(${backdropUrl})` } : {}}
      >
        <div className="backdropOverlay">
          <div className="backdropContent">
            <button onClick={() => navigate(-1)} className="backBtnHero">
              ← {t('common.back')}
            </button>
            <div className="heroBody">
              {posterUrl && (
                <img src={posterUrl} alt={displayTitle} className="heroPoster" />
              )}
              <div className="heroInfo">
                <h1 className="heroTitle">{displayTitle}</h1>
                <div className="heroBadges">
                  {title.year && <span className="badge">{title.year}</span>}
                  {type && (
                    <span className="badge">
                      {type === 'movie' ? `🎬 ${t('common.movie')}` : `📺 ${t('common.tvSeries')}`}
                    </span>
                  )}
                  {rating && <span className="badge badgeRating">⭐ {rating}</span>}
                  {title.runtime && <span className="badge">{title.runtime} min</span>}
                </div>
                {title.genres && title.genres.length > 0 && (
                  <div className="heroGenres">
                    {title.genres.map(g => (
                      <span key={g.id} className="genrePill">{g.name}</span>
                    ))}
                  </div>
                )}
                {title.plot_overview && (
                  <p className="heroOverview">{title.plot_overview}</p>
                )}
                {trailerKey && (
                  <button className="trailerBtn" onClick={() => setShowTrailer(true)}>
                    ▶ {t('titleDetail.watchTrailer')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl w-full mx-auto px-4 py-10">
        {/* Cast */}
        {cast.length > 0 && (
          <section className="contentSection">
            <h2 className="sectionTitle">{t('titleDetail.cast')}</h2>
            <div className="castScroll">
              {cast.map(person => (
                <button
                  key={person.id}
                  className="castCard"
                  onClick={() => navigate(`/person/${person.id}`)}
                  title={person.name}
                >
                  <div className="castPhoto">
                    {person.profile_path ? (
                      <img src={person.profile_path} alt={person.name} />
                    ) : (
                      <div className="castPhotoFallback">👤</div>
                    )}
                  </div>
                  <p className="castName">{person.name}</p>
                  <p className="castCharacter">{person.character}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Streaming Sources */}
        {sources.length > 0 && (
          <section className="contentSection">
            <h2 className="sectionTitle">{t('titleDetail.availableOn')}</h2>
            <div className="sourcesGrid">
              {sources.map(source => (
                <div key={source.id} className="sourceCard">
                  {source.logo_100px && (
                    <img src={source.logo_100px} alt={source.name} className="sourceLogo" />
                  )}
                  <h3 className="sourceName">{source.name}</h3>
                  <span className="sourceType">
                    {t(`providerTypes.${source.type}`) || t('providerTypes.streaming')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {sources.length === 0 && (
          <div className="text-center p-12 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)]">
            <p>{t('titleDetail.noSources')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TitleDetail;
