/**
 * Property-Based Tests for Theme System
 * Feature: walking-safely-app, Property 7: Atualização de Tema
 * Validates: Requisito 5.4
 *
 * Tests that theme changes are immediately reflected across all components
 */

import React from 'react';
import { Text, View } from 'react-native';
import { render, act } from '@testing-library/react-native';
import fc from 'fast-check';
import { ThemeProvider, useTheme, useThemeName, useIsDarkMode } from '../ThemeProvider';
import type { ThemeName } from '../tamagui.config';

// Test component that consumes theme context
function ThemeConsumer(): React.JSX.Element {
  const { theme, setTheme, toggleTheme, isSystemTheme } = useTheme();
  const themeName = useThemeName();
  const isDarkMode = useIsDarkMode();

  return (
    <View testID="theme-consumer">
      <Text testID="current-theme">{theme}</Text>
      <Text testID="theme-name">{themeName}</Text>
      <Text testID="is-dark-mode">{isDarkMode.toString()}</Text>
      <Text testID="is-system-theme">{isSystemTheme.toString()}</Text>
      <Text
        testID="set-light"
        onPress={() => setTheme('light')}
      >
        Set Light
      </Text>
      <Text
        testID="set-dark"
        onPress={() => setTheme('dark')}
      >
        Set Dark
      </Text>
      <Text testID="toggle" onPress={toggleTheme}>
        Toggle
      </Text>
    </View>
  );
}

// Multiple consumers to test that all components update
function MultipleThemeConsumers(): React.JSX.Element {
  return (
    <View>
      <ThemeConsumerWithId id="consumer-1" />
      <ThemeConsumerWithId id="consumer-2" />
      <ThemeConsumerWithId id="consumer-3" />
    </View>
  );
}

function ThemeConsumerWithId({ id }: { id: string }): React.JSX.Element {
  const { theme } = useTheme();
  return <Text testID={`theme-${id}`}>{theme}</Text>;
}

// Wrapper component with theme controls
function ThemeTestWrapper({
  children,
  defaultTheme = 'light',
}: {
  children: React.ReactNode;
  defaultTheme?: ThemeName;
}): React.JSX.Element {
  return (
    <ThemeProvider defaultTheme={defaultTheme} useSystemThemeByDefault={false}>
      {children}
    </ThemeProvider>
  );
}

describe('Theme System - Property Tests', () => {
  /**
   * Feature: walking-safely-app, Property 7: Atualização de Tema
   *
   * For any theme change (light to dark or dark to light),
   * all components using theme tokens MUST reflect the new theme
   * immediately after the change.
   */
  it('should immediately update all components when theme changes', () => {
    fc.assert(
      fc.property(
        // Generate a sequence of theme changes
        fc.array(fc.constantFrom<ThemeName>('light', 'dark'), { minLength: 1, maxLength: 10 }),
        (themeSequence) => {
          const { getByTestId } = render(
            <ThemeTestWrapper>
              <ThemeConsumer />
            </ThemeTestWrapper>
          );

          // Apply each theme change and verify immediate update
          for (const expectedTheme of themeSequence) {
            act(() => {
              const button = getByTestId(expectedTheme === 'light' ? 'set-light' : 'set-dark');
              button.props.onPress();
            });

            // Verify theme is immediately updated
            const currentTheme = getByTestId('current-theme').props.children;
            const themeName = getByTestId('theme-name').props.children;
            const isDarkMode = getByTestId('is-dark-mode').props.children;

            expect(currentTheme).toBe(expectedTheme);
            expect(themeName).toBe(expectedTheme);
            expect(isDarkMode).toBe((expectedTheme === 'dark').toString());
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Toggle theme produces opposite theme
   *
   * For any current theme state, toggling should produce the opposite theme.
   */
  it('should toggle between light and dark themes correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ThemeName>('light', 'dark'),
        fc.integer({ min: 1, max: 10 }),
        (initialTheme, toggleCount) => {
          const { getByTestId } = render(
            <ThemeTestWrapper defaultTheme={initialTheme}>
              <ThemeConsumer />
            </ThemeTestWrapper>
          );

          let expectedTheme = initialTheme;

          for (let i = 0; i < toggleCount; i++) {
            act(() => {
              getByTestId('toggle').props.onPress();
            });

            // Calculate expected theme after toggle
            expectedTheme = expectedTheme === 'light' ? 'dark' : 'light';

            // Verify theme is correct after toggle
            const currentTheme = getByTestId('current-theme').props.children;
            expect(currentTheme).toBe(expectedTheme);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All subscribed components receive theme updates
   *
   * For any theme change, ALL components using useTheme must reflect
   * the same theme value simultaneously.
   */
  it('should update all subscribed components simultaneously', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<ThemeName>('light', 'dark'), { minLength: 1, maxLength: 5 }),
        (themeSequence) => {
          // Create a wrapper that allows theme changes
          let setThemeRef: ((theme: ThemeName) => void) | null = null;

          function ThemeController(): React.JSX.Element {
            const { setTheme } = useTheme();
            setThemeRef = setTheme;
            return <MultipleThemeConsumers />;
          }

          const { getByTestId } = render(
            <ThemeTestWrapper>
              <ThemeController />
            </ThemeTestWrapper>
          );

          for (const expectedTheme of themeSequence) {
            act(() => {
              if (setThemeRef) {
                setThemeRef(expectedTheme);
              }
            });

            // Verify ALL consumers have the same theme
            const consumer1Theme = getByTestId('theme-consumer-1').props.children;
            const consumer2Theme = getByTestId('theme-consumer-2').props.children;
            const consumer3Theme = getByTestId('theme-consumer-3').props.children;

            expect(consumer1Theme).toBe(expectedTheme);
            expect(consumer2Theme).toBe(expectedTheme);
            expect(consumer3Theme).toBe(expectedTheme);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isDarkMode is consistent with theme
   *
   * For any theme state, isDarkMode should be true if and only if
   * the theme is 'dark'.
   */
  it('should have consistent isDarkMode value', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ThemeName>('light', 'dark'),
        (theme) => {
          const { getByTestId } = render(
            <ThemeTestWrapper defaultTheme={theme}>
              <ThemeConsumer />
            </ThemeTestWrapper>
          );

          const isDarkMode = getByTestId('is-dark-mode').props.children;
          const expectedIsDark = theme === 'dark';

          expect(isDarkMode).toBe(expectedIsDark.toString());

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Setting theme disables system theme
   *
   * For any manual theme change, isSystemTheme should become false.
   */
  it('should disable system theme when manually setting theme', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ThemeName>('light', 'dark'),
        (targetTheme) => {
          const { getByTestId } = render(
            <ThemeProvider useSystemThemeByDefault={true}>
              <ThemeConsumer />
            </ThemeProvider>
          );

          // Initially using system theme
          expect(getByTestId('is-system-theme').props.children).toBe('true');

          // Set theme manually
          act(() => {
            const button = getByTestId(targetTheme === 'light' ? 'set-light' : 'set-dark');
            button.props.onPress();
          });

          // System theme should be disabled
          expect(getByTestId('is-system-theme').props.children).toBe('false');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
