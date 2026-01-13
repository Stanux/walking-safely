/**
 * Modal Component for WalkingSafelyApp
 * Reusable modal with overlay and centered content
 * Uses design tokens for styling
 * Requirements: 6.1, 6.2
 */

import React, { ReactNode, useCallback } from 'react';
import {
  Modal as RNModal,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

export type ModalSize = 'sm' | 'md' | 'lg' | 'full';

export interface ModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Modal content */
  children: ReactNode;
  /** Modal size */
  size?: ModalSize;
  /** Whether to close modal when pressing overlay */
  closeOnOverlayPress?: boolean;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Custom container style */
  containerStyle?: StyleProp<ViewStyle>;
  /** Custom content style */
  contentStyle?: StyleProp<ViewStyle>;
  /** Animation type */
  animationType?: 'none' | 'slide' | 'fade';
  /** Test ID for testing */
  testID?: string;
}

/**
 * Modal component with overlay and centered content
 */
export function Modal({
  visible,
  onClose,
  children,
  size = 'md',
  closeOnOverlayPress = true,
  showCloseButton = true,
  containerStyle,
  contentStyle,
  animationType = 'fade',
  testID,
}: ModalProps): React.JSX.Element {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleOverlayPress = useCallback(() => {
    if (closeOnOverlayPress) {
      onClose();
    }
  }, [closeOnOverlayPress, onClose]);

  const getContentWidth = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return { width: '70%', maxWidth: 280 };
      case 'md':
        return { width: '85%', maxWidth: 400 };
      case 'lg':
        return { width: '95%', maxWidth: 600 };
      case 'full':
        return { width: '100%', height: '100%', borderRadius: 0 };
      default:
        return { width: '85%', maxWidth: 400 };
    }
  };

  const getBackgroundColor = (): string => {
    return isDark
      ? tokens.colors.surface.dark
      : tokens.colors.background.light;
  };

  const getShadowStyle = (): ViewStyle => {
    const shadowConfig = tokens.shadow.lg;
    return Platform.select({
      ios: {
        shadowColor: shadowConfig.shadowColor,
        shadowOffset: shadowConfig.shadowOffset,
        shadowOpacity: isDark
          ? shadowConfig.shadowOpacity * 1.5
          : shadowConfig.shadowOpacity,
        shadowRadius: shadowConfig.shadowRadius,
      },
      android: {
        elevation: shadowConfig.elevation,
      },
      default: {},
    }) as ViewStyle;
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
      statusBarTranslucent
      testID={testID}
    >
      <TouchableWithoutFeedback onPress={handleOverlayPress}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.content,
                  getContentWidth(),
                  {
                    backgroundColor: getBackgroundColor(),
                  },
                  size !== 'full' && getShadowStyle(),
                  size !== 'full' && {
                    borderRadius: tokens.borderRadius.xl,
                  },
                  containerStyle,
                ]}
              >
                {showCloseButton && size !== 'full' ? (
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                    accessibilityLabel="Fechar modal"
                    accessibilityRole="button"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <View
                      style={[
                        styles.closeIcon,
                        {
                          backgroundColor: isDark
                            ? tokens.colors.text.secondary.dark
                            : tokens.colors.text.secondary.light,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.closeLine,
                          styles.closeLineLeft,
                          {
                            backgroundColor: getBackgroundColor(),
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.closeLine,
                          styles.closeLineRight,
                          {
                            backgroundColor: getBackgroundColor(),
                          },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                ) : null}
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={[
                    styles.scrollContent,
                    contentStyle,
                  ]}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {children}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  content: {
    maxHeight: '90%',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: tokens.spacing.md,
    right: tokens.spacing.md,
    zIndex: 1,
  },
  closeIcon: {
    width: 24,
    height: 24,
    borderRadius: tokens.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeLine: {
    position: 'absolute',
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  closeLineLeft: {
    transform: [{ rotate: '45deg' }],
  },
  closeLineRight: {
    transform: [{ rotate: '-45deg' }],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: tokens.spacing.lg,
  },
});

export default Modal;
