/**
 * RegisterScreen
 *
 * Full implementation of the registration screen with:
 * - Name, email, password, and password confirmation fields
 * - Language selector
 * - Local validation
 * - Registration via registerUseCase
 * - Error display per field
 * - Link to login
 *
 * @module app/navigation/screens/RegisterScreen
 * @requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11
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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../AuthNavigator';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { tokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { validateRegisterForm } from '@/features/auth/domain/validators/authValidators';
import { registerUseCase, Locale } from '@/features/auth/domain/useCases/registerUseCase';
import { useAuthStore } from '@/features/auth/store/authStore';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

/**
 * Language option interface
 */
interface LanguageOption {
  value: Locale;
  label: string;
}

/**
 * Available language options (Req 8.6)
 */
const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'pt_BR', label: 'Português (Brasil)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

/**
 * RegisterScreen component
 *
 * Provides registration functionality with:
 * - Name input with validation (Req 8.2)
 * - Email input with validation (Req 8.3)
 * - Password input with validation (Req 8.4)
 * - Password confirmation with validation (Req 8.5)
 * - Language selector (Req 8.6)
 * - Submit to POST /auth/register (Req 8.7)
 * - Secure token storage on success (Req 8.8)
 * - Navigation to App on success (Req 8.9)
 * - Error display per field on 422 (Req 8.10)
 * - Link to login screen (Req 8.11)
 */
