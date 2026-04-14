import React, { createContext, useState, useCallback, useEffect } from 'react';
import { translateText, translateObject, clearTranslationCache } from './translationService';

export const TranslationContext = createContext();

export const TranslationProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('selectedLanguage') || 'en';
  });

  const [translatedDiseases, setTranslatedDiseases] = useState({});
  const [translatedWeather, setTranslatedWeather] = useState({});
  const [isTranslating, setIsTranslating] = useState(false);

  // Update localStorage and document lang whenever language changes
  useEffect(() => {
    localStorage.setItem('selectedLanguage', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (newLang) => {
    setLanguageState(newLang);
  };

  // Main translation function
  const t = useCallback(async (key, defaultValue = key) => {
    if (language === 'en') {
      return defaultValue;
    }
    
    try {
      const translated = await translateText(defaultValue, language, 'en');
      return translated;
    } catch (error) {
      console.error(`Translation error for key "${key}":`, error);
      return defaultValue;
    }
  }, [language]);

  // Translate synchronously from pre-defined translations
  const tSync = useCallback((translations, key) => {
    if (!translations[language] || !translations[language][key]) {
      return translations['en']?.[key] || key;
    }
    return translations[language][key];
  }, [language]);

  // Translate an object asynchronously
  const translateObj = useCallback(async (obj) => {
    if (language === 'en') return obj;
    setIsTranslating(true);
    try {
      const result = await translateObject(obj, language, 'en');
      setIsTranslating(false);
      return result;
    } catch (error) {
      console.error('Translation error:', error);
      setIsTranslating(false);
      return obj;
    }
  }, [language]);

  return (
    <TranslationContext.Provider
      value={{
        language,
        setLanguage,
        t,
        tSync,
        translateObj,
        isTranslating,
        clearCache: clearTranslationCache,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = React.useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
};
