/**
 * RiskAlertBanner Component
 * Visual alert banner for high-risk areas during navigation
 * Requirements: 7.1, 7.2, 7.3, 7.5, 7.6
 */

import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors, getRiskColor} from '../../theme/colors';
import {spacing, borderRadius, shadows} from '../../theme/spacing';
import {textStyles} from '../../theme/typography';
import {Alert} from '../../types/models';

/**
 * Props for RiskAlertBanner component
 */
export interface RiskAlertBannerProps {
  /** Alert data to display */
  alert: Alert | null;
  /** Whether the alert is currently visible */
  visible: boolean;
  /** Distance to the risk area in meters */
  distanceToRisk?: number | null;
  /** Callback when alert is dismissed */
  onDismiss: () => void;
  /** Whether to vibrate on alert (default: true) */
  enableVibration?: boolean;
  /** Animation duration in ms (default: 300) */
  animationDuration?: number;
}

/**
 * Format distance for display
 */
const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

/**
 * Get alert icon based on risk level
 */
const getAlertIcon = (riskIndex?: number): string => {
  if (!riskIndex) {
    return '⚠️';
  }
  if (riskIndex >= 80) {
    return '🚨';
  }
  if (riskIndex >= 70) {
    return '⚠️';
  }
  return '⚡';
};

/**
 * RiskAlertBanner Component
 * Displays a prominent alert banner when approaching high-risk areas
 */
export const RiskAlertBanner: React.FC<RiskAlertBannerProps> = ({
  alert,
  visible,
  distanceToRisk,
  onDismiss,
  enableVibration = true,
  animationDuration = 300,
}) => {
  const {t} = useTranslation();
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  /**
   * Animate banner in/out
   */
  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      // Vibrate on alert
      if (enableVibration && Platform.OS !== 'web') {
        Vibration.vibrate([0, 200, 100, 200]);
      }
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: animationDuration,
        useNativeDriver: true,
      }).start();

      // Stop pulse
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [visible, slideAnim, pulseAnim, enableVibration, animationDuration]);

  if (!alert) {
    return null;
  }

  const riskColor = alert.riskIndex
    ? getRiskColor(alert.riskIndex)
    : colors.error.main;
  const alertIcon = getAlertIcon(alert.riskIndex);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{translateY: slideAnim}, {scale: pulseAnim}],
        },
      ]}>
      <TouchableOpacity
        style={[styles.banner, {backgroundColor: riskColor}]}
        onPress={onDismiss}
        activeOpacity={0.9}
        accessibilityRole="alert"
        accessibilityLabel={t(alert.title)}>
        {/* Alert Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{alertIcon}</Text>
        </View>

        {/* Alert Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{t(alert.title)}</Text>
          <Text style={styles.message}>{t(alert.message)}</Text>

          {/* Crime Type - Requirement 7.3 */}
          {alert.crimeType && (
            <Text style={styles.crimeType}>
              {t('navigation.predominantCrime')}: {alert.crimeType}
            </Text>
          )}

          {/* Distance to Risk */}
          {distanceToRisk !== null && distanceToRisk !== undefined && (
            <Text style={styles.distance}>
              {formatDistance(distanceToRisk)} {t('navigation.ahead')}
            </Text>
          )}
        </View>

        {/* Risk Index Badge */}
        {alert.riskIndex && (
          <View style={styles.riskBadge}>
            <Text style={styles.riskValue}>{alert.riskIndex}</Text>
            <Text style={styles.riskLabel}>{t('navigation.risk')}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Dismiss Hint - Requirement 7.5 */}
      <Text style={styles.dismissHint}>{t('navigation.tapToDismiss')}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: spacing.base,
    right: spacing.base,
    zIndex: 1000,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 28,
  },
  content: {
    flex: 1,
  },
  title: {
    ...textStyles.h5,
    color: colors.neutral.white,
    marginBottom: spacing.xs,
  },
  message: {
    ...textStyles.body,
    color: colors.neutral.white,
    opacity: 0.95,
  },
  crimeType: {
    ...textStyles.caption,
    color: colors.neutral.white,
    opacity: 0.85,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  distance: {
    ...textStyles.label,
    color: colors.neutral.white,
    marginTop: spacing.xs,
  },
  riskBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  riskValue: {
    ...textStyles.h4,
    color: colors.neutral.white,
  },
  riskLabel: {
    ...textStyles.captionSmall,
    color: colors.neutral.white,
    opacity: 0.8,
  },
  dismissHint: {
    ...textStyles.caption,
    color: colors.neutral.white,
    textAlign: 'center',
    marginTop: spacing.sm,
    opacity: 0.7,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
});

export default RiskAlertBanner;
