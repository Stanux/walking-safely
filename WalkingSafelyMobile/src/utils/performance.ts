/**
 * Performance Utilities
 * Helpers for optimizing app performance
 * Requirements: 15.1, 15.2
 */

import React, {ComponentType, LazyExoticComponent} from 'react';

/**
 * Create a lazy-loaded component with a fallback
 * @param importFn - Dynamic import function
 * @returns Lazy component
 */
export function lazyWithPreload<T extends ComponentType<any>>(
  importFn: () => Promise<{default: T}>,
): LazyExoticComponent<T> & {preload: () => Promise<{default: T}>} {
  const LazyComponent = React.lazy(importFn) as LazyExoticComponent<T> & {
    preload: () => Promise<{default: T}>;
  };
  LazyComponent.preload = importFn;
  return LazyComponent;
}

/**
 * Shallow comparison for memoization
 * @param prevProps - Previous props
 * @param nextProps - Next props
 * @returns Whether props are equal
 */
export function shallowEqual<T extends Record<string, any>>(
  prevProps: T,
  nextProps: T,
): boolean {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Deep comparison for complex objects (use sparingly)
 * @param obj1 - First object
 * @param obj2 - Second object
 * @returns Whether objects are deeply equal
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) {
    return true;
  }

  if (
    typeof obj1 !== 'object' ||
    typeof obj2 !== 'object' ||
    obj1 === null ||
    obj2 === null
  ) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Coordinates comparison for map components
 * @param prev - Previous coordinates
 * @param next - Next coordinates
 * @returns Whether coordinates are equal
 */
export function coordinatesEqual(
  prev: {latitude: number; longitude: number} | null | undefined,
  next: {latitude: number; longitude: number} | null | undefined,
): boolean {
  if (prev === next) {
    return true;
  }
  if (!prev || !next) {
    return false;
  }
  return prev.latitude === next.latitude && prev.longitude === next.longitude;
}

/**
 * Array comparison for heatmap points
 * @param prev - Previous array
 * @param next - Next array
 * @returns Whether arrays are equal
 */
export function arrayEqual<T>(prev: T[], next: T[]): boolean {
  if (prev === next) {
    return true;
  }
  if (prev.length !== next.length) {
    return false;
  }
  for (let i = 0; i < prev.length; i++) {
    if (prev[i] !== next[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Throttle function execution
 * @param fn - Function to throttle
 * @param delay - Delay in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, remaining);
    }
  };
}

/**
 * Debounce function execution
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function with cancel method
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): ((...args: Parameters<T>) => void) & {cancel: () => void} {
  let timeoutId: NodeJS.Timeout | null = null;

  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };

  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debouncedFn;
}

export default {
  lazyWithPreload,
  shallowEqual,
  deepEqual,
  coordinatesEqual,
  arrayEqual,
  throttle,
  debounce,
};
