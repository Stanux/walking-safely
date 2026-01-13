/**
 * Occurrence Types
 * Types of risk occurrences available for registration
 * Requirements: 4.2
 */

export interface OccurrenceType {
  id: string;
  name: string;
  nameKey: string; // i18n key
  icon: string;
}

// Occurrence types available for selection (Req 4.2)
// Types: Roubo, Furto, Agressão, Assédio, Vandalismo, Atividade Suspeita, Baixa Iluminação
export const OCCURRENCE_TYPES: OccurrenceType[] = [
  {
    id: '1',
    name: 'Roubo',
    nameKey: 'occurrence.type.robbery',
    icon: 'alert-circle',
  },
  {
    id: '2',
    name: 'Furto',
    nameKey: 'occurrence.type.theft',
    icon: 'hand-back-left-off',
  },
  {
    id: '3',
    name: 'Agressão',
    nameKey: 'occurrence.type.assault',
    icon: 'account-alert',
  },
  {
    id: '4',
    name: 'Assédio',
    nameKey: 'occurrence.type.harassment',
    icon: 'account-voice',
  },
  {
    id: '5',
    name: 'Vandalismo',
    nameKey: 'occurrence.type.vandalism',
    icon: 'hammer',
  },
  {
    id: '6',
    name: 'Atividade Suspeita',
    nameKey: 'occurrence.type.suspicious',
    icon: 'eye-alert',
  },
  {
    id: '7',
    name: 'Baixa Iluminação',
    nameKey: 'occurrence.type.lowLighting',
    icon: 'lightbulb-off',
  },
  {
    id: '8',
    name: 'Via Obstruída',
    nameKey: 'occurrence.type.obstructedPath',
    icon: 'road-variant',
  },
] as const;

/**
 * Get occurrence type by ID
 */
export function getOccurrenceTypeById(id: string): OccurrenceType | undefined {
  return OCCURRENCE_TYPES.find(type => type.id === id);
}

/**
 * Get occurrence type icon by ID
 */
export function getOccurrenceTypeIcon(id: string): string {
  const type = getOccurrenceTypeById(id);
  return type?.icon ?? 'help-circle';
}

/**
 * Get occurrence type name by ID
 */
export function getOccurrenceTypeName(id: string): string {
  const type = getOccurrenceTypeById(id);
  return type?.name ?? 'Desconhecido';
}
