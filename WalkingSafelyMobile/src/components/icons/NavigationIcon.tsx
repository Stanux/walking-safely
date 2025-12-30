/**
 * Navigation Icon - Turn-by-turn navigation symbol
 * Used for active navigation and route guidance
 */

import React from 'react';
import Svg, {Path, Circle} from 'react-native-svg';
import {IconBase, IconBaseProps} from './IconBase';

interface NavigationIconProps extends Omit<IconBaseProps, 'children'> {
  variant?: 'compass' | 'arrow' | 'route';
}

export const NavigationIcon: React.FC<NavigationIconProps> = ({
  variant = 'compass',
  ...props
}) => {
  const renderCompass = () => (
    <>
      <Circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <Path
        d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"
        fill="currentColor"
      />
      <Circle cx="12" cy="12" r="2" fill="currentColor" />
    </>
  );

  const renderArrow = () => (
    <Path
      d="M12 2l8 20-8-6-8 6 8-20z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );

  const renderRoute = () => (
    <>
      <Path
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 21v-5a2 2 0 012-2h4a2 2 0 012 2v5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="11" r="1" fill="currentColor" />
    </>
  );

  const renderContent = () => {
    switch (variant) {
      case 'arrow':
        return renderArrow();
      case 'route':
        return renderRoute();
      default:
        return renderCompass();
    }
  };

  return (
    <IconBase {...props}>
      <Svg viewBox="0 0 24 24">
        {renderContent()}
      </Svg>
    </IconBase>
  );
};

export default NavigationIcon;