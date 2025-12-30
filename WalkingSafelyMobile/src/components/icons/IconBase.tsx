/**
 * Base Icon Component
 * Provides consistent styling and behavior for all icons
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {colors} from '../../theme/colors';

export interface IconBaseProps {
  size?: number;
  color?: string;
  focused?: boolean;
  style?: any;
  children: React.ReactNode;
}

export const IconBase: React.FC<IconBaseProps> = ({
  size = 24,
  color,
  focused = false,
  style,
  children,
}) => {
  const iconColor = color || (focused ? colors.primary.main : colors.text.tertiary);
  
  return (
    <View style={[
      styles.container,
      {
        width: size,
        height: size,
      },
      style,
    ]}>
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<any>, {
              width: size,
              height: size,
              fill: iconColor,
              stroke: iconColor,
            })
          : child
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default IconBase;