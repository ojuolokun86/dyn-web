/**
 * Team Search & Logo Cache Utility
 * Handles TheSportsDB API integration and Supabase logo caching
 * Uses existing 'profiles' bucket like other Hall of Fame uploads
 */

const THESPORTSDB_API_BASE = 'https://www.thesportsdb.com/api/v1/json/123';
const HOF_LOGO_BUCKET = 'profiles';  // Use existing profiles bucket

/**
 * Fetch team data from TheSportsDB API (via backend)
 * @param {string} teamName - The team name to search for (e.g., "PSG", "Manchester United")
 * @returns {Promise<{name: string, logo: string}|null>} Team data or null if not found
 */
async function fetchTeamData(teamName, options = {}) {
  const { signal } = options;

  try {
    if (!teamName || teamName.trim().length === 0) {
      console.warn('[fetchTeamData] Empty team name provided');
      return null;
    }

    console.log(`[fetchTeamData] Searching for team: ${teamName}`);
    
    const url = `${window.API_BASE_URL}/admin/search-team?teamName=${encodeURIComponent(teamName)}`;
    
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      console.log(`[fetchTeamData] Team not found: ${result.error}`);
      return null;
    }

    const teamInfo = {
      name: result.data.name || teamName,
      logo: result.data.logo || null
    };

    console.log(`[fetchTeamData] Found team: ${teamInfo.name}`, teamInfo);
    return teamInfo;
    
  } catch (error) {
    if (error && error.name === 'AbortError') {
      console.log('[fetchTeamData] Request aborted due to new typing input');
      return null;
    }
    console.error('[fetchTeamData] Error fetching team data:', error);
    return null;
  }
}


/**
 * Normalize a team name for comparison and safe matching.
 * @param {string} teamName
 * @returns {string}
 */
function normalizeTeamName(teamName) {
  return String(teamName || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Make safe filename from team name
 * @param {string} teamName - The team name
 * @returns {string} Safe filename
 */
function makeSafeTeamName(teamName) {
  return normalizeTeamName(teamName)
    .replace(/-/g, '-')
    .substring(0, 50);
}

/**
 * Build a manual fallback result when an external API lookup fails.
 * @param {string} teamName
 * @returns {{name: string, logo: null, source: string}}
 */
function buildManualTeamResult(teamName) {
  const cleanName = String(teamName || '').trim();
  return {
    name: cleanName || 'Unknown team',
    logo: null,
    source: 'manual'
  };
}

/**
 * Prevent duplicate rapid searches from triggering redundant API calls.
 * @param {string} previousQuery
 * @param {string} nextQuery
 * @returns {boolean}
 */
function shouldSkipSearchRequest(previousQuery, nextQuery) {
  if (!previousQuery || !nextQuery) return false;
  return normalizeTeamName(previousQuery) === normalizeTeamName(nextQuery);
}

function createDebouncedSearch(searchFn, delayMs = 1000) {
  let timeoutId = null;
  let latestRequestId = 0;

  return function debouncedSearch(query, ...args) {
    const requestId = ++latestRequestId;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      const currentRequestId = requestId;
      const result = await searchFn(query, ...args);
      return { result, requestId: currentRequestId };
    }, delayMs);

    return { requestId, cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }};
  };
}

/**
 * Check if logo already exists in Supabase
 * @param {string} teamName - The team name
 * @returns {Promise<string|null>} Public URL if exists, null otherwise
 */
async function checkCachedLogo(teamName) {
  try {
    if (!window.supabaseClient) {
      console.log('[checkCachedLogo] Supabase client not initialized');
      return null;
    }

    const safeTeamName = makeSafeTeamName(teamName);
    const path = `${safeTeamName}.png`;

    console.log(`[checkCachedLogo] Checking for cached logo: ${path}`);

    const { data, error } = await window.supabaseClient.storage
      .from(HOF_LOGO_BUCKET)
      .list('', {
        limit: 100,
        search: safeTeamName
      });

    if (error) {
      console.warn('[checkCachedLogo] Error listing files:', error);
      return null;
    }

    const matchingFile = data && data.find(file => {
      const name = (file && file.name) ? file.name.toLowerCase() : '';
      return name === `${safeTeamName}.png` || name.startsWith(`${safeTeamName}.`);
    });

    if (matchingFile) {
      const { data: { publicUrl } } = window.supabaseClient.storage
        .from(HOF_LOGO_BUCKET)
        .getPublicUrl(matchingFile.name);

      console.log(`[checkCachedLogo] Cache hit! URL: ${publicUrl}`);
      return publicUrl;
    }

    console.log(`[checkCachedLogo] No cached logo found for: ${teamName}`);
    return null;

  } catch (error) {
    console.error('[checkCachedLogo] Error checking cached logo:', error);
    return null;
  }
}

/**
 * Download image from URL and cache it to Supabase
 * @param {string} teamName - The team name
 * @param {string} imageUrl - The image URL to download
 * @returns {Promise<string|null>} Public Supabase URL or null on failure
 */
