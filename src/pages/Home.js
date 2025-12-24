import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import SearchContainer from '../components/SearchContainer';
import { detectUserCountry, detectUserCountrySync } from '../utils/countryDetection';
import styles from './Home.module.css';

const Home = () => {
  const { t } = useLocale();
  // Start with sync detection for immediate display
  const [selectedCountry, setSelectedCountry] = useState(detectUserCountrySync());
  const navigate = useNavigate();

  useEffect(() => {
    // Then try async IP-based detection for more accuracy
    const detectCountry = async () => {
      const detectedCountry = await detectUserCountry();
      setSelectedCountry(detectedCountry);
    };
    detectCountry();
  }, []);

  const handleSearch = (query) => {
    if (query.trim()) {
      // Arama sonuçları sayfasına yönlendir
      navigate(`/search?q=${encodeURIComponent(query)}&country=${selectedCountry}`);
    }
  };

  const handleCountryChange = (countryCode) => {
    setSelectedCountry(countryCode);
  };

  return (
    <div className={styles.page}>
      {/* Search Container */}
      <SearchContainer
        onSearch={handleSearch}
        onCountryChange={handleCountryChange}
        selectedCountry={selectedCountry}
      />

      {/* Welcome Section */}
      <div className={styles.welcomeSection}>
        <h2 className={styles.welcomeTitle}>
          {t('home.welcomeTitle')}
        </h2>
        <p className={styles.welcomeText}>
          {t('home.welcomeText')}
        </p>
      </div>
    </div>
  );
};

export default Home;
