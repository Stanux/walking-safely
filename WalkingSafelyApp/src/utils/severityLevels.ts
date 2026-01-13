/**
 * Severity Levels
 * Severity levels for risk occurrences with visual colors
 * Requirements: 4.3, 2.4
 */

export type SeverityValue = 'low' | 'medium' | 'high' | 'critical';

export interface SeverityLevel {
  value: SeverityValue;
  label: string;
  labelKey: string; // i18n key
  color: string;
  order: number; // for sorting
}

// Severity levels with colors (Req 2.4, 4.3)
// Levels: Baixa, Média, Alta, Crítica
export const SEVERITY_LEVELS: SeverityLevel[] = [
  {
    value: 'low',
    label: 'Baixa',
    labelKey: 'severity.low',
    color: '#FFC107', // Yellow
    order: 1,
  },
  {
    value: 'medium',
    label: 'Média',
    labelKey: 'severity.medium',
    color: '#FF9800', // Orange
    order: 2,
  },
  {
    value: 'high',
    label: 'Alta',
    labelKey: 'severity.high',
    color: '#F44336', // Red
    order: 3,
  },
  {
    value: 'critical',
    label: 'Crítica',
    labelKey: 'severity.critical',
    color: '#9C27B0', // Purple
    order: 4,
  },
] as const;

// Color mapping for quick access (Req 2.4)
export const SEVERITY_COLORS: Record<SeverityValue, string> = {
  low: '#FFC107', // Yellow
  medium: '#FF9800', // Orange
  high: '#F44336', // Red
  critical: '#9C27B0', // Purple
} as const;

/**
 * Get severity level by value
 */
export function getSeverityByValue(value: SeverityValue): SeverityLevel | undefined {
  return SEVERITY_LEVELS.find(level => level.value === value);
}

/**
 * Get severity color by value
 */
export function getSeverityColor(value: SeverityValue): string {
  return SEVERITY_COLORS[value] ?? '#9E9E9E'; // Gray fallback
}

/**
 * Get severity label by value
 */
export function getSeverityLabel(value: SeverityValue): string {
  const level = getSeverityByValue(value);
  return level?.label ?? 'Desconhecido';
}

/**
 * Check if a value is a valid severity
 */
export function isValidSeverity(value: string): value is SeverityValue {
  return ['low', 'medium', 'high', 'critical'].includes(value);
}
