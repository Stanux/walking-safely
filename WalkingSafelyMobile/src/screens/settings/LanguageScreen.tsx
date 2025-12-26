/**
 * Language Settings Screen
 * Allows users to select their preferred language
 * Requirements: 12.3, 12.4
 */

import React, {useCallback} from 'react';
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
import {usePreferencesStore} from '../../store/preferencesStore';
import {SUPPORTED_LANGUAGES, SupportedLanguage} from '../../i18n';
import type {LanguageSettingsScreenProps} from '../../types/navigation';

/**
 * Language option interface
 */
interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}

/**
 * Available language options
 */
const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'pt-BR',
    name: 'Portuguese (Brazil)',
    nativeName: 'Português (Brasil)',
  },
  {code: 'en', name: 'English', nativeName: 'English'},
  {code: 'es', name: 'Spanish', nativeName: 'Español'},
];

/**
 * Language item component
 */
interface LanguageItemProps {
  option: LanguageOption;
  isSelected: boolean;
  onPress: () => void;
}

const LanguageItem: React.FC<LanguageItemProps> = ({
  option,
  isSelected,
  onPress,
}) => (
  <TouchableOpacity
    style={styles.languageItem}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="radio"
    accessibilityState={{selected: isSelected}}
    accessibilityLabel={option.nativeName}>
    <View style={styles.languageInfo}>
      <Text style={styles.languageNativeName}>{option.nativeName}</Text>
      <Text style={styles.languageName}>{option.name}</Text>
    </View>
    <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
      {isSelected && <View style={styles.radioInner} />}
    </View>
  </TouchableOpacity>
);

/**
 * Language Settings Screen Component
 * Requirement 12.3: Allow language change in settings
 * Requirement 12.4: Update entire interface immediately when language changes
 */
export const LanguageScreen: React.FC<LanguageSettingsScreenProps> = () => {
  const {t} = useTranslation();
  const {locale, setLocale} = usePreferencesStore();

  /**
   * Handle language selection
   * Updates locale in store which triggers i18n update
   */
  const handleLanguageSelect = useCallback(
    (languageCode: SupportedLanguage) => {
      setLocale(languageCode);
    },
    [setLocale],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeader}>{t('settings.selectLanguage')}</Text>

        <View style={styles.card}>
          {LANGUAGE_OPTIONS.map((option, index) => (
            <React.Fragment key={option.code}>
              <LanguageItem
                option={option}
                isSelected={locale === option.code}
                onPress={() => handleLanguageSelect(option.code)}
              />
              {index < LANGUAGE_OPTIONS.length - 1 && (
                <View style={styles.separator} />
              )}
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.helpText}>
          {t('settings.language')} • {SUPPORTED_LANGUAGES[locale]}
        </Text>
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
  sectionHeader: {
    ...textStyles.caption,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.background.primary,
    marginHorizontal: spacing.base,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
  },
  languageInfo: {
    flex: 1,
  },
  languageNativeName: {
    ...textStyles.body,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  languageName: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.neutral.gray400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary.main,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.main,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.light,
    marginLeft: spacing.base,
  },
  helpText: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginHorizontal: spacing.base,
  },
});

export default LanguageScreen;
