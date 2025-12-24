import React, { createContext, useContext, useState, useEffect } from 'react';
import enTranslations from '../locales/en.json';
import trTranslations from '../locales/tr.json';

const LocaleContext = createContext();

const translations = {
  en: enTranslations,
  tr: trTranslations,
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};

export const LocaleProvider = ({ children }) => {
  // Get initial locale from localStorage or browser language
  const [locale, setLocale] = useState(() => {
    const savedLocale = localStorage.getItem('locale');
    if (savedLocale) return savedLocale;
    
    // Try to detect from browser
    const browserLang = navigator.language || navigator.userLanguage;
    const langCode = browserLang.split('-')[0].toLowerCase();
    
    // Return supported locale or default to 'en'
    return translations[langCode] ? langCode : 'en';
  });

  useEffect(() => {
    localStorage.setItem('locale', locale);
  }, [locale]);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[locale];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  const changeLocale = (newLocale) => {
    if (translations[newLocale]) {
      setLocale(newLocale);
    }
  };

  const value = {
    locale,
    t,
    changeLocale,
    availableLocales: Object.keys(translations),
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
};

