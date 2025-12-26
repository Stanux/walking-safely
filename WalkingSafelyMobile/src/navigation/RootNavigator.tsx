/**
 * Root Navigator
 * Main navigation container that switches between Auth and Main flows
 * Requirements: 1.2, 16.1, 16.2
 */

import React, {useEffect, useState} from 'react';
import {ActivityIndicator, View, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {colors} from '../theme/colors';
import {useAuthStore} from '../store/authStore';
import type {RootStackParamList} from './types';

// Navigators
import {AuthNavigator} from './AuthNavigator';
import {MainNavigator} from './MainNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Loading Screen Component
 * Displayed while checking authentication status
 */
const LoadingScreen: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.primary.main} />
  </View>
);

/**
 * Root Navigator Component
 * Handles authentication state and navigation flow
 */
export const RootNavigator: React.FC = () => {
  const {isAuthenticated, isLoading, loadStoredAuth} = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  // Load stored authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        await loadStoredAuth();
      } finally {
        setIsInitializing(false);
      }
    };
    initAuth();
  }, [loadStoredAuth]);

  // Show loading screen while initializing
  if (isInitializing || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
});

export default RootNavigator;
