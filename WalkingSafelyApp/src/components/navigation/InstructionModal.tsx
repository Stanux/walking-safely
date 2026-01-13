/**
 * InstructionModal Component
 * Modal displaying the complete list of navigation instructions
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import React, {memo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {spacing, borderRadius, shadows} from '../../theme/spacing';
import {textStyles} from '../../theme/typography';
import type {RouteInstruction} from '../../types/models';

const {height: screenHeight} = Dimensions.get('window');

/**
 * Props for InstructionModal component
 */
export interface InstructionModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** List of route instructions to display */
  instructions: RouteInstruction[];
  /** Callback when modal is closed */
  onClose: () => void;
}

/**
 * Get maneuver icon based on maneuver type
 */
const getManeuverIcon = (maneuver: string): string => {
  const icons: Record<string, string> = {
    'turn-left': '↰',
    'turn-right': '↱',
    'turn-slight-left': '↖',
    'turn-slight-right': '↗',
    'turn-sharp-left': '⬅',
    'turn-sharp-right': '➡',
    'uturn-left': '↩',
    'uturn-right': '↪',
    'uturn': '↩',
    'straight': '↑',
    'continue': '↑',
    'merge': '⤵',
    'ramp-left': '↙',
    'ramp-right': '↘',
    'fork-left': '⑂',
    'fork-right': '⑂',
    'roundabout-left': '↺',
    'roundabout-right': '↻',
    'roundabout': '↻',
    'arrive': '🏁',
    'depart': '🚗',
  };
  return icons[maneuver] || '↑';
};

/**
 * Format distance from meters to human-readable string
 */
const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

/**
 * Individual instruction item component
 */
interface InstructionItemProps {
  instruction: RouteInstruction;
  index: number;
  isLast: boolean;
}

const InstructionItem: React.FC<InstructionItemProps> = ({
  instruction,
  index,
  isLast,
}) => {
  const icon = getManeuverIcon(instruction.maneuver);
  const distance = formatDistance(instruction.distance);

  return (
    <View style={[styles.instructionItem, isLast && styles.instructionItemLast]}>
      {/* Step number */}
      <View style={styles.stepContainer}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>{index + 1}</Text>
        </View>
        {!isLast && <View style={styles.stepLine} />}
      </View>

      {/* Maneuver icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.maneuverIcon}>{icon}</Text>
      </View>

      {/* Instruction content */}
      <View style={styles.instructionContent}>
        <Text style={styles.instructionText}>{instruction.text}</Text>
        {instruction.distance > 0 && (
          <Text style={styles.instructionDistance}>{distance}</Text>
        )}
      </View>
    </View>
  );
};


/**
 * InstructionModal Component
 * Requirement 10.1: Display modal when user triggers instructions button
 * Requirement 10.2: Modal occupies most of the screen
 * Requirement 10.3: List all instructions that will be presented during navigation
 * Requirement 10.4: Allow user to close and return to map view
 */
const InstructionModalComponent: React.FC<InstructionModalProps> = ({
  visible,
  instructions,
  onClose,
}) => {
  const {t} = useTranslation();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Requirement 10.2: Modal occupies most of the screen */}
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {t('navigation.instructions.routeInstructions') || 'Instruções da Rota'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {t('navigation.instructions.stepsCount', {count: instructions.length}) ||
                `${instructions.length} passos`}
            </Text>
            {/* Requirement 10.4: Close button to return to map view */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('common.close') || 'Fechar'}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Requirement 10.3: List all navigation instructions */}
          <ScrollView
            style={styles.instructionsList}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.instructionsListContent}
          >
            {instructions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {t('navigation.instructions.noInstructions') ||
                    'Nenhuma instrução disponível'}
                </Text>
              </View>
            ) : (
              instructions.map((instruction, index) => (
                <InstructionItem
                  key={`instruction-${index}`}
                  instruction={instruction}
                  index={index}
                  isLast={index === instructions.length - 1}
                />
              ))
            )}
          </ScrollView>

          {/* Footer with close button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('common.close') || 'Fechar'}
            >
              <Text style={styles.footerButtonText}>
                {t('common.close') || 'Fechar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    // Requirement 10.2: Modal occupies most of the screen
    maxHeight: screenHeight * 0.85,
    minHeight: screenHeight * 0.6,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    ...textStyles.h3,
    color: colors.text.primary,
    flex: 1,
  },
  headerSubtitle: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginRight: spacing.md,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  instructionsList: {
    flex: 1,
  },
  instructionsListContent: {
    paddingVertical: spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 70,
  },
  instructionItemLast: {
    paddingBottom: spacing.lg,
  },
  stepContainer: {
    alignItems: 'center',
    width: 32,
    marginRight: spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    ...textStyles.caption,
    color: colors.neutral.white,
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border.light,
    marginTop: spacing.xs,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  maneuverIcon: {
    fontSize: 22,
    color: colors.primary.main,
  },
  instructionContent: {
    flex: 1,
    justifyContent: 'center',
  },
  instructionText: {
    ...textStyles.body,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  instructionDistance: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyText: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  footerButton: {
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonText: {
    ...textStyles.label,
    color: colors.neutral.white,
    fontWeight: '600',
  },
});

/**
 * Memoized InstructionModal to prevent unnecessary re-renders
 */
export const InstructionModal = memo(InstructionModalComponent);

InstructionModal.displayName = 'InstructionModal';

export default InstructionModal;
