/**
 * AppNavigator
 * 
 * Stack navigator for authenticated app flows.
 * Displayed when user is authenticated.
 * 
 * @module app/navigation/AppNavigator
 * @requirements 4.1, 4.2, 11.1, 17.3
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Coordinates, RouteResponse} from '@/types/models';

// Screens
import MapScreen from '@/screens/main/MapScreen';
import OccurrenceCreateScreen from '@/screens/occurrence/OccurrenceCreateScreen';
import {RoutePreviewScreen} from '@/screens/route/RoutePreviewScreen';
import {NavigationScreen} from '@/screens/navigation/NavigationScreen';

/**
 * App stack parameter list type definition
 */
export type AppStackParamList = {
  MapScreen: undefined;
  OccurrenceCreate: {coordinates: Coordinates};
  RoutePreview: {
    origin: Coordinates;
    destination: Coordinates;
    destinationAddress?: string;
  };
  ActiveNavigation: {
    route: RouteResponse;
    sessionId: string;
  };
};

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * AppNavigator component
 * 
 * Provides navigation for authenticated users.
 * Includes MapScreen and OccurrenceCreate screens.
 */
const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="MapScreen"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {backgroundColor: '#FFFFFF'},
      }}>
      <Stack.Screen
        name="MapScreen"
        component={MapScreen}
        options={{title: 'Mapa'}}
      />
      <Stack.Screen
        name="OccurrenceCreate"
        component={OccurrenceCreateScreen}
        options={{title: 'Reportar Ocorrência'}}
      />
      <Stack.Screen
        name="RoutePreview"
        component={RoutePreviewScreen}
        options={{title: 'Preview da Rota'}}
      />
      <Stack.Screen
        name="ActiveNavigation"
        component={NavigationScreen}
        options={{title: 'Navegação'}}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
