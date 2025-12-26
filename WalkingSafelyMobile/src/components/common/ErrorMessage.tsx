/**
 * ErrorMessage Component
 * Displays error messages with retry option
 * Addresses Requirement 14.2: Error messages with retry option
 */

import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {textStyles} from '../../theme/typography';
import {spacing, componentSpacing} from '../../theme/spacing';
import {Button} from './Button';

export type ErrorVariant = 'inline' | 'banner' | 'card' | 'fullscreen';

export interface ErrorMessageProps {
  message: string;
  title?: string;
  variant?: ErrorVariant;
  showRetry?: boolean;
  retryLabel?: string;
  onRetry?: () => void;
  showDismiss?: boolean;
  dismissLabel?: string;
  onDismiss?: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  title,
  variant = 'inline',
  showRetry = false,
  retryLabel,
  onRetry,
  showDismiss = false,
  dismissLabel,
  onDismiss,
  icon,
  style,
  testID = 'error-message',
}) => {
  const {t} = useTranslation();

  const displayTitle = title ?? t('common.error');
  const displayRetryLabel = retryLabel ?? t('common.retry');
  const displayDismissLabel = dismissLabel ?? t('common.close');

  const containerStyles: ViewStyle[] = [
    styles.container,
    styles[`${variant}Container`],
    style,
  ].filter(Boolean) as ViewStyle[];

  const renderActions = () => {
    if (!showRetry && !showDismiss) {
      return null;
    }

    return (
      <View style={styles.actionsContainer}>
        {showDismiss && onDismiss && (
          <Button
            title={displayDismissLabel}
            variant="ghost"
            size="small"
            onPress={onDismiss}
            style={styles.actionButton}
          />
        )}
        {showRetry && onRetry && (
          <Button
            title={displayRetryLabel}
            variant={variant === 'fullscreen' ? 'primary' : 'outline'}
            size="small"
            onPress={onRetry}
            style={styles.actionButton}
          />
        )}
      </View>
    );
  };

  if (variant === 'fullscreen') {
    return (
      <View style={[styles.fullscreenContainer, style]} testID={testID}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={styles.fullscreenTitle}>{displayTitle}</Text>
        <Text style={styles.fullscreenMessage}>{message}</Text>
        {renderActions()}
      </View>
    );
  }

  return (
    <View
      style={containerStyles}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <View style={styles.contentContainer}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <View style={styles.textContainer}>
          {variant !== 'inline' && (
            <Text style={styles.title}>{displayTitle}</Text>
          )}
          <Text
            style={[
              styles.message,
              variant === 'inline' && styles.inlineMessage,
            ]}>
            {message}
          </Text>
        </View>
      </View>
      {renderActions()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  // Variant containers
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  bannerContainer: {
    backgroundColor: colors.error.light,
    padding: componentSpacing.alertBannerPadding,
    borderRadius: componentSpacing.alertBannerBorderRadius,
  },

  cardContainer: {
    backgroundColor: colors.background.primary,
    padding: componentSpacing.cardPadding,
    borderRadius: componentSpacing.cardBorderRadius,
    borderWidth: 1,
    borderColor: colors.error.main,
    shadowColor: colors.neutral.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  fullscreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background.primary,
  },

  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  iconContainer: {
    marginRight: spacing.sm,
  },

  textContainer: {
    flex: 1,
  },

  title: {
    ...textStyles.h5,
    color: colors.error.dark,
    marginBottom: spacing.xs,
  },

  message: {
    ...textStyles.body,
    color: colors.error.dark,
  },

  inlineMessage: {
    ...textStyles.caption,
    color: colors.error.main,
  },

  fullscreenTitle: {
    ...textStyles.h3,
    color: colors.text.primary,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },

  fullscreenMessage: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    gap: spacing.sm,
  },

  actionButton: {
    minWidth: 80,
  },
});

export default ErrorMessage;
