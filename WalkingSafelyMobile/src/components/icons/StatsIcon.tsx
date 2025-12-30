/**
 * Statistics Icon - Professional analytics icon
 * Represents data, charts, and statistical information
 */

import React from 'react';
import Svg, {Path, Rect} from 'react-native-svg';
import {IconBase, IconBaseProps} from './IconBase';

interface StatsIconProps extends Omit<IconBaseProps, 'children'> {}

export const StatsIcon: React.FC<StatsIconProps> = (props) => {
  return (
    <IconBase {...props}>
      <Svg viewBox="0 0 24 24">
        {/* Chart bars */}
        <Rect x="3" y="17" width="4" height="4" rx="1" />
        <Rect x="10" y="12" width="4" height="9" rx="1" />
        <Rect x="17" y="7" width="4" height="14" rx="1" />
        
        {/* Trend line */}
        <Path
          d="M3 3l4 4 4-2 6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Data points */}
        <circle cx="3" cy="7" r="2" />
        <circle cx="7" cy="11" r="2" />
        <circle cx="11" cy="9" r="2" />
        <circle cx="17" cy="15" r="2" />
      </Svg>
    </IconBase>
  );
};

export default StatsIcon;