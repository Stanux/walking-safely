/**
 * LoginScreen
 *
 * Full implementation of the login screen with:
 * - Email and password fields
 * - Local validation
 * - Login via loginUseCase
 * - Error display (authentication errors, lock time)
 * - Links to register and forgot password
 *
 * @module app/navigation/screens/LoginScreen
 * @requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../AuthNavigator';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { tokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { validateLoginForm } from '@/features/auth/domain/validators/authValidators';
import { loginUseCase } from '@/features/auth/domain/useCases/loginUseCase';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Images } from '@/assets';

const { width } = Dimensions.get('window');

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

/**
 * LoginScreen component
 *
 * Provides login functionality with:
 * - Email input with validation (Req 7.2)
 * - Password input with validation (Req 7.3)
 * - Submit to POST /auth/login (Req 7.4)
 * - Secure token storage on success (Req 7.5)
 * - Navigation to App on success (Req 7.6)
 * - Error display with attempts remaining (Req 7.7)
 * - Lock time display when account is locked (Req 7.8)
 * - Link to register screen (Req 7.9)
 * - Link to forgot password screen (Req 7.10)
 */
const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  // Lock countdown state
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);

  // Auth store state
  const {
    isLoading,
    error: authError,
    attemptsRemaining,
    lockedUntil,
    clearError,
  } = useAuthStore();

  // Clear errors when component mounts or unmounts
  useEffect(() => {
    clearError();
    return () => clearError();
  }, [clearError]);

  // Handle lock countdown timer
  useEffect(() => {
    if (lockedUntil) {
      const lockedTime = new Date(lockedUntil).getTime();
      const updateCountdown = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((lockedTime - now) / 1000));
        setLockCountdown(remaining);

        if (remaining <= 0) {
          setLockCountdown(null);
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);

      return () => clearInterval(interval);
    }
    setLockCountdown(null);
    return undefined;
  }, [lockedUntil]);

  /**
   * Format seconds to MM:SS display
   */
  const formatLockTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    // Clear previous errors
    setEmailError(undefined);
    setPasswordError(undefined);

    // Local validation (Req 7.2, 7.3)
    const validation = validateLoginForm(email, password);

    if (!validation.isValid) {
      setEmailError(validation.errors.email);
      setPasswordError(validation.errors.password);
      return;
    }

    // Call login use case (Req 7.4, 7.5, 7.6, 7.7, 7.8)
    const result = await loginUseCase({
      email: email.trim(),
      password,
    });

    if (!result.success && result.validationErrors) {
      setEmailError(result.validationErrors.email);
      setPasswordError(result.validationErrors.password);
    }
    // Navigation to App_Navigator is handled automatically by RootNavigator
    // when isAuthenticated becomes true (Req 7.6)
  }, [email, password]);

  /**
   * Navigate to register screen (Req 7.9)
   */
  const handleNavigateToRegister = useCallback(() => {
    navigation.navigate('Register');
  }, [navigation]);

  /**
   * Navigate to forgot password screen (Req 7.10)
   */
  const handleNavigateToForgotPassword = useCallback(() => {
    navigation.navigate('ForgotPassword');
  }, [navigation]);

  // Check if account is locked
  const isLocked = lockCountdown !== null && lockCountdown > 0;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: isDark
            ? tokens.colors.background.dark
            : tokens.colors.background.light,
        },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={Images.logo}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text
                style={[
                  styles.title,
                  {
                    color: isDark
                      ? tokens.colors.text.primary.dark
                      : tokens.colors.text.primary.light,
                  },
                ]}
              >
                Bem-vindo de volta
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: isDark
                      ? tokens.colors.text.secondary.dark
                      : tokens.colors.text.secondary.light,
                  },
                ]}
              >
                Entre com sua conta para continuar
              </Text>
            </View>

            {/* Error Banner - Auth errors (Req 7.7) */}
            {authError && !isLocked && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{authError}</Text>
                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <Text style={styles.attemptsText}>
                    Tentativas restantes: {attemptsRemaining}
                  </Text>
                )}
              </View>
            )}

            {/* Lock Banner - Account locked (Req 7.8) */}
            {isLocked && (
              <View style={styles.lockBanner}>
                <Text style={styles.lockBannerText}>
                  Conta bloqueada temporariamente
                </Text>
                <Text style={styles.lockTimeText}>
                  Tente novamente em: {formatLockTime(lockCountdown)}
                </Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.form}>
              {/* Email Input (Req 7.1, 7.2) */}
              <Input
                type="email"
                label="Email"
                placeholder="seu@email.com"
                value={email}
                onChangeText={setEmail}
                error={emailError}
                disabled={isLoading || isLocked}
                autoComplete="email"
                testID="login-email-input"
              />

              {/* Password Input (Req 7.1, 7.3) */}
              <Input
                type="password"
                label="Senha"
                placeholder="Sua senha"
                value={password}
                onChangeText={setPassword}
                error={passwordError}
                disabled={isLoading || isLocked}
                autoComplete="password"
                testID="login-password-input"
              />

              {/* Forgot Password Link (Req 7.10) */}
              <TouchableOpacity
                style={styles.forgotPasswordLink}
                onPress={handleNavigateToForgotPassword}
                disabled={isLoading}
                testID="login-forgot-password-link"
              >
                <Text
                  style={[
                    styles.forgotPasswordText,
                    {
                      color: tokens.colors.primary[isDark ? 400 : 500],
                    },
                  ]}
                >
                  Esqueceu sua senha?
                </Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <Button
                variant="primary"
                size="lg"
                onPress={handleSubmit}
                loading={isLoading}
                disabled={isLocked}
                style={styles.submitButton}
                testID="login-submit-button"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </View>

            {/* Register Link (Req 7.9) */}
            <View style={styles.registerContainer}>
              <Text
                style={[
                  styles.registerText,
                  {
                    color: isDark
                      ? tokens.colors.text.secondary.dark
                      : tokens.colors.text.secondary.light,
                  },
                ]}
              >
                Não tem uma conta?{' '}
              </Text>
              <TouchableOpacity
                onPress={handleNavigateToRegister}
                disabled={isLoading}
                testID="login-register-link"
              >
                <Text
                  style={[
                    styles.registerLinkText,
                    {
                      color: tokens.colors.primary[isDark ? 400 : 500],
                    },
                  ]}
                >
                  Criar conta
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xl,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: tokens.spacing.xl,
  },
  logo: {
    width: width * 0.35,
    height: width * 0.35,
  },
  header: {
    marginBottom: tokens.spacing.xl,
  },
  title: {
    fontSize: tokens.typography.fontSize.xxl,
    fontFamily: tokens.typography.fontFamily.bold,
    marginBottom: tokens.spacing.xs,
  },
  subtitle: {
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.regular,
  },
  errorBanner: {
    backgroundColor: tokens.colors.error + '15',
    borderWidth: 1,
    borderColor: tokens.colors.error,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  errorBannerText: {
    color: tokens.colors.error,
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.medium,
  },
  attemptsText: {
    color: tokens.colors.error,
    fontSize: tokens.typography.fontSize.xs,
    fontFamily: tokens.typography.fontFamily.regular,
    marginTop: tokens.spacing.xs,
  },
  lockBanner: {
    backgroundColor: tokens.colors.warning + '15',
    borderWidth: 1,
    borderColor: tokens.colors.warning,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
    alignItems: 'center',
  },
  lockBannerText: {
    color: tokens.colors.warning,
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.medium,
  },
  lockTimeText: {
    color: tokens.colors.warning,
    fontSize: tokens.typography.fontSize.lg,
    fontFamily: tokens.typography.fontFamily.bold,
    marginTop: tokens.spacing.xs,
  },
  form: {
    marginBottom: tokens.spacing.lg,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: tokens.spacing.lg,
    marginTop: -tokens.spacing.sm,
  },
  forgotPasswordText: {
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.medium,
  },
  submitButton: {
    marginTop: tokens.spacing.sm,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.regular,
  },
  registerLinkText: {
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.semiBold,
  },
});

export default LoginScreen;
