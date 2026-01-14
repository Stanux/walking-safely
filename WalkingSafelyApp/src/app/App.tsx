/**
 * WalkingSafelyApp - Main Application Component
 * 
 * Entry point for the Walking Safely mobile application.
 * Implements Clean Architecture with feature-based organization.
 * 
 * @requirements 4.1, 5.1
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import KeepAwake from 'react-native-keep-awake';
import { ThemeProvider, useThemeName } from '@/shared/theme';
import { RootNavigator } from './navigation';

// Initialize i18n
import '../shared/config/i18n';

/**
 * StatusBarManager component
 * 
 * Manages StatusBar appearance based on current theme.
 * Must be inside ThemeProvider to access theme context.
 */
const StatusBarManager: React.FC = () => {
  const theme = useThemeName();
  
  return (
    <StatusBar
      barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
      backgroundColor={theme === 'dark' ? '#121212' : '#FFFFFF'}
    />
  );
};

/**
 * App component
 * 
 * Main application component that sets up:
 * - ThemeProvider for light/dark mode support (Requirement 5.1)
 * - RootNavigator with NavigationContainer (Requirement 4.1)
 * - KeepAwake to prevent screen from sleeping during navigation
 */
const App: React.FC = () => {
  // Mantém a tela ligada enquanto o app está aberto
  useEffect(() => {
    KeepAwake.activate();
    return () => {
      KeepAwake.deactivate();
    };
  }, []);

  return (
    <ThemeProvider>
      <StatusBarManager />
      <RootNavigator />
    </ThemeProvider>
  );
};

export default App;
