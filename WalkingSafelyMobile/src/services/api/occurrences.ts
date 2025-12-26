/**
 * Occurrences API Service
 * Handles occurrence creation, listing, and retrieval
 */

import {apiClient} from './client';
import {
  ListOccurrencesRequest,
  CreateOccurrenceResponse,
  PaginatedResponse,
  RateLimitInfo,
} from '../../types/api';
import {Occurrence, CreateOccurrenceData} from '../../types/models';

/**
 * Occurrences service interface
 */
export interface OccurrencesService {
  create(data: CreateOccurrenceData): Promise<CreateOccurrenceResponse>;
  list(params?: ListOccurrencesRequest): Promise<PaginatedResponse<Occurrence>>;
  getById(id: string): Promise<Occurrence>;
  getRateLimitInfo(): Promise<RateLimitInfo>;
  getNearby(params: NearbyOccurrencesParams): Promise<Occurrence[]>;
}

/**
 * Occurrences API endpoints
 */
const OCCURRENCES_ENDPOINTS = {
  BASE: '/occurrences',
  RATE_LIMIT: '/occurrences/rate-limit',
} as const;

/**
 * Parameters for fetching occurrences near a location
 */
export interface NearbyOccurrencesParams {
  latitude?: number;
  longitude?: number;
  radius?: number; // in meters, default 1000
  days?: number; // filter by recent days
  crimeTypeId?: string;
  // Bounds-based query (alternative to lat/lng/radius)
  bounds?: {
    northEast: { latitude: number; longitude: number };
    southWest: { latitude: number; longitude: number };
  };
}

/**
 * Build query string from request parameters
 */
const buildQueryParams = (params?: ListOccurrencesRequest): string => {
  if (!params) {
    return '';
  }

  const queryParams = new URLSearchParams();

  if (params.bounds) {
    queryParams.append('ne_lat', params.bounds.northEast.latitude.toString());
    queryParams.append('ne_lng', params.bounds.northEast.longitude.toString());
    queryParams.append('sw_lat', params.bounds.southWest.latitude.toString());
    queryParams.append('sw_lng', params.bounds.southWest.longitude.toString());
  }

  if (params.crimeTypes?.length) {
    params.crimeTypes.forEach(type =>
      queryParams.append('crime_types[]', type),
    );
  }

  if (params.severity?.length) {
    params.severity.forEach(sev => queryParams.append('severity[]', sev));
  }

  if (params.startDate) {
    queryParams.append('start_date', params.startDate);
  }

  if (params.endDate) {
    queryParams.append('end_date', params.endDate);
  }

  if (params.page) {
    queryParams.append('page', params.page.toString());
  }

  if (params.perPage) {
    queryParams.append('per_page', params.perPage.toString());
  }

  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Occurrences service implementation
 */
export const occurrencesService: OccurrencesService = {
  /**
   * Create a new occurrence report
   */
  async create(data: CreateOccurrenceData): Promise<CreateOccurrenceResponse> {
    console.log('[OccurrencesService] Creating occurrence:', JSON.stringify(data));
    
    const response = await apiClient.post<CreateOccurrenceResponse>(
      OCCURRENCES_ENDPOINTS.BASE,
      {
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        timestamp: data.timestamp,
        crime_type_id: parseInt(data.crimeTypeId, 10),
        severity: data.severity,
        // user_location is required by backend to validate proximity
        user_location: {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
        },
        metadata: data.description ? { description: data.description } : undefined,
      },
    );
    
    console.log('[OccurrencesService] Response:', JSON.stringify(response));
    return response;
  },

  /**
   * List occurrences with optional filters
   */
  async list(
    params?: ListOccurrencesRequest,
  ): Promise<PaginatedResponse<Occurrence>> {
    const queryString = buildQueryParams(params);
    return apiClient.get<PaginatedResponse<Occurrence>>(
      `${OCCURRENCES_ENDPOINTS.BASE}${queryString}`,
    );
  },

  /**
   * Get a single occurrence by ID
   */
  async getById(id: string): Promise<Occurrence> {
    return apiClient.get<Occurrence>(`${OCCURRENCES_ENDPOINTS.BASE}/${id}`);
  },

  /**
   * Get current rate limit information for the user
   */
  async getRateLimitInfo(): Promise<RateLimitInfo> {
    return apiClient.get<RateLimitInfo>(OCCURRENCES_ENDPOINTS.RATE_LIMIT);
  },

  /**
   * Get occurrences near a specific location or within bounds
   */
  async getNearby(params: NearbyOccurrencesParams): Promise<Occurrence[]> {
    const queryParams = new URLSearchParams();
    
    // Use bounds if provided, otherwise use lat/lng/radius
    if (params.bounds) {
      // Calculate center point from bounds for the API
      const centerLat = (params.bounds.northEast.latitude + params.bounds.southWest.latitude) / 2;
      const centerLng = (params.bounds.northEast.longitude + params.bounds.southWest.longitude) / 2;
      
      // Calculate approximate radius from bounds (in meters)
      const latDiff = Math.abs(params.bounds.northEast.latitude - params.bounds.southWest.latitude);
      const lngDiff = Math.abs(params.bounds.northEast.longitude - params.bounds.southWest.longitude);
      const maxDiff = Math.max(latDiff, lngDiff);
      const radiusKm = maxDiff * 111; // ~111km per degree
      const radiusMeters = Math.min(radiusKm * 1000, 10000); // Cap at 10km
      
      queryParams.append('latitude', centerLat.toString());
      queryParams.append('longitude', centerLng.toString());
      queryParams.append('radius', radiusMeters.toString());
    } else if (params.latitude !== undefined && params.longitude !== undefined) {
      queryParams.append('latitude', params.latitude.toString());
      queryParams.append('longitude', params.longitude.toString());
      queryParams.append('radius', (params.radius || 2000).toString());
    }
    
    if (params.days) {
      queryParams.append('days', params.days.toString());
    }
    
    if (params.crimeTypeId) {
      queryParams.append('crime_type_id', params.crimeTypeId);
    }
    
    queryParams.append('per_page', '100'); // Get more results for map display

    const response = await apiClient.get<{data: any[]; meta: any}>(
      `${OCCURRENCES_ENDPOINTS.BASE}?${queryParams.toString()}`,
    );
    
    // Map backend response to frontend Occurrence type
    return (response.data || []).map((item: any) => ({
      id: String(item.id),
      timestamp: item.timestamp,
      location: item.location || { latitude: 0, longitude: 0 },
      crimeType: item.crime_type ? {
        id: String(item.crime_type.id),
        name: item.crime_type.name || 'Ocorrência',
        categoryId: '1',
      } : { id: '0', name: 'Ocorrência', categoryId: '1' },
      severity: item.severity?.value || 'medium',
      confidenceScore: item.confidence_score || 0,
      source: item.source || 'collaborative',
    }));
  },
};

export default occurrencesService;
