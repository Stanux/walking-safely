/**
 * useVoiceNavigation Hook
 * Provides voice navigation functionality with TTS integration
 * Requirements: 14.1, 14.4
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {ttsService} from '../services/tts';
import type {RouteInstruction} from '../types/models';

/**
 * Voice navigation state interface
 */
export interface UseVoiceNavigationState {
  /** Whether voice navigation is enabled */
  isEnabled: boolean;
  /** Whether TTS is currently speaking */
  isSpeaking: boolean;
  /** Whether TTS is initialized */
  isInitialized: boolean;
  /** Last spoken instruction index */
  lastSpokenIndex: number;
}

/**
 * Voice navigation actions interface
 */
export interface UseVoiceNavigationActions {
  /** Enable voice navigation */
  enable: () => void;
  /** Disable voice navigation */
  disable: () => void;
  /** Toggle voice navigation on/off */
  toggle: () => void;
  /** Speak a navigation instruction */
  speakInstruction: (instruction: RouteInstruction, distance: number) => Promise<void>;
  /** Speak a maneuver with advance notice */
  speakManeuver: (maneuver: string, distance: number, fullInstruction?: string, forceSpeak?: boolean) => Promise<void>;
  /** Speak a risk alert */
  speakRiskAlert: (crimeType: string, distance: number) => Promise<void>;
  /** Speak arrival notification */
  speakArrival: () => Promise<void>;
  /** Speak route recalculation notification */
  speakRecalculating: () => Promise<void>;
  /** Stop current speech */
  stop: () => Promise<void>;
  /** Initialize TTS service */
  initialize: () => Promise<void>;
}

/**
 * Voice navigation options interface
 */
export interface UseVoiceNavigationOptions {
  /** Initial enabled state (default: true) */
  initialEnabled?: boolean;
  /** Distance threshold for advance voice prompts in meters (default: 100) */
  advanceDistance?: number;
  /** Minimum distance between voice prompts in meters (default: 50) */
  minPromptDistance?: number;
  /** Auto-initialize TTS on mount (default: true) */
  autoInitialize?: boolean;
}

/**
 * Voice navigation return type
 */
export type UseVoiceNavigationReturn = UseVoiceNavigationState & UseVoiceNavigationActions;

/**
 * Default options for voice navigation
 */
const DEFAULT_OPTIONS: Required<UseVoiceNavigationOptions> = {
  initialEnabled: true,
  advanceDistance: 100,
  minPromptDistance: 50,
  autoInitialize: true,
};

/**
 * useVoiceNavigation Hook
 * 
 * Provides voice navigation functionality for turn-by-turn directions.
 * Integrates with react-native-tts for speech synthesis.
 * 
 * Requirements:
 * - 14.1: Voice_Narration SHALL narrate navigation instructions when Navigation_Mode is active
 * - 14.4: Voice_Narration SHALL narrate instructions with adequate advance notice
 * 
 * @param options - Configuration options for voice navigation
 * @returns Voice navigation state and actions
 * 
 * @example
 * ```tsx
 * const {
 *   isEnabled,
 *   isSpeaking,
 *   toggle,
 *   speakManeuver,
 *   speakRiskAlert,
 * } = useVoiceNavigation({ initialEnabled: true });
 * 
 * // Speak a turn instruction with advance notice
 * await speakManeuver('turn-left', 100, 'Turn left onto Main Street');
 * 
 * // Speak a risk alert
 * await speakRiskAlert('Roubo', 150);
 * ```
 */
