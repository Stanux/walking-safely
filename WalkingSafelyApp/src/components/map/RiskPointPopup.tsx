/**
 * RiskPointPopup Component
 * Popup displaying occurrence details when a risk point is tapped
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import React, {memo} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import {tokens} from '@/shared/theme/tokens';
import {useTheme} from '@/shared/theme/ThemeProvider';
import {useAuthStore} from '@/features/auth/store/authStore';
import type {Occurrence, OccurrenceSeverity} from '@/types/models';

export interface RiskPointPopupProps {
  occurrence: Occurrence | null;
  visible: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

/**
 * Get severity color based on severity level
 */
const getSeverityColor = (severity: OccurrenceSeverity): string => {
  switch (severity) {
    case 'low':
      return '#FFC107';
    case 'medium':
      return '#FF9800';
    case 'high':
      return '#F44336';
    case 'critical':
      return '#9C27B0';
    default:
      return '#FF9800';
  }
};

/**
 * Get severity label based on severity level
 */
const getSeverityLabel = (severity: OccurrenceSeverity): string => {
  switch (severity) {
    case 'low':
      return 'Baixa';
    case 'medium':
      return 'Média';
    case 'high':
      return 'Alta';
    case 'critical':
      return 'Crítica';
    default:
      return 'Média';
  }
};

/**
 * RiskPointPopup - Displays occurrence details in a popup
 * Requirements:
 * - 3.1: Display popup when user taps on risk point
 * - 3.2: Display occurrence type
 * - 3.3: Display severity level
 * - 3.4: Display description if available
 * - 3.5: Allow user to close and return to map
 */
export const RiskPointPopup: React.FC<RiskPointPopupProps> = memo(
  ({occurrence, visible, onClose, onDelete}) => {
    const {theme} = useTheme();
    const isDark = theme === 'dark';
    const {user} = useAuthStore();

    if (!occurrence) {
      return null;
    }

    const severityColor = getSeverityColor(occurrence.severity);
    const severityLabel = getSeverityLabel(occurrence.severity);
    const description = (occurrence as any).metadata?.description || null;
    const hasDescription = description !== null && description !== undefined && description.trim() !== '';
    
    // Check if current user owns this occurrence
    console.log('[RiskPointPopup] user:', user?.id, 'createdBy:', occurrence.createdBy);
    const canDelete = user && occurrence.createdBy && String(occurrence.createdBy) === String(user.id);

    const handleDelete = () => {
      Alert.alert(
        'Excluir Ocorrência',
        'Tem certeza que deseja excluir esta ocorrência?',
        [
          {text: 'Cancelar', style: 'cancel'},
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: () => {
              if (onDelete) {
                onDelete(occurrence.id);
              }
            },
          },
        ]
      );
    };

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        accessibilityViewIsModal>
        <Pressable style={styles.overlay} onPress={onClose}>
          <View style={styles.container}>
            <Pressable onPress={e => e.stopPropagation()}>
              <View
                style={[
                  styles.popup,
                  {
                    backgroundColor: isDark
                      ? tokens.colors.surface.dark
                      : tokens.colors.background.light,
                  },
                ]}>
                {/* Header with close button */}
                <View
                  style={[
                    styles.header,
                    {
                      borderBottomColor: isDark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.1)',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.title,
                      {
                        color: isDark
                          ? tokens.colors.text.primary.dark
                          : tokens.colors.text.primary.light,
                      },
                    ]}>
                    Detalhes da Ocorrência
                  </Text>
                  <TouchableOpacity
                    onPress={onClose}
                    style={[
                      styles.closeButton,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(0,0,0,0.05)',
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Fechar popup">
                    <Text
                      style={[
                        styles.closeButtonText,
                        {
                          color: isDark
                            ? tokens.colors.text.secondary.dark
                            : tokens.colors.text.secondary.light,
                        },
                      ]}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Crime Type (Req 3.2) */}
                <View style={styles.row}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: isDark
                          ? tokens.colors.text.secondary.dark
                          : tokens.colors.text.secondary.light,
                      },
                    ]}>
                    Tipo:
                  </Text>
                  <Text
                    style={[
                      styles.value,
                      {
                        color: isDark
                          ? tokens.colors.text.primary.dark
                          : tokens.colors.text.primary.light,
                      },
                    ]}>
                    {occurrence.crimeType?.name || 'Ocorrência'}
                  </Text>
                </View>

                {/* Severity Level (Req 3.3) */}
                <View style={styles.row}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: isDark
                          ? tokens.colors.text.secondary.dark
                          : tokens.colors.text.secondary.light,
                      },
                    ]}>
                    Severidade:
                  </Text>
                  <View style={styles.severityContainer}>
                    <View
                      style={[
                        styles.severityBadge,
                        {backgroundColor: severityColor},
                      ]}
                    />
                    <Text
                      style={[
                        styles.value,
                        {
                          color: isDark
                            ? tokens.colors.text.primary.dark
                            : tokens.colors.text.primary.light,
                        },
                      ]}>
                      {severityLabel}
                    </Text>
                  </View>
                </View>

                {/* Description if available (Req 3.4) */}
                {hasDescription && (
                  <View style={styles.descriptionContainer}>
                    <Text
                      style={[
                        styles.label,
                        {
                          color: isDark
                            ? tokens.colors.text.secondary.dark
                            : tokens.colors.text.secondary.light,
                        },
                      ]}>
                      Descrição:
                    </Text>
                    <Text
                      style={[
                        styles.description,
                        {
                          color: isDark
                            ? tokens.colors.text.primary.dark
                            : tokens.colors.text.primary.light,
                        },
                      ]}>
                      {description}
                    </Text>
                  </View>
                )}

                {/* Close button (Req 3.5) */}
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.actionButton,
                    {backgroundColor: tokens.colors.primary[500]},
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar e voltar ao mapa">
                  <Text style={styles.actionButtonText}>Fechar</Text>
                </TouchableOpacity>

                {/* Delete button - only shown if user owns this occurrence */}
                {canDelete && (
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={[
                      styles.actionButton,
                      styles.deleteButton,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Excluir ocorrência">
                    <Text style={styles.actionButtonText}>Excluir</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    );
  },
);

RiskPointPopup.displayName = 'RiskPointPopup';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    maxWidth: 350,
  },
  popup: {
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.lg,
    ...tokens.shadow.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
    borderBottomWidth: 1,
    paddingBottom: tokens.spacing.sm,
  },
  title: {
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: '600',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  label: {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: '500',
    marginRight: tokens.spacing.sm,
    minWidth: 80,
  },
  value: {
    fontSize: tokens.typography.fontSize.sm,
    flex: 1,
  },
  severityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  severityBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: tokens.spacing.sm,
  },
  descriptionContainer: {
    marginTop: tokens.spacing.xs,
    marginBottom: tokens.spacing.sm,
  },
  description: {
    fontSize: tokens.typography.fontSize.sm,
    marginTop: tokens.spacing.xs,
    lineHeight: 20,
  },
  actionButton: {
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    marginTop: tokens.spacing.sm,
  },
  deleteButton: {
    backgroundColor: tokens.colors.error,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: tokens.typography.fontSize.md,
    fontWeight: '600',
  },
});

export default RiskPointPopup;
