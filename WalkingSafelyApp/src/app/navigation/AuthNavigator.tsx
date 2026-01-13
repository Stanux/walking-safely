/**
 * AuthNavigator
 * 
 * Stack navigator for authentication flows (Login, Register, ForgotPassword).
 * Displayed when user is not authenticated.
 * 
 * @module app/navigation/AuthNavigator
 * @requirements 4.2
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Placeholder screens - will be replaced with actual screens in tasks 15, 16, 17
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';

/**
 * Auth stack parameter list type definition
 */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * AuthNavigator component
 * 
 * Provides navigation between authentication screens:
 * - Login: Main entry point for existing users
 * - Register: Account creation for new users
 * - ForgotPassword: Password recovery flow
 */
const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ title: 'Login' }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{ title: 'Criar Conta' }}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
        options={{ title: 'Recuperar Senha' }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
