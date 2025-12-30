/**
 * Preferences Store
 * Manages user preferences including locale and alert settings
 * Requirements: 11.1, 11.2, 11.3, 11.4, 12.3
 */

import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AlertSchedule} from '../types/models';
import {UpdateAlertPreferencesRequest} from '../types/api';
import {alertsApiService} from '../services/api/alerts';
import {setLocale as setI18nLocale, SupportedLanguage} from '../i18n';

/**
 * Preferences store state interface
 */
interface PreferencesState {
  locale: SupportedLanguage;
  alertsEnabled: boolean;
  soundEnabled: boolean;
  keepScreenAwake: boolean;
  alertTypes: string[];
  alertSchedule: AlertSchedule | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
}

/**
 * Preferences store actions interface
 */
interface PreferencesActions {
  setLocale: (locale: SupportedLanguage) => void;
  setAlertsEnabled: (enabled: boolean) => Promise<void>;
  setSoundEnabled: (enabled: boolean) => Promise<void>;
  setKeepScreenAwake: (enabled: boolean) => void;
  setAlertTypes: (types: string[]) => Promise<void>;
  setAlertSchedule: (schedule: AlertSchedule | null) => Promise<void>;
  updateAlertPreferences: (
    prefs: Partial<UpdateAlertPreferencesRequest>,
  ) => Promise<void>;
  loadPreferences: () => Promise<void>;
  clearError: () => void;
}

/**
 * Combined preferences store type
 */
type PreferencesStore = PreferencesState & PreferencesActions;

/**
 * Default locale
 */
const DEFAULT_LOCALE: SupportedLanguage = 'pt-BR';

/**
 * Initial preferences state
 */
const initialState: PreferencesState = {
  locale: DEFAULT_LOCALE,
  alertsEnabled: true,
  soundEnabled: true,
  keepScreenAwake: true,
  alertTypes: [],
  alertSchedule: null,
  isLoading: false,
  isSyncing: false,
  error: null,
};

/**
 * Preferences store with persistence
 */
export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Set application locale
       * Requirement 12.3: Allow language change in settings
       */
      setLocale: (locale: SupportedLanguage) => {
        // Update i18n immediately
        setI18nLocale(locale);
        set({locale});
      },

      /**
       * Enable/disable alerts
       * Requirement 11.1: Alert settings screen
       */
      setAlertsEnabled: async (enabled: boolean) => {
        set({alertsEnabled: enabled, isSyncing: true});
        try {
          await alertsApiService.updatePreferences({enabled});
          set({isSyncing: false});
        } catch (error) {
          set({
            isSyncing: false,
            error:
              error instanceof Error ? error.message : 'errors.preferencesSync',
          });
        }
      },

      /**
       * Enable/disable alert sounds
       * Requirement 11.2: Enable/disable sound alerts
       */
      setSoundEnabled: async (enabled: boolean) => {
        set({soundEnabled: enabled, isSyncing: true});
        try {
          await alertsApiService.updatePreferences({soundEnabled: enabled});
          set({isSyncing: false});
        } catch (error) {
          set({
            isSyncing: false,
            error:
              error instanceof Error ? error.message : 'errors.preferencesSync',
          });
        }
      },

      /**
       * Enable/disable keep screen awake
       * Local preference that doesn't sync with backend
       */
      setKeepScreenAwake: (enabled: boolean) => {
        set({keepScreenAwake: enabled});
      },

      /**
       * Set alert types to receive
       * Requirement 11.3: Enable/disable alerts by occurrence type
       */
      setAlertTypes: async (types: string[]) => {
        set({alertTypes: types, isSyncing: true});
        try {
          await alertsApiService.updatePreferences({types});
          set({isSyncing: false});
        } catch (error) {
          set({
            isSyncing: false,
            error:
              error instanceof Error ? error.message : 'errors.preferencesSync',
          });
        }
      },

      /**
       * Set alert schedule
       * Requirement 11.4: Configure alert activation times
       */
      setAlertSchedule: async (schedule: AlertSchedule | null) => {
        set({alertSchedule: schedule, isSyncing: true});
        try {
          await alertsApiService.updatePreferences({schedule});
          set({isSyncing: false});
        } catch (error) {
          set({
            isSyncing: false,
            error:
              error instanceof Error ? error.message : 'errors.preferencesSync',
          });
        }
      },

      /**
       * Update multiple alert preferences at once
       * Requirement 11.5: Sync preferences with backend
       */
      updateAlertPreferences: async (
        prefs: Partial<UpdateAlertPreferencesRequest>,
      ) => {
        set({isSyncing: true, error: null});

        // Update local state immediately
        const updates: Partial<PreferencesState> = {};
        if (prefs.enabled !== undefined) {
          updates.alertsEnabled = prefs.enabled;
        }
        if (prefs.soundEnabled !== undefined) {
          updates.soundEnabled = prefs.soundEnabled;
        }
        if (prefs.types !== undefined) {
          updates.alertTypes = prefs.types;
        }
        if (prefs.schedule !== undefined) {
          updates.alertSchedule = prefs.schedule;
        }

        set(updates);

        try {
          await alertsApiService.updatePreferences(prefs);
          set({isSyncing: false});
        } catch (error) {
          set({
            isSyncing: false,
            error:
              error instanceof Error ? error.message : 'errors.preferencesSync',
          });
          throw error;
        }
      },

      /**
       * Load preferences from backend
       * Requirement 11.6: Load preferences on app start
       */
      loadPreferences: async () => {
        set({isLoading: true, error: null});

        try {
          const preferences = await alertsApiService.getPreferences();

          set({
            alertsEnabled: preferences.enabled,
            soundEnabled: preferences.soundEnabled,
            alertTypes: preferences.types,
            alertSchedule: preferences.schedule,
            isLoading: false,
          });

          // Apply stored locale to i18n
          const {locale} = get();
          setI18nLocale(locale);
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : 'errors.preferencesLoad',
          });
        }
      },

      /**
       * Clear error state
       */
      clearError: () => {
        set({error: null});
      },
    }),
    {
      name: 'preferences-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist all preference state
      partialize: state => ({
        locale: state.locale,
        alertsEnabled: state.alertsEnabled,
        soundEnabled: state.soundEnabled,
        keepScreenAwake: state.keepScreenAwake,
        alertTypes: state.alertTypes,
        alertSchedule: state.alertSchedule,
      }),
    },
  ),
);

export default usePreferencesStore;
