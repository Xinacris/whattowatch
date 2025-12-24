import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import SearchContainer from '../components/SearchContainer';
import { detectUserCountry, detectUserCountrySync } from '../utils/countryDetection';

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
    <div className="py-8">
      {/* Search Container */}
      <SearchContainer
        onSearch={handleSearch}
        onCountryChange={handleCountryChange}
        selectedCountry={selectedCountry}
      />

      {/* Welcome Section */}
      <div className="mt-16 text-center">
        <h2 className="text-3xl font-semibold text-[var(--text-primary)] mb-4">
          {t('home.welcomeTitle')}
        </h2>
        <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
          {t('home.welcomeText')}
        </p>
      </div>
    </div>
  );
};

export default Home;
