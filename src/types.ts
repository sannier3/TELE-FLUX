/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type NodeType =
  | 'ndi'                       // numéro NDI
  | 'sda'                       // numéro SDA
  | 'nds'                       // numéro NDS
  | 'incoming_num'              // numéro entrant
  | 'outgoing_num'              // numéro sortant
  | 'user_station'              // poste utilisateur
  | 'direct_line'               // ligne directe
  | 'extension'                 // extension
  | 'ivr'                       // AVI ou serveur vocal interactif
  | 'call_group'                // groupe d’appel
  | 'queue'                     // file d’attente
  | 'transfer'                  // transfert d’appel
  | 'forward_unconditional'      // renvoi inconditionnel
  | 'forward_no_answer'          // renvoi sur non-réponse
  | 'forward_busy'              // renvoi sur occupation
  | 'voicemail'                 // messagerie vocale
  | 'custom_audio'              // message vocal personnalisé
  | 'time_range'                // plage horaire
  | 'day_night'                 // règle jour/nuit
  | 'external_destination'      // destination externe
  | 'mobile_external'           // mobile ou numéro externe
  | 'switchboard'               // standard
  | 'greeting'                  // accueil téléphonique
  | 'hangup'                    // fin d'appel / raccrocher
  | 'emergency_overflow';       // scénario d’urgence ou débordement

export interface CallNode {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  properties: {
    number?: string;            // NDI, SDA, NDS, direct or external number
    description?: string;       // general description
    internalNumber?: string;    // internal extension
    stationName?: string;       // user/station name
    userName?: string;          // user name
    phoneModel?: string;        // model of IP Phone
    extensionType?: string;     // extension details
    delayBeforeForward?: number;// in seconds
    forwardDestination?: string;// destination number or node ID
    audioMessageName?: string;  // associated audio prompt name
    timeSchedule?: string;      // business hours string, e.g. "08:00-12:00, 14:00-18:00"
    emergencyActive?: boolean;  // emergency active flag
    techComment?: string;       // technician-specific comment
    clientComment?: string;     // client-friendly comment
    additionalOptions?: string[]; // e.g., ["Enregistrement d'appel", "Musique d'attente"]
    
    // Add custom advanced fields
    forwardType?: 'manual' | 'scheduled' | 'none'; // Forward type
    forwardPriority?: number; // Priority order of rule (lower is higher)
    targetPlatform?: string; // Platform e.g. Yeastar P-Series, 3CX, DSTNY, etc.
    targetPlatformCustom?: string;
    configMethod?: string; // config method, e.g. code fonction, touche BLF
    nodeStatus?: string; // Active/target status of block
    nodeStatusCustom?: string;
    priorityLevel?: string; // "Normale", "Haute", "Urgente", "Critique"
    manualForwardTrigger?: string;
    
    // Key Switch / Touch Documentation
    keyConfig?: {
      keyName: string;
      keyType: string; // "BLF", "DSS", "Physique", "Virtuelle", "Code fonction"
      functionCode: string;
      concernedPost: string;
      actionTriggered: string;
      targetStatus: string;
      impactedRule: string;
      clientComment: string;
      techComment: string;
    };
    
    // Advanced Post / Terminal Equipment Details
    phoneBrand?: string;
    phoneType?: string;
    phoneModelCustom?: string;
    outgoingCallerId?: string; // présentée
    associatedSda?: string; // SDA rattachée
    siteName?: string;
    serviceName?: string;
    macAddress?: string;
    hasExtensionModule?: string; // "aucun" | "un" | "plusieurs" | "personnalise"
    extensionModuleModel?: string; // e.g. Yealink EXP50
    extensionModuleCustom?: string;
    hasHeadset?: string; // headset connection type or "aucun"
    headsetBrand?: string;
    headsetModel?: string;
    headsetConnection?: string;
    dectBaseModel?: string;
    dectHandsetModel?: string;

    // Advanced Opening Hours & Voicemail Text requested by user
    timeSchedules?: { days: string[]; start: string; end: string }[];
    voicemailText?: string;
    showVoicemailTextOnNode?: boolean;

    // Optional visual display settings toggles per node
    hidePrimaryDetails?: boolean;
    hideDescription?: boolean;
    hideBadges?: boolean;
    hideMetadata?: boolean;
    hideInternalNumber?: boolean;
    hideExternalNumber?: boolean;
  };
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  label: string; // e.g., "si occupé", "hors horaires", "appel entrant", etc.
  labels?: string[]; // For multiple connection names / options per connection
}

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  internalNumber: string;
  sdaId: string; // Associated SDA Number
  stationType: 'IP' | 'DECT' | 'Softphone' | 'Analogique';
  phoneBrand?: string;
  phoneModel: string;
  phoneModelCustom?: string;
  voicemailEnabled: boolean;
  forwardEnabled: boolean;
  forwardDestination: string;
  comment: string;
}

export interface PhoneLine {
  id: string;
  ndi: string;
  type: 'SIP Trunk' | 'T0' | 'T2' | 'Analogique';
  channels: number;
  provider: string;
  comment: string;
}

export interface ReusableTemplate {
  id: string;
  name: string;
  description: string;
  type: NodeType;
  properties: CallNode['properties'];
}

export interface TelecomProject {
  projectName: string;
  clientName: string;
  siteName: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  lines: PhoneLine[];
  users: DirectoryUser[];
  templates: ReusableTemplate[];
  nodes: CallNode[];
  connections: Connection[];
}
