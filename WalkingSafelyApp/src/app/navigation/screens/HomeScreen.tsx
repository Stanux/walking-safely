/**
 * HomeScreen
 *
 * Main screen displayed after successful authentication.
 * Shows welcome message with user's name and logout functionality.
 *
 * Requirements:
 * - 10.5: App MUST provide logout functionality consuming POST /auth/logout
 * - 10.7: WHEN logout is executed, App MUST navigate to Auth_Navigator
 *
 * @module app/navigation/screens/HomeScreen
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useAuthStore, selectUser, selectIsLoading } from '@/features/auth/store/authStore';
import { logoutUseCase } from '@/features/auth/domain/useCases/logoutUseCase';
import { Button } from '@/shared/components/Button';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { tokens } from '@/shared/theme/tokens';

/**
 * HomeScreen component
 *
 * Displays welcome message with user's name and provides logout functionality.
 * Supports dark mode theming.
 */
const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const user = useAuthStore(selectUser);
  const isLoading = useAuthStore(selectIsLoading);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  /**
   * Handle logout button press
   * Calls logoutUseCase which:
   * 1. Calls POST /auth/logout API
   * 2. Clears secure storage
   * 3. Updates auth store (triggers navigation to Auth_Navigator)
   */
  const handleLogout = async () => {
    setLogoutError(null);
    const result = await logoutUseCase();

    if (!result.success && result.error) {
      setLogoutError(result.error);
    }
    // Navigation to Auth_Navigator is handled automatically by RootNavigator
    // when isAuthenticated becomes false
  };

  // Get user's first name for greeting
  const firstName = user?.name?.split(' ')[0] || '';
  const greeting = firstName ? `Olá, ${firstName}!` : 'Olá!';

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isDark ? tokens.colors.background.dark : tokens.colors.background.light },
      ]}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? tokens.colors.background.dark : tokens.colors.background.light}
      />
      <View style={styles.container}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text
            style={[
              styles.greeting,
              { color: tokens.colors.primary[isDark ? 400 : 500] },
            ]}
          >
            {greeting}
          </Text>
          <Text
            style={[
              styles.welcomeMessage,
              { color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light },
            ]}
          >
            Bem-vindo ao WalkingSafely
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: isDark ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light },
            ]}
          >
            Sua segurança é nossa prioridade
          </Text>
        </View>

        {/* Placeholder Content */}
        <View
          style={[
            styles.placeholderCard,
            {
              backgroundColor: isDark ? tokens.colors.surface.dark : tokens.colors.surface.light,
            },
          ]}
        >
          <Text
            style={[
              styles.placeholderText,
              { color: isDark ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light },
            ]}
          >
            Mais funcionalidades em breve...
          </Text>
        </View>

        {/* Error Message */}
        {logoutError && (
          <Text style={styles.errorText}>{logoutError}</Text>
        )}

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <Button
            variant="outline"
            size="lg"
            onPress={handleLogout}
            loading={isLoading}
            disabled={isLoading}
            testID="logout-button"
            accessibilityLabel="Sair da conta"
          >
            Sair
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.xxl,
    paddingBottom: tokens.spacing.lg,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: tokens.spacing.xxl,
  },
  greeting: {
    fontSize: tokens.typography.fontSize.xxxl,
    fontWeight: 'bold',
    marginBottom: tokens.spacing.xs,
  },
  welcomeMessage: {
    fontSize: tokens.typography.fontSize.xl,
    fontWeight: '600',
    marginBottom: tokens.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: tokens.typography.fontSize.md,
    textAlign: 'center',
  },
  placeholderCard: {
    flex: 1,
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
    ...tokens.shadow.sm,
  },
  placeholderText: {
    fontSize: tokens.typography.fontSize.md,
    textAlign: 'center',
  },
  errorText: {
    color: tokens.colors.error,
    fontSize: tokens.typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: tokens.spacing.md,
  },
  logoutSection: {
    paddingTop: tokens.spacing.md,
  },
});

export default HomeScreen;
