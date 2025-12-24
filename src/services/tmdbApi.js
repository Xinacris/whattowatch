const API_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.REACT_APP_TMDB_API_KEY;

/**
 * Build URL with API key as query parameter
 * @param {string} endpoint - API endpoint
 * @param {object} params - Additional query parameters
 * @returns {string} - Complete URL
 */
const buildUrl = (endpoint, params = {}) => {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', API_KEY);
  
  // Add additional parameters
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined) {
      url.searchParams.append(key, params[key]);
    }
  });
  
  return url.toString();
};

/**
 * Search for movies and TV shows
 * @param {string} query - Search query
 * @param {string} country - Country code (optional, for language)
 * @returns {Promise} - Search results
 */
export const searchTitles = async (query, country = null) => {
  try {
    const params = {
      query: query,
      include_adult: false,
    };

    // Add language based on country if provided
    if (country) {
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
    }

    const url = buildUrl('/search/multi', params);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const json = await response.json();
    
    // Transform TMDB results to match our expected format
    const transformedResults = (json.results || []).map(item => ({
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
 * @param {string} country - Country code (optional)
 * @returns {Promise} - Title details
 */
export const getTitleDetails = async (titleId, type = 'movie', country = null) => {
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

    const endpoint = type === 'movie' ? `/movie/${titleId}` : `/tv/${titleId}`;
    const url = buildUrl(endpoint, params);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const json = await response.json();
    
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
    
    const url = buildUrl(endpoint);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const json = await response.json();
    
    // TMDB returns watch providers by country
    const countryProviders = json.results?.[country.toLowerCase()] || {};
    
    // Combine all provider types (flatrate, rent, buy)
    const allProviders = [];
    
    if (countryProviders.flatrate) {
      countryProviders.flatrate.forEach(provider => {
        allProviders.push({
          ...provider,
          type: 'sub',
        });
      });
    }
    
    if (countryProviders.rent) {
      countryProviders.rent.forEach(provider => {
        allProviders.push({
          ...provider,
          type: 'rent',
        });
      });
    }
    
    if (countryProviders.buy) {
      countryProviders.buy.forEach(provider => {
        allProviders.push({
          ...provider,
          type: 'buy',
        });
      });
    }
    
    // Fetch source details to get logos and full info
    // For now, return basic info - can enhance later with source details API
    return allProviders.map(provider => ({
      id: provider.provider_id,
      name: provider.provider_name,
      type: provider.type,
      logo_100px: provider.logo_path 
        ? `https://image.tmdb.org/t/p/w500${provider.logo_path}` 
        : null,
      logo_path: provider.logo_path,
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
    const url = buildUrl(endpoint, params);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const json = await response.json();
    
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

