/**
 * Walking Safely Logo - Main app icon
 * Combines safety shield, location pin, and walking path
 * Professional, modern, and memorable design
 */

import React from 'react';
import Svg, {Path, Circle, Defs, LinearGradient, Stop} from 'react-native-svg';
import {IconBase, IconBaseProps} from './IconBase';
import {colors} from '../../theme/colors';

interface WalkingSafelyLogoProps extends Omit<IconBaseProps, 'children'> {
  variant?: 'full' | 'icon' | 'monochrome';
}

export const WalkingSafelyLogo: React.FC<WalkingSafelyLogoProps> = ({
  variant = 'full',
  ...props
}) => {
  const renderFullLogo = () => (
    <Svg viewBox="0 0 100 100">
      <Defs>
        {/* Primary gradient */}
        <LinearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colors.primary.light} />
          <Stop offset="100%" stopColor={colors.primary.main} />
        </LinearGradient>
        
        {/* Safety gradient */}
        <LinearGradient id="safetyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colors.risk.low} />
          <Stop offset="100%" stopColor="#16A34A" />
        </LinearGradient>
        
        {/* Warning gradient */}
        <LinearGradient id="warningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colors.warning.light} />
          <Stop offset="100%" stopColor={colors.warning.main} />
        </LinearGradient>
      </Defs>
      
      {/* Background circle */}
      <Circle cx="50" cy="50" r="45" fill="url(#primaryGrad)" />
      
      {/* Safety shield */}
      <Path
        d="M50 15 L35 25 L35 45 Q35 65 50 75 Q65 65 65 45 L65 25 Z"
        fill="url(#safetyGrad)"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
      
      {/* Location pin */}
      <Circle cx="50" cy="35" r="8" fill="#FFFFFF" />
      <Circle cx="50" cy="35" r="4" fill={colors.primary.main} />
      
      {/* Walking path */}
      <Path
        d="M25 70 Q35 65 45 70 Q55 75 65 70 Q75 65 85 70"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Safety checkmark */}
      <Path
        d="M42 45 L47 50 L58 39"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );

  const renderIconOnly = () => (
    <Svg viewBox="0 0 24 24">
      {/* Simplified shield */}
      <Path
        d="M12 2L7 4v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V4l-5-2z"
        fill={colors.primary.main}
      />
      
      {/* Location dot */}
      <Circle cx="12" cy="10" r="2" fill="#FFFFFF" />
      
      {/* Checkmark */}
      <Path
        d="M9 12l2 2 4-4"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );

  const renderMonochrome = () => (
    <Svg viewBox="0 0 24 24">
      <Path
        d="M12 2L7 4v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V4l-5-2z"
        fill="currentColor"
      />
      <Circle cx="12" cy="10" r="2" fill="#FFFFFF" />
      <Path
        d="M9 12l2 2 4-4"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );

  const renderContent = () => {
    switch (variant) {
      case 'icon':
        return renderIconOnly();
      case 'monochrome':
        return renderMonochrome();
      default:
        return renderFullLogo();
    }
  };

  return (
    <IconBase {...props}>
      {renderContent()}
    </IconBase>
  );
};

export default WalkingSafelyLogo;