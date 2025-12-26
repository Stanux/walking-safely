/**
 * Main Navigator
 * Bottom tab navigator with Map, Statistics, and Settings tabs
 * Requirements: 1.2, 16.1, 16.3, 15.1, 15.2
 */

import React, {Suspense, lazy} from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {Text, StyleSheet, View, ActivityIndicator} from 'react-native';
import {colors} from '../theme/colors';
import {textStyles} from '../theme/typography';
import type {
  MainTabParamList,
  MapStackParamList,
  SettingsStackParamList,
  StatisticsStackParamList,
} from './types';

// Lazy loaded screens for performance optimization
// Requirement 15.1, 15.2: Lazy loading of screens
const MapScreen = lazy(() => import('../screens/main/MapScreen'));
const StatisticsScreen = lazy(() => import('../screens/main/StatisticsScreen'));
const SettingsScreen = lazy(() => import('../screens/settings/SettingsScreen'));
const AlertPreferencesScreen = lazy(
  () => import('../screens/settings/AlertPreferencesScreen'),
);
const LanguageScreen = lazy(() => import('../screens/settings/LanguageScreen'));
const PrivacyScreen = lazy(() => import('../screens/settings/PrivacyScreen'));
const RoutePreviewScreen = lazy(
  () => import('../screens/main/RoutePreviewScreen'),
);
const ActiveNavigationScreen = lazy(
  () => import('../screens/navigation/ActiveNavigationScreen'),
);
const ReportOccurrenceScreen = lazy(
  () => import('../screens/occurrence/ReportOccurrenceScreen'),
);

// Create navigators
const Tab = createBottomTabNavigator<MainTabParamList>();
const MapStack = createNativeStackNavigator<MapStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const StatisticsStack = createNativeStackNavigator<StatisticsStackParamList>();

/**
 * Loading fallback component for lazy loaded screens
 */
const ScreenLoadingFallback: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.primary.main} />
  </View>
);

/**
 * Wrapper component for lazy loaded screens with Suspense
 * Uses any type for props to avoid complex generic type issues with React.lazy
 */

function withSuspense(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<any>>,
): React.ComponentType<any> {
  return function WrappedComponent(props: any) {
    return (
      <Suspense fallback={<ScreenLoadingFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Wrapped lazy components
const LazyMapScreen = withSuspense(MapScreen);
const LazyStatisticsScreen = withSuspense(StatisticsScreen);
const LazySettingsScreen = withSuspense(SettingsScreen);
const LazyAlertPreferencesScreen = withSuspense(AlertPreferencesScreen);
const LazyLanguageScreen = withSuspense(LanguageScreen);
const LazyPrivacyScreen = withSuspense(PrivacyScreen);
const LazyRoutePreviewScreen = withSuspense(RoutePreviewScreen);
const LazyActiveNavigationScreen = withSuspense(ActiveNavigationScreen);
const LazyReportOccurrenceScreen = withSuspense(ReportOccurrenceScreen);

/**
 * Map Stack Navigator
 * Handles map-related screens
 */
const MapStackNavigator: React.FC = () => {
  const {t} = useTranslation();

  return (
    <MapStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background.primary,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontFamily: textStyles.h4.fontFamily,
          fontSize: textStyles.h4.fontSize,
          fontWeight: textStyles.h4.fontWeight,
        },
        headerShadowVisible: false,
      }}>
      <MapStack.Screen
        name="MapHome"
        component={LazyMapScreen}
        options={{
          title: t('navigation.map'),
          headerShown: false,
        }}
      />
      <MapStack.Screen
        name="RoutePreview"
        component={LazyRoutePreviewScreen}
        options={{
          title: t('navigation.routePreview'),
          headerShown: false,
        }}
      />
      <MapStack.Screen
        name="ActiveNavigation"
        component={LazyActiveNavigationScreen}
        options={{
          title: t('navigation.activeNavigation'),
          headerShown: false,
          gestureEnabled: false, // Prevent accidental swipe back during navigation
        }}
      />
      <MapStack.Screen
        name="ReportOccurrence"
        component={LazyReportOccurrenceScreen}
        options={{
          title: t('occurrence.title'),
          headerShown: false,
        }}
      />
      {/* Additional map screens will be added here:
          - SearchResults
          - OccurrenceDetail
      */}
    </MapStack.Navigator>
  );
};

/**
 * Statistics Stack Navigator
 * Handles statistics-related screens
 */
const StatisticsStackNavigator: React.FC = () => {
  const {t} = useTranslation();

  return (
    <StatisticsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background.primary,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontFamily: textStyles.h4.fontFamily,
          fontSize: textStyles.h4.fontSize,
          fontWeight: textStyles.h4.fontWeight,
        },
        headerShadowVisible: false,
      }}>
      <StatisticsStack.Screen
        name="StatisticsHome"
        component={LazyStatisticsScreen}
        options={{
          title: t('navigation.statistics'),
        }}
      />
      {/* Additional statistics screens will be added here:
          - RegionDetail
      */}
    </StatisticsStack.Navigator>
  );
};

