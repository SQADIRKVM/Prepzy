import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';

// Free notification sounds from Mixkit (reliable CDN)
// Using MP3 format which works on both iOS and Android
const NOTIFICATION_SOUND_BASE_URL = 'https://assets.mixkit.co/sfx/download/';
const NOTIFICATION_SOUNDS: { [key: string]: string } = {
  'Default': `${NOTIFICATION_SOUND_BASE_URL}mixkit-arcade-game-jump-coin-216.mp3`,
  'Chime': `${NOTIFICATION_SOUND_BASE_URL}mixkit-arcade-retro-game-over-213.mp3`,
  'Bell': `${NOTIFICATION_SOUND_BASE_URL}mixkit-arcade-game-jump-coin-216.mp3`,
  'Ding': `${NOTIFICATION_SOUND_BASE_URL}mixkit-arcade-retro-game-over-213.mp3`,
  'Alert': `${NOTIFICATION_SOUND_BASE_URL}mixkit-arcade-game-jump-coin-216.mp3`,
  'Gentle': `${NOTIFICATION_SOUND_BASE_URL}mixkit-arcade-retro-game-over-213.mp3`,
  'Digital': `${NOTIFICATION_SOUND_BASE_URL}mixkit-arcade-game-jump-coin-216.mp3`,
  'Classic': `${NOTIFICATION_SOUND_BASE_URL}mixkit-arcade-retro-game-over-213.mp3`,
};

// Use different unique sounds for each option (from Mixkit free sounds)
// Note: These are placeholder URLs - you can replace with actual unique sound URLs
const UNIQUE_SOUNDS: { [key: string]: string } = {
  'Chime': `${NOTIFICATION_SOUND_BASE_URL}mixkit-arcade-retro-game-over-213.mp3`,
  'Bell': `${NOTIFICATION_SOUND_BASE_URL}mixkit-arcade-game-jump-coin-216.mp3`,
  'Ding': `${NOTIFICATION_SOUND_BASE_URL}mixkit-arcade-retro-game-over-213.mp3`,
  'Alert': `${NOTIFICATION_SOUND_BASE_URL}mixkit-arcade-game-jump-coin-216.mp3`,
  'Gentle': `${NOTIFICATION_SOUND_BASE_URL}mixkit-arcade-retro-game-over-213.mp3`,
  'Digital': `${NOTIFICATION_SOUND_BASE_URL}mixkit-arcade-game-jump-coin-216.mp3`,
  'Classic': `${NOTIFICATION_SOUND_BASE_URL}mixkit-arcade-retro-game-over-213.mp3`,
};

const SOUNDS_DIR = `${FileSystem.documentDirectory}sounds/`;
const SOUND_CACHE_KEY = '@notification_sounds_cache';

interface SoundCache {
  [soundName: string]: {
    localUri: string;
    downloadedAt: string;
  };
}

/**
 * Initialize sounds directory
 */
export async function initializeSoundsDirectory(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(SOUNDS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(SOUNDS_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error('[SoundService] Failed to create sounds directory:', error);
  }
}

/**
 * Get sound URL for a given sound name
 */
function getSoundUrl(soundName: string): string | null {
  if (soundName === 'None (Silent)' || soundName === 'None' || soundName === 'Default') {
    return null; // Use system default
  }

  // Return sound URL from notification sounds (use unique sounds if available)
  return UNIQUE_SOUNDS[soundName] || NOTIFICATION_SOUNDS[soundName] || null;
}

/**
 * Download and cache a sound file
 */
export async function downloadSound(soundName: string): Promise<string | null> {
  try {
    await initializeSoundsDirectory();

    const soundUrl = getSoundUrl(soundName);
    if (!soundUrl) {
      return null; // Use system default
    }

    // Check cache
    const safeFileName = soundName.replace(/[^a-zA-Z0-9]/g, '_');
    const cacheData = await FileSystem.getInfoAsync(`${SOUNDS_DIR}${safeFileName}.mp3`);
    if (cacheData.exists && cacheData.uri) {
      return cacheData.uri;
    }

    // Download sound - use mp3 for both platforms (iOS supports mp3 in notifications)
    const fileUri = `${SOUNDS_DIR}${soundName.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
    const downloadResult = await FileSystem.downloadAsync(soundUrl, fileUri);

    if (downloadResult.status === 200 && downloadResult.uri) {
      // Update cache
      const cache: SoundCache = {};
      try {
        const cached = await FileSystem.readAsStringAsync(`${FileSystem.documentDirectory}${SOUND_CACHE_KEY}.json`);
        Object.assign(cache, JSON.parse(cached));
      } catch (e) {
        // Cache doesn't exist, create new
      }
      cache[soundName] = {
        localUri: downloadResult.uri,
        downloadedAt: new Date().toISOString(),
      };
      await FileSystem.writeAsStringAsync(
        `${FileSystem.documentDirectory}${SOUND_CACHE_KEY}.json`,
        JSON.stringify(cache)
      );

      return downloadResult.uri;
    }

    return null;
  } catch (error) {
    console.error(`[SoundService] Failed to download sound ${soundName}:`, error);
    return null;
  }
}

/**
 * Get local URI for a sound (downloads if not cached)
 */
export async function getSoundUri(soundName: string): Promise<string | null> {
  if (soundName === 'None (Silent)' || soundName === 'None') {
    return null; // No sound
  }

  if (soundName === 'Default') {
    return null; // Use system default
  }

  try {
    // Check cache first
    try {
      const cacheFile = `${FileSystem.documentDirectory}${SOUND_CACHE_KEY}.json`;
      const cacheInfo = await FileSystem.getInfoAsync(cacheFile);
      
      if (cacheInfo.exists) {
        const cacheData = await FileSystem.readAsStringAsync(cacheFile);
        const cache: SoundCache = JSON.parse(cacheData);
        
        if (cache[soundName] && cache[soundName].localUri) {
          const fileInfo = await FileSystem.getInfoAsync(cache[soundName].localUri);
          if (fileInfo.exists) {
            return cache[soundName].localUri;
          }
        }
      }
    } catch (error) {
      // Cache read failed, continue to download
      console.log('[SoundService] Cache read failed, will download:', error);
    }

    // Download if not cached
    return await downloadSound(soundName);
  } catch (error) {
    console.error(`[SoundService] Failed to get sound URI for ${soundName}:`, error);
    return null;
  }
}

/**
 * Preload all sounds (optional - can be called on app start)
 */
export async function preloadSounds(): Promise<void> {
  const soundNames = ['Chime', 'Bell', 'Ding', 'Alert', 'Gentle', 'Digital', 'Classic'];
  await Promise.all(soundNames.map(name => downloadSound(name)));
}

/**
 * Clear sound cache
 */
export async function clearSoundCache(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(SOUNDS_DIR);
    if (dirInfo.exists) {
      const files = await FileSystem.readDirectoryAsync(SOUNDS_DIR);
      await Promise.all(files.map(file => FileSystem.deleteAsync(`${SOUNDS_DIR}${file}`, { idempotent: true })));
    }
    await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${SOUND_CACHE_KEY}.json`, { idempotent: true });
  } catch (error) {
    console.error('[SoundService] Failed to clear sound cache:', error);
  }
}

