/**
 * Geocoding API Service
 * Handles address search and reverse geocoding
 */

import {apiClient} from './client';
import {
  GeocodeRequest,
  GeocodeResponse,
  ReverseGeocodeRequest,
  ReverseGeocodeResponse,
} from '../../types/api';
import {Coordinates, Address} from '../../types/models';
import {MAX_SEARCH_RESULTS} from '../../utils/constants';

/**
 * Geocoding service interface
 */
export interface GeocodingService {
  search(query: string, limit?: number): Promise<Address[]>;
  reverseGeocode(coordinates: Coordinates): Promise<Address>;
}

/**
 * Geocoding API endpoints
 */
const GEOCODING_ENDPOINTS = {
  SEARCH: '/geocode',
  REVERSE: '/reverse-geocode',
} as const;

/**
 * Backend address response structure (snake_case)
 */
interface BackendAddress {
  formatted_address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}

/**
 * Geocoding service implementation
 */
export const geocodingService: GeocodingService = {
  /**
   * Search for addresses by query string
   */
  async search(
    query: string,
    limit: number = MAX_SEARCH_RESULTS,
  ): Promise<Address[]> {
    console.log('[GeocodingService] Searching for:', query);
    const response = await apiClient.get<{data: BackendAddress[]; count: number}>(
      `${GEOCODING_ENDPOINTS.SEARCH}?query=${encodeURIComponent(query)}&limit=${limit}`,
    );

    console.log('[GeocodingService] Raw response:', JSON.stringify(response));

    // Handle different response structures - apiClient may already extract data
    let addresses: BackendAddress[] = [];
    
    if (response && typeof response === 'object') {
      if (Array.isArray(response.data)) {
        addresses = response.data;
      } else if (Array.isArray(response)) {
        addresses = response as unknown as BackendAddress[];
      }
    }
    
    console.log('[GeocodingService] Addresses array:', addresses?.length || 0);

    if (!Array.isArray(addresses) || addresses.length === 0) {
      console.log('[GeocodingService] No addresses found');
      return [];
    }

    // Map backend snake_case to frontend camelCase and add unique id
    const result: Address[] = addresses.map((addr, index) => ({
      id: `addr_${Date.now()}_${index}`,
      formattedAddress: addr.formatted_address || '',
      coordinates: {
        latitude: addr.coordinates?.latitude || 0,
        longitude: addr.coordinates?.longitude || 0,
      },
      city: addr.city,
      state: addr.state,
      country: addr.country,
    }));
    
    console.log('[GeocodingService] Processed addresses:', result.length);
    console.log('[GeocodingService] First result:', JSON.stringify(result[0]));
    return result;
  },

  /**
   * Get address from coordinates (reverse geocoding)
   */
  async reverseGeocode(coordinates: Coordinates): Promise<Address> {
    const response = await apiClient.get<{data: BackendAddress}>(
      `${GEOCODING_ENDPOINTS.REVERSE}?lat=${coordinates.latitude}&lng=${coordinates.longitude}`,
    );

    const addr = response.data || (response as unknown as BackendAddress);

    return {
      id: `addr_${Date.now()}`,
      formattedAddress: addr.formatted_address || '',
      coordinates: {
        latitude: addr.coordinates?.latitude || coordinates.latitude,
        longitude: addr.coordinates?.longitude || coordinates.longitude,
      },
      city: addr.city,
      state: addr.state,
      country: addr.country,
    };
  },
};

export default geocodingService;
