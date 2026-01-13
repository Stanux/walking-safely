/**
 * ThemeProvider for WalkingSafelyApp
 * Manages theme state and provides theme context to the app
 * Requirements: 5.1, 5.3, 5.4
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { TamaguiProvider } from '@tamagui/core';
import { tamaguiConfig, ThemeName } from './tamagui.config';

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
  isSystemTheme: boolean;
  setUseSystemTheme: (useSystem: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeName;
  useSystemThemeByDefault?: boolean;
}

/**
 * ThemeProvider component that wraps the app and provides theme management
 * Supports light/dark mode and respects system preferences by default
 */
export function ThemeProvider({
  children,
  defaultTheme = 'light',
  useSystemThemeByDefault = true,
}: ThemeProviderProps): React.JSX.Element {
  const systemColorScheme = useColorScheme();
  const [isSystemTheme, setIsSystemTheme] = useState(useSystemThemeByDefault);
  const [manualTheme, setManualTheme] = useState<ThemeName>(defaultTheme);

  // Determine the active theme based on system preference or manual selection
  const activeTheme = useMemo((): ThemeName => {
    if (isSystemTheme && systemColorScheme) {
      return systemColorScheme as ThemeName;
    }
    return manualTheme;
  }, [isSystemTheme, systemColorScheme, manualTheme]);

  // Update manual theme when system theme changes and we're using system theme
  useEffect(() => {
    if (isSystemTheme && systemColorScheme) {
      setManualTheme(systemColorScheme as ThemeName);
    }
  }, [isSystemTheme, systemColorScheme]);

  const setTheme = useCallback((newTheme: ThemeName) => {
    setIsSystemTheme(false);
    setManualTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsSystemTheme(false);
    setManualTheme((current: ThemeName) => (current === 'light' ? 'dark' : 'light'));
  }, []);

  const setUseSystemTheme = useCallback((useSystem: boolean) => {
    setIsSystemTheme(useSystem);
  }, []);

  const contextValue = useMemo(
    (): ThemeContextValue => ({
      theme: activeTheme,
      setTheme,
      toggleTheme,
      isSystemTheme,
      setUseSystemTheme,
    }),
    [activeTheme, setTheme, toggleTheme, isSystemTheme, setUseSystemTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme={activeTheme}>
        {children}
      </TamaguiProvider>
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 * Must be used within a ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook to get the current theme name
 */
export function useThemeName(): ThemeName {
  const { theme } = useTheme();
  return theme;
}

/**
 * Hook to check if dark mode is active
 */
export function useIsDarkMode(): boolean {
  const { theme } = useTheme();
  return theme === 'dark';
}
