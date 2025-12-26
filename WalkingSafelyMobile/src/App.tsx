/**
 * Walking Safely Mobile App
 * Main application entry point
 */

import React, {useEffect} from 'react';
import {StatusBar, View, StyleSheet, Platform} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';
import {colors} from './theme/colors';
import {RootNavigator} from './navigation';
import {NetworkProvider, useNetworkContext} from './contexts';
import {OfflineBanner} from './components/common';
import {backgroundService} from './services/background';

// Initialize i18n
import './i18n';

// Configure Geolocation
Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: 'whenInUse',
  locationProvider: Platform.OS === 'android' ? 'auto' : 'auto',
});

/**
 * Main app content with offline banner
 */
function AppContent(): React.JSX.Element {
  const {isConnected, status} = useNetworkContext();
  const isOffline = status === 'offline' || !isConnected;

  // Initialize background service for resource management
  // Requirement 15.5: Release resources when in background
  useEffect(() => {
    backgroundService.initialize({
      onEnterBackground: () => {
        console.log('[App] Entered background');
      },
      onEnterForeground: () => {
        console.log('[App] Entered foreground');
      },
      onResourcesReleased: () => {
        console.log('[App] Resources released');
      },
      onResourcesRestored: () => {
        console.log('[App] Resources restored');
      },
    });

    return () => {
      backgroundService.cleanup();
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background.primary}
      />
      <RootNavigator />
      <OfflineBanner isOffline={isOffline} position="top" />
    </View>
  );
}

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <NetworkProvider>
          <AppContent />
        </NetworkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
