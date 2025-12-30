/**
 * Navigation Types
 * Type definitions for React Navigation stack and tab navigators
 */

import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type {Coordinates, RouteResponse, Occurrence} from './models';

/**
 * Auth Stack Navigator param list
 */
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

/**
 * Map Stack Navigator param list
 */
export type MapStackParamList = {
  MapHome: undefined;
  SearchResults: {
    query: string;
  };
  RoutePreview: {
    origin: Coordinates;
    destination: Coordinates;
    destinationAddress?: string;
  };
  ActiveNavigation: {
    route: RouteResponse;
    sessionId: string;
  };
  ReportOccurrence: {
    location?: Coordinates;
  };
  OccurrenceDetail: {
    occurrenceId: string;
    occurrence?: Occurrence;
  };
};

/**
 * Settings Stack Navigator param list
 */
export type SettingsStackParamList = {
  SettingsHome: undefined;
  GeneralSettings: undefined;
  AlertPreferences: undefined;
  LanguageSettings: undefined;
  PrivacySettings: undefined;
  About: undefined;
};

/**
 * Statistics Stack Navigator param list
 */
export type StatisticsStackParamList = {
  StatisticsHome: undefined;
  RegionDetail: {
    regionId: string;
  };
};

/**
 * Main Tab Navigator param list
 */
export type MainTabParamList = {
  Map: NavigatorScreenParams<MapStackParamList>;
  Statistics: NavigatorScreenParams<StatisticsStackParamList>;
  Settings: NavigatorScreenParams<SettingsStackParamList>;
};

/**
 * Root Navigator param list
 */
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

// Auth Stack Screen Props
export type WelcomeScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'Welcome'
>;
export type LoginScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'Login'
>;
export type RegisterScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'Register'
>;

// Map Stack Screen Props
export type MapHomeScreenProps = CompositeScreenProps<
  NativeStackScreenProps<MapStackParamList, 'MapHome'>,
  BottomTabScreenProps<MainTabParamList>
>;

export type SearchResultsScreenProps = NativeStackScreenProps<
  MapStackParamList,
  'SearchResults'
>;
export type RoutePreviewScreenProps = NativeStackScreenProps<
  MapStackParamList,
  'RoutePreview'
>;
export type ActiveNavigationScreenProps = NativeStackScreenProps<
  MapStackParamList,
  'ActiveNavigation'
>;
export type ReportOccurrenceScreenProps = NativeStackScreenProps<
  MapStackParamList,
  'ReportOccurrence'
>;
export type OccurrenceDetailScreenProps = NativeStackScreenProps<
  MapStackParamList,
  'OccurrenceDetail'
>;

// Settings Stack Screen Props
export type SettingsHomeScreenProps = CompositeScreenProps<
  NativeStackScreenProps<SettingsStackParamList, 'SettingsHome'>,
  BottomTabScreenProps<MainTabParamList>
>;

export type AlertPreferencesScreenProps = NativeStackScreenProps<
  SettingsStackParamList,
  'AlertPreferences'
>;
export type GeneralSettingsScreenProps = NativeStackScreenProps<
  SettingsStackParamList,
  'GeneralSettings'
>;
export type LanguageSettingsScreenProps = NativeStackScreenProps<
  SettingsStackParamList,
  'LanguageSettings'
>;
export type PrivacySettingsScreenProps = NativeStackScreenProps<
  SettingsStackParamList,
  'PrivacySettings'
>;
export type AboutScreenProps = NativeStackScreenProps<
  SettingsStackParamList,
  'About'
>;

// Statistics Stack Screen Props
export type StatisticsHomeScreenProps = CompositeScreenProps<
  NativeStackScreenProps<StatisticsStackParamList, 'StatisticsHome'>,
  BottomTabScreenProps<MainTabParamList>
>;

export type RegionDetailScreenProps = NativeStackScreenProps<
  StatisticsStackParamList,
  'RegionDetail'
>;

/**
 * Declare global navigation types for useNavigation hook
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
