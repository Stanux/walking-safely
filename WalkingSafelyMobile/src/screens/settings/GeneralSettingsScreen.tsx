/**
 * General Settings Screen
 * General app settings including keep screen awake option
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Switch,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {textStyles} from '../../theme/typography';
import {spacing, borderRadius, shadows} from '../../theme/spacing';
import {usePreferencesStore} from '../../store/preferencesStore';
import type {GeneralSettingsScreenProps} from '../../types/navigation';

/**
 * Settings item with switch component
 */
interface SettingsSwitchItemProps {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: string;
}

const SettingsSwitchItem: React.FC<SettingsSwitchItemProps> = ({
  title,
  description,
  value,
  onValueChange,
  icon,
}) => (
  <View style={styles.settingItem}>
    <View style={styles.settingContent}>
      {icon && <Text style={styles.settingIcon}>{icon}</Text>}
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description && (
          <Text style={styles.settingDescription}>{description}</Text>
        )}
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{
        false: colors.border.light,
        true: colors.primary.light,
      }}
      thumbColor={value ? colors.primary.main : colors.neutral.gray500}
      ios_backgroundColor={colors.border.light}
    />
  </View>
);

/**
 * General Settings Screen
 * Displays general app settings like keep screen awake
 */
export const GeneralSettingsScreen: React.FC<GeneralSettingsScreenProps> = ({
  navigation,
}) => {
  const {t} = useTranslation();
  const {keepScreenAwake, setKeepScreenAwake} = usePreferencesStore();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('settings.display') || 'Tela'}
          </Text>
          <View style={styles.sectionContent}>
            <SettingsSwitchItem
              icon="📱"
              title={t('settings.keepScreenAwake') || 'Manter tela ligada'}
              description={
                t('settings.keepScreenAwakeDescription') ||
                'Impede que a tela seja bloqueada enquanto o app estiver ativo'
              }
              value={keepScreenAwake}
              onValueChange={setKeepScreenAwake}
            />
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            {t('settings.generalInfo') ||
              'Essas configurações afetam o comportamento geral do aplicativo.'}
          </Text>
        </View>
      </ScrollView>
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...textStyles.h5,
    color: colors.text.primary,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  sectionContent: {
    backgroundColor: colors.background.primary,
    marginHorizontal: spacing.base,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  settingDescription: {
    ...textStyles.caption,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  infoContainer: {
    marginHorizontal: spacing.base,
    marginTop: spacing.lg,
    padding: spacing.base,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.base,
    ...shadows.sm,
  },
  infoText: {
    ...textStyles.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default GeneralSettingsScreen;