/**
 * ForgotPasswordScreen
 *
 * Full implementation of the password recovery screen with:
 * - Email field
 * - Local validation
 * - Password recovery via forgotPasswordUseCase
 * - Confirmation message display
 * - Process instructions
 * - Link to return to login
 *
 * @module app/navigation/screens/ForgotPasswordScreen
 * @requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
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
import { validateEmail } from '@/features/auth/domain/validators/authValidators';
import { forgotPasswordUseCase } from '@/features/auth/domain/useCases/forgotPasswordUseCase';
import { useAuthStore } from '@/features/auth/store/authStore';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'ForgotPassword'
>;

interface Props {
  navigation: ForgotPasswordScreenNavigationProp;
}

/**
 * ForgotPasswordScreen component
 *
 * Provides password recovery functionality with:
 * - Email input field (Req 9.1)
 * - Email validation before submission (Req 9.2)
 * - Submit to POST /auth/forgot-password (Req 9.3)
 * - Success confirmation message (Req 9.4)
 * - Generic success message for non-existent emails (Req 9.5)
 * - Link to return to login (Req 9.6)
 * - Clear process instructions (Req 9.7)
 */
const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Form state
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();

  // Success state
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Auth store state
  const { isLoading, error: authError, clearError } = useAuthStore();

  // Clear errors when component mounts or unmounts
  useEffect(() => {
    clearError();
    return () => clearError();
  }, [clearError]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    // Clear previous errors and success state
    setEmailError(undefined);
    setIsSuccess(false);
    setSuccessMessage('');

    // Local validation (Req 9.2)
    const validation = validateEmail(email);

    if (!validation.isValid) {
      setEmailError(validation.error);
      return;
    }

    // Call forgot password use case (Req 9.3, 9.4, 9.5)
    const result = await forgotPasswordUseCase({
      email: email.trim(),
    });

    if (result.success) {
      // Show success message (Req 9.4)
      setIsSuccess(true);
      setSuccessMessage(
        result.message ||
          'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.'
      );
    } else {
      // Handle validation errors
      if (result.validationErrors?.email) {
        setEmailError(result.validationErrors.email);
      }
    }
  }, [email]);

  /**
   * Navigate back to login screen (Req 9.6)
   */
  const handleNavigateToLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  /**
   * Reset form to try again
   */
  const handleTryAgain = useCallback(() => {
    setIsSuccess(false);
    setSuccessMessage('');
    setEmail('');
    setEmailError(undefined);
  }, []);

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
                Recuperar Senha
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
                {isSuccess
                  ? 'Verifique seu email'
                  : 'Digite seu email para receber instruções'}
              </Text>
            </View>

            {/* Success State */}
            {isSuccess ? (
              <View style={styles.successContainer}>
                {/* Success Banner (Req 9.4) */}
                <View style={styles.successBanner}>
                  <Text style={styles.successIcon}>✓</Text>
                  <Text style={styles.successBannerText}>{successMessage}</Text>
                </View>

                {/* Instructions (Req 9.7) */}
                <View
                  style={[
                    styles.instructionsContainer,
                    {
                      backgroundColor: isDark
                        ? tokens.colors.surface.dark
                        : tokens.colors.surface.light,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.instructionsTitle,
                      {
                        color: isDark
                          ? tokens.colors.text.primary.dark
                          : tokens.colors.text.primary.light,
                      },
                    ]}
                  >
                    Próximos passos:
                  </Text>
                  <View style={styles.instructionsList}>
                    <Text
                      style={[
                        styles.instructionItem,
                        {
                          color: isDark
                            ? tokens.colors.text.secondary.dark
                            : tokens.colors.text.secondary.light,
                        },
                      ]}
                    >
                      1. Verifique sua caixa de entrada
                    </Text>
                    <Text
                      style={[
                        styles.instructionItem,
                        {
                          color: isDark
                            ? tokens.colors.text.secondary.dark
                            : tokens.colors.text.secondary.light,
                        },
                      ]}
                    >
                      2. Clique no link do email recebido
                    </Text>
                    <Text
                      style={[
                        styles.instructionItem,
                        {
                          color: isDark
                            ? tokens.colors.text.secondary.dark
                            : tokens.colors.text.secondary.light,
                        },
                      ]}
                    >
                      3. Crie uma nova senha segura
                    </Text>
                    <Text
                      style={[
                        styles.instructionItem,
                        {
                          color: isDark
                            ? tokens.colors.text.secondary.dark
                            : tokens.colors.text.secondary.light,
                        },
                      ]}
                    >
                      4. Faça login com sua nova senha
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.instructionNote,
                      {
                        color: isDark
                          ? tokens.colors.text.secondary.dark
                          : tokens.colors.text.secondary.light,
                      },
                    ]}
                  >
                    Não recebeu o email? Verifique sua pasta de spam ou tente
                    novamente.
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.successActions}>
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={handleNavigateToLogin}
                    style={styles.primaryButton}
                    testID="forgot-password-back-to-login-button"
                  >
                    Voltar para Login
                  </Button>

                  <TouchableOpacity
                    style={styles.tryAgainLink}
                    onPress={handleTryAgain}
                    testID="forgot-password-try-again-link"
                  >
                    <Text
                      style={[
                        styles.tryAgainText,
                        {
                          color: tokens.colors.primary[isDark ? 400 : 500],
                        },
                      ]}
                    >
                      Tentar com outro email
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {/* Error Banner - Auth errors */}
                {authError && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{authError}</Text>
                  </View>
                )}

                {/* Instructions (Req 9.7) */}
                <View
                  style={[
                    styles.instructionsContainer,
                    {
                      backgroundColor: isDark
                        ? tokens.colors.surface.dark
                        : tokens.colors.surface.light,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.instructionsText,
                      {
                        color: isDark
                          ? tokens.colors.text.secondary.dark
                          : tokens.colors.text.secondary.light,
                      },
                    ]}
                  >
                    Digite o email associado à sua conta. Enviaremos um link
                    para você criar uma nova senha.
                  </Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                  {/* Email Input (Req 9.1, 9.2) */}
                  <Input
                    type="email"
                    label="Email"
                    placeholder="seu@email.com"
                    value={email}
                    onChangeText={setEmail}
                    error={emailError}
                    disabled={isLoading}
                    autoComplete="email"
                    testID="forgot-password-email-input"
                  />

                  {/* Submit Button */}
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={handleSubmit}
                    loading={isLoading}
                    style={styles.submitButton}
                    testID="forgot-password-submit-button"
                  >
                    {isLoading ? 'Enviando...' : 'Enviar Instruções'}
                  </Button>
                </View>

                {/* Back to Login Link (Req 9.6) */}
                <View style={styles.loginContainer}>
                  <TouchableOpacity
                    onPress={handleNavigateToLogin}
                    disabled={isLoading}
                    testID="forgot-password-login-link"
                  >
                    <Text
                      style={[
                        styles.loginLinkText,
                        {
                          color: tokens.colors.primary[isDark ? 400 : 500],
                        },
                      ]}
                    >
                      ← Voltar para Login
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  successContainer: {
    flex: 1,
  },
  successBanner: {
    backgroundColor: tokens.colors.success + '15',
    borderWidth: 1,
    borderColor: tokens.colors.success,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: tokens.typography.fontSize.xl,
    color: tokens.colors.success,
    marginRight: tokens.spacing.sm,
  },
  successBannerText: {
    flex: 1,
    color: tokens.colors.success,
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.medium,
  },
  instructionsContainer: {
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  instructionsText: {
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.regular,
    lineHeight: tokens.typography.fontSize.sm * tokens.typography.lineHeight.relaxed,
  },
  instructionsTitle: {
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.semiBold,
    marginBottom: tokens.spacing.sm,
  },
  instructionsList: {
    marginBottom: tokens.spacing.sm,
  },
  instructionItem: {
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.regular,
    marginBottom: tokens.spacing.xs,
    lineHeight: tokens.typography.fontSize.sm * tokens.typography.lineHeight.relaxed,
  },
  instructionNote: {
    fontSize: tokens.typography.fontSize.xs,
    fontFamily: tokens.typography.fontFamily.regular,
    fontStyle: 'italic',
    marginTop: tokens.spacing.xs,
  },
  form: {
    marginBottom: tokens.spacing.lg,
  },
  submitButton: {
    marginTop: tokens.spacing.sm,
  },
  loginContainer: {
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.semiBold,
  },
  successActions: {
    marginTop: tokens.spacing.lg,
  },
  primaryButton: {
    marginBottom: tokens.spacing.md,
  },
  tryAgainLink: {
    alignItems: 'center',
    padding: tokens.spacing.sm,
  },
  tryAgainText: {
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.medium,
  },
});

export default ForgotPasswordScreen;
