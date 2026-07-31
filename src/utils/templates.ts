/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TelecomProject, NodeType, ReusableTemplate, CallNode } from '../types';

export const PHONE_MODELS = [
  'Yealink T46U',
  'Yealink T54W',
  'Mitel 6920 IP',
  'Poly Edge E350',
  'Cisco Desk Phone 8845',
  'Gigaset N510 IP PRO (DECT)',
  'Grandstream GRP2615',
  'Softphone (Sip Client)'
];

export const PROVIDERS = [
  'Orange Business Services',
  'SFR Business',
  'Bouygues Telecom Entreprises',
  'OVHcloud',
  'Sewan',
  'Keyyo',
  'Colt'
];

export const DEFAULT_TEMPLATES: ReusableTemplate[] = [
  {
    id: 't-poste-standard',
    name: 'Modèle Poste Standard',
    description: 'Poste IP standard préconfiguré avec Yealink T46U, messagerie vocale active',
    type: 'user_station',
    properties: {
      phoneModel: 'Yealink T46U',
      internalNumber: '100',
      techComment: 'Poste standard utilisateur. Messagerie commune sur non-réponse (20s).',
      clientComment: 'Téléphone de bureau de gamme supérieure.',
      additionalOptions: ["Musique d'attente"]
    }
  },
  {
    id: 't-ligne-directe',
    name: 'Modèle Ligne Directe',
    description: 'Numéro direct SDA vers poste utilisateur avec délai de renvoi de 15 secondes',
    type: 'direct_line',
    properties: {
      delayBeforeForward: 15,
      techComment: 'Ligne directe SDA rattachée. Débordement messagerie.',
      clientComment: 'Numéro de téléphone direct pour joindre la personne sans passer par le standard.'
    }
  },
  {
    id: 't-avi-simple',
    name: 'Modèle Accueil SVI (3 options)',
    description: 'Serveur Vocal Interactif standard pour guider les clients ou les usagers',
    type: 'ivr',
    properties: {
      audioMessageName: 'svi_general_valide.wav',
      techComment: 'SVI Touche 1: commercial, Touche 2: technique, Touche 3: compta.',
      clientComment: 'Boîte vocale d\'accueil guidant vos correspondants par choix clavier (SVI).'
    }
  },
  {
    id: 't-groupe-appel',
    name: "Modèle Groupe d'appel",
    description: "Groupe d'appel par scrutation simultanée avec débordement",
    type: 'call_group',
    properties: {
      delayBeforeForward: 20,
      internalNumber: '500',
      techComment: 'Groupe de 3 utilisateurs en simultané. Timeout 20 sec.',
      clientComment: 'Fait sonner plusieurs postes en même temps.'
    }
  },
  {
    id: 't-scenario-jour-nuit',
    name: 'Modèle Scénario Jour/Nuit',
    description: 'Règle horaire alternant entre jour (SVI / Secrétariat) et nuit (Messagerie)',
    type: 'day_night',
    properties: {
      timeSchedule: '08:30-12:00, 14:00-18:00',
      techComment: 'Routage automatique selon plage horaire entreprise. Lundi au Vendredi.',
      clientComment: 'Ferme automatiquement votre ligne en dehors des heures d\'ouverture.'
    }
  },
  {
    id: 't-renvoi-mobile',
    name: 'Modèle Renvoi Externe / Mobile',
    description: 'Renvoi automatique sur occupation vers un prestataire ou numéro d\'urgence',
    type: 'mobile_external',
    properties: {
      number: '0612345678',
      techComment: 'Renvoi externe de contournement ou astreinte.',
      clientComment: 'Redirige l\'appel vers un téléphone mobile ou un numéro externe.'
    }
  }
];

