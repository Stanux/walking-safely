/**
 * LoadingIndicator Component
 * Displays loading state with optional message
 * Addresses Requirement 14.1: Loading indicators during requests
 */

import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewStyle,
  Modal,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {textStyles} from '../../theme/typography';
import {spacing, borderRadius} from '../../theme/spacing';

export type LoadingSize = 'small' | 'large';
export type LoadingVariant = 'inline' | 'overlay' | 'fullscreen';

export interface LoadingIndicatorProps {
  visible?: boolean;
  message?: string;
  size?: LoadingSize;
  variant?: LoadingVariant;
  color?: string;
  style?: ViewStyle;
  testID?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  visible = true,
  message,
  size = 'large',
  variant = 'inline',
  color = colors.primary.main,
  style,
  testID = 'loading-indicator',
}) => {
  const {t} = useTranslation();

  const displayMessage = message ?? t('common.loading');

  if (!visible) {
    return null;
  }

  const renderContent = () => (
    <View
      style={[
        styles.container,
        variant === 'overlay' && styles.overlayContent,
        style,
      ]}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={displayMessage}>
      <ActivityIndicator size={size} color={color} />
      {displayMessage && (
        <Text
          style={[
            styles.message,
            variant === 'overlay' && styles.overlayMessage,
          ]}>
          {displayMessage}
        </Text>
      )}
    </View>
  );

  if (variant === 'fullscreen') {
    return (
      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.fullscreenContainer}>{renderContent()}</View>
      </Modal>
    );
  }

  if (variant === 'overlay') {
    return (
      <View style={styles.overlayContainer}>
        <View style={styles.overlayBackground} />
        {renderContent()}
      </View>
    );
  }

  return renderContent();
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
  },

  message: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // Overlay variant
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },

  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.dark,
  },

  overlayContent: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    minWidth: 120,
    shadowColor: colors.neutral.black,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  overlayMessage: {
    color: colors.text.primary,
  },

  // Fullscreen variant
  fullscreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay.modal,
  },
});

export default LoadingIndicator;