export function useVoiceNavigation(
  options: UseVoiceNavigationOptions = {}
): UseVoiceNavigationReturn {
  const mergedOptions = {...DEFAULT_OPTIONS, ...options};
  
  // State
  const [isEnabled, setIsEnabled] = useState(mergedOptions.initialEnabled);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSpokenIndexRef = useRef(-1);
  
  // Refs for tracking
  const lastSpokenDistanceRef = useRef<number>(0);
  const lastSpokenTimeRef = useRef<number>(0);
  const isInitializingRef = useRef(false);

  /**
   * Initialize TTS service
   * Requirement 14.1: Enable voice narration
   */
  const initialize = useCallback(async () => {
    if (isInitialized || isInitializingRef.current) {
      return;
    }
    
    isInitializingRef.current = true;
    
    try {
      await ttsService.init();
      setIsInitialized(true);
      console.log('[useVoiceNavigation] TTS initialized successfully');
    } catch (error) {
      console.error('[useVoiceNavigation] Failed to initialize TTS:', error);
    } finally {
      isInitializingRef.current = false;
    }
  }, [isInitialized]);

  /**
   * Auto-initialize TTS on mount if enabled
   */
  useEffect(() => {
    if (mergedOptions.autoInitialize) {
      initialize();
    }
  }, [initialize, mergedOptions.autoInitialize]);

  /**
   * Enable voice navigation
   */
  const enable = useCallback(() => {
    setIsEnabled(true);
    console.log('[useVoiceNavigation] Voice navigation enabled');
  }, []);

  /**
   * Disable voice navigation
   */
  const disable = useCallback(() => {
    setIsEnabled(false);
    ttsService.stop();
    console.log('[useVoiceNavigation] Voice navigation disabled');
  }, []);

  /**
   * Toggle voice navigation on/off
   * Requirement 14.2: Button to mute/unmute voice narration
   */
  const toggle = useCallback(() => {
    if (isEnabled) {
      disable();
    } else {
      enable();
    }
  }, [isEnabled, enable, disable]);

  /**
   * Check if enough time/distance has passed since last prompt
   * Requirement 14.4: Adequate advance notice for instructions
   */
  const shouldSpeak = useCallback((distance: number): boolean => {
    const now = Date.now();
    const timeSinceLastSpeak = now - lastSpokenTimeRef.current;
    const distanceDiff = Math.abs(distance - lastSpokenDistanceRef.current);
    
    // Minimum 2 seconds between prompts
    if (timeSinceLastSpeak < 2000) {
      return false;
    }
    
    // Minimum distance change between prompts
    if (distanceDiff < mergedOptions.minPromptDistance && timeSinceLastSpeak < 10000) {
      return false;
    }
    
    return true;
  }, [mergedOptions.minPromptDistance]);

  /**
   * Speak a navigation instruction
   * Requirement 14.1: Narrate navigation instructions
   */
  const speakInstruction = useCallback(async (
    instruction: RouteInstruction,
    distance: number
  ): Promise<void> => {
    if (!isEnabled || !isInitialized) {
      return;
    }
    
    if (!shouldSpeak(distance)) {
      return;
    }
    
    try {
      setIsSpeaking(true);
      await ttsService.speakInstruction(instruction.text, distance);
      lastSpokenDistanceRef.current = distance;
      lastSpokenTimeRef.current = Date.now();
    } catch (error) {
      console.error('[useVoiceNavigation] Failed to speak instruction:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, [isEnabled, isInitialized, shouldSpeak]);

  /**
   * Speak a maneuver with advance notice
   * Requirement 14.4: Narrate instructions with adequate advance notice
   */
  const speakManeuver = useCallback(async (
    maneuver: string,
    distance: number,
    fullInstruction?: string,
    forceSpeak?: boolean
  ): Promise<void> => {
    if (!isEnabled || !isInitialized) {
      return;
    }
    
    if (!forceSpeak && !shouldSpeak(distance)) {
      return;
    }
    
    try {
      setIsSpeaking(true);
      await ttsService.speakManeuver(maneuver, distance, fullInstruction);
      lastSpokenDistanceRef.current = distance;
      lastSpokenTimeRef.current = Date.now();
    } catch (error) {
      console.error('[useVoiceNavigation] Failed to speak maneuver:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, [isEnabled, isInitialized, shouldSpeak]);

  /**
   * Speak a risk alert
   * Requirement 15.3: Narrate risk alert when voice is active
   */
  const speakRiskAlert = useCallback(async (
    crimeType: string,
    distance: number
  ): Promise<void> => {
    if (!isEnabled || !isInitialized) {
      return;
    }
    
    try {
      setIsSpeaking(true);
      await ttsService.speakRiskAlert(crimeType, distance);
    } catch (error) {
      console.error('[useVoiceNavigation] Failed to speak risk alert:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, [isEnabled, isInitialized]);

  /**
   * Speak arrival notification
   */
  const speakArrival = useCallback(async (): Promise<void> => {
    if (!isEnabled || !isInitialized) {
      return;
    }
    
    try {
      setIsSpeaking(true);
      await ttsService.speakArrival();
    } catch (error) {
      console.error('[useVoiceNavigation] Failed to speak arrival:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, [isEnabled, isInitialized]);

  /**
   * Speak route recalculation notification
   * Requirement 16.5: Notify user by voice when route is recalculated
   */
  const speakRecalculating = useCallback(async (): Promise<void> => {
    if (!isEnabled || !isInitialized) {
      return;
    }
    
    try {
      setIsSpeaking(true);
      await ttsService.speakRecalculating();
    } catch (error) {
      console.error('[useVoiceNavigation] Failed to speak recalculating:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, [isEnabled, isInitialized]);

  /**
   * Stop current speech
   */
  const stop = useCallback(async (): Promise<void> => {
    try {
      await ttsService.stop();
      setIsSpeaking(false);
    } catch (error) {
      console.error('[useVoiceNavigation] Failed to stop speech:', error);
    }
  }, []);

  return {
    // State
    isEnabled,
    isSpeaking,
    isInitialized,
    lastSpokenIndex: lastSpokenIndexRef.current,
    // Actions
    enable,
    disable,
    toggle,
    speakInstruction,
    speakManeuver,
    speakRiskAlert,
    speakArrival,
    speakRecalculating,
    stop,
    initialize,
  };
}

export default useVoiceNavigation;
