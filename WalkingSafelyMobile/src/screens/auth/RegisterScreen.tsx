/**
 * Register Screen
 * User registration screen
 * Requirements: 2.1
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
import {authService} from '../../services/api/auth';
import {useAuthStore} from '../../store/authStore';
import {usePreferencesStore} from '../../store/preferencesStore';
import type {RegisterScreenProps} from '../../types/navigation';

export const RegisterScreen: React.FC<RegisterScreenProps> = ({navigation}) => {
  const {t} = useTranslation();
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading and error state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation state
  const [nameError, setNameError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmPasswordError, setConfirmPasswordError] = useState<
    string | undefined
  >();

  // Stores
  const {setUser} = useAuthStore();
  const {locale} = usePreferencesStore();

  /**
   * Validate name
   */
  const validateName = useCallback(
    (value: string): boolean => {
      if (!value.trim()) {
        setNameError(t('errors.validation'));
        return false;
      }
      if (value.trim().length < 2) {
        setNameError(t('errors.validation'));
        return false;
      }
      setNameError(undefined);
      return true;
    },
    [t],
  );

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
      if (value.length < 6) {
        setPasswordError(t('errors.validation'));
        return false;
      }
      setPasswordError(undefined);
      return true;
    },
    [t],
  );

  /**
   * Validate confirm password
   */
  const validateConfirmPassword = useCallback(
    (value: string, pwd: string): boolean => {
      if (!value) {
        setConfirmPasswordError(t('errors.validation'));
        return false;
      }
      if (value !== pwd) {
        setConfirmPasswordError(t('errors.validation'));
        return false;
      }
      setConfirmPasswordError(undefined);
      return true;
    },
    [t],
  );

  /**
   * Handle form submission
   */
  const handleRegister = useCallback(async () => {
    // Clear previous errors
    setError(null);

    // Validate fields
    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(
      confirmPassword,
      password,
    );

    if (
      !isNameValid ||
      !isEmailValid ||
      !isPasswordValid ||
      !isConfirmPasswordValid
    ) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting register with:', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        locale,
      });
      // Convert locale format from pt-BR to pt_BR for API compatibility
      const apiLocale = locale?.replace('-', '_') || 'pt_BR';
      const response = await authService.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        password_confirmation: confirmPassword,
        locale: apiLocale,
      });
      console.log('Register response:', response);

      // Update auth store with user data and token
      setUser(response.user, response.token);

      // Navigation will be handled by RootNavigator based on auth state
    } catch (err) {
      console.log('Register error:', err);
      const errorMessage =
        err instanceof Error ? err.message : t('auth.registerError');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    name,
    email,
    password,
    confirmPassword,
    locale,
    setUser,
    validateName,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    t,
  ]);

  /**
   * Navigate to login screen
   */
  const handleNavigateToLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  /**
   * Toggle confirm password visibility
   */
  const toggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword(prev => !prev);
  }, []);

  /**
   * Clear error when input changes
   */
  const clearFieldError = useCallback(() => {
    if (error) {
      setError(null);
    }
  }, [error]);

  /**
   * Handle name change
   */
  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      if (nameError) {
        setNameError(undefined);
      }
      clearFieldError();
    },
    [nameError, clearFieldError],
  );

  /**
   * Handle email change
   */
  const handleEmailChange = useCallback(
    (value: string) => {
      setEmail(value);
      if (emailError) {
        setEmailError(undefined);
      }
      clearFieldError();
    },
    [emailError, clearFieldError],
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
      clearFieldError();
    },
    [passwordError, clearFieldError],
  );

  /**
   * Handle confirm password change
   */
  const handleConfirmPasswordChange = useCallback(
    (value: string) => {
      setConfirmPassword(value);
      if (confirmPasswordError) {
        setConfirmPasswordError(undefined);
      }
      clearFieldError();
    },
    [confirmPasswordError, clearFieldError],
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
          <Text style={styles.title}>{t('auth.register')}</Text>
          <Text style={styles.subtitle}>{t('auth.welcomeSubtitle')}</Text>
        </View>

        {/* Error Message */}
        {error && (
          <ErrorMessage
            message={error}
            variant="banner"
            style={styles.errorBanner}
          />
        )}

        {/* Form */}
        <View style={styles.form}>
          <Input
            label={t('auth.name')}
            placeholder={t('auth.name')}
            value={name}
            onChangeText={handleNameChange}
            error={nameError}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="name"
            returnKeyType="next"
            onSubmitEditing={() => emailInputRef.current?.focus()}
            editable={!isLoading}
            required
            testID="register-name-input"
          />

          <Input
            ref={emailInputRef}
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
            containerStyle={styles.inputSpacing}
            testID="register-email-input"
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
            autoComplete="password-new"
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
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
            containerStyle={styles.inputSpacing}
            testID="register-password-input"
          />

          <Input
            ref={confirmPasswordInputRef}
            label={t('auth.confirmPassword')}
            placeholder={t('auth.confirmPassword')}
            value={confirmPassword}
            onChangeText={handleConfirmPasswordChange}
            error={confirmPasswordError}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password-new"
            returnKeyType="done"
            onSubmitEditing={handleRegister}
            editable={!isLoading}
            required
            rightIcon={
              <TouchableOpacity onPress={toggleConfirmPasswordVisibility}>
                <Text style={styles.showHideText}>
                  {showConfirmPassword ? t('common.close') : t('common.ok')}
                </Text>
              </TouchableOpacity>
            }
            onRightIconPress={toggleConfirmPasswordVisibility}
            containerStyle={styles.inputSpacing}
            testID="register-confirm-password-input"
          />

          <Button
            title={isLoading ? t('common.loading') : t('auth.register')}
            onPress={handleRegister}
            loading={isLoading}
            disabled={
              isLoading || !name || !email || !password || !confirmPassword
            }
            fullWidth
            size="large"
            style={styles.registerButton}
            testID="register-submit-button"
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.hasAccount')}</Text>
          <TouchableOpacity
            onPress={handleNavigateToLogin}
            disabled={isLoading}
            accessibilityRole="link"
            accessibilityLabel={t('auth.login')}>
            <Text style={styles.loginLink}>{t('auth.login')}</Text>
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
    gap: spacing.sm,
  },
  inputSpacing: {
    marginTop: spacing.xs,
  },
  showHideText: {
    ...textStyles.caption,
    color: colors.primary.main,
  },
  registerButton: {
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
  loginLink: {
    ...textStyles.body,
    color: colors.primary.main,
    fontWeight: '600',
  },
});

export default RegisterScreen;
