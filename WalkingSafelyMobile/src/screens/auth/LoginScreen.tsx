/**
 * Login Screen
 * User authentication screen
 * Requirements: 2.2, 2.3
 */

import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {textStyles} from '../../theme/typography';
import {spacing} from '../../theme/spacing';
import {
  Button,
  Input,
  ErrorMessage,
  LoadingIndicator,
} from '../../components/common';
import {useAuthStore} from '../../store/authStore';
import type {LoginScreenProps} from '../../types/navigation';

export const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const {t} = useTranslation();
  const passwordInputRef = useRef<TextInput>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validation state
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  // Auth store
  const {login, isLoading, error, clearError} = useAuthStore();

  /**
   * Validate email format
   */
  const validateEmail = useCallback(
    (value: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value.trim()) {
        setEmailError(t('errors.validation'));
        return false;
      }
      if (!emailRegex.test(value)) {
        setEmailError(t('errors.validation'));
        return false;
      }
      setEmailError(undefined);
      return true;
    },
    [t],
  );

  /**
   * Validate password
   */
  const validatePassword = useCallback(
    (value: string): boolean => {
      if (!value) {
        setPasswordError(t('errors.validation'));
        return false;
      }
      setPasswordError(undefined);
      return true;
    },
    [t],
  );

  /**
   * Handle form submission
   */
  const handleLogin = useCallback(async () => {
    // Clear previous errors
    clearError();

    // Validate fields
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      await login(email, password);
      // Navigation will be handled by RootNavigator based on auth state
    } catch {
      // Error is handled by the store
    }
  }, [email, password, login, clearError, validateEmail, validatePassword]);

  /**
   * Navigate to register screen
   */
  const handleNavigateToRegister = useCallback(() => {
    navigation.navigate('Register');
  }, [navigation]);

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  /**
   * Handle email change
   */
  const handleEmailChange = useCallback(
    (value: string) => {
      setEmail(value);
      if (emailError) {
        setEmailError(undefined);
      }
      if (error) {
        clearError();
      }
    },
    [emailError, error, clearError],
  );

  /**
   * Handle password change
   */
  const handlePasswordChange = useCallback(
    (value: string) => {
      setPassword(value);
      if (passwordError) {
        setPasswordError(undefined);
      }
      if (error) {
        clearError();
      }
    },
    [passwordError, error, clearError],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.login')}</Text>
          <Text style={styles.subtitle}>{t('auth.welcomeSubtitle')}</Text>
        </View>

        {/* Error Message */}
        {error && (
          <ErrorMessage
            message={t('auth.loginError')}
            variant="banner"
            style={styles.errorBanner}
          />
        )}

        {/* Form */}
        <View style={styles.form}>
          <Input
            label={t('auth.email')}
            placeholder={t('auth.email')}
            value={email}
            onChangeText={handleEmailChange}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            editable={!isLoading}
            required
            testID="login-email-input"
          />

          <Input
            ref={passwordInputRef}
            label={t('auth.password')}
            placeholder={t('auth.password')}
            value={password}
            onChangeText={handlePasswordChange}
            error={passwordError}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            editable={!isLoading}
            required
            rightIcon={
              <TouchableOpacity onPress={togglePasswordVisibility}>
                <Text style={styles.showHideText}>
                  {showPassword ? t('common.close') : t('common.ok')}
                </Text>
              </TouchableOpacity>
            }
            onRightIconPress={togglePasswordVisibility}
            containerStyle={styles.passwordInput}
            testID="login-password-input"
          />

          <Button
            title={isLoading ? t('common.loading') : t('auth.login')}
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading || !email || !password}
            fullWidth
            size="large"
            style={styles.loginButton}
            testID="login-submit-button"
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
          <TouchableOpacity
            onPress={handleNavigateToRegister}
            disabled={isLoading}
            accessibilityRole="link"
            accessibilityLabel={t('auth.register')}>
            <Text style={styles.registerLink}>{t('auth.register')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <LoadingIndicator variant="overlay" message={t('common.loading')} />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...textStyles.h1,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorBanner: {
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.md,
  },
  passwordInput: {
    marginTop: spacing.sm,
  },
  showHideText: {
    ...textStyles.caption,
    color: colors.primary.main,
  },
  loginButton: {
    marginTop: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  footerText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  registerLink: {
    ...textStyles.body,
    color: colors.primary.main,
    fontWeight: '600',
  },
});

export default LoginScreen;
