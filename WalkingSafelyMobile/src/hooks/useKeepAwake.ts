/**
 * Hook for managing screen wake lock
 * Keeps the screen active while the app is in use
 */

import {useEffect} from 'react';
import KeepAwake from 'react-native-keep-awake';

interface UseKeepAwakeOptions {
  /**
   * Whether to keep the screen awake
   * @default true
   */
  enabled?: boolean;
  /**
   * Tag to identify this keep awake instance
   * Useful when multiple components need keep awake
   */
  tag?: string;
}

/**
 * Hook to keep the screen awake while the app is active
 * 
 * @param options Configuration options
 * @returns Object with methods to control keep awake state
 */
export function useKeepAwake(options: UseKeepAwakeOptions = {}) {
  const {enabled = true, tag = 'WalkingSafely'} = options;

  useEffect(() => {
    if (enabled) {
      // Activate keep awake when component mounts
      KeepAwake.activate(tag);
      console.log(`[KeepAwake] Activated with tag: ${tag}`);

      // Deactivate when component unmounts
      return () => {
        KeepAwake.deactivate(tag);
        console.log(`[KeepAwake] Deactivated with tag: ${tag}`);
      };
    }
  }, [enabled, tag]);

  const activate = () => {
    KeepAwake.activate(tag);
    console.log(`[KeepAwake] Manually activated with tag: ${tag}`);
  };

  const deactivate = () => {
    KeepAwake.deactivate(tag);
    console.log(`[KeepAwake] Manually deactivated with tag: ${tag}`);
  };

  return {
    activate,
    deactivate,
    isEnabled: enabled,
  };
}