async function cacheTeamLogo(teamName, imageUrl) {
  try {
    if (!window.supabaseClient) {
      console.error('[cacheTeamLogo] Supabase client not initialized');
      return null;
    }

    if (!imageUrl) {
      console.warn('[cacheTeamLogo] No image URL provided');
      return null;
    }

    console.log(`[cacheTeamLogo] Caching logo for ${teamName}: ${imageUrl}`);

    // Check if already cached
    const cachedUrl = await checkCachedLogo(teamName);
    if (cachedUrl) {
      console.log('[cacheTeamLogo] Logo already cached, reusing');
      return cachedUrl;
    }

    // Download the image
    console.log('[cacheTeamLogo] Downloading image...');
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const blob = await imageResponse.blob();
    console.log(`[cacheTeamLogo] Image downloaded, size: ${blob.size} bytes`);

    const fileName = `${makeSafeTeamName(teamName)}.png`;

    console.log(`[cacheTeamLogo] Uploading to Supabase (profiles bucket): ${fileName}`);

    const { data, error } = await window.supabaseClient.storage
      .from(HOF_LOGO_BUCKET)
      .upload(fileName, blob, {
        contentType: blob.type || 'image/png',
        upsert: true
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = window.supabaseClient.storage
      .from(HOF_LOGO_BUCKET)
      .getPublicUrl(fileName);

    console.log(`[cacheTeamLogo] Success! Public URL: ${publicUrl}`);
    return publicUrl;

  } catch (error) {
    console.error('[cacheTeamLogo] Error caching logo:', error);
    return null;
  }
}

/**
 * Complete flow: fetch team data and cache logo
 * @param {string} teamName - The team name to search
 * @returns {Promise<{name: string, logo: string}|null>} Complete team info with cached logo URL
 */
async function fetchAndCacheTeamLogo(teamName, options = {}) {
  const { signal } = options;

  try {
    console.log(`[fetchAndCacheTeamLogo] Starting flow for: ${teamName}`);

    const cachedUrl = await checkCachedLogo(teamName);
    
    const teamData = await fetchTeamData(teamName, { signal });
    
    if (!teamData) {
      console.log('[fetchAndCacheTeamLogo] Team not found in API');
      return null;
    }

    if (cachedUrl) {
      console.log('[fetchAndCacheTeamLogo] Using cached logo');
      teamData.logo = cachedUrl;
    } else if (teamData.logo) {
      const cachedLogoUrl = await cacheTeamLogo(teamData.name, teamData.logo);
      if (cachedLogoUrl) {
        teamData.logo = cachedLogoUrl;
      }
    }

    console.log('[fetchAndCacheTeamLogo] Complete result:', teamData);
    return teamData;

  } catch (error) {
    if (error && error.name === 'AbortError') {
      console.log('[fetchAndCacheTeamLogo] Search aborted');
      return null;
    }
    console.error('[fetchAndCacheTeamLogo] Error in complete flow:', error);
    return null;
  }
}

/**
 * Create bucket if it doesn't exist
 * Called during initialization
 */
async function ensureHallOfFameBucket() {
  try {
    if (!window.supabaseClient) {
      console.log('[ensureHallOfFameBucket] Supabase client not initialized');
      return false;
    }

    console.log(`[ensureHallOfFameBucket] Ensuring bucket exists: ${HOF_LOGO_BUCKET}`);

    // Try to list files - this will fail if bucket doesn't exist or we don't have access
    const { error } = await window.supabaseClient.storage
      .from(HOF_LOGO_BUCKET)
      .list('', { limit: 1 });

    if (error) {
      console.warn(`[ensureHallOfFameBucket] Bucket check failed: ${error.message}`);
      // Bucket might not exist or we don't have permission
      return false;
    }

    console.log('[ensureHallOfFameBucket] Bucket ready');
    return true;

  } catch (error) {
    console.error('[ensureHallOfFameBucket] Error:', error);
    return false;
  }
}

// Initialize on script load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    // Ensure bucket is accessible
    if (window.supabaseClient) {
      await ensureHallOfFameBucket();
    }
  });
}

// Make functions globally available
if (typeof window !== 'undefined') {
  window.fetchTeamData = fetchTeamData;
  window.cacheTeamLogo = cacheTeamLogo;
  window.fetchAndCacheTeamLogo = fetchAndCacheTeamLogo;
  window.checkCachedLogo = checkCachedLogo;
  window.makeSafeTeamName = makeSafeTeamName;
  window.buildManualTeamResult = buildManualTeamResult;
  window.shouldSkipSearchRequest = shouldSkipSearchRequest;
  window.createDebouncedSearch = createDebouncedSearch;
  window.ensureHallOfFameBucket = ensureHallOfFameBucket;
}

if (typeof globalThis !== 'undefined') {
  globalThis.fetchTeamData = fetchTeamData;
  globalThis.cacheTeamLogo = cacheTeamLogo;
  globalThis.fetchAndCacheTeamLogo = fetchAndCacheTeamLogo;
  globalThis.checkCachedLogo = checkCachedLogo;
  globalThis.makeSafeTeamName = makeSafeTeamName;
  globalThis.buildManualTeamResult = buildManualTeamResult;
  globalThis.shouldSkipSearchRequest = shouldSkipSearchRequest;
  globalThis.createDebouncedSearch = createDebouncedSearch;
  globalThis.ensureHallOfFameBucket = ensureHallOfFameBucket;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchTeamData,
    cacheTeamLogo,
    fetchAndCacheTeamLogo,
    checkCachedLogo,
    makeSafeTeamName,
    buildManualTeamResult,
    shouldSkipSearchRequest,
    createDebouncedSearch,
    ensureHallOfFameBucket,
    normalizeTeamName
  };
}
