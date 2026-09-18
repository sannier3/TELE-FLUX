/**
 * Options téléphonie (groupes / files ACD / SVI) — alignées PABX courants
 * (Yeastar, 3CX, Asterisk, Alcatel-Lucent, Mitel, etc.)
 */

export type DistributionMode =
  | 'simultaneous'
  | 'linear'
  | 'cyclic'
  | 'memory'
  | 'longest_idle'
  | 'fewest_calls'
  | 'random';

export const DISTRIBUTION_MODES: {
  value: DistributionMode;
  label: string;
  short: string;
  hint: string;
}[] = [
  {
    value: 'simultaneous',
    label: 'Simultané (tous sonnent)',
    short: 'Simultané',
    hint: 'Tous les membres libres sonnent en même temps (Ring All).',
  },
  {
    value: 'linear',
    label: 'Linéaire / séquentiel',
    short: 'Linéaire',
    hint: 'Sonnerie dans l’ordre fixe de la liste, en recommençant toujours au début.',
  },
  {
    value: 'cyclic',
    label: 'Cyclique (round-robin)',
    short: 'Cyclique',
    hint: 'Tourne entre les membres : chaque nouvel appel démarre après le dernier joint.',
  },
  {
    value: 'memory',
    label: 'Cyclique mémorisé',
    short: 'Mémoire',
    hint: 'Comme le cyclique, en mémorisant le dernier agent ayant répondu.',
  },
  {
    value: 'longest_idle',
    label: 'Plus longtemps libre',
    short: 'Idle max',
    hint: 'Priorité à l’agent disponible depuis le plus longtemps (Least Recent).',
  },
  {
    value: 'fewest_calls',
    label: 'Moins d’appels',
    short: 'Peu d’appels',
    hint: 'Priorité à l’agent ayant traité le moins d’appels sur la période.',
  },
  {
    value: 'random',
    label: 'Aléatoire',
    short: 'Aléatoire',
    hint: 'Sélection aléatoire parmi les agents disponibles.',
  },
];

/** Alias legacy → mode normalisé */
export function normalizeDistributionMode(raw?: string): DistributionMode {
  if (!raw) return 'simultaneous';
  const v = raw.toLowerCase().trim();
  if (v === 'sequential' || v === 'sequentiel' || v === 'séquentiel' || v === 'hunt') return 'linear';
  if (v === 'rotative' || v === 'roundrobin' || v === 'round-robin') return 'cyclic';
  if ((DISTRIBUTION_MODES.map((m) => m.value) as string[]).includes(v)) {
    return v as DistributionMode;
  }
  return 'simultaneous';
}

export function distributionModeLabel(raw?: string): string {
  const mode = normalizeDistributionMode(raw);
  return DISTRIBUTION_MODES.find((m) => m.value === mode)?.short || mode;
}

export const QUEUE_FEATURE_OPTIONS = [
  'Musique d\'attente',
  'Annonce de position',
  'Annonce du temps d\'attente',
  'Annonce périodique',
  'Enregistrement d\'appel',
  'Callback (rappel automatique)',
  'Ignorer agents occupés',
  'Sauter agents DND / ne pas déranger',
  'Autoriser entrée file vide',
  'Quitter si plus d\'agents',
  'Débordement sur timeout',
  'Supervision agent (écoute / chuchotement)',
];

export const GROUP_FEATURE_OPTIONS = [
  'Musique d\'attente',
  'Ignorer agents occupés',
  'Sauter agents DND / ne pas déranger',
  'Pickup de groupe',
  'Enregistrement d\'appel',
  'Débordement sur timeout',
];

export const IVR_FEATURE_OPTIONS = [
  'Réponse automatique (Auto-Answer)',
  'Détection DTMF',
  'Répétition menu si erreur',
  'Transfert opérateur (0)',
  'Enregistrement d\'appel',
  'Langue multi (FR/EN)',
];

export const STATION_FEATURE_OPTIONS = [
  'Musique d\'attente',
  'Enregistrement d\'appel',
  'Messagerie vocale',
  'Voicemail to Email',
  'Renvoi sur occupation',
  'Renvoi sur non-réponse',
  'Supervision BLF',
  'Hotdesking',
  'Softphone associé',
  'Client mobile / WebRTC',
  'Sonnerie simultanée fixe+mobile',
  'DND / Ne pas déranger',
  'Pickup de groupe',
];

export const PBU_FEATURE_OPTIONS = [
  'Convergence fixe-mobile (One Number)',
  'Sonnerie simultanée poste + mobile',
  'Transfert depuis le mobile',
  'Supervision / présence',
  'Messagerie unifiée',
  'Appels sortants via le PABX',
  'CLI présentée (SDA)',
];

export const TRUNK_FEATURE_OPTIONS = [
  'Failover trunk secondaire',
  'CLI préservée',
  'CLI écrasée (présentation forcée)',
  'T.38 Fax',
  'SRTP / TLS',
  'NAT Traversal',
  'Codec negotiation',
];

export const OVERFLOW_ACTIONS = [
  'Messagerie vocale',
  'Autre file / groupe',
  'SVI',
  'Numéro externe',
  'Raccrocher',
  'Callback',
  'Annonce puis raccrocher',
];
