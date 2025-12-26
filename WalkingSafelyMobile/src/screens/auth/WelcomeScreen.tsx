/**
 * Welcome Screen
 * Initial screen shown to unauthenticated users
 * Requirements: 2.1
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {textStyles} from '../../theme/typography';
import {spacing} from '../../theme/spacing';
import type {WelcomeScreenProps} from '../../types/navigation';

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({navigation}) => {
  const {t} = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('auth.welcome')}</Text>
        <Text style={styles.subtitle}>{t('auth.welcomeSubtitle')}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')}
          accessibilityRole="button"
          accessibilityLabel={t('auth.login')}>
          <Text style={styles.primaryButtonText}>{t('auth.login')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Register')}
          accessibilityRole="button"
          accessibilityLabel={t('auth.register')}>
          <Text style={styles.secondaryButtonText}>{t('auth.register')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...textStyles.h1,
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  buttonContainer: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  primaryButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...textStyles.button,
    color: colors.primary.contrast,
  },
  secondaryButton: {
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  secondaryButtonText: {
    ...textStyles.button,
    color: colors.text.primary,
  },
});

export default WelcomeScreen;