/**
 * Settings Stack Navigator
 * Handles settings-related screens
 */
const SettingsStackNavigator: React.FC = () => {
  const {t} = useTranslation();

  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background.primary,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontFamily: textStyles.h4.fontFamily,
          fontSize: textStyles.h4.fontSize,
          fontWeight: textStyles.h4.fontWeight,
        },
        headerShadowVisible: false,
      }}>
      <SettingsStack.Screen
        name="SettingsHome"
        component={LazySettingsScreen}
        options={{
          title: t('navigation.settings'),
        }}
      />
      <SettingsStack.Screen
        name="AlertPreferences"
        component={LazyAlertPreferencesScreen}
        options={{
          title: t('settings.alertPreferences'),
        }}
      />
      <SettingsStack.Screen
        name="LanguageSettings"
        component={LazyLanguageScreen}
        options={{
          title: t('settings.language'),
        }}
      />
      <SettingsStack.Screen
        name="PrivacySettings"
        component={LazyPrivacyScreen}
        options={{
          title: t('settings.privacy'),
        }}
      />
    </SettingsStack.Navigator>
  );
};

/**
 * Tab Bar Icon Component
 */
interface TabIconProps {
  focused: boolean;
  label: string;
}

const TabIcon: React.FC<TabIconProps> = ({focused, label}) => {
  // Simple text-based icons for now
  // Can be replaced with actual icons later
  const iconMap: Record<string, string> = {
    map: '🗺️',
    statistics: '📊',
    settings: '⚙️',
  };

  return (
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      {iconMap[label.toLowerCase()] || '•'}
    </Text>
  );
};

/**
 * Main Tab Navigator
 * Bottom tabs for main app navigation
 * Requirement 16.1: Navigation by tabs at bottom
 * Requirement 16.3: Maintain state when navigating between tabs
 */
export const MainNavigator: React.FC = () => {
  const {t} = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background.primary,
          borderTopColor: colors.border.light,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: {
          ...textStyles.caption,
          marginTop: 4,
        },
        // Requirement 16.3: Preserve state between tabs
        lazy: false,
      }}>
      <Tab.Screen
        name="Map"
        component={MapStackNavigator}
        options={{
          tabBarLabel: t('navigation.map'),
          tabBarIcon: ({focused}) => <TabIcon focused={focused} label="map" />,
        }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsStackNavigator}
        options={{
          tabBarLabel: t('navigation.statistics'),
          tabBarIcon: ({focused}) => (
            <TabIcon focused={focused} label="statistics" />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{
          tabBarLabel: t('navigation.settings'),
          tabBarIcon: ({focused}) => (
            <TabIcon focused={focused} label="settings" />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  tabIconFocused: {
    opacity: 1,
  },
});

export default MainNavigator;
