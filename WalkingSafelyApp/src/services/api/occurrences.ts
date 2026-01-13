/**
 * Occurrences Service
 * API service for occurrences/risk points
 */

import {apiClient} from '../../shared/services/api';
import {Occurrence, CreateOccurrenceData, MapBounds} from '../../types/models';

export interface OccurrencesService {
  getOccurrences(bounds: MapBounds): Promise<Occurrence[]>;
  getNearby(params: {bounds: MapBounds}): Promise<Occurrence[]>;
  create(data: CreateOccurrenceData): Promise<{occurrence: Occurrence}>;
  getOccurrenceById(id: string): Promise<Occurrence>;
  delete(id: string): Promise<void>;
}

/**
 * Map backend occurrence to frontend format
 */
const mapOccurrence = (occ: any): Occurrence => ({
  id: String(occ.id),
  timestamp: occ.timestamp || occ.created_at,
  location: {
    latitude: occ.location?.latitude || occ.latitude,
    longitude: occ.location?.longitude || occ.longitude,
  },
  crimeType: occ.crime_type ? {
    id: String(occ.crime_type.id),
    name: occ.crime_type.name,
    categoryId: String(occ.crime_type.category_id || '1'),
  } : {
    id: '1',
    name: occ.crime_type_name || 'Ocorrência',
    categoryId: '1',
  },
  severity: occ.severity?.value || occ.severity || 'medium',
  confidenceScore: occ.confidence_score || 1,
  source: occ.source || 'collaborative',
  createdBy: occ.created_by || null,
});

/**
 * Occurrences service implementation
 */
export const occurrencesService: OccurrencesService = {
  /**
   * Get occurrences within the given bounds
   */
  async getOccurrences(bounds: MapBounds): Promise<Occurrence[]> {
    return this.getNearby({bounds});
  },

  /**
   * Get nearby occurrences within bounds
   */
  async getNearby(params: {bounds: MapBounds}): Promise<Occurrence[]> {
    try {
      const {bounds} = params;
      
      // Calculate center point and radius from bounds
      const centerLat = (bounds.northEast.latitude + bounds.southWest.latitude) / 2;
      const centerLng = (bounds.northEast.longitude + bounds.southWest.longitude) / 2;
      
      // Calculate radius in meters (approximate)
      const latDiff = Math.abs(bounds.northEast.latitude - bounds.southWest.latitude);
      const lngDiff = Math.abs(bounds.northEast.longitude - bounds.southWest.longitude);
      // 1 degree latitude ≈ 111km, 1 degree longitude varies by latitude
      const latMeters = latDiff * 111000;
      const lngMeters = lngDiff * 111000 * Math.cos(centerLat * Math.PI / 180);
      const radius = Math.max(latMeters, lngMeters) / 2;
      
      console.log('[OccurrencesService] Fetching occurrences at:', {centerLat, centerLng, radius});
      
      const response = await apiClient.get('/occurrences', {
        params: {
          latitude: centerLat,
          longitude: centerLng,
          radius: Math.min(radius, 50000), // Max 50km as per API
          per_page: 100, // Get more results
        },
      });
      
      const data = response.data?.data || response.data || [];
      const occurrences = Array.isArray(data) ? data : (data.occurrences || []);
      
      console.log('[OccurrencesService] Fetched occurrences:', occurrences.length);
      
      return occurrences.map(mapOccurrence);
    } catch (error) {
      console.error('[OccurrencesService] Error fetching occurrences:', error);
      return [];
    }
  },

  /**
   * Create a new occurrence
   */
  async create(data: CreateOccurrenceData): Promise<{occurrence: Occurrence}> {
    try {
      const response = await apiClient.post('/occurrences', {
        crime_type_id: data.crimeTypeId,
        severity: data.severity,
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        user_location: {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
        },
        metadata: data.description ? [{ key: 'description', value: data.description }] : [],
      });
      
      const occData = response.data?.data || response.data;
      return {
        occurrence: mapOccurrence(occData),
      };
    } catch (error) {
      console.error('[OccurrencesService] Error creating occurrence:', error);
      throw error;
    }
  },

  /**
   * Get occurrence by ID
   */
  async getOccurrenceById(id: string): Promise<Occurrence> {
    try {
      const response = await apiClient.get(`/occurrences/${id}`);
      const occData = response.data?.data || response.data;
      return mapOccurrence(occData);
    } catch (error) {
      console.error('[OccurrencesService] Error fetching occurrence:', error);
      throw error;
    }
  },

  /**
   * Delete an occurrence
   */
  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/occurrences/${id}`);
    } catch (error) {
      console.error('[OccurrencesService] Error deleting occurrence:', error);
      throw error;
    }
  },
};
