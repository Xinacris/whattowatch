import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import SearchContainer from '../components/SearchContainer';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import { detectUserCountry, detectUserCountrySync } from '../utils/countryDetection';
import { getTrendingTitles } from '../services/tmdbApi';

const SKELETON_COUNT = 6;
const skeletons = Array.from({ length: SKELETON_COUNT });

const Home = () => {
  const { t, locale } = useLocale();
  const [selectedCountry, setSelectedCountry] = useState(detectUserCountrySync());
  const navigate = useNavigate();
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingTV, setTrendingTV] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  useEffect(() => {
    document.title = "Xinny's WhereToWatch";
  }, []);

  useEffect(() => {
    const detectCountry = async () => {
      const detectedCountry = await detectUserCountry();
      setSelectedCountry(detectedCountry);
    };
    detectCountry();
  }, []);

  useEffect(() => {
    const fetchTrending = async () => {
      setLoadingTrending(true);
      try {
        const localeToLanguage = { en: 'en-US', tr: 'tr-TR' };
        const language = localeToLanguage[locale] || 'en-US';
        const data = await getTrendingTitles('week', language);
        const all = data.title_results || [];
        setTrendingMovies(all.filter(item => item.tmdb_type === 'movie').slice(0, 8));
        setTrendingTV(all.filter(item => item.tmdb_type === 'tv').slice(0, 8));
      } catch (err) {
        console.error('Error fetching trending:', err);
      } finally {
        setLoadingTrending(false);
      }
    };
    fetchTrending();
  }, [locale]);

  const handleSearch = (query) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}&country=${selectedCountry}`);
    }
  };

  const handleCountryChange = (countryCode) => {
    setSelectedCountry(countryCode);
  };

  return (
    <div className="py-8">
      <SearchContainer
        onSearch={handleSearch}
        onCountryChange={handleCountryChange}
        selectedCountry={selectedCountry}
      />

      <section className="mt-14">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-5 flex items-center gap-3">
          <span className="w-1 h-6 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(to bottom, #818cf8, #60a5fa)' }} />
          {t('home.trendingMovies')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {loadingTrending
            ? skeletons.map((_, i) => <SkeletonCard key={i} />)
            : trendingMovies.map(title => (
                <MovieCard key={title.id} title={title} selectedCountry={selectedCountry} />
              ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-5 flex items-center gap-3">
          <span className="w-1 h-6 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(to bottom, #818cf8, #60a5fa)' }} />
          {t('home.trendingTV')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {loadingTrending
            ? skeletons.map((_, i) => <SkeletonCard key={i} />)
            : trendingTV.map(title => (
                <MovieCard key={title.id} title={title} selectedCountry={selectedCountry} />
              ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
