/**
 * Privacy Settings Screen
 * Allows users to manage privacy settings and request data deletion (LGPD)
 * Requirements: 13.4, 13.5
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {textStyles} from '../../theme/typography';
import {spacing, borderRadius, shadows} from '../../theme/spacing';
import {Modal} from '../../components/common/Modal';
import {Button} from '../../components/common/Button';
import type {PrivacySettingsScreenProps} from '../../types/navigation';

/**
 * Privacy policy URL
 */
const PRIVACY_POLICY_URL = 'https://walkingsafely.app/privacy';
const TERMS_OF_SERVICE_URL = 'https://walkingsafely.app/terms';

/**
 * Menu item component
 */
interface MenuItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
}) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={title}>
    <View style={styles.menuItemContent}>
      <Text style={styles.menuItemIcon}>{icon}</Text>
      <View style={styles.menuItemTextContainer}>
        <Text style={[styles.menuItemTitle, danger && styles.dangerText]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    <Text style={styles.menuItemArrow}>›</Text>
  </TouchableOpacity>
);

/**
 * Privacy Settings Screen Component
 * Requirement 13.4: Display privacy settings with option to request data deletion (LGPD)
 * Requirement 13.5: Display link to privacy policy
 */
export const PrivacyScreen: React.FC<PrivacySettingsScreenProps> = () => {
  const {t} = useTranslation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Open privacy policy in browser
   */
  const handlePrivacyPolicyPress = useCallback(async () => {
    try {
      const canOpen = await Linking.canOpenURL(PRIVACY_POLICY_URL);
      if (canOpen) {
        await Linking.openURL(PRIVACY_POLICY_URL);
      } else {
        Alert.alert(t('common.error'), t('errors.unknown'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.unknown'));
    }
  }, [t]);

  /**
   * Open terms of service in browser
   */
  const handleTermsPress = useCallback(async () => {
    try {
      const canOpen = await Linking.canOpenURL(TERMS_OF_SERVICE_URL);
      if (canOpen) {
        await Linking.openURL(TERMS_OF_SERVICE_URL);
      } else {
        Alert.alert(t('common.error'), t('errors.unknown'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.unknown'));
    }
  }, [t]);

  /**
   * Show data deletion confirmation modal
   */
  const handleDeleteDataPress = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  /**
   * Close data deletion modal
   */
  const handleCloseModal = useCallback(() => {
    setShowDeleteModal(false);
  }, []);

  /**
   * Confirm data deletion request
   * In production, this would call the backend API
   */
  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);

    try {
      // Simulate API call - in production this would call the LGPD endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));

      setShowDeleteModal(false);
      Alert.alert(t('common.success'), t('settings.deleteDataSuccess'));
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.unknown'));
    } finally {
      setIsDeleting(false);
    }
  }, [t]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Legal Documents Section */}
        <Text style={styles.sectionHeader}>{t('settings.about')}</Text>
        <View style={styles.card}>
          <MenuItem
            icon="📄"
            title={t('settings.privacyPolicy')}
            onPress={handlePrivacyPolicyPress}
          />
          <View style={styles.separator} />
          <MenuItem
            icon="📋"
            title={t('settings.termsOfService')}
            onPress={handleTermsPress}
          />
        </View>

        {/* Data Management Section */}
        <Text style={styles.sectionHeader}>
          {t('settings.privacySettings')}
        </Text>
        <View style={styles.card}>
          <MenuItem
            icon="🗑️"
            title={t('settings.deleteData')}
            subtitle="LGPD"
            onPress={handleDeleteDataPress}
            danger
          />
        </View>

        {/* Info Text */}
        <Text style={styles.infoText}>{t('settings.deleteDataConfirm')}</Text>
      </ScrollView>

      {/* Delete Data Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        onClose={handleCloseModal}
        title={t('settings.deleteData')}
        message={t('settings.deleteDataConfirm')}
        size="small"
        closeOnBackdrop={!isDeleting}>
        <View style={styles.modalActions}>
          <Button
            title={t('common.cancel')}
            variant="outline"
            onPress={handleCloseModal}
            disabled={isDeleting}
            style={styles.modalButton}
          />
          <Button
            title={t('common.confirm')}
            variant="danger"
            onPress={handleConfirmDelete}
            loading={isDeleting}
            style={styles.modalButton}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.base,
  },
  sectionHeader: {
    ...textStyles.caption,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    marginTop: spacing.base,
  },
  card: {
    backgroundColor: colors.background.primary,
    marginHorizontal: spacing.base,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    ...textStyles.body,
    color: colors.text.primary,
  },
  menuItemSubtitle: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  menuItemArrow: {
    ...textStyles.h3,
    color: colors.text.tertiary,
  },
  dangerText: {
    color: colors.error.main,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.light,
    marginLeft: spacing.base + 20 + spacing.md, // icon width + margin
  },
  infoText: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginHorizontal: spacing['2xl'],
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.base,
  },
  modalButton: {
    minWidth: 100,
  },
});

export default PrivacyScreen;
