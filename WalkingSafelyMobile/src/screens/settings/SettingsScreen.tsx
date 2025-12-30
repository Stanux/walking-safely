/**
 * Settings Screen
 * Main settings menu with navigation to sub-screens
 * Requirements: 16.1
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {textStyles} from '../../theme/typography';
import {spacing, borderRadius, shadows} from '../../theme/spacing';
import type {SettingsHomeScreenProps} from '../../types/navigation';

/**
 * Settings menu item interface
 */
interface SettingsMenuItem {
  id: string;
  titleKey: string;
  icon: string;
  screen: 'AlertPreferences' | 'GeneralSettings' | 'LanguageSettings' | 'PrivacySettings' | 'About';
}

/**
 * Settings menu items configuration
 */
const SETTINGS_MENU_ITEMS: SettingsMenuItem[] = [
  {
    id: 'general',
    titleKey: 'settings.general',
    icon: '⚙️',
    screen: 'GeneralSettings',
  },
  {
    id: 'alerts',
    titleKey: 'settings.alertPreferences',
    icon: '🔔',
    screen: 'AlertPreferences',
  },
  {
    id: 'language',
    titleKey: 'settings.language',
    icon: '🌐',
    screen: 'LanguageSettings',
  },
  {
    id: 'privacy',
    titleKey: 'settings.privacy',
    icon: '🔒',
    screen: 'PrivacySettings',
  },
  {
    id: 'about',
    titleKey: 'settings.about',
    icon: 'ℹ️',
    screen: 'About',
  },
];

/**
 * Settings menu item component
 */
interface MenuItemProps {
  item: SettingsMenuItem;
  onPress: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({item, onPress}) => {
  const {t} = useTranslation();

  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t(item.titleKey)}>
      <View style={styles.menuItemContent}>
        <Text style={styles.menuItemIcon}>{item.icon}</Text>
        <Text style={styles.menuItemTitle}>{t(item.titleKey)}</Text>
      </View>
      <Text style={styles.menuItemArrow}>›</Text>
    </TouchableOpacity>
  );
};

/**
 * Main Settings Screen
 * Displays list of settings options: Alerts, Language, Privacy, About
 * Requirement 16.1: Navigation by tabs at bottom (Settings tab)
 */
export const SettingsScreen: React.FC<SettingsHomeScreenProps> = ({
  navigation,
}) => {
  const {t} = useTranslation();

  const handleMenuItemPress = (screen: SettingsMenuItem['screen']) => {
    navigation.navigate(screen);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.menuContainer}>
          {SETTINGS_MENU_ITEMS.map(item => (
            <MenuItem
              key={item.id}
              item={item}
              onPress={() => handleMenuItemPress(item.screen)}
            />
          ))}
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>{t('settings.version')} 1.0.0</Text>
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
  menuContainer: {
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
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
  menuItemTitle: {
    ...textStyles.body,
    color: colors.text.primary,
  },
  menuItemArrow: {
    ...textStyles.h3,
    color: colors.text.tertiary,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: spacing['2xl'],
    paddingBottom: spacing.base,
  },
  versionText: {
    ...textStyles.caption,
    color: colors.text.tertiary,
  },
});

export default SettingsScreen;
