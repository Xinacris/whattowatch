import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { getCollectionDetails } from '../services/tmdbApi';
import '../styles/CollectionDetail.scss';

const CollectionDetail = () => {
    const { t, locale } = useLocale();
    const { id } = useParams();
    const navigate = useNavigate();

    const [collection, setCollection] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCollectionData = async () => {
            setLoading(true);
            setError(null);

            try {
                const localeToLanguage = {
                    'en': 'en-US',
                    'tr': 'tr-TR',
                };
                const language = localeToLanguage[locale] || 'en-US';

                const data = await getCollectionDetails(id, language);
                setCollection(data);
            } catch (err) {
                console.error('Error fetching collection data:', err);
                setError(err.message || 'Failed to load collection details.');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchCollectionData();
        }
    }, [id, locale]);

    useEffect(() => {
        if (collection) {
            document.title = `${collection.name} · Xinny's WhereToWatch`;
        }
        return () => { document.title = "Xinny's WhereToWatch"; };
    }, [collection]);

    if (loading) {
        return (
            <div className="py-8">
                <div className="text-center py-16">
                    <div className="spinner"></div>
                    <p className="mt-4 text-[var(--text-secondary)]">{t('common.loading') || 'Loading...'}</p>
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

    if (!collection) return null;

    return (
        <div className="collection-detail-container px-4 max-w-6xl mx-auto">
            <button
                onClick={() => navigate(-1)}
                className="bg-transparent border-none text-[var(--accent-color)] text-base cursor-pointer px-4 py-2 mb-8 rounded-lg transition-all duration-200 font-medium hover:bg-[var(--bg-hover)]"
            >
                ← {t('common.back') || 'Back'}
            </button>

            <div className="collection-header">
                <div className="poster-wrapper">
                    <img
                        src={collection.poster || 'https://via.placeholder.com/300x450?text=No+Poster'}
                        alt={collection.name}
                    />
                </div>

                <div className="info-wrapper">
                    <h1>{collection.name}</h1>
                    {collection.overview && (
                        <p className="overview">{collection.overview}</p>
                    )}
                </div>
            </div>

            <div className="collection-parts">
                <h2>{t('collection.parts') || 'Movies in this Collection'}</h2>

                <div className="parts-grid">
                    {collection.parts.map(part => (
                        <div
                            key={part.id}
                            className="part-card"
                            onClick={() => navigate(`/title/${part.id}?type=movie`)}
                        >
                            <img
                                src={part.poster || `https://via.placeholder.com/300x450?text=${encodeURIComponent(part.title)}`}
                                alt={part.title}
                                className="part-poster"
                            />
                            <div className="part-info">
                                <h3>{part.title}</h3>
                                <div className="meta">
                                    {part.release_date && (
                                        <span>{new Date(part.release_date).getFullYear()}</span>
                                    )}
                                    {part.vote_average > 0 && (
                                        <span className="rating">⭐ {part.vote_average.toFixed(1)}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CollectionDetail;
