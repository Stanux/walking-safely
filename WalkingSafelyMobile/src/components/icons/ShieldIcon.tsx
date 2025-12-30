/**
 * Shield Icon - Safety and protection symbol
 * Used for security features and risk indicators
 */

import React from 'react';
import Svg, {Path} from 'react-native-svg';
import {IconBase, IconBaseProps} from './IconBase';

interface ShieldIconProps extends Omit<IconBaseProps, 'children'> {
  variant?: 'outline' | 'filled' | 'check';
}

export const ShieldIcon: React.FC<ShieldIconProps> = ({
  variant = 'outline',
  ...props
}) => {
  const renderOutline = () => (
    <Path
      d="M12 2L7 4v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V4l-5-2z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );

  const renderFilled = () => (
    <Path
      d="M12 2L7 4v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V4l-5-2z"
      fill="currentColor"
    />
  );

  const renderCheck = () => (
    <>
      <Path
        d="M12 2L7 4v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V4l-5-2z"
        fill="currentColor"
      />
      <Path
        d="M9 12l2 2 4-4"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </>
  );

  const renderContent = () => {
    switch (variant) {
      case 'filled':
        return renderFilled();
      case 'check':
        return renderCheck();
      default:
        return renderOutline();
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

export default ShieldIcon;