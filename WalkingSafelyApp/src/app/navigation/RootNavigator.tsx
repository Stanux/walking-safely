/**
 * RootNavigator
 * 
 * Main navigation component that decides between AuthNavigator and AppNavigator
 * based on authentication state.
 * 
 * @module app/navigation/RootNavigator
 * @requirements 4.1, 10.2, 10.3, 10.4
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore, selectIsAuthenticated } from '@/features/auth/store/authStore';
import { secureStorage } from '@/shared/services/storage/secureStorage';
import { User } from '@/features/auth/data/api/authApi';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import SplashScreen from './screens/SplashScreen';

/**
 * RootNavigator component
 * 
 * Handles initial token verification and navigation routing based on auth state.
 * Shows splash screen while initializing.
 */
const RootNavigator: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for stored token on app start
        const storedToken = await secureStorage.getToken();
        const storedUser = await secureStorage.getUser<User>();

        if (storedToken) {
          // Token exists - set it in store
          setToken(storedToken);
          if (storedUser) {
            setUser(storedUser);
          }
        }
      } catch (error) {
        // If there's an error reading storage, clear everything
        await secureStorage.clearAll();
        setToken(null);
        setUser(null);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [setToken, setUser]);

  // Handle splash screen finish
  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  // Show splash screen while initializing or during splash animation
  if (showSplash || isInitializing) {
    console.log('[RootNavigator] Showing splash...');
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  console.log('[RootNavigator] isAuthenticated:', isAuthenticated);
  console.log('[RootNavigator] Rendering:', isAuthenticated ? 'AppNavigator' : 'AuthNavigator');

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({});

export default RootNavigator;
