/**
 * Detects user's country based on IP geolocation API and browser timezone/locale
 * Falls back to 'US' if detection fails
 */
export const detectUserCountry = async () => {
  // List of supported countries
  const supportedCountries = [
    'US', 'GB', 'TR', 'DE', 'FR', 'IT', 'ES', 'CA', 
    'AU', 'JP', 'KR', 'BR', 'MX', 'IN', 'CN'
  ];

  try {
    // Method 1: Try IP-based geolocation (most accurate)
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        const countryCode = data.country_code;
        if (countryCode && supportedCountries.includes(countryCode)) {
          return countryCode;
        }
      }
    } catch (error) {
      console.log('IP geolocation failed, trying fallback methods:', error);
    }

    // Method 2: Try timezone (reliable fallback)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const timezoneToCountry = {
      // US timezones
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'America/Chicago': 'US',
      'America/Denver': 'US',
      'America/Phoenix': 'US',
      'America/Anchorage': 'US',
      'America/Honolulu': 'US',
      // UK
      'Europe/London': 'GB',
      // Turkey
      'Europe/Istanbul': 'TR',
      // Germany
      'Europe/Berlin': 'DE',
      'Europe/Munich': 'DE',
      // France
      'Europe/Paris': 'FR',
      // Italy
      'Europe/Rome': 'IT',
      'Europe/Milan': 'IT',
      // Spain
      'Europe/Madrid': 'ES',
      'Europe/Barcelona': 'ES',
      // Canada
      'America/Toronto': 'CA',
      'America/Vancouver': 'CA',
      'America/Montreal': 'CA',
      // Australia
      'Australia/Sydney': 'AU',
      'Australia/Melbourne': 'AU',
      // Japan
      'Asia/Tokyo': 'JP',
      // South Korea
      'Asia/Seoul': 'KR',
      // Brazil
      'America/Sao_Paulo': 'BR',
      'America/Rio_de_Janeiro': 'BR',
      // Mexico
      'America/Mexico_City': 'MX',
      // India
      'Asia/Kolkata': 'IN',
      'Asia/Calcutta': 'IN',
      // China
      'Asia/Shanghai': 'CN',
      'Asia/Beijing': 'CN',
    };
    
    if (timezoneToCountry[timezone]) {
      return timezoneToCountry[timezone];
    }

    // Method 3: Try browser locale
    const locale = navigator.language || navigator.userLanguage || '';
    let countryCode = null;
    
    if (locale.includes('-')) {
      countryCode = locale.split('-')[1]?.toUpperCase();
    } else if (locale.length === 2) {
      const langToCountry = {
        'tr': 'TR',
        'de': 'DE',
        'fr': 'FR',
        'it': 'IT',
        'es': 'ES',
        'ja': 'JP',
        'ko': 'KR',
        'pt': 'BR',
        'zh': 'CN',
        'hi': 'IN',
      };
      countryCode = langToCountry[locale.toLowerCase()];
    }
    
    if (countryCode && supportedCountries.includes(countryCode)) {
      return countryCode;
    }

    // Default fallback
    console.log('Could not detect country. Timezone:', timezone, 'Locale:', locale);
    return 'US';
  } catch (error) {
    console.error('Error detecting country:', error);
    return 'US';
  }
};

// Synchronous version for immediate use (uses timezone/locale only)
export const detectUserCountrySync = () => {
  const supportedCountries = [
    'US', 'GB', 'TR', 'DE', 'FR', 'IT', 'ES', 'CA', 
    'AU', 'JP', 'KR', 'BR', 'MX', 'IN', 'CN'
  ];

  try {
    // Try timezone first
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const timezoneToCountry = {
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'America/Chicago': 'US',
      'America/Denver': 'US',
      'America/Phoenix': 'US',
      'America/Anchorage': 'US',
      'America/Honolulu': 'US',
      'Europe/London': 'GB',
      'Europe/Istanbul': 'TR',
      'Europe/Berlin': 'DE',
      'Europe/Munich': 'DE',
      'Europe/Paris': 'FR',
      'Europe/Rome': 'IT',
      'Europe/Milan': 'IT',
      'Europe/Madrid': 'ES',
      'Europe/Barcelona': 'ES',
      'America/Toronto': 'CA',
      'America/Vancouver': 'CA',
      'America/Montreal': 'CA',
      'Australia/Sydney': 'AU',
      'Australia/Melbourne': 'AU',
      'Asia/Tokyo': 'JP',
      'Asia/Seoul': 'KR',
      'America/Sao_Paulo': 'BR',
      'America/Rio_de_Janeiro': 'BR',
      'America/Mexico_City': 'MX',
      'Asia/Kolkata': 'IN',
      'Asia/Calcutta': 'IN',
      'Asia/Shanghai': 'CN',
      'Asia/Beijing': 'CN',
    };
    
    if (timezoneToCountry[timezone]) {
      return timezoneToCountry[timezone];
    }

    // Try locale
    const locale = navigator.language || navigator.userLanguage || '';
    let countryCode = null;
    
    if (locale.includes('-')) {
      countryCode = locale.split('-')[1]?.toUpperCase();
    } else if (locale.length === 2) {
      const langToCountry = {
        'tr': 'TR',
        'de': 'DE',
        'fr': 'FR',
        'it': 'IT',
        'es': 'ES',
        'ja': 'JP',
        'ko': 'KR',
        'pt': 'BR',
        'zh': 'CN',
        'hi': 'IN',
      };
      countryCode = langToCountry[locale.toLowerCase()];
    }
    
    if (countryCode && supportedCountries.includes(countryCode)) {
      return countryCode;
    }

    return 'US';
  } catch (error) {
    console.error('Error detecting country:', error);
    return 'US';
  }
};
