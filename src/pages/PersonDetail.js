import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { getPersonDetails } from '../services/tmdbApi';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import '../styles/PersonDetail.scss';

const SKELETON_COUNT = 8;
const skeletons = Array.from({ length: SKELETON_COUNT });

const PersonDetail = () => {
  const { t, locale } = useLocale();
  const { id } = useParams();
  const navigate = useNavigate();

  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const fetchPerson = async () => {
      setLoading(true);
      setError(null);
      try {
        const localeToLanguage = { en: 'en-US', tr: 'tr-TR' };
        const language = localeToLanguage[locale] || 'en-US';
        const data = await getPersonDetails(id, language);
        setPerson(data);
      } catch (err) {
        setError(err.message || 'Failed to load person details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPerson();
  }, [id, locale]);

  useEffect(() => {
    if (person) {
      document.title = `${person.name} · Xinny's WhereToWatch`;
    }
    return () => { document.title = "Xinny's WhereToWatch"; };
  }, [person]);

  if (loading) {
    return (
      <div className="py-8 max-w-6xl mx-auto px-4">
        <div className="personSkeleton">
          <div className="skeletonPhoto" />
          <div className="skeletonInfo">
            <div className="skeletonLine" style={{ width: '40%', height: 36 }} />
            <div className="skeletonLine" style={{ width: '25%', height: 20 }} />
            <div className="skeletonLine" style={{ width: '100%', height: 80 }} />
          </div>
        </div>
        <div className="skeletonLine" style={{ width: '20%', height: 28, marginBottom: '1.5rem' }} />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {skeletons.map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="py-8">
        <div className="text-center p-12 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
          <p className="text-[var(--text-primary)] mb-4">{error || 'Person not found'}</p>
          <button onClick={() => navigate(-1)} className="personBackBtn">
            ← {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  const filteredCredits = person.credits.filter(item => {
    if (activeFilter === 'movie') return item.tmdb_type === 'movie';
    if (activeFilter === 'tv') return item.tmdb_type === 'tv';
    return true;
  });

  const movieCount = person.credits.filter(c => c.tmdb_type === 'movie').length;
  const tvCount = person.credits.filter(c => c.tmdb_type === 'tv').length;

  const BIO_LIMIT = 300;
  const bioText = person.biography || '';
  const bioShort = bioText.length > BIO_LIMIT ? bioText.slice(0, BIO_LIMIT) + '…' : bioText;

  const filterBtnClass = (filter) =>
    `px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 cursor-pointer ${
      activeFilter === filter
        ? 'bg-[var(--accent-color)] text-white border-[var(--accent-color)]'
        : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--accent-color)] hover:text-[var(--accent-color)]'
    }`;

  return (
    <div className="py-8 max-w-6xl mx-auto px-4">
      <button onClick={() => navigate(-1)} className="personBackBtn">
        ← {t('common.back')}
      </button>

      {/* Person Header */}
      <div className="personHeader">
        <div className="personPhotoWrap">
          {person.profile_path ? (
            <img src={person.profile_path} alt={person.name} className="personPhoto" />
          ) : (
            <div className="personPhotoFallback">👤</div>
          )}
        </div>

        <div className="personInfo">
          <h1 className="personName">{person.name}</h1>

          {person.known_for_department && (
            <p className="personDepartment">
              {t(`person.department.${person.known_for_department}`) || person.known_for_department}
            </p>
          )}

          <div className="personMeta">
            {person.birthday && (
              <span className="personMetaItem">
                <span className="personMetaLabel">{t('person.born')}</span>
                {person.birthday}
                {person.place_of_birth && ` · ${person.place_of_birth}`}
              </span>
            )}
            {person.deathday && (
              <span className="personMetaItem">
                <span className="personMetaLabel">{t('person.died')}</span>
                {person.deathday}
              </span>
            )}
          </div>

          {bioText && (
            <div className="personBio">
              <p>{bioExpanded ? bioText : bioShort}</p>
              {bioText.length > BIO_LIMIT && (
                <button
                  className="bioToggle"
                  onClick={() => setBioExpanded(v => !v)}
                >
                  {bioExpanded ? t('person.showLess') : t('person.showMore')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filmography */}
      {person.credits.length > 0 && (
        <section>
          <div className="filmographyHeader">
            <h2 className="filmographyTitle">{t('person.filmography')}</h2>
            <div className="filmographyFilters">
              <button className={filterBtnClass('all')} onClick={() => setActiveFilter('all')}>
                {t('common.filterAll')}
                {activeFilter === 'all' && (
                  <span className="ml-1.5 opacity-70">({person.credits.length})</span>
                )}
              </button>
              <button className={filterBtnClass('movie')} onClick={() => setActiveFilter('movie')}>
                {t('common.filterMovies')}
                {activeFilter === 'movie' && (
                  <span className="ml-1.5 opacity-70">({movieCount})</span>
                )}
              </button>
              <button className={filterBtnClass('tv')} onClick={() => setActiveFilter('tv')}>
                {t('common.filterTV')}
                {activeFilter === 'tv' && (
                  <span className="ml-1.5 opacity-70">({tvCount})</span>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredCredits.map(title => (
              <MovieCard key={`${title.id}-${title.tmdb_type}`} title={title} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default PersonDetail;
