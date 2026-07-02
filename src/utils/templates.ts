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

export const INITIAL_DEFAULT_PROJECT: TelecomProject = {
  projectName: 'Siège Social Acme Corp',
  clientName: 'ACME S.A.',
  siteName: 'Paris Centre - Direction Générale',
  author: 'Jean Technicien',
  createdAt: '2026-06-18',
  updatedAt: '2026-06-18',
  lines: [
    {
      id: 'l-1',
      ndi: '01 40 20 30 00',
      type: 'SIP Trunk',
      channels: 10,
      provider: 'Orange Business Services',
      comment: 'Trunk SIP principal IP raccordé sur SBC de secours.'
    }
  ],
  users: [
    {
      id: 'u-1',
      name: 'Standard Général',
      email: 'standard@acme.com',
      internalNumber: '100',
      sdaId: '01 40 20 30 00',
      stationType: 'IP',
      phoneModel: 'Yealink T54W',
      voicemailEnabled: true,
      forwardEnabled: true,
      forwardDestination: '999',
      comment: 'Poste standard principale avec module d\'extension raccordé.'
    },
    {
      id: 'u-2',
      name: 'Alice Commercial',
      email: 'alice@acme.com',
      internalNumber: '101',
      sdaId: '01 40 20 30 01',
      stationType: 'IP',
      phoneModel: 'Yealink T46U',
      voicemailEnabled: true,
      forwardEnabled: false,
      forwardDestination: '',
      comment: 'Commerciale France, messagerie activée sur non-réponse.'
    },
    {
      id: 'u-3',
      name: 'Bob Support Client',
      email: 'bob@acme.com',
      internalNumber: '102',
      sdaId: '01 40 20 30 02',
      stationType: 'Softphone',
      phoneModel: 'Softphone (Sip Client)',
      voicemailEnabled: false,
      forwardEnabled: true,
      forwardDestination: '06 12 34 56 78',
      comment: 'Technicien Support, renvoi sur mobile si absent.'
    }
  ],
  templates: DEFAULT_TEMPLATES,
  nodes: [
    {
      id: 'node-1',
      type: 'sda',
      name: 'Numéro Unique Client',
      x: 30,
      y: 180,
      properties: {
        number: '0140203000',
        description: 'Sélection Directe à l\'Arrivée du standard commercial',
        techComment: 'Entrée principale de la ligne VoIP Trunk SIP',
        clientComment: 'Numéro général de l\'entreprise imprimé sur vos cartes d\'affaires.'
      }
    },
    {
      id: 'node-2',
      type: 'day_night',
      name: 'Règle Heures d\'Ouverture',
      x: 240,
      y: 180,
      properties: {
        timeSchedule: '08:30-12:00, 14:00-18:00',
        description: 'Horaires habituels Acme Corp',
        techComment: 'Bascule automatique. Lundi au Vendredi.',
        clientComment: 'Aiguillage selon nos horaires d\'ouverture de bureau.'
      }
    },
    {
      id: 'node-3',
      type: 'ivr',
      name: 'Menu SVI Principal',
      x: 480,
      y: 80,
      properties: {
        audioMessageName: 'svi_general_fr.wav',
        description: 'Serveur Vocal Interactif commercial et support',
        techComment: 'Touche 1 = Alice (Ventes), Touche 2 = Bob (Technique)',
        clientComment: 'Vous entendrez : "Pour les ventes, tapez 1. Pour le support, tapez 2.".'
      }
    },
    {
      id: 'node-4',
      type: 'user_station',
      name: 'Poste d\'Alice (Ventes)',
      x: 750,
      y: 30,
      properties: {
        userName: 'Alice Robinson',
        stationName: 'Bureau Commercial',
        internalNumber: '101',
        phoneModel: 'Yealink T46U',
        description: 'Commerciale Senior zone Nord',
        techComment: 'IP Yealink branché sur switch POE d\'étage.',
        clientComment: 'Téléphone commercial direct d\'Alice.'
      }
    },
    {
      id: 'node-5',
      type: 'user_station',
      name: 'Poste de Bob (Support)',
      x: 750,
      y: 180,
      properties: {
        userName: 'Bob Durand',
        stationName: 'Bureau Support Client',
        internalNumber: '102',
        phoneModel: 'Softphone (Sip Client)',
        description: 'Support technique niveau d\'escalade 1',
        techComment: 'Sip-Client sur PC Windows via VPN.',
        clientComment: 'Poste IP du service client de Bob.'
      }
    },
    {
      id: 'node-6',
      type: 'voicemail',
      name: 'Messagerie Fermeture',
      x: 480,
      y: 340,
      properties: {
        internalNumber: '999',
        audioMessageName: 'fermeture_nuit.wav',
        description: 'Boîte aux lettres générale d\'absence',
        techComment: 'Redirige vers adresse email contact@acme.com',
        clientComment: 'Boîte vocale d\'absence enregistrable permettant de laisser un message.'
      }
    },
    {
      id: 'node-7',
      type: 'voicemail',
      name: 'Messagerie Alice (Absente)',
      x: 1010,
      y: 90,
      properties: {
        internalNumber: '111',
        audioMessageName: 'messagerie_alice.wav',
        description: 'Messagerie vocale commerciale d\'Alice',
        techComment: 'Notification de message activée vers alice@acme.com',
        clientComment: 'Si Alice est déjà en ligne ou absente, vos clients peuvent laisser un message ici.'
      }
    },
    {
      id: 'node-8',
      type: 'call_group',
      name: 'Gr. Interne Comptabilité & RH',
      x: 30,
      y: 500,
      properties: {
        internalNumber: '200',
        description: 'Groupe de distribution interne d\'administration',
        techComment: 'Scrutation simultanée sur les postes internes 201 et 202.',
        clientComment: 'Ligne interne commune : fait sonner la comptabilité et les RH.'
      }
    },
    {
      id: 'node-9',
      type: 'user_station',
      name: 'Poste RH (Interne)',
      x: 320,
      y: 450,
      properties: {
        userName: 'Martine Recrutement',
        stationName: 'Bureau RH',
        internalNumber: '201',
        phoneModel: 'Yealink T54W',
        description: 'Poste interne RH sans numéro direct SDA',
        techComment: 'Poste SIP rattaché au dect de l\'étage.',
        clientComment: 'Martine gère le recrutement. Poste joignable uniquement en interne via le 201.'
      }
    },
    {
      id: 'node-10',
      type: 'user_station',
      name: 'Poste Comptabilité (Interne)',
      x: 320,
      y: 560,
      properties: {
        userName: 'Pierre Finance',
        stationName: 'Bureau Compta',
        internalNumber: '202',
        phoneModel: 'Mitel 6920 IP',
        description: 'Comptable général de l\'entreprise',
        techComment: 'Poste physique IP connecté au LAN Interne.',
        clientComment: 'Pierre est le comptable. Poste joignable uniquement en interne via le 202.'
      }
    },
    {
      id: 'node-11',
      type: 'voicemail',
      name: 'Messagerie Admin Interne',
      x: 620,
      y: 500,
      properties: {
        internalNumber: '220',
        audioMessageName: 'messagerie_admin.wav',
        description: 'Boîte de messagerie d\'administration générale',
        techComment: 'Notification mail vers admin-notifs@acme.com',
        clientComment: 'Messagerie commune d\'administration pour laisser des messages internes ou consignes.'
      }
    },
    {
      id: 'node-12',
      type: 'user_station',
      name: 'Parc Central Postes Standards',
      x: 30,
      y: 800,
      properties: {
        internalNumber: '300 à 350',
        userName: 'Agents Généraux (50 postes)',
        stationName: 'Bureaux Standards',
        phoneModel: 'Yealink T46U',
        outgoingCallerId: '01 40 00 11 11',
        description: 'Postes de travail sans ligne SDA directe individuelle',
        techComment: 'Abonnement SIP Trunk multi-canaux sans SDA personnelle.',
        clientComment: 'Tous ces postes partagent le même comportement standard d\'appel entrant et sortant.'
      }
    },
    {
      id: 'node-13',
      type: 'outgoing_num',
      name: 'Sortie: 01 40 00 11 11',
      x: 320,
      y: 730,
      properties: {
        number: '0140001111',
        description: 'Numéro d\'accueil général présenté à l\'extérieur',
        techComment: 'Outgoing Caller ID configuration au niveau du Trunk principal.',
        clientComment: 'Numéro unique affiché sur le téléphone des correspondants appelés par ces postes.'
      }
    },
    {
      id: 'node-14',
      type: 'incoming_num',
      name: 'Entrée: Pas de SDA directe',
      x: 320,
      y: 870,
      properties: {
        number: 'Inaccessible Directement',
        description: 'Refus automatique des appels entrants directs externes',
        techComment: 'Routage entrant direct désactivé. Obligation de passer par le standard.',
        clientComment: 'Ces téléphones ne peuvent pas être joints directement de l\'extérieur (passer d\'abord par le standard).'
      }
    },
    {
      id: 'node-15',
      type: 'voicemail',
      name: 'Boîte Vocale Commune 300',
      x: 620,
      y: 800,
      properties: {
        internalNumber: '399',
        audioMessageName: 'messagerie_commune_300.wav',
        description: 'Messagerie vocale partagée du pool de postes',
        techComment: 'Boîte vocale de groupe sur non-réponse prolongée ou renvoi global.',
        clientComment: 'Boîte mail de réception de messages vocaux accessible depuis n\'importe quel poste via touche ou code.'
      }
    }
  ],
  connections: [
    {
      id: 'conn-1',
      sourceId: 'node-1',
      targetId: 'node-2',
      label: 'appel entrant'
    },
    {
      id: 'conn-2',
      sourceId: 'node-2',
      targetId: 'node-3',
      label: 'jours ouvrés'
    },
    {
      id: 'conn-3',
      sourceId: 'node-2',
      targetId: 'node-6',
      label: 'hors horaires'
    },
    {
      id: 'conn-4',
      sourceId: 'node-3',
      targetId: 'node-4',
      label: 'touche 1 (Ventes)'
    },
    {
      id: 'conn-5',
      sourceId: 'node-3',
      targetId: 'node-5',
      label: 'touche 2 (Support)'
    },
    {
      id: 'conn-6',
      sourceId: 'node-4',
      targetId: 'node-7',
      label: 'si non-réponse (15s)'
    },
    {
      id: 'conn-7',
      sourceId: 'node-8',
      targetId: 'node-9',
      label: 'parallèle'
    },
    {
      id: 'conn-8',
      sourceId: 'node-8',
      targetId: 'node-10',
      label: 'parallèle'
    },
    {
      id: 'conn-9',
      sourceId: 'node-8',
      targetId: 'node-11',
      label: 'si non-réponse (20s)'
    },
    {
      id: 'conn-10',
      sourceId: 'node-12',
      targetId: 'node-13',
      label: 'appel sortant (via Trunk)'
    },
    {
      id: 'conn-11',
      sourceId: 'node-12',
      targetId: 'node-14',
      label: 'appel entrant (Non admis)'
    },
    {
      id: 'conn-12',
      sourceId: 'node-12',
      targetId: 'node-15',
      label: 'si non-réponse'
    }
  ]
};

export const BLANK_PROJECT: TelecomProject = {
  projectName: 'Nouveau Projet Vierge',
  clientName: '',
  siteName: '',
  author: '',
  createdAt: '2026-06-18',
  updatedAt: '2026-06-18',
  lines: [],
  users: [],
  templates: [],
  nodes: [],
  connections: []
};

