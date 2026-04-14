// Translation Service using MyMemory API (Free, No Key Required)
// This service handles dynamic translation of all content

const MYMEMORY_API = "https://api.mymemory.translated.net/get";
const CACHE_KEY = "translation_cache";
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Language codes mapping
const langCodeMap = {
  en: "en",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  hi: "hi",
  pt: "pt-BR",
  ja: "ja",
  zh: "zh-CN",
  ar: "ar"
};

// Initialize cache
const getCache = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, expiry } = JSON.parse(cached);
      if (new Date().getTime() < expiry) {
        return data;
      }
    }
  } catch (e) {
    console.warn("Cache read error:", e);
  }
  return {};
};

const saveCache = (cache) => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: cache,
        expiry: new Date().getTime() + CACHE_EXPIRY
      })
    );
  } catch (e) {
    console.warn("Cache save error:", e);
  }
};

let translationCache = getCache();

/**
 * Translate text using MyMemory API
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code
 * @param {string} sourceLang - Source language code (default: 'en')
 * @returns {Promise<string>} - Translated text
 */
export const translateText = async (text, targetLang, sourceLang = "en") => {
  if (!text || targetLang === "en") return text;
  
  // Check cache first
  const cacheKey = `${sourceLang}_${targetLang}_${text}`;
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  try {
    const fromLang = langCodeMap[sourceLang] || sourceLang;
    const toLang = langCodeMap[targetLang] || targetLang;

    const response = await fetch(
      `${MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`,
      {
        headers: {
          "User-Agent": "LeafLens/1.0"
        }
      }
    );

    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      
      // Cache the translation
      translationCache[cacheKey] = translated;
      saveCache(translationCache);
      
      return translated;
    }
  } catch (error) {
    console.warn(`Translation error for "${text}":`, error);
  }

  // Return original text if translation fails
  return text;
};

/**
 * Translate an array of texts in batch
 * @param {string[]} texts - Array of texts to translate
 * @param {string} targetLang - Target language code
 * @param {string} sourceLang - Source language code (default: 'en')
 * @returns {Promise<string[]>} - Array of translated texts
 */
export const translateBatch = async (texts, targetLang, sourceLang = "en") => {
  const results = await Promise.all(
    texts.map(text => translateText(text, targetLang, sourceLang))
  );
  return results;
};

/**
 * Translate an object's string values
 * @param {object} obj - Object to translate
 * @param {string} targetLang - Target language code
 * @param {string} sourceLang - Source language code (default: 'en')
 * @returns {Promise<object>} - Object with translated values
 */
export const translateObject = async (obj, targetLang, sourceLang = "en") => {
  if (targetLang === "en") return obj;

  const translated = { ...obj };
  const keys = Object.keys(obj);
  
  for (const key of keys) {
    if (typeof obj[key] === "string") {
      translated[key] = await translateText(obj[key], targetLang, sourceLang);
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      translated[key] = await translateObject(obj[key], targetLang, sourceLang);
    }
  }

  return translated;
};

/**
 * Clear translation cache
 */
export const clearTranslationCache = () => {
  translationCache = {};
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.warn("Cache clear error:", e);
  }
};

/**
 * Translate disease data
 * @param {object} disease - Disease object
 * @param {string} targetLang - Target language code
 * @returns {Promise<object>} - Translated disease object
 */
export const translateDisease = async (disease, targetLang) => {
  if (targetLang === "en") return disease;

  return {
    ...disease,
    name: await translateText(disease.name, targetLang),
    desc: await translateText(disease.desc, targetLang),
    severity: await translateText(disease.severity, targetLang),
    advice: await translateText(disease.advice, targetLang),
  };
};

/**
 * Translate weather code labels
 * @param {object} labels - Weather code labels
 * @param {string} targetLang - Target language code
 * @returns {Promise<object>} - Translated labels
 */
export const translateWeatherLabels = async (labels, targetLang) => {
  if (targetLang === "en") return labels;

  const translated = {};
  for (const [code, label] of Object.entries(labels)) {
    translated[code] = await translateText(label, targetLang);
  }
  return translated;
};
