/**
 * Auth Navigator
 * Stack navigator for authentication flow (Welcome, Login, Register)
 * Requirements: 1.2, 16.2
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {colors} from '../theme/colors';
import {textStyles} from '../theme/typography';
import type {AuthStackParamList} from './types';

// Auth Screens
import {WelcomeScreen} from '../screens/auth/WelcomeScreen';
import {LoginScreen} from '../screens/auth/LoginScreen';
import {RegisterScreen} from '../screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Auth Stack Navigator
 * Handles unauthenticated user flows
 */
export const AuthNavigator: React.FC = () => {
  const {t} = useTranslation();

  return (
    <Stack.Navigator
      initialRouteName="Welcome"
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
        contentStyle: {
          backgroundColor: colors.background.primary,
        },
      }}>
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: t('auth.login'),
          headerBackTitle: t('common.back'),
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          title: t('auth.register'),
          headerBackTitle: t('common.back'),
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
