/**
 * App Logo Component
 * Displays the Walking Safely logo with optional text
 * Used in splash screens, about pages, and headers
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {WalkingSafelyLogo} from '../icons';
import {colors} from '../../theme/colors';
import {textStyles} from '../../theme/typography';
import {spacing} from '../../theme/spacing';

interface AppLogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  variant?: 'full' | 'icon' | 'monochrome';
  style?: any;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'medium',
  showText = true,
  variant = 'full',
  style,
}) => {
  const logoSize = {
    small: 48,
    medium: 80,
    large: 120,
  }[size];

  const textSize = {
    small: textStyles.h5,
    medium: textStyles.h3,
    large: textStyles.h1,
  }[size];

  return (
    <View style={[styles.container, style]}>
      <WalkingSafelyLogo
        size={logoSize}
        variant={variant}
      />
      
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[textSize, styles.appName]}>
            Walking Safely
          </Text>
          <Text style={styles.tagline}>
            Navegue com segurança
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  appName: {
    color: colors.text.primary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tagline: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default AppLogo;