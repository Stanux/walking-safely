/**
 * Alert Preferences Screen
 * Allows users to configure alert settings
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {textStyles} from '../../theme/typography';
import {spacing, borderRadius, shadows} from '../../theme/spacing';
import {usePreferencesStore} from '../../store/preferencesStore';
import {LoadingIndicator} from '../../components/common/LoadingIndicator';
import type {AlertPreferencesScreenProps} from '../../types/navigation';

/**
 * Crime type option for alert filtering
 */
interface CrimeTypeOption {
  id: string;
  labelKey: string;
}

/**
 * Available crime types for alert filtering
 */
const CRIME_TYPE_OPTIONS: CrimeTypeOption[] = [
  {id: 'robbery', labelKey: 'crimeTypes.robbery'},
  {id: 'theft', labelKey: 'crimeTypes.theft'},
  {id: 'assault', labelKey: 'crimeTypes.assault'},
  {id: 'harassment', labelKey: 'crimeTypes.harassment'},
  {id: 'vandalism', labelKey: 'crimeTypes.vandalism'},
  {id: 'suspiciousActivity', labelKey: 'crimeTypes.suspiciousActivity'},
];

/**
 * Section header component
 */
interface SectionHeaderProps {
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({title}) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

/**
 * Toggle row component
 */
interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  value,
  onValueChange,
  disabled = false,
}) => (
  <View style={styles.toggleRow}>
    <Text style={[styles.toggleLabel, disabled && styles.disabledText]}>
      {label}
    </Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{
        false: colors.neutral.gray300,
        true: colors.primary.light,
      }}
      thumbColor={value ? colors.primary.main : colors.neutral.gray100}
      ios_backgroundColor={colors.neutral.gray300}
    />
  </View>
);

/**
 * Time picker row component
 */
interface TimePickerRowProps {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
}

const TimePickerRow: React.FC<TimePickerRowProps> = ({
  label,
  value,
  onPress,
  disabled = false,
}) => (
  <TouchableOpacity
    style={styles.timePickerRow}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}>
    <Text style={[styles.toggleLabel, disabled && styles.disabledText]}>
      {label}
    </Text>
    <View style={styles.timeValue}>
      <Text style={[styles.timeText, disabled && styles.disabledText]}>
        {value}
      </Text>
      <Text style={styles.chevron}>›</Text>
    </View>
  </TouchableOpacity>
);

/**
 * Alert Preferences Screen Component
 * Requirement 11.1: Display alert settings screen accessible from menu
 * Requirement 11.2: Enable/disable sound alerts
 * Requirement 11.3: Enable/disable alerts by occurrence type
 * Requirement 11.4: Configure alert activation times
 * Requirement 11.5: Sync preferences with backend
 */
export const AlertPreferencesScreen: React.FC<
  AlertPreferencesScreenProps
