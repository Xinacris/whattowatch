const API_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.REACT_APP_TMDB_API_KEY;
const API_TOKEN = process.env.REACT_APP_TMDB_API_TOKEN; // Bearer token (optional, preferred)

// Debug: Check if environment variables are loaded
if (!API_KEY && !API_TOKEN) {
  console.warn('⚠️ TMDB API credentials not found. Please check your .env file and restart the development server.');
}

/**
 * Build URL with query parameters
 * @param {string} endpoint - API endpoint
 * @param {object} params - Additional query parameters
 * @returns {string} - Complete URL
 */
const buildUrl = (endpoint, params = {}) => {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  // Add additional parameters
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined) {
      url.searchParams.append(key, params[key]);
    }
  });
  
  return url.toString();
};

/**
 * Get fetch options with proper authentication
 * @returns {object} - Fetch options with headers
 */
const getFetchOptions = () => {
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  };

  // Prefer Bearer token if available, otherwise use API key in query params
  if (API_TOKEN) {
    options.headers['Authorization'] = `Bearer ${API_TOKEN}`;
  }
  
  return options;
};

/**
 * Make authenticated fetch request to TMDB API
 * @param {string} endpoint - API endpoint
 * @param {object} params - Query parameters
 * @returns {Promise<Response>} - Fetch response
 */
