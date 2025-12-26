/**
 * OfflineBanner Component
 * Displays a banner when the device is offline
 * Addresses Requirement 14.5: Display banner when offline
 */

import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {textStyles} from '../../theme/typography';
import {spacing} from '../../theme/spacing';

export interface OfflineBannerProps {
  /** Whether the device is offline */
  isOffline: boolean;
  /** Custom message to display (overrides default) */
  message?: string;
  /** Whether to show the banner at the top or bottom */
  position?: 'top' | 'bottom';
  /** Callback when banner is tapped */
  onPress?: () => void;
  /** Custom style for the container */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

const ANIMATION_DURATION = 300;
const BANNER_HEIGHT = 44;

/**
 * Animated banner that appears when device goes offline
 */
export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOffline,
  message,
  position = 'top',
  onPress,
  style,
  testID = 'offline-banner',
}) => {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const animatedValue = useRef(new Animated.Value(0)).current;

  const displayMessage = message ?? t('errors.offline');

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isOffline ? 1 : 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start();
  }, [isOffline, animatedValue]);

  // Calculate safe area padding
  const safeAreaPadding = position === 'top' ? insets.top : insets.bottom;

  // Animation interpolations
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [
      position === 'top'
        ? -BANNER_HEIGHT - safeAreaPadding
        : BANNER_HEIGHT + safeAreaPadding,
      0,
    ],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const containerStyle: ViewStyle = {
    ...(position === 'top'
      ? {top: 0, paddingTop: safeAreaPadding}
      : {bottom: 0, paddingBottom: safeAreaPadding}),
  };

  const BannerContent = (
    <View style={styles.content}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>⚠️</Text>
      </View>
      <Text style={styles.message} numberOfLines={1}>
        {displayMessage}
      </Text>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        containerStyle,
        {
          transform: [{translateY}],
          opacity,
        },
        style,
      ]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={displayMessage}
      pointerEvents={isOffline ? 'auto' : 'none'}>
      {onPress ? (
        <TouchableOpacity
          onPress={onPress}
          style={styles.touchable}
          activeOpacity={0.8}>
          {BannerContent}
        </TouchableOpacity>
      ) : (
        BannerContent
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.warning.main,
    zIndex: 9999,
    elevation: 10,
    shadowColor: colors.neutral.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  touchable: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: BANNER_HEIGHT,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  icon: {
    fontSize: 16,
  },
  message: {
    ...textStyles.bodySmall,
    color: colors.neutral.black,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
});

export default OfflineBanner;