export const NODE_METADATA: Record<NodeType, {
  label: string;
  category: 'numbers' | 'terminals' | 'routing' | 'forwards' | 'media';
  color: string;
  borderColor: string;
  bgSelected: string;
  iconName: string;
  defaultProps: CallNode['properties'];
}> = {
  ndi: {
    label: 'Numéro NDI',
    category: 'numbers',
    color: 'emerald',
    borderColor: 'border-emerald-500',
    bgSelected: 'bg-emerald-50',
    iconName: 'database',
    defaultProps: { number: '0140000000', description: 'Numéro de tête de ligne (analogique/numérique)' }
  },
  sda: {
    label: 'Numéro SDA',
    category: 'numbers',
    color: 'emerald',
    borderColor: 'border-emerald-600',
    bgSelected: 'bg-emerald-100/40',
    iconName: 'phone-incoming',
    defaultProps: { number: '0140203000', description: 'Sélection Directe à l\'Arrivée' }
  },
  nds: {
    label: 'Numéro NDS',
    category: 'numbers',
    color: 'teal',
    borderColor: 'border-teal-500',
    bgSelected: 'bg-teal-50',
    iconName: 'hash',
    defaultProps: { number: '0800123456', description: 'Numéro Spécial ou Surtaxé (Vert/Azur)' }
  },
  incoming_num: {
    label: 'Numéro Entrant',
    category: 'numbers',
    color: 'teal',
    borderColor: 'border-teal-600',
    bgSelected: 'bg-teal-50',
    iconName: 'phone',
    defaultProps: { number: '0140001111', description: 'Numéro d\'accueil général' }
  },
  outgoing_num: {
    label: 'Numéro Sortant',
    category: 'numbers',
    color: 'slate',
    borderColor: 'border-slate-500',
    bgSelected: 'bg-slate-50',
    iconName: 'phone-outgoing',
    defaultProps: { number: 'Masqué ou SDA', description: 'Présentations de numéro sortant' }
  },
  user_station: {
    label: 'Poste Utilisateur',
    category: 'terminals',
    color: 'blue',
    borderColor: 'border-blue-500',
    bgSelected: 'bg-blue-50',
    iconName: 'user',
    defaultProps: { stationName: 'Poste Collaborateur', internalNumber: '101', userName: 'Nom Utilisateur', phoneModel: 'Yealink T46U' }
  },
  direct_line: {
    label: 'Ligne Directe',
    category: 'terminals',
    color: 'sky',
    borderColor: 'border-sky-500',
    bgSelected: 'bg-sky-50',
    iconName: 'phone-call',
    defaultProps: { number: '0140203001', internalNumber: '101', description: 'Ligne rattachée à un utilisateur direct' }
  },
  extension: {
    label: 'Extension / Module',
    category: 'terminals',
    color: 'indigo',
    borderColor: 'border-indigo-500',
    bgSelected: 'bg-indigo-50',
    iconName: 'layers',
    defaultProps: { extensionType: 'Module d\'extension boutons Yealink EXP40', description: 'Clavier d\'extension touche de supervision' }
  },
  ivr: {
    label: 'SVI / Serveur Vocal',
    category: 'routing',
    color: 'amber',
    borderColor: 'border-amber-500',
    bgSelected: 'bg-amber-50',
    iconName: 'layers',
    defaultProps: { audioMessageName: 'accueil_svi.wav', description: 'Serveur Vocal Interactif (Appuyez sur 1, 2, ...)' }
  },
  call_group: {
    label: "Groupe d'appel",
    category: 'routing',
    color: 'yellow',
    borderColor: 'border-yellow-600',
    bgSelected: 'bg-yellow-50',
    iconName: 'users',
    defaultProps: { stationName: 'Groupe Support', delayBeforeForward: 15, internalNumber: '500', description: 'Sonne en cascade ou en simultané' }
  },
  queue: {
    label: "File d'attente",
    category: 'routing',
    color: 'orange',
    borderColor: 'border-orange-500',
    bgSelected: 'bg-orange-50',
    iconName: 'clock',
    defaultProps: { delayBeforeForward: 60, internalNumber: '600', description: 'File d\'attente musicale (ACD) avec agents connectés' }
  },
  transfer: {
    label: "Transfert d'appel",
    category: 'forwards',
    color: 'violet',
    borderColor: 'border-violet-500',
    bgSelected: 'bg-violet-50',
    iconName: 'phone-forwarded',
    defaultProps: { forwardDestination: '100', description: 'Redirection interne d\'appels automatisée' }
  },
  forward_unconditional: {
    label: 'Renvoi Inconditionnel',
    category: 'forwards',
    color: 'purple',
    borderColor: 'border-purple-600',
    bgSelected: 'bg-purple-50',
    iconName: 'phone-forwarded',
    defaultProps: { forwardDestination: '0612345678', description: 'Renvoi automatique et immédiat' }
  },
  forward_no_answer: {
    label: 'Renvoi sur Non-Réponse',
    category: 'forwards',
    color: 'fuchsia',
    borderColor: 'border-fuchsia-500',
    bgSelected: 'bg-fuchsia-50',
    iconName: 'phone-missed',
    defaultProps: { delayBeforeForward: 15, forwardDestination: '150', description: 'Renvoi si aucune réponse après X secondes' }
  },
  forward_busy: {
    label: 'Renvoi sur Occupation',
    category: 'forwards',
    color: 'pink',
    borderColor: 'border-pink-500',
    bgSelected: 'bg-pink-50',
    iconName: 'phone-off',
    defaultProps: { forwardDestination: '120', description: 'Renvoi automatique si la ligne est occupée' }
  },
  voicemail: {
    label: 'Messagerie Vocale',
    category: 'media',
    color: 'rose',
    borderColor: 'border-rose-500',
    bgSelected: 'bg-rose-50',
    iconName: 'voicemail',
    defaultProps: { audioMessageName: 'messagerie_abs.wav', internalNumber: '999', description: 'Boîte de messagerie pour enregistrer un message' }
  },
  custom_audio: {
    label: 'Message Vocal Perso',
    category: 'media',
    color: 'red',
    borderColor: 'border-red-500',
    bgSelected: 'bg-red-50',
    iconName: 'volume2',
    defaultProps: { audioMessageName: 'message_accueil_personnalise.mp3', description: 'Message vocal d\'accueil sans enregistrement' }
  },
  time_range: {
    label: 'Plage Horaire',
    category: 'media',
    color: 'yellow',
    borderColor: 'border-yellow-500',
    bgSelected: 'bg-yellow-50',
    iconName: 'clock',
    defaultProps: { timeSchedule: '08:30-12:00, 14:00-18:00', description: 'Horaires d\'ouverture réguliers' }
  },
  day_night: {
    label: 'Règle Jour/Nuit',
    category: 'media',
    color: 'indigo',
    borderColor: 'border-indigo-600',
    bgSelected: 'bg-indigo-50',
    iconName: 'sun',
    defaultProps: { timeSchedule: '08:00-12:00, 14:00-18:30', description: 'Bascule automatique jour/nuit et weekend' }
  },
  external_destination: {
    label: 'Destination Externe',
    category: 'terminals',
    color: 'blue',
    borderColor: 'border-blue-600',
    bgSelected: 'bg-blue-50',
    iconName: 'external-link',
    defaultProps: { forwardDestination: '0199999999', description: 'Numéro de secours vers opérateur ou partenaire tiers' }
  },
  mobile_external: {
    label: 'Mobile / Numéro Externe',
    category: 'terminals',
    color: 'cyan',
    borderColor: 'border-cyan-500',
    bgSelected: 'bg-cyan-50',
    iconName: 'smartphone',
    defaultProps: { number: '0600000000', description: 'Numéro de téléphone mobile d\'un technicien ou d\'un commercial' }
  },
  switchboard: {
    label: 'Standard',
    category: 'terminals',
    color: 'blue',
    borderColor: 'border-blue-700',
    bgSelected: 'bg-blue-100/30',
    iconName: 'phone',
    defaultProps: { internalNumber: '9', description: 'Poste standardiste ou groupe d\'accueil principal' }
  },
  greeting: {
    label: 'Accueil Téléphonique',
    category: 'numbers',
    color: 'emerald',
    borderColor: 'border-emerald-700',
    bgSelected: 'bg-emerald-50',
    iconName: 'volume-2',
    defaultProps: { audioMessageName: 'pre-decroche_bienvenue.wav', description: 'Pré-décroché ou musique d\'accueil client' }
  },
  emergency_overflow: {
    label: 'Scénario Urgence/Débord',
    category: 'routing',
    color: 'red',
    borderColor: 'border-red-600',
    bgSelected: 'bg-red-50',
    iconName: 'shield-alert',
    defaultProps: { emergencyActive: false, description: 'Aiguillage d\'urgence en cas de pannes ou surcapacité' }
  },
  hangup: {
    label: "Fin d'appel (Raccrocher)",
    category: 'routing',
    color: 'stone',
    borderColor: 'border-stone-500',
    bgSelected: 'bg-stone-50',
    iconName: 'phone-off',
    defaultProps: { description: 'Raccroché automatique de l’appel / Libération du canal de communication' }
  }
};