const fetchFromTMDB = async (endpoint, params = {}) => {
  const url = buildUrl(endpoint, params);
  const options = getFetchOptions();
  
  // If using API key (not token), add it to URL
  let finalUrl = url;
  if (!API_TOKEN && API_KEY) {
    const urlWithKey = new URL(url);
    urlWithKey.searchParams.append('api_key', API_KEY);
    finalUrl = urlWithKey.toString();
  }
  
  const response = await fetch(finalUrl, options);
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

/**
 * Search for movies and TV shows
 * @param {string} query - Search query
 * @param {string} country - Country code (optional, for streaming providers)
 * @param {string} language - Language code (optional, for content language, e.g., 'en-US', 'tr-TR')
 * @returns {Promise} - Search results
 */
export const searchTitles = async (query, country = null, language = null) => {
  try {
    const params = {
      query: query,
      include_adult: false,
    };

    // Use provided language, or fallback to country-based language mapping
    if (language) {
      params.language = language;
    } else if (country) {
      // Map country codes to language codes (simplified)
      const countryToLanguage = {
        'US': 'en-US',
        'GB': 'en-US',
        'TR': 'tr-TR',
        'DE': 'de-DE',
        'FR': 'fr-FR',
        'IT': 'it-IT',
        'ES': 'es-ES',
        'CA': 'en-US',
        'AU': 'en-US',
        'JP': 'ja-JP',
        'KR': 'ko-KR',
        'BR': 'pt-BR',
        'MX': 'es-MX',
        'IN': 'en-US',
        'CN': 'zh-CN',
      };
      params.language = countryToLanguage[country] || 'en-US';
    } else {
      params.language = 'en-US'; // Default fallback
    }

    const json = await fetchFromTMDB('/search/multi', params);
    
    // Filter out actors/people (only show movies and TV shows)
    const filteredResults = (json.results || []).filter(item => 
      item.media_type === 'movie' || item.media_type === 'tv'
    );
    
    // Transform TMDB results to match our expected format
    const transformedResults = filteredResults.map(item => ({
      id: item.id,
      tmdb_id: item.id,
      title: item.title || item.name,
      name: item.name || item.title,
      year: item.release_date ? new Date(item.release_date).getFullYear() : null,
      imdb_rating: item.vote_average || null,
      tmdb_type: item.media_type === 'movie' ? 'movie' : 'tv',
      type: item.media_type === 'movie' ? 'movie' : 'tv_series',
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      poster_path: item.poster_path,
      plot_overview: item.overview || null,
      release_date: item.release_date || item.first_air_date,
      backdrop_path: item.backdrop_path,
    }));
    
    return {
      title_results: transformedResults,
      people_results: [],
    };
  } catch (error) {
    console.error('Error searching titles:', error);
    throw error;
  }
};

/**
 * Get title details by ID
 * @param {number} titleId - Title ID
 * @param {string} type - 'movie' or 'tv'
 * @param {string} country - Country code (optional, for streaming providers)
 * @param {string} language - Language code (optional, for content language, e.g., 'en-US', 'tr-TR')
 * @returns {Promise} - Title details
 */
export const getTitleDetails = async (titleId, type = 'movie', country = null, language = null) => {
  try {
    const params = {};
    
    // Use provided language, or fallback to country-based language mapping
    if (language) {
      params.language = language;
    } else if (country) {
      const countryToLanguage = {
        'US': 'en-US', 'GB': 'en-US', 'TR': 'tr-TR', 'DE': 'de-DE',
        'FR': 'fr-FR', 'IT': 'it-IT', 'ES': 'es-ES', 'CA': 'en-US',
        'AU': 'en-US', 'JP': 'ja-JP', 'KR': 'ko-KR', 'BR': 'pt-BR',
        'MX': 'es-MX', 'IN': 'en-US', 'CN': 'zh-CN',
      };
      params.language = countryToLanguage[country] || 'en-US';
    } else {
      params.language = 'en-US'; // Default fallback
    }

    const endpoint = type === 'movie' ? `/movie/${titleId}` : `/tv/${titleId}`;
    const json = await fetchFromTMDB(endpoint, params);
    
    // Transform TMDB response to match our expected format
    return {
      id: json.id,
      tmdb_id: json.id,
      title: json.title || json.name,
      name: json.name || json.title,
      year: json.release_date ? new Date(json.release_date).getFullYear() : 
            json.first_air_date ? new Date(json.first_air_date).getFullYear() : null,
      imdb_rating: json.vote_average || null,
      tmdb_type: type,
      type: type === 'movie' ? 'movie' : 'tv_series',
      poster: json.poster_path ? `https://image.tmdb.org/t/p/w500${json.poster_path}` : null,
      poster_url: json.poster_path ? `https://image.tmdb.org/t/p/w500${json.poster_path}` : null,
      plot_overview: json.overview || null,
      release_date: json.release_date || json.first_air_date,
      backdrop_path: json.backdrop_path,
      genres: json.genres || [],
      runtime: json.runtime || json.episode_run_time?.[0] || null,
      ...json,
    };
  } catch (error) {
    console.error('Error fetching title details:', error);
    throw error;
  }
};

/**
 * Get streaming sources for a title
 * @param {number} titleId - Title ID
 * @param {string} type - 'movie' or 'tv'
 * @param {string} country - Country code (required)
 * @returns {Promise} - Streaming sources
 */
export const getTitleSources = async (titleId, type = 'movie', country) => {
  try {
    if (!country) {
      throw new Error('Country code is required for watch providers');
    }

    const endpoint = type === 'movie' 
      ? `/movie/${titleId}/watch/providers`
      : `/tv/${titleId}/watch/providers`;
    
    const json = await fetchFromTMDB(endpoint);
    
    // TMDB returns watch providers by country
    // Response format: { id: number, results: { [countryCode]: { link, flatrate, buy, rent, free, ads } } }
    const countryProviders = json.results?.[country.toUpperCase()] || json.results?.[country.toLowerCase()] || {};
    
    // Combine all provider types (flatrate, rent, buy, free, ads)
    const allProviders = [];
    
    // Subscription services (flatrate)
    if (countryProviders.flatrate) {
      countryProviders.flatrate.forEach(provider => {
        allProviders.push({
          ...provider,
          type: 'sub',
        });
      });
    }
    
    // Free services
    if (countryProviders.free) {
      countryProviders.free.forEach(provider => {
        allProviders.push({
          ...provider,
          type: 'free',
        });
      });
    }
    
    // Rent services
    if (countryProviders.rent) {
      countryProviders.rent.forEach(provider => {
        allProviders.push({
          ...provider,
          type: 'rent',
        });
      });
    }
    
    // Buy services
    if (countryProviders.buy) {
      countryProviders.buy.forEach(provider => {
        allProviders.push({
          ...provider,
          type: 'buy',
        });
      });
    }
    
    // Ad-supported services
    if (countryProviders.ads) {
      countryProviders.ads.forEach(provider => {
        allProviders.push({
          ...provider,
          type: 'ads',
        });
      });
    }
    
    // Map providers with logo URLs
    return allProviders.map(provider => ({
      id: provider.provider_id,
      name: provider.provider_name,
      type: provider.type,
      logo_100px: provider.logo_path 
        ? `https://image.tmdb.org/t/p/w500${provider.logo_path}` 
        : null,
      logo_path: provider.logo_path,
      display_priority: provider.display_priority,
      regions: [country.toUpperCase()],
    }));
  } catch (error) {
    console.error('Error fetching title sources:', error);
    throw error;
  }
};

/**
 * Get popular titles
 * @param {string} type - 'movie' or 'tv'
 * @param {string} country - Country code (optional)
 * @returns {Promise} - Popular titles
 */
export const getPopularTitles = async (type = 'movie', country = null) => {
  try {
    const params = {};
    if (country) {
      const countryToLanguage = {
        'US': 'en-US', 'GB': 'en-US', 'TR': 'tr-TR', 'DE': 'de-DE',
        'FR': 'fr-FR', 'IT': 'it-IT', 'ES': 'es-ES', 'CA': 'en-US',
        'AU': 'en-US', 'JP': 'ja-JP', 'KR': 'ko-KR', 'BR': 'pt-BR',
        'MX': 'es-MX', 'IN': 'en-US', 'CN': 'zh-CN',
      };
      params.language = countryToLanguage[country] || 'en-US';
    }

    const endpoint = type === 'movie' ? '/movie/popular' : '/tv/popular';
    const json = await fetchFromTMDB(endpoint, params);
    
    // Transform results
    const transformedResults = (json.results || []).map(item => ({
      id: item.id,
      tmdb_id: item.id,
      title: item.title || item.name,
      name: item.name || item.title,
      year: item.release_date ? new Date(item.release_date).getFullYear() : 
            item.first_air_date ? new Date(item.first_air_date).getFullYear() : null,
      imdb_rating: item.vote_average || null,
      tmdb_type: type,
      type: type === 'movie' ? 'movie' : 'tv_series',
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      plot_overview: item.overview || null,
    }));
    
    return {
      title_results: transformedResults,
    };
  } catch (error) {
    console.error('Error fetching popular titles:', error);
    throw error;
  }
};

