/**
 * MuteButton Component
 * Floating button to mute/unmute voice navigation
 * Requirements: 14.2, 14.3
 */

import React, {useCallback} from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
  AccessibilityInfo,
} from 'react-native';
import {colors} from '../../theme/colors';
import {spacing, shadows} from '../../theme/spacing';

/**
 * MuteButton props interface
 */
export interface MuteButtonProps {
  /** Whether voice is currently muted */
  isMuted: boolean;
  /** Callback when button is pressed */
  onToggle: () => void;
  /** Optional size variant */
  size?: 'small' | 'medium' | 'large';
  /** Optional position on screen */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Whether to show label text */
  showLabel?: boolean;
  /** Custom style overrides */
  style?: object;
  /** Test ID for testing */
  testID?: string;
  /** Accessibility label override */
  accessibilityLabel?: string;
}

/**
 * Size configurations for the button
 */
const SIZE_CONFIG = {
  small: {
    buttonSize: 40,
    iconSize: 20,
    labelSize: 10,
  },
  medium: {
    buttonSize: 52,
    iconSize: 26,
    labelSize: 12,
  },
  large: {
    buttonSize: 64,
    iconSize: 32,
    labelSize: 14,
  },
} as const;

/**
 * Position configurations for the button
 */
const POSITION_CONFIG = {
  'top-left': {
    top: spacing.base,
    left: spacing.base,
  },
  'top-right': {
    top: spacing.base,
    right: spacing.base,
  },
  'bottom-left': {
    bottom: spacing.base,
    left: spacing.base,
  },
  'bottom-right': {
    bottom: spacing.base,
    right: spacing.base,
  },
} as const;

/**
 * MuteButton Component
 * 
 * A floating action button that allows users to mute or unmute voice navigation.
 * Provides visual feedback for the current state and accessibility support.
 * 
 * Requirements:
 * - 14.2: System SHALL provide a floating button to mute or reactivate Voice_Narration
 * - 14.3: When user mutes Voice_Narration, System SHALL maintain only visual orientation
 * 
 * @param props - Component props
 * @returns MuteButton component
 * 
 * @example
 * ```tsx
 * <MuteButton
 *   isMuted={voiceEnabled}
 *   onToggle={() => setVoiceEnabled(!voiceEnabled)}
 *   position="bottom-right"
 *   size="medium"
 * />
 * ```
 */
export const MuteButton: React.FC<MuteButtonProps> = ({
  isMuted,
  onToggle,
  size = 'medium',
  position,
  showLabel = false,
  style,
  testID = 'mute-button',
  accessibilityLabel,
}) => {
  const sizeConfig = SIZE_CONFIG[size];
  const positionStyle = position ? POSITION_CONFIG[position] : {};

  /**
   * Handle button press with accessibility announcement
   */
  const handlePress = useCallback(() => {
    onToggle();
    
    // Announce state change for accessibility
    const announcement = isMuted
      ? 'Narração por voz ativada'
      : 'Narração por voz desativada';
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [isMuted, onToggle]);

  /**
   * Get the appropriate icon based on mute state
   */
  const getIcon = (): string => {
    return isMuted ? '🔇' : '🔊';
  };

  /**
   * Get the appropriate label based on mute state
   */
  const getLabel = (): string => {
    return isMuted ? 'Mudo' : 'Som';
  };

  /**
   * Get the default accessibility label
   */
  const getAccessibilityLabel = (): string => {
    if (accessibilityLabel) {
      return accessibilityLabel;
    }
    return isMuted
      ? 'Ativar narração por voz'
      : 'Desativar narração por voz';
  };

  /**
   * Get button background color based on state
   */
  const getBackgroundColor = (): string => {
    return isMuted ? colors.neutral.gray400 : colors.primary.main;
  };

  return (
    <TouchableOpacity
      testID={testID}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityState={{selected: !isMuted}}
      accessibilityHint={
        isMuted
          ? 'Toque duas vezes para ativar a narração por voz'
          : 'Toque duas vezes para desativar a narração por voz'
      }
      style={[
        styles.button,
        {
          width: sizeConfig.buttonSize,
          height: sizeConfig.buttonSize,
          borderRadius: sizeConfig.buttonSize / 2,
          backgroundColor: getBackgroundColor(),
        },
        position && styles.floating,
        positionStyle,
        style,
      ]}>
      <View style={styles.content}>
        <Text
          style={[
            styles.icon,
            {fontSize: sizeConfig.iconSize},
          ]}>
          {getIcon()}
        </Text>
        {showLabel && (
          <Text
            style={[
              styles.label,
              {fontSize: sizeConfig.labelSize},
            ]}>
            {getLabel()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

/**
 * Get mute button state for external use
 * Useful for determining visual state without rendering the component
 */
export function getMuteButtonState(isMuted: boolean): {
  icon: string;
  label: string;
  backgroundColor: string;
  accessibilityLabel: string;
} {
  return {
    icon: isMuted ? '🔇' : '🔊',
    label: isMuted ? 'Mudo' : 'Som',
    backgroundColor: isMuted ? colors.neutral.gray400 : colors.primary.main,
    accessibilityLabel: isMuted
      ? 'Ativar narração por voz'
      : 'Desativar narração por voz',
  };
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  floating: {
    position: 'absolute',
    zIndex: 1000,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    textAlign: 'center',
  },
  label: {
    color: colors.neutral.white,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});

export default MuteButton;
