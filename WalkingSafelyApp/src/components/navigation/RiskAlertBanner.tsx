/**
 * RiskAlertBanner Component
 * Visual alert banner for risk areas during navigation
 * Requirements: 15.2 - Include visual notification on screen
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
import {colors} from '../../theme/colors';
import {spacing, borderRadius, shadows} from '../../theme/spacing';
import {textStyles} from '../../theme/typography';
import {Occurrence, OccurrenceSeverity} from '../../types/models';
import {SEVERITY_COLORS} from '../../utils/severityLevels';

/**
 * Props for RiskAlertBanner component
 */
export interface RiskAlertBannerProps {
  /** Occurrence that triggered the alert */
  occurrence: Occurrence | null;
  /** Whether the alert is currently visible */
  visible: boolean;
  /** Distance to the risk point in meters */
  distance: number | null;
  /** Callback when alert is dismissed */
  onDismiss: () => void;
  /** Whether to vibrate on alert (default: true) */
  enableVibration?: boolean;
  /** Animation duration in ms (default: 300) */
  animationDuration?: number;
}

/**
 * Get color based on severity level
 * Requirement 15.2: Visual notification with appropriate severity indication
 */
export const getSeverityColor = (severity: OccurrenceSeverity): string => {
  return SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium;
};

/**
 * Format distance for display
 */
export const formatAlertDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

/**
 * Get alert icon based on severity level
 */
export const getAlertIcon = (severity: OccurrenceSeverity): string => {
  switch (severity) {
    case 'critical':
      return '🚨';
    case 'high':
      return '⚠️';
    case 'medium':
      return '⚡';
    case 'low':
      return '📍';
    default:
      return '⚠️';
  }
};

/**
 * RiskAlertBanner Component
 * Displays a prominent alert banner when approaching risk areas
 * Requirement 15.2: Include visual notification on screen
 */
export const RiskAlertBanner: React.FC<RiskAlertBannerProps> = ({
  occurrence,
  visible,
  distance,
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

  if (!occurrence || !visible) {
    return null;
  }

  const severityColor = getSeverityColor(occurrence.severity);
  const alertIcon = getAlertIcon(occurrence.severity);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{translateY: slideAnim}, {scale: pulseAnim}],
        },
      ]}>
      <TouchableOpacity
        style={[styles.banner, {backgroundColor: severityColor}]}
        onPress={onDismiss}
        activeOpacity={0.9}
        accessibilityRole="alert"
        accessibilityLabel={t('navigation.riskAlertAccessibility', {
          crimeType: occurrence.crimeType.name,
          distance: distance ? formatAlertDistance(distance) : '',
        })}>
        {/* Alert Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{alertIcon}</Text>
        </View>

        {/* Alert Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{t('navigation.riskAlert')}</Text>
          <Text style={styles.crimeType}>{occurrence.crimeType.name}</Text>

          {/* Distance to Risk */}
          {distance !== null && distance !== undefined && (
            <Text style={styles.distance}>
              {formatAlertDistance(distance)} {t('navigation.ahead')}
            </Text>
          )}
        </View>

        {/* Severity Badge */}
        <View style={styles.severityBadge}>
          <Text style={styles.severityText}>
            {t(`severity.${occurrence.severity}`)}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Dismiss Hint */}
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
    pointerEvents: 'box-none',
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
  crimeType: {
    ...textStyles.body,
    color: colors.neutral.white,
    opacity: 0.95,
    fontWeight: '600',
  },
  distance: {
    ...textStyles.label,
    color: colors.neutral.white,
    marginTop: spacing.xs,
    opacity: 0.9,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.base,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginLeft: spacing.sm,
  },
  severityText: {
    ...textStyles.caption,
    color: colors.neutral.white,
    fontWeight: '600',
    textTransform: 'uppercase',
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
