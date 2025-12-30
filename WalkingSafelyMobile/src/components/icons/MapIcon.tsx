/**
 * Map Icon - Professional navigation icon
 * Represents location, navigation, and mapping functionality
 */

import React from 'react';
import Svg, {Path, Circle} from 'react-native-svg';
import {IconBase, IconBaseProps} from './IconBase';

interface MapIconProps extends Omit<IconBaseProps, 'children'> {}

export const MapIcon: React.FC<MapIconProps> = (props) => {
  return (
    <IconBase {...props}>
      <Svg viewBox="0 0 24 24">
        {/* Map base */}
        <Path
          d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM10 5.47l4 1.4v11.66l-4-1.4V5.47zm-5 .99l3-1.01v11.7l-3 1.01V6.46zm14 11.08l-3 1.01V6.86l3-1.01v11.69z"
          fillRule="evenodd"
        />
        {/* Location pin overlay */}
        <Circle cx="12" cy="10" r="2" />
        <Path d="M12 6c-2.21 0-4 1.79-4 4 0 1.5 2 4.5 4 6.5 2-2 4-5 4-6.5 0-2.21-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
      </Svg>
    </IconBase>
  );
};

export default MapIcon;