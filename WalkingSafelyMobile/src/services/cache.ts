/**
 * Cache Service
 * Implements local caching for frequently accessed data
 * Requirements: 15.3 - Implement local cache for frequently accessed data (taxonomy, preferences)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {CrimeType, CrimeCategory, AlertPreferences} from '../types/models';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Cache configuration
 */
interface CacheConfig {
  /** Default TTL in milliseconds (1 hour) */
  defaultTTL: number;
  /** Taxonomy TTL in milliseconds (24 hours) */
  taxonomyTTL: number;
  /** Preferences TTL in milliseconds (5 minutes) */
  preferencesTTL: number;
}

/**
 * Cache keys
 */
const CACHE_KEYS = {
  CRIME_TYPES: '@cache/crime_types',
  CRIME_CATEGORIES: '@cache/crime_categories',
  PREFERENCES: '@cache/preferences',
  TAXONOMY_VERSION: '@cache/taxonomy_version',
} as const;

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 60 * 60 * 1000, // 1 hour
  taxonomyTTL: 24 * 60 * 60 * 1000, // 24 hours
  preferencesTTL: 5 * 60 * 1000, // 5 minutes
};

/**
 * Taxonomy data structure
 */
export interface TaxonomyData {
  crimeTypes: CrimeType[];
  categories: CrimeCategory[];
}

/**
 * Cache service interface
 */
export interface CacheService {
  // Crime taxonomy cache
  getCrimeTypes(): Promise<CrimeType[] | null>;
  setCrimeTypes(types: CrimeType[]): Promise<void>;
  getCrimeCategories(): Promise<CrimeCategory[] | null>;
  setCrimeCategories(categories: CrimeCategory[]): Promise<void>;
  getTaxonomyVersion(): Promise<string | null>;
  setTaxonomyVersion(version: string): Promise<void>;
  getTaxonomy(): Promise<TaxonomyData | null>;
  setTaxonomy(data: TaxonomyData): Promise<void>;

  // Preferences cache
  getPreferences(): Promise<AlertPreferences | null>;
  setPreferences(preferences: AlertPreferences): Promise<void>;

  // Cache management
  invalidate(key: string): Promise<void>;
  invalidateAll(): Promise<void>;
  invalidateTaxonomy(): Promise<void>;
  invalidatePreferences(): Promise<void>;
  isValid(key: string): Promise<boolean>;

  // Generic cache operations
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, data: T, ttl?: number): Promise<void>;
}

/**
 * Create a cache entry with expiration
 */
const createCacheEntry = <T>(data: T, ttl: number): CacheEntry<T> => {
  const now = Date.now();
  return {
    data,
    timestamp: now,
    expiresAt: now + ttl,
  };
};

/**
 * Check if a cache entry is still valid
 */
const isCacheEntryValid = <T>(entry: CacheEntry<T> | null): boolean => {
  if (!entry) {
    return false;
  }
  return Date.now() < entry.expiresAt;
};

/**
 * Cache service implementation
 */
class CacheServiceImpl implements CacheService {
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {...DEFAULT_CONFIG, ...config};
  }

  /**
   * Get cached crime types
   */
  async getCrimeTypes(): Promise<CrimeType[] | null> {
    return this.get<CrimeType[]>(CACHE_KEYS.CRIME_TYPES);
  }

  /**
   * Cache crime types
   */
  async setCrimeTypes(types: CrimeType[]): Promise<void> {
    await this.set(CACHE_KEYS.CRIME_TYPES, types, this.config.taxonomyTTL);
  }

  /**
   * Get cached crime categories
   */
  async getCrimeCategories(): Promise<CrimeCategory[] | null> {
    return this.get<CrimeCategory[]>(CACHE_KEYS.CRIME_CATEGORIES);
  }

  /**
   * Cache crime categories
   */
  async setCrimeCategories(categories: CrimeCategory[]): Promise<void> {
    await this.set(
      CACHE_KEYS.CRIME_CATEGORIES,
      categories,
      this.config.taxonomyTTL,
    );
  }

  /**
   * Get cached taxonomy version
   */
  async getTaxonomyVersion(): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(CACHE_KEYS.TAXONOMY_VERSION);
      return value;
    } catch (error) {
      console.error('Error getting taxonomy version from cache:', error);
      return null;
    }
  }

  /**
   * Cache taxonomy version
   */
  async setTaxonomyVersion(version: string): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.TAXONOMY_VERSION, version);
    } catch (error) {
      console.error('Error setting taxonomy version in cache:', error);
    }
  }

  /**
   * Get complete taxonomy (crime types and categories)
   */
  async getTaxonomy(): Promise<TaxonomyData | null> {
    const crimeTypes = await this.getCrimeTypes();
    const categories = await this.getCrimeCategories();

    if (crimeTypes && categories) {
      return {crimeTypes, categories};
    }

    return null;
  }

  /**
   * Cache complete taxonomy
   */
  async setTaxonomy(data: TaxonomyData): Promise<void> {
    await this.setCrimeTypes(data.crimeTypes);
    await this.setCrimeCategories(data.categories);
  }

  /**
   * Get cached preferences
   */
  async getPreferences(): Promise<AlertPreferences | null> {
    return this.get<AlertPreferences>(CACHE_KEYS.PREFERENCES);
  }

  /**
   * Cache preferences
   */
  async setPreferences(preferences: AlertPreferences): Promise<void> {
    await this.set(
      CACHE_KEYS.PREFERENCES,
      preferences,
      this.config.preferencesTTL,
    );
  }

  /**
   * Invalidate a specific cache key
   */
  async invalidate(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error invalidating cache key ${key}:`, error);
    }
  }

  /**
   * Invalidate all cache entries
   */
  async invalidateAll(): Promise<void> {
    try {
      const keys = Object.values(CACHE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error invalidating all cache:', error);
    }
  }

  /**
   * Invalidate taxonomy cache (crime types and categories)
   */
  async invalidateTaxonomy(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        CACHE_KEYS.CRIME_TYPES,
        CACHE_KEYS.CRIME_CATEGORIES,
        CACHE_KEYS.TAXONOMY_VERSION,
      ]);
    } catch (error) {
      console.error('Error invalidating taxonomy cache:', error);
    }
  }

  /**
   * Invalidate preferences cache
   */
  async invalidatePreferences(): Promise<void> {
    await this.invalidate(CACHE_KEYS.PREFERENCES);
  }

  /**
   * Check if a cache entry is still valid
   */
  async isValid(key: string): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (!value) {
        return false;
      }
      const entry = JSON.parse(value) as CacheEntry<unknown>;
      return isCacheEntryValid(entry);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generic get from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (!value) {
        return null;
      }

      const entry = JSON.parse(value) as CacheEntry<T>;

      if (!isCacheEntryValid(entry)) {
        // Cache expired, remove it
        await this.invalidate(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Generic set to cache
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const entry = createCacheEntry(data, ttl ?? this.config.defaultTTL);
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error(`Error setting cache key ${key}:`, error);
    }
  }
}

/**
 * Singleton cache service instance
 */
export const cacheService: CacheService = new CacheServiceImpl();

/**
 * Export cache keys for external use
 */
export {CACHE_KEYS};

/**
 * Export types
 */
export type {CacheConfig, CacheEntry};

export default cacheService;
