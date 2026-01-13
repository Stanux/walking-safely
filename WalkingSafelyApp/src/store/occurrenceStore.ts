/**
 * Occurrence Store
 * Manages occurrence state for risk points on the map
 * Requirements: 2.1, 4.5, 4.6, 5.2
 */

import {create} from 'zustand';
import {
  Occurrence,
  CreateOccurrenceData,
  MapBounds,
  OccurrenceSeverity,
} from '../types/models';
import {occurrencesService} from '../services/api/occurrences';

/**
 * Occurrence form data for validation
 */
export interface OccurrenceFormData {
  crimeTypeId: string | null;
  severity: OccurrenceSeverity | null;
  description?: string;
}

/**
 * Occurrence store state interface
 */
export interface OccurrenceState {
  occurrences: Occurrence[];
  isLoading: boolean;
  error: string | null;
  selectedOccurrence: Occurrence | null;
  isCreating: boolean;
  createError: string | null;
}

/**
 * Occurrence store actions interface
 */
export interface OccurrenceActions {
  fetchOccurrences: (bounds: MapBounds) => Promise<void>;
  createOccurrence: (data: CreateOccurrenceData) => Promise<Occurrence>;
  deleteOccurrence: (id: string) => Promise<void>;
  selectOccurrence: (occurrence: Occurrence | null) => void;
  clearError: () => void;
  clearCreateError: () => void;
  reset: () => void;
}

/**
 * Combined occurrence store type
 */
export type OccurrenceStore = OccurrenceState & OccurrenceActions;

/**
 * Initial occurrence state
 */
const initialState: OccurrenceState = {
  occurrences: [],
  isLoading: false,
  error: null,
  selectedOccurrence: null,
  isCreating: false,
  createError: null,
};

/**
 * Validate occurrence form data
 * Requirement 4.6: Prevent submission if type or severity not selected
 * @returns Error message if invalid, null if valid
 */
export function validateOccurrenceForm(data: OccurrenceFormData): string | null {
  if (!data.crimeTypeId || data.crimeTypeId.trim() === '') {
    return 'errors.occurrenceTypeRequired';
  }
  
  if (!data.severity) {
    return 'errors.severityRequired';
  }
  
  const validSeverities: OccurrenceSeverity[] = ['low', 'medium', 'high', 'critical'];
  if (!validSeverities.includes(data.severity)) {
    return 'errors.invalidSeverity';
  }
  
  return null;
}

/**
 * Occurrence store
 */
export const useOccurrenceStore = create<OccurrenceStore>()((set, get) => ({
  ...initialState,

  /**
   * Fetch occurrences within map bounds
   * Requirement 2.1: Display all risk points within visible map area
   */
  fetchOccurrences: async (bounds: MapBounds) => {
    set({isLoading: true, error: null});

    try {
      const occurrences = await occurrencesService.getNearby({bounds});
      
      set({
        occurrences,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'errors.fetchOccurrences';
      set({
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  /**
   * Create a new occurrence
   * Requirement 4.5: Register occurrence with captured coordinates
   * Requirement 5.2: Return to map showing new risk point
   */
  createOccurrence: async (data: CreateOccurrenceData) => {
    // Validate form data before submission (Requirement 4.6)
    const validationError = validateOccurrenceForm({
      crimeTypeId: data.crimeTypeId,
      severity: data.severity,
      description: data.description,
    });
    
    if (validationError) {
      set({createError: validationError});
      throw new Error(validationError);
    }

    set({isCreating: true, createError: null});

    try {
      const response = await occurrencesService.create(data);
      
      // Add the new occurrence to the list
      const newOccurrence = response.occurrence;
      const currentOccurrences = get().occurrences;
      
      set({
        occurrences: [...currentOccurrences, newOccurrence],
        isCreating: false,
      });
      
      return newOccurrence;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'errors.createOccurrence';
      set({
        isCreating: false,
        createError: errorMessage,
      });
      throw error;
    }
  },

  /**
   * Select an occurrence for viewing details
   * Requirement 3.1: Display popup with occurrence details when tapped
   */
  selectOccurrence: (occurrence: Occurrence | null) => {
    set({selectedOccurrence: occurrence});
  },

  /**
   * Delete an occurrence
   */
  deleteOccurrence: async (id: string) => {
    try {
      await occurrencesService.delete(id);
      
      // Remove from local state
      const currentOccurrences = get().occurrences;
      set({
        occurrences: currentOccurrences.filter(occ => occ.id !== id),
        selectedOccurrence: null,
      });
    } catch (error) {
      console.error('[OccurrenceStore] Error deleting occurrence:', error);
      throw error;
    }
  },

  /**
   * Clear fetch error state
   */
  clearError: () => {
    set({error: null});
  },

  /**
   * Clear create error state
   */
  clearCreateError: () => {
    set({createError: null});
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set(initialState);
  },
}));

export default useOccurrenceStore;