> = () => {
  const {t} = useTranslation();

  const {
    alertsEnabled,
    soundEnabled,
    alertTypes,
    alertSchedule,
    isSyncing,
    setAlertsEnabled,
    setSoundEnabled,
    setAlertTypes,
    setAlertSchedule,
  } = usePreferencesStore();

  const [scheduleEnabled, setScheduleEnabled] = useState(
    alertSchedule !== null,
  );
  const [startTime, setStartTime] = useState(
    alertSchedule?.startTime || '22:00',
  );
  const [endTime, setEndTime] = useState(alertSchedule?.endTime || '06:00');

  /**
   * Handle alerts enabled toggle
   */
  const handleAlertsEnabledChange = useCallback(
    async (enabled: boolean) => {
      await setAlertsEnabled(enabled);
    },
    [setAlertsEnabled],
  );

  /**
   * Handle sound enabled toggle
   */
  const handleSoundEnabledChange = useCallback(
    async (enabled: boolean) => {
      await setSoundEnabled(enabled);
    },
    [setSoundEnabled],
  );

  /**
   * Handle crime type toggle
   */
  const handleCrimeTypeToggle = useCallback(
    async (typeId: string) => {
      const newTypes = alertTypes.includes(typeId)
        ? alertTypes.filter(t => t !== typeId)
        : [...alertTypes, typeId];
      await setAlertTypes(newTypes);
    },
    [alertTypes, setAlertTypes],
  );

  /**
   * Handle schedule enabled toggle
   */
  const handleScheduleEnabledChange = useCallback(
    async (enabled: boolean) => {
      setScheduleEnabled(enabled);
      if (enabled) {
        await setAlertSchedule({
          startTime,
          endTime,
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
        });
      } else {
        await setAlertSchedule(null);
      }
    },
    [startTime, endTime, setAlertSchedule],
  );

  /**
   * Handle time selection (simplified - in production would use a time picker)
   */
  const handleTimePress = useCallback(
    (type: 'start' | 'end') => {
      // In a real app, this would open a time picker
      // For now, we'll cycle through some preset times
      const times = ['06:00', '08:00', '18:00', '20:00', '22:00', '00:00'];
      const currentTime = type === 'start' ? startTime : endTime;
      const currentIndex = times.indexOf(currentTime);
      const nextIndex = (currentIndex + 1) % times.length;
      const newTime = times[nextIndex];

      if (type === 'start') {
        setStartTime(newTime);
        if (scheduleEnabled) {
          setAlertSchedule({
            startTime: newTime,
            endTime,
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          });
        }
      } else {
        setEndTime(newTime);
        if (scheduleEnabled) {
          setAlertSchedule({
            startTime,
            endTime: newTime,
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          });
        }
      }
    },
    [startTime, endTime, scheduleEnabled, setAlertSchedule],
  );

  return (
    <SafeAreaView style={styles.container}>
      {isSyncing && (
        <View style={styles.syncingIndicator}>
          <LoadingIndicator size="small" />
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* General Settings Section */}
        <View style={styles.section}>
          <SectionHeader title={t('settings.alerts')} />
          <View style={styles.card}>
            <ToggleRow
              label={t('settings.alerts')}
              value={alertsEnabled}
              onValueChange={handleAlertsEnabledChange}
            />
            <View style={styles.separator} />
            <ToggleRow
              label={t('settings.soundAlerts')}
              value={soundEnabled}
              onValueChange={handleSoundEnabledChange}
              disabled={!alertsEnabled}
            />
          </View>
        </View>

        {/* Alert Types Section */}
        <View style={styles.section}>
          <SectionHeader title={t('settings.alertTypes')} />
          <View style={styles.card}>
            {CRIME_TYPE_OPTIONS.map((option, index) => (
              <React.Fragment key={option.id}>
                <ToggleRow
                  label={t(option.labelKey)}
                  value={alertTypes.includes(option.id)}
                  onValueChange={() => handleCrimeTypeToggle(option.id)}
                  disabled={!alertsEnabled}
                />
                {index < CRIME_TYPE_OPTIONS.length - 1 && (
                  <View style={styles.separator} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Schedule Section */}
        <View style={styles.section}>
          <SectionHeader title={t('settings.alertSchedule')} />
          <View style={styles.card}>
            <ToggleRow
              label={t('settings.scheduleEnabled')}
              value={scheduleEnabled}
              onValueChange={handleScheduleEnabledChange}
              disabled={!alertsEnabled}
            />
            <View style={styles.separator} />
            <TimePickerRow
              label={t('settings.startTime')}
              value={startTime}
              onPress={() => handleTimePress('start')}
              disabled={!alertsEnabled || !scheduleEnabled}
            />
            <View style={styles.separator} />
            <TimePickerRow
              label={t('settings.endTime')}
              value={endTime}
              onPress={() => handleTimePress('end')}
              disabled={!alertsEnabled || !scheduleEnabled}
            />
          </View>
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
    paddingBottom: spacing['2xl'],
  },
  syncingIndicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.base,
    zIndex: 10,
  },
  section: {
    marginBottom: spacing.lg,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  toggleLabel: {
    ...textStyles.body,
    color: colors.text.primary,
    flex: 1,
  },
  disabledText: {
    color: colors.text.tertiary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.light,
    marginLeft: spacing.base,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  timeValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    ...textStyles.body,
    color: colors.primary.main,
    marginRight: spacing.xs,
  },
  chevron: {
    ...textStyles.h4,
    color: colors.text.tertiary,
  },
});

export default AlertPreferencesScreen;