export const DEMO_PROJECT: TelecomProject = {
  projectName: 'Architecture Télécom Complète Acme Corp',
  clientName: 'ACME S.A.',
  siteName: 'Siège Social Paris - Multi-lignes',
  author: 'Expert Télécom',
  createdAt: '2026-06-18',
  updatedAt: '2026-07-30',
  lines: [
    {
      id: 'l-1',
      ndi: '01 40 20 30 00',
      type: 'SIP Trunk',
      channels: 30,
      provider: 'Orange Business Services / SFR Business',
      comment: 'Trunk SIP principal IP raccordé avec pool de 100 SDA.'
    },
    {
      id: 'l-2',
      ndi: '01 40 20 30 10',
      type: 'SIP Trunk',
      channels: 10,
      provider: 'SFR Business PBU',
      comment: 'Ligne directe Groupement Standardiste.'
    }
  ],
  users: [
    {
      id: 'u-1',
      name: 'Alice Commercial',
      email: 'alice@acme.com',
      internalNumber: '101',
      sdaId: '01 40 20 30 01',
      stationType: 'IP',
      phoneModel: 'Yealink T46U',
      voicemailEnabled: true,
      forwardEnabled: false,
      forwardDestination: '',
      comment: 'Commerciale Senior. Possède sa ligne SDA directe et est également joignable via l\'SVI Ventes. Option PABX SFR activée.'
    },
    {
      id: 'u-2',
      name: 'Bob Support Client',
      email: 'bob@acme.com',
      internalNumber: '102',
      sdaId: '01 40 20 30 02',
      stationType: 'Softphone',
      phoneModel: 'Softphone (Sip Client)',
      voicemailEnabled: true,
      forwardEnabled: true,
      forwardDestination: '06 12 34 56 78',
      comment: 'Technicien Support Niveau 1, membre du groupement support.'
    },
    {
      id: 'u-3',
      name: 'Charlie Ventes',
      email: 'charlie@acme.com',
      internalNumber: '103',
      sdaId: '',
      stationType: 'IP',
      phoneModel: 'Yealink T54W',
      voicemailEnabled: false,
      forwardEnabled: false,
      forwardDestination: '',
      comment: 'Commercial zone Sud, membre du groupement ventes SVI.'
    },
    {
      id: 'u-4',
      name: 'Martine Accueil',
      email: 'martine@acme.com',
      internalNumber: '201',
      sdaId: '',
      stationType: 'IP',
      phoneModel: 'Yealink T54W',
      voicemailEnabled: false,
      forwardEnabled: false,
      forwardDestination: '',
      comment: 'Standardiste principale sur le Groupement Ligne Directe Standard.'
    },
    {
      id: 'u-5',
      name: 'Pierre Compta & Accueil',
      email: 'pierre@acme.com',
      internalNumber: '202',
      sdaId: '',
      stationType: 'IP',
      phoneModel: 'Mitel 6920 IP',
      voicemailEnabled: false,
      forwardEnabled: false,
      forwardDestination: '',
      comment: 'Poste secours du groupement d\'accueil.'
    }
  ],
  templates: DEFAULT_TEMPLATES,
  nodes: [
    // 1. Ligne Directe Unique (SDA Directe pour Poste Alice qui est aussi dans l'SVI) - Placée en haut
    {
      id: 'node-sda-alice',
      type: 'sda',
      name: '01 40 20 30 01 - SDA Directe Alice',
      x: 30,
      y: 30,
      properties: {
        number: '0140203001',
        description: 'Numéro direct SDA attribué personnellement à Alice',
        techComment: 'Appel entrant direct qui pointe vers le Poste 101 d\'Alice.',
        clientComment: 'Ligne directe réservée aux contacts VIP et clients privilégiés d\'Alice.'
      }
    },
    {
      id: 'node-user-alice',
      type: 'user_station',
      name: 'Poste Alice (Ventes & Direct)',
      x: 1040,
      y: 30,
      properties: {
        userName: 'Alice Commercial',
        stationName: 'Bureau Commercial Senior',
        internalNumber: '101',
        phoneModel: 'Yealink T46U',
        hasPabxOption: true,
        pabxOperator: 'SFR PBU',
        description: 'Commerciale Senior (Présente sur SVI + ligne SDA directe dédiée)',
        techComment: 'Poste IP Yealink avec Option PABX. Reçoit les appels directs de la SDA 0140203001 et les appels du SVI Ventes.',
        clientComment: 'Poste d\'Alice. Peut être jointe via le SVI (Ventes) ou directement sur son numéro SDA.'
      }
    },
    {
      id: 'node-vm-alice',
      type: 'voicemail',
      name: 'Boîte Vocale Perso Alice',
      x: 1330,
      y: 30,
      properties: {
        internalNumber: '111',
        audioMessageName: 'messagerie_alice.wav',
        description: 'Messagerie vocale personnelle d\'Alice sur non-réponse',
        techComment: 'Renvoi automatique sur non-réponse prolongée.',
        clientComment: 'Permet de laisser un message direct dans la boîte d\'Alice.'
      }
    },

    // 2. Branche Ligne Principale SVI (Accueil Vocal Interactif)
    {
      id: 'node-sda-svi',
      type: 'sda',
      name: '01 40 20 30 00 - SDA SVI Principale',
      x: 30,
      y: 260,
      properties: {
        number: '0140203000',
        description: 'Numéro d\'Accueil Général SVI / AVI (Ligne Principale)',
        techComment: 'Entrée principale du Trunk SIP vers le serveur vocal.',
        clientComment: 'Numéro général de l\'entreprise affiché sur le site web et cartes d\'affaires.'
      }
    },
    {
      id: 'node-time-svi',
      type: 'day_night',
      name: 'Horaires Ouverture SVI',
      x: 270,
      y: 260,
      properties: {
        timeSchedule: '08:30-12:00, 14:00-18:00',
        description: 'Horaires d\'ouverture habituels (Lun-Ven)',
        techComment: 'Bascule automatique jour/nuit. Jours fériés redirigés.',
        clientComment: 'Aiguillage selon nos heures d\'ouverture de bureau.'
      }
    },
    {
      id: 'node-svi-main',
      type: 'ivr',
      name: 'SVI / AVI Accueil Général',
      x: 510,
      y: 240,
      properties: {
        audioMessageName: 'accueil_svi_general.wav',
        description: 'Serveur Vocal Interactif commercial et support',
        techComment: 'Touche 1 = Groupement Commercial, Touche 2 = Groupement Support',
        clientComment: 'Vous entendrez : "Pour le service commercial tapez 1, pour le support technique tapez 2."'
      }
    },
    {
      id: 'node-vm-night',
      type: 'voicemail',
      name: 'Messagerie Fermeture SVI',
      x: 510,
      y: 470,
      properties: {
        internalNumber: '999',
        audioMessageName: 'fermeture_nuit.wav',
        description: 'Boîte aux lettres générale de nuit / fermeture',
        techComment: 'Messages audio envoyés par email à accueil@acme.com',
        clientComment: 'Boîte vocale permettant de laisser un message en dehors des heures d\'ouverture.'
      }
    },
    {
      id: 'node-grp-comm',
      type: 'call_group',
      name: 'Groupement Ventes & Commercial',
      x: 770,
      y: 240,
      properties: {
        internalNumber: '150',
        groupType: 'simultaneous',
        ringTime: '20s',
        description: 'Distribution simultanée sur les postes commerciaux (Alice & Charlie)',
        techComment: 'Scrutation simultanée sur postes 101 et 103.',
        clientComment: 'Fait sonner l\'ensemble des téléphones de l\'équipe commerciale.'
      }
    },
    {
      id: 'node-grp-supp',
      type: 'call_group',
      name: 'Groupement Support Technique',
      x: 770,
      y: 490,
      properties: {
        internalNumber: '160',
        groupType: 'sequential',
        ringTime: '15s',
        description: 'Equipe support technique niveau 1 (Bob)',
        techComment: 'Scrutation séquentielle sur poste support.',
        clientComment: 'Postes d\'assistance technique.'
      }
    },
    {
      id: 'node-user-charlie',
      type: 'user_station',
      name: 'Poste Charlie (Ventes)',
      x: 1040,
      y: 270,
      properties: {
        userName: 'Charlie Ventes',
        stationName: 'Bureau Commercial 2',
        internalNumber: '103',
        phoneModel: 'Yealink T54W',
        description: 'Commercial zone Sud',
        techComment: 'Poste IP membre du groupement de ventes.',
        clientComment: 'Poste commercial de Charlie.'
      }
    },
    {
      id: 'node-user-bob',
      type: 'user_station',
      name: 'Poste Bob (Support)',
      x: 1040,
      y: 490,
      properties: {
        userName: 'Bob Support Client',
        stationName: 'Poste Support',
        internalNumber: '102',
        phoneModel: 'Softphone SIP',
        description: 'Technicien Support Client',
        techComment: 'Sip-Client sur PC Windows via VPN.',
        clientComment: 'Poste du support technique.'
      }
    },

    // 3. Branche Groupement comme Ligne Principale
    {
      id: 'node-sda-std',
      type: 'sda',
      name: '01 40 20 30 10 - SDA Groupement Standard',
      x: 30,
      y: 770,
      properties: {
        number: '0140203010',
        description: 'Ligne directe d\'entrée vers le Groupement de Standardistes',
        techComment: 'Pointe directement sur le groupement N°200 sans passer par un SVI.',
        clientComment: 'Ligne directe d\'accueil téléphonique général.'
      }
    },
    {
      id: 'node-grp-std',
      type: 'call_group',
      name: 'Groupement Standard Général',
      x: 300,
      y: 770,
      properties: {
        internalNumber: '200',
        groupType: 'simultaneous',
        ringTime: '20s',
        description: 'Groupement d\'accueil physique (Martine & Pierre)',
        techComment: 'Fait sonner simultanément les postes d\'accueil 201 et 202.',
        clientComment: 'Recherche simultanée des hôtes d\'accueil.'
      }
    },
    {
      id: 'node-user-martine',
      type: 'user_station',
      name: 'Poste Martine (Standard 1)',
      x: 580,
      y: 720,
      properties: {
        userName: 'Martine Accueil',
        stationName: 'Bureau Accueil A',
        internalNumber: '201',
        phoneModel: 'Yealink T54W',
        description: 'Standardiste principale',
        techComment: 'Poste IP avec console de supervision d\'extension.',
        clientComment: 'Poste de l\'accueil principal.'
      }
    },
    {
      id: 'node-user-pierre',
      type: 'user_station',
      name: 'Poste Pierre (Standard 2)',
      x: 580,
      y: 940,
      properties: {
        userName: 'Pierre Compta & Accueil',
        stationName: 'Bureau Accueil B',
        internalNumber: '202',
        phoneModel: 'Mitel 6920 IP',
        description: 'Standardiste secondaire',
        techComment: 'Poste IP compta / secours accueil.',
        clientComment: 'Poste d\'accueil secondaire.'
      }
    },
    {
      id: 'node-vm-std',
      type: 'voicemail',
      name: 'Messagerie Vocale Standard',
      x: 840,
      y: 770,
      properties: {
        internalNumber: '299',
        audioMessageName: 'messagerie_standard.wav',
        description: 'Messagerie de groupe du standard général',
        techComment: 'Notification mail automatique vers standard@acme.com',
        clientComment: 'Messagerie commune si aucun standardiste n\'est disponible.'
      }
    },

    // 4. Branche Parc Postes & Sortie
    {
      id: 'node-pool',
      type: 'user_station',
      name: 'Pool Postes Internes 300-320',
      x: 30,
      y: 1180,
      properties: {
        internalNumber: '300 à 320',
        userName: 'Agents Internes (20 postes)',
        phoneModel: 'Yealink T46U',
        description: 'Postes internes sans SDA d\'entrée directe',
        techComment: 'Canaux sortants partagés sur Trunk SIP.',
        clientComment: 'Postes de travail internes sans ligne directe attribuée.'
      }
    },
    {
      id: 'node-out',
      type: 'outgoing_num',
      name: 'Sortie Présentée: 01 40 00 11 11',
      x: 340,
      y: 1180,
      properties: {
        number: '0140001111',
        description: 'Numéro général affiché lors des appels sortants du pool'
      }
    }
  ],
  connections: [
    // Branche 1: SVI
    {
      id: 'conn-1',
      sourceId: 'node-sda-svi',
      targetId: 'node-time-svi',
      label: 'appel entrant'
    },
    {
      id: 'conn-2',
      sourceId: 'node-time-svi',
      targetId: 'node-svi-main',
      label: 'heures ouvrées'
    },
    {
      id: 'conn-3',
      sourceId: 'node-time-svi',
      targetId: 'node-vm-night',
      label: 'hors horaires'
    },
    {
      id: 'conn-4',
      sourceId: 'node-svi-main',
      targetId: 'node-grp-comm',
      label: 'touche 1 (Ventes)'
    },
    {
      id: 'conn-5',
      sourceId: 'node-svi-main',
      targetId: 'node-grp-supp',
      label: 'touche 2 (Support)'
    },
    {
      id: 'conn-6',
      sourceId: 'node-grp-comm',
      targetId: 'node-user-alice',
      label: 'sonnerie simultanée'
    },
    {
      id: 'conn-7',
      sourceId: 'node-grp-comm',
      targetId: 'node-user-charlie',
      label: 'sonnerie simultanée'
    },
    {
      id: 'conn-8',
      sourceId: 'node-grp-supp',
      targetId: 'node-user-bob',
      label: 'distrib. 1er niveau'
    },

    // Branche 2: Ligne Directe Alice (relie SDA Directe -> Poste Alice qui est déjà dans l'SVI!)
    {
      id: 'conn-9',
      sourceId: 'node-sda-alice',
      targetId: 'node-user-alice',
      label: 'appel direct SDA Alice'
    },
    {
      id: 'conn-10',
      sourceId: 'node-user-alice',
      targetId: 'node-vm-alice',
      label: 'si non-réponse (15s)'
    },

    // Branche 3: Groupement comme Ligne Principale
    {
      id: 'conn-11',
      sourceId: 'node-sda-std',
      targetId: 'node-grp-std',
      label: 'appel entrant direct'
    },
    {
      id: 'conn-12',
      sourceId: 'node-grp-std',
      targetId: 'node-user-martine',
      label: 'distrib. simultanée'
    },
    {
      id: 'conn-13',
      sourceId: 'node-grp-std',
      targetId: 'node-user-pierre',
      label: 'distrib. simultanée'
    },
    {
      id: 'conn-14',
      sourceId: 'node-grp-std',
      targetId: 'node-vm-std',
      label: 'si non-réponse (20s)'
    },

    // Branche 4: Pool & Sortie
    {
      id: 'conn-15',
      sourceId: 'node-pool',
      targetId: 'node-out',
      label: 'appel sortant (Caller ID)'
    }
  ]
};

export const BLANK_PROJECT: TelecomProject = {
  projectName: '',
  clientName: '',
  siteName: '',
  author: '',
  createdAt: '',
  updatedAt: '',
  lines: [],
  users: [],
  templates: [],
  nodes: [],
  connections: []
};

export const INITIAL_DEFAULT_PROJECT: TelecomProject = DEMO_PROJECT;

