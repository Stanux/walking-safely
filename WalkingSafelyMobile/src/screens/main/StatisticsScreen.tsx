/**
 * Statistics Screen
 * Display crime statistics and analytics
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {textStyles} from '../../theme/typography';
import {spacing} from '../../theme/spacing';
import type {StatisticsHomeScreenProps} from '../../types/navigation';

export const StatisticsScreen: React.FC<StatisticsHomeScreenProps> = () => {
  const {t} = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('navigation.statistics')}</Text>
      <Text style={styles.placeholder}>{t('common.comingSoon')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...textStyles.h2,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  placeholder: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
});

export default StatisticsScreen;
