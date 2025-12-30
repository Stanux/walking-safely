/**
 * Type declarations for react-native-svg
 */

declare module 'react-native-svg' {
  import {Component} from 'react';
  import {ViewStyle} from 'react-native';

  export interface SvgProps {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
    style?: ViewStyle;
    fill?: string;
    stroke?: string;
    children?: React.ReactNode;
  }

  export interface PathProps {
    d: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number | string;
    strokeLinecap?: 'butt' | 'round' | 'square';
    strokeLinejoin?: 'miter' | 'round' | 'bevel';
    fillRule?: 'nonzero' | 'evenodd';
  }

  export interface CircleProps {
    cx: number | string;
    cy: number | string;
    r: number | string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number | string;
  }

  export interface RectProps {
    x: number | string;
    y: number | string;
    width: number | string;
    height: number | string;
    rx?: number | string;
    ry?: number | string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number | string;
  }

  export interface LinearGradientProps {
    id: string;
    x1?: string;
    y1?: string;
    x2?: string;
    y2?: string;
    children?: React.ReactNode;
  }

  export interface StopProps {
    offset: string;
    stopColor: string;
    stopOpacity?: number;
  }

  export interface DefsProps {
    children?: React.ReactNode;
  }

  export class Svg extends Component<SvgProps> {}
  export class Path extends Component<PathProps> {}
  export class Circle extends Component<CircleProps> {}
  export class Rect extends Component<RectProps> {}
  export class LinearGradient extends Component<LinearGradientProps> {}
  export class Stop extends Component<StopProps> {}
  export class Defs extends Component<DefsProps> {}

  export default Svg;
}