const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [locale, setLocale] = useState<Locale>('pt_BR');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  // Error state
  const [nameError, setNameError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [passwordConfirmationError, setPasswordConfirmationError] = useState<string | undefined>();

  // Auth store state
  const { isLoading, error: authError, clearError } = useAuthStore();

  // Clear errors when component mounts or unmounts
  useEffect(() => {
    clearError();
    return () => clearError();
  }, [clearError]);

  /**
   * Get the label for the currently selected language
   */
  const getSelectedLanguageLabel = useCallback((): string => {
    const option = LANGUAGE_OPTIONS.find((opt) => opt.value === locale);
    return option?.label || 'Português (Brasil)';
  }, [locale]);

  /**
   * Handle language selection
   */
  const handleLanguageSelect = useCallback((selectedLocale: Locale) => {
    setLocale(selectedLocale);
    setShowLanguageSelector(false);
  }, []);

  /**
   * Toggle language selector visibility
   */
  const toggleLanguageSelector = useCallback(() => {
    setShowLanguageSelector((prev) => !prev);
  }, []);

  /**
   * Clear all field errors
   */
  const clearFieldErrors = useCallback(() => {
    setNameError(undefined);
    setEmailError(undefined);
    setPasswordError(undefined);
    setPasswordConfirmationError(undefined);
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    // Clear previous errors
    clearFieldErrors();

    // Local validation (Req 8.2, 8.3, 8.4, 8.5)
    const validation = validateRegisterForm(name, email, password, passwordConfirmation);

    if (!validation.isValid) {
      setNameError(validation.errors.name);
      setEmailError(validation.errors.email);
      setPasswordError(validation.errors.password);
      setPasswordConfirmationError(validation.errors.passwordConfirmation);
      return;
    }

    // Call register use case (Req 8.7, 8.8, 8.9, 8.10)
    const result = await registerUseCase({
      name: name.trim(),
      email: email.trim(),
      password,
      passwordConfirmation,
      locale,
    });

    if (!result.success) {
      // Handle local validation errors
      if (result.validationErrors) {
        setNameError(result.validationErrors.name);
        setEmailError(result.validationErrors.email);
        setPasswordError(result.validationErrors.password);
        setPasswordConfirmationError(result.validationErrors.passwordConfirmation);
      }

      // Handle API field errors (Req 8.10)
      if (result.fieldErrors) {
        if (result.fieldErrors.name) {
          setNameError(result.fieldErrors.name[0]);
        }
        if (result.fieldErrors.email) {
          setEmailError(result.fieldErrors.email[0]);
        }
        if (result.fieldErrors.password) {
          setPasswordError(result.fieldErrors.password[0]);
        }
        if (result.fieldErrors.password_confirmation) {
          setPasswordConfirmationError(result.fieldErrors.password_confirmation[0]);
        }
      }
    }
    // Navigation to App_Navigator is handled automatically by RootNavigator
    // when isAuthenticated becomes true (Req 8.9)
  }, [name, email, password, passwordConfirmation, locale, clearFieldErrors]);

  /**
   * Navigate to login screen (Req 8.11)
   */
  const handleNavigateToLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

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
                Criar Conta
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
                Preencha os dados para criar sua conta
              </Text>
            </View>

            {/* Error Banner - General auth errors */}
            {authError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{authError}</Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.form}>
              {/* Name Input (Req 8.1, 8.2) */}
              <Input
                type="text"
                label="Nome"
                placeholder="Seu nome completo"
                value={name}
                onChangeText={setName}
                error={nameError}
                disabled={isLoading}
                autoComplete="name"
                testID="register-name-input"
              />

              {/* Email Input (Req 8.1, 8.3) */}
              <Input
                type="email"
                label="Email"
                placeholder="seu@email.com"
                value={email}
                onChangeText={setEmail}
                error={emailError}
                disabled={isLoading}
                autoComplete="email"
                testID="register-email-input"
              />

              {/* Password Input (Req 8.1, 8.4) */}
              <Input
                type="password"
                label="Senha"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChangeText={setPassword}
                error={passwordError}
                disabled={isLoading}
                autoComplete="new-password"
                testID="register-password-input"
              />

              {/* Password Confirmation Input (Req 8.1, 8.5) */}
              <Input
                type="password"
                label="Confirmar Senha"
                placeholder="Digite a senha novamente"
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
                error={passwordConfirmationError}
                disabled={isLoading}
                autoComplete="new-password"
                testID="register-password-confirmation-input"
              />

              {/* Language Selector (Req 8.6) */}
              <View style={styles.languageContainer}>
                <Text
                  style={[
                    styles.languageLabel,
                    {
                      color: isDark
                        ? tokens.colors.text.primary.dark
                        : tokens.colors.text.primary.light,
                    },
                  ]}
                >
                  Idioma preferido
                </Text>
                <TouchableOpacity
                  style={[
                    styles.languageSelector,
                    {
                      borderColor: isDark
                        ? tokens.colors.primary[700]
                        : tokens.colors.primary[200],
                      backgroundColor: isDark
                        ? tokens.colors.background.dark
                        : tokens.colors.background.light,
                    },
                  ]}
                  onPress={toggleLanguageSelector}
                  disabled={isLoading}
                  testID="register-language-selector"
                >
                  <Text
                    style={[
                      styles.languageSelectorText,
                      {
                        color: isDark
                          ? tokens.colors.text.primary.dark
                          : tokens.colors.text.primary.light,
                      },
                    ]}
                  >
                    {getSelectedLanguageLabel()}
                  </Text>
                  <Text
                    style={[
                      styles.languageSelectorArrow,
                      {
                        color: isDark
                          ? tokens.colors.text.secondary.dark
                          : tokens.colors.text.secondary.light,
                      },
                    ]}
                  >
                    {showLanguageSelector ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>

                {/* Language Options Dropdown */}
                {showLanguageSelector && (
                  <View
                    style={[
                      styles.languageOptions,
                      {
                        backgroundColor: isDark
                          ? tokens.colors.surface.dark
                          : tokens.colors.surface.light,
                        borderColor: isDark
                          ? tokens.colors.primary[700]
                          : tokens.colors.primary[200],
                      },
                    ]}
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.languageOption,
                          locale === option.value && {
                            backgroundColor: isDark
                              ? tokens.colors.primary[800]
                              : tokens.colors.primary[50],
                          },
                        ]}
                        onPress={() => handleLanguageSelect(option.value)}
                        testID={`register-language-option-${option.value}`}
                      >
                        <Text
                          style={[
                            styles.languageOptionText,
                            {
                              color:
                                locale === option.value
                                  ? tokens.colors.primary[isDark ? 300 : 600]
                                  : isDark
                                    ? tokens.colors.text.primary.dark
                                    : tokens.colors.text.primary.light,
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                        {locale === option.value && (
                          <Text
                            style={[
                              styles.languageOptionCheck,
                              {
                                color: tokens.colors.primary[isDark ? 300 : 600],
                              },
                            ]}
                          >
                            ✓
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Submit Button */}
              <Button
                variant="primary"
                size="lg"
                onPress={handleSubmit}
                loading={isLoading}
                style={styles.submitButton}
                testID="register-submit-button"
              >
                {isLoading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </View>

            {/* Login Link (Req 8.11) */}
            <View style={styles.loginContainer}>
              <Text
                style={[
                  styles.loginText,
                  {
                    color: isDark
                      ? tokens.colors.text.secondary.dark
                      : tokens.colors.text.secondary.light,
                  },
                ]}
              >
                Já tem uma conta?{' '}
              </Text>
              <TouchableOpacity
                onPress={handleNavigateToLogin}
                disabled={isLoading}
                testID="register-login-link"
              >
                <Text
                  style={[
                    styles.loginLinkText,
                    {
                      color: tokens.colors.primary[isDark ? 400 : 500],
                    },
                  ]}
                >
                  Entrar
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
  },
  container: {
    flex: 1,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xl,
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
  form: {
    marginBottom: tokens.spacing.lg,
  },
  languageContainer: {
    marginBottom: tokens.spacing.md,
  },
  languageLabel: {
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.medium,
    marginBottom: tokens.spacing.xs,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    minHeight: 48,
  },
  languageSelectorText: {
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.regular,
  },
  languageSelectorArrow: {
    fontSize: tokens.typography.fontSize.xs,
  },
  languageOptions: {
    marginTop: tokens.spacing.xs,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    overflow: 'hidden',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  languageOptionText: {
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.regular,
  },
  languageOptionCheck: {
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.bold,
  },
  submitButton: {
    marginTop: tokens.spacing.md,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.regular,
  },
  loginLinkText: {
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.semiBold,
  },
});

export default RegisterScreen;
