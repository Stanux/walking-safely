/**
 * Modal Component
 * Reusable modal dialog with customizable content
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal as RNModal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {textStyles} from '../../theme/typography';
import {spacing, componentSpacing} from '../../theme/spacing';
import {Button, ButtonVariant} from './Button';

export type ModalSize = 'small' | 'medium' | 'large' | 'fullscreen';

export interface ModalAction {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
}

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  children?: React.ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  actions?: ModalAction[];
  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  testID?: string;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  message,
  children,
  size = 'medium',
  closeOnBackdrop = true,
  showCloseButton = false,
  actions,
  primaryAction,
  secondaryAction,
  style,
  contentStyle,
  testID = 'modal',
}) => {
  const {t} = useTranslation();

  const handleBackdropPress = () => {
    if (closeOnBackdrop) {
      onClose();
    }
  };

  const renderActions = () => {
    // Use explicit actions array if provided
    if (actions && actions.length > 0) {
      return (
        <View style={styles.actionsContainer}>
          {actions.map((action, index) => (
            <Button
              key={index}
              title={action.label}
              variant={action.variant ?? 'primary'}
              onPress={action.onPress}
              loading={action.loading}
              disabled={action.disabled}
              style={styles.actionButton}
            />
          ))}
        </View>
      );
    }

    // Use primary/secondary actions
    if (primaryAction || secondaryAction) {
      return (
        <View style={styles.actionsContainer}>
          {secondaryAction && (
            <Button
              title={secondaryAction.label}
              variant={secondaryAction.variant ?? 'outline'}
              onPress={secondaryAction.onPress}
              loading={secondaryAction.loading}
              disabled={secondaryAction.disabled}
              style={styles.actionButton}
            />
          )}
          {primaryAction && (
            <Button
              title={primaryAction.label}
              variant={primaryAction.variant ?? 'primary'}
              onPress={primaryAction.onPress}
              loading={primaryAction.loading}
              disabled={primaryAction.disabled}
              style={styles.actionButton}
            />
          )}
        </View>
      );
    }

    return null;
  };

  const containerStyles: ViewStyle[] = [
    styles.modalContainer,
    styles[`${size}Container`],
    style,
  ].filter(Boolean) as ViewStyle[];

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      testID={testID}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={containerStyles}>
                {/* Header */}
                {(title || showCloseButton) && (
                  <View style={styles.header}>
                    {title && <Text style={styles.title}>{title}</Text>}
                    {showCloseButton && (
                      <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeButton}
                        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                        accessibilityLabel={t('common.close')}
                        accessibilityRole="button">
                        <Text style={styles.closeButtonText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Content */}
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={[styles.content, contentStyle]}
                  showsVerticalScrollIndicator={false}
                  bounces={false}>
                  {message && <Text style={styles.message}>{message}</Text>}
                  {children}
                </ScrollView>

                {/* Actions */}
                {renderActions()}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },

  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay.modal,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },

  modalContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: componentSpacing.modalBorderRadius,
    maxHeight: '90%',
    shadowColor: colors.neutral.black,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },

  // Size variants
  smallContainer: {
    width: '80%',
    maxWidth: 280,
  },

  mediumContainer: {
    width: '90%',
    maxWidth: 400,
  },

  largeContainer: {
    width: '95%',
    maxWidth: 500,
  },

  fullscreenContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    maxHeight: '100%',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: componentSpacing.modalPadding,
    paddingTop: componentSpacing.modalPadding,
    paddingBottom: spacing.sm,
  },

  title: {
    ...textStyles.h4,
    color: colors.text.primary,
    flex: 1,
  },

  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },

  closeButtonText: {
    ...textStyles.body,
    color: colors.text.secondary,
    fontSize: 18,
  },

  scrollView: {
    flexGrow: 0,
  },

  content: {
    paddingHorizontal: componentSpacing.modalPadding,
    paddingBottom: spacing.base,
  },

  message: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginBottom: spacing.base,
  },

  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: componentSpacing.modalPadding,
    paddingBottom: componentSpacing.modalPadding,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },

  actionButton: {
    minWidth: 80,
  },
});

export default Modal;
