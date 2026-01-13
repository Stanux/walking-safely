import { createTamagui } from 'tamagui';
import { config } from '@tamagui/config/v3';

// Create the Tamagui configuration
// This will be customized with our design tokens in a later task
const tamaguiConfig = createTamagui(config);

export type AppConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
