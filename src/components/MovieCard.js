import React from 'react';
import { Link } from 'react-router-dom';
import styles from './MovieCard.module.css';

const MovieCard = ({ title, selectedCountry }) => {
  const {
    id,
    title: titleName,
    name,
    year,
    imdb_rating,
    tmdb_type,
    poster,
    plot_overview,
  } = title;

  const displayTitle = titleName || name;
  const type = tmdb_type || title.type || 'movie';
  const rating = imdb_rating ? imdb_rating.toFixed(1) : null;
  const imageUrl = poster || `https://via.placeholder.com/300x450?text=${encodeURIComponent(displayTitle)}`;

  // Build URL with country and type parameters if available
  const detailUrl = selectedCountry 
    ? `/title/${id}?country=${selectedCountry}&type=${type}`
    : `/title/${id}?type=${type}`;

  return (
    <Link to={detailUrl} className={styles.card}>
      <div className={styles.imageContainer}>
        <img
          src={imageUrl}
          alt={displayTitle}
          className={styles.image}
          loading="lazy"
        />
        {rating && (
          <div className={styles.rating}>
            <span className={styles.ratingValue}>{rating}</span>
          </div>
        )}
        <div className={styles.typeBadge}>
          {type === 'movie' ? '🎬' : '📺'}
        </div>
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{displayTitle}</h3>
        {year && (
          <p className={styles.year}>{year}</p>
        )}
        {plot_overview && (
          <p className={styles.overview}>
            {plot_overview.length > 100
              ? `${plot_overview.substring(0, 100)}...`
              : plot_overview}
          </p>
        )}
      </div>
    </Link>
  );
};

export default MovieCard;

