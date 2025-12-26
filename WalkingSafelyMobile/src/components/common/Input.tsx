/**
 * Input Component
 * Reusable text input with label, error state, and icons
 */

import React, {useState, forwardRef} from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import {colors} from '../../theme/colors';
import {textStyles} from '../../theme/typography';
import {spacing, borderWidth, componentSpacing} from '../../theme/spacing';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  required?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      disabled = false,
      leftIcon,
      rightIcon,
      onRightIconPress,
      containerStyle,
      inputStyle,
      required = false,
      editable = true,
      ...rest
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const isEditable = editable && !disabled;
    const hasError = !!error;

    const inputContainerStyles: ViewStyle[] = [
      styles.inputContainer,
      isFocused && styles.inputContainerFocused,
      hasError && styles.inputContainerError,
      disabled && styles.inputContainerDisabled,
    ].filter(Boolean) as ViewStyle[];

    const inputStyles: TextStyle[] = [
      styles.input,
      leftIcon && styles.inputWithLeftIcon,
      rightIcon && styles.inputWithRightIcon,
      disabled && styles.inputDisabled,
      inputStyle,
    ].filter(Boolean) as TextStyle[];

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <View style={styles.labelContainer}>
            <Text style={[styles.label, hasError && styles.labelError]}>
              {label}
            </Text>
            {required && <Text style={styles.required}>*</Text>}
          </View>
        )}

        <View style={inputContainerStyles}>
          {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

          <TextInput
            ref={ref}
            style={inputStyles}
            editable={isEditable}
            placeholderTextColor={colors.neutral.gray400}
            onFocus={e => {
              setIsFocused(true);
              rest.onFocus?.(e);
            }}
            onBlur={e => {
              setIsFocused(false);
              rest.onBlur?.(e);
            }}
            accessibilityLabel={label}
            accessibilityState={{disabled}}
            {...rest}
          />

          {rightIcon && (
            <TouchableOpacity
              style={styles.rightIconContainer}
              onPress={onRightIconPress}
              disabled={!onRightIconPress}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              {rightIcon}
            </TouchableOpacity>
          )}
        </View>

        {(error || hint) && (
          <Text style={[styles.helperText, hasError && styles.errorText]}>
            {error || hint}
          </Text>
        )}
      </View>
    );
  },
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  labelContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },

  label: {
    ...textStyles.label,
    color: colors.text.primary,
  },

  labelError: {
    color: colors.error.main,
  },

  required: {
    ...textStyles.label,
    color: colors.error.main,
    marginLeft: spacing.xs,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderWidth: borderWidth.thin,
    borderColor: colors.border.medium,
    borderRadius: componentSpacing.inputBorderRadius,
    minHeight: 48,
  },

  inputContainerFocused: {
    borderColor: colors.primary.main,
    borderWidth: borderWidth.base,
  },

  inputContainerError: {
    borderColor: colors.error.main,
    borderWidth: borderWidth.base,
  },

  inputContainerDisabled: {
    backgroundColor: colors.neutral.gray100,
    borderColor: colors.border.light,
  },

  input: {
    flex: 1,
    ...textStyles.body,
    color: colors.text.primary,
    paddingHorizontal: componentSpacing.inputPaddingHorizontal,
    paddingVertical: componentSpacing.inputPaddingVertical,
  },

  inputWithLeftIcon: {
    paddingLeft: spacing.xs,
  },

  inputWithRightIcon: {
    paddingRight: spacing.xs,
  },

  inputDisabled: {
    color: colors.text.tertiary,
  },

  leftIconContainer: {
    paddingLeft: componentSpacing.inputPaddingHorizontal,
  },

  rightIconContainer: {
    paddingRight: componentSpacing.inputPaddingHorizontal,
  },

  helperText: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  errorText: {
    color: colors.error.main,
  },
});

export default Input;
