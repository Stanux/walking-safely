/**
 * Input Component for WalkingSafelyApp
 * Reusable text input with types: text, email, password
 * Supports states: error, disabled, focused
 * Displays error messages
 * Uses design tokens for styling
 * Requirements: 6.1, 6.2, 6.3
 */

import React, { useState, useCallback, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  TextInputProps,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

export type InputType = 'text' | 'email' | 'password';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  /** Input type */
  type?: InputType;
  /** Label text */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Custom container style */
  containerStyle?: StyleProp<ViewStyle>;
  /** Custom input style */
  inputStyle?: StyleProp<TextStyle>;
  /** Custom label style */
  labelStyle?: StyleProp<TextStyle>;
  /** Custom error style */
  errorStyle?: StyleProp<TextStyle>;
  /** Left icon component */
  leftIcon?: React.ReactNode;
  /** Right icon component */
  rightIcon?: React.ReactNode;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Input component with multiple types and states
 */
export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      type = 'text',
      label,
      error,
      disabled = false,
      containerStyle,
      inputStyle,
      labelStyle,
      errorStyle,
      leftIcon,
      rightIcon,
      testID,
      onFocus,
      onBlur,
      ...textInputProps
    },
    ref
  ): React.JSX.Element => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const handleFocus = useCallback(
      (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        setIsFocused(true);
        onFocus?.(e);
      },
      [onFocus]
    );

    const handleBlur = useCallback(
      (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        setIsFocused(false);
        onBlur?.(e);
      },
      [onBlur]
    );

    const togglePasswordVisibility = useCallback(() => {
      setIsPasswordVisible((prev) => !prev);
    }, []);

    const getKeyboardType = (): TextInputProps['keyboardType'] => {
      switch (type) {
        case 'email':
          return 'email-address';
        default:
          return 'default';
      }
    };

    const getAutoCapitalize = (): TextInputProps['autoCapitalize'] => {
      switch (type) {
        case 'email':
        case 'password':
          return 'none';
        default:
          return 'sentences';
      }
    };

    const getContainerBorderColor = (): string => {
      if (error) {
        return tokens.colors.error;
      }
      if (isFocused) {
        return tokens.colors.primary[isDark ? 400 : 500];
      }
      if (disabled) {
        return isDark
          ? tokens.colors.text.secondary.dark
          : tokens.colors.text.secondary.light;
      }
      return isDark
        ? tokens.colors.primary[700]
        : tokens.colors.primary[200];
    };

    const getBackgroundColor = (): string => {
      if (disabled) {
        return isDark
          ? tokens.colors.surface.dark
          : tokens.colors.surface.light;
      }
      return isDark
        ? tokens.colors.background.dark
        : tokens.colors.background.light;
    };

    const getTextColor = (): string => {
      if (disabled) {
        return isDark
          ? tokens.colors.text.secondary.dark
          : tokens.colors.text.secondary.light;
      }
      return isDark
        ? tokens.colors.text.primary.dark
        : tokens.colors.text.primary.light;
    };

    const getPlaceholderColor = (): string => {
      return isDark
        ? tokens.colors.text.secondary.dark
        : tokens.colors.text.secondary.light;
    };

    const isPassword = type === 'password';
    const secureTextEntry = isPassword && !isPasswordVisible;

    return (
      <View style={[styles.container, containerStyle]} testID={testID}>
        {label ? (
          <Text
            style={[
              styles.label,
              {
                color: error
                  ? tokens.colors.error
                  : isDark
                    ? tokens.colors.text.primary.dark
                    : tokens.colors.text.primary.light,
              },
              labelStyle,
            ]}
          >
            {label}
          </Text>
        ) : null}
        <View
          style={[
            styles.inputContainer,
            {
              borderColor: getContainerBorderColor(),
              backgroundColor: getBackgroundColor(),
            },
            isFocused ? styles.inputContainerFocused : undefined,
            error ? styles.inputContainerError : undefined,
          ]}
        >
          {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              {
                color: getTextColor(),
              },
              leftIcon ? styles.inputWithLeftIcon : undefined,
              (rightIcon || isPassword) ? styles.inputWithRightIcon : undefined,
              inputStyle,
            ]}
            placeholderTextColor={getPlaceholderColor()}
            editable={!disabled}
            keyboardType={getKeyboardType()}
            autoCapitalize={getAutoCapitalize()}
            secureTextEntry={secureTextEntry}
            autoCorrect={type !== 'email' && type !== 'password'}
            onFocus={handleFocus}
            onBlur={handleBlur}
            accessibilityLabel={label}
            accessibilityState={{ disabled }}
            {...textInputProps}
          />
          {isPassword ? (
            <TouchableOpacity
              style={styles.rightIcon}
              onPress={togglePasswordVisibility}
              accessibilityLabel={
                isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'
              }
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.toggleText,
                  {
                    color: tokens.colors.primary[isDark ? 400 : 500],
                  },
                ]}
              >
                {isPasswordVisible ? 'Ocultar' : 'Mostrar'}
              </Text>
            </TouchableOpacity>
          ) : rightIcon ? (
            <View style={styles.rightIcon}>{rightIcon}</View>
          ) : null}
        </View>
        {error ? (
          <Text style={[styles.error, errorStyle]}>{error}</Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: tokens.spacing.md,
  },
  label: {
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.medium,
    marginBottom: tokens.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    minHeight: 48,
  },
  inputContainerFocused: {
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: tokens.colors.error,
  },
  input: {
    flex: 1,
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.regular,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  inputWithLeftIcon: {
    paddingLeft: tokens.spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: tokens.spacing.xs,
  },
  leftIcon: {
    paddingLeft: tokens.spacing.md,
  },
  rightIcon: {
    paddingRight: tokens.spacing.md,
  },
  toggleText: {
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.medium,
  },
  error: {
    fontSize: tokens.typography.fontSize.xs,
    fontFamily: tokens.typography.fontFamily.regular,
    color: tokens.colors.error,
    marginTop: tokens.spacing.xs,
  },
});

export default Input;
