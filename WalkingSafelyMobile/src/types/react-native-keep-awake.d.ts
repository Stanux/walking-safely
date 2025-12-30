/**
 * Type declarations for react-native-keep-awake
 */

declare module 'react-native-keep-awake' {
  interface KeepAwake {
    /**
     * Activate keep awake with optional tag
     * @param tag Optional tag to identify this keep awake instance
     */
    activate(tag?: string): void;

    /**
     * Deactivate keep awake with optional tag
     * @param tag Optional tag to identify this keep awake instance
     */
    deactivate(tag?: string): void;
  }

  const KeepAwake: KeepAwake;
  export default KeepAwake;
}