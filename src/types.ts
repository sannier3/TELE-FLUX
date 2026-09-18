/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type NodeType =
  | 'ndi'
  | 'sda'
  | 'nds'
  | 'incoming_num'
  | 'outgoing_num'
  | 'sip_trunk'
  | 'user_station'
  | 'direct_line'
  | 'extension'
  | 'softphone'
  | 'mobile_pbu'
  | 'ivr'
  | 'call_group'
  | 'queue'
  | 'conference'
  | 'parking'
  | 'paging'
  | 'disa'
  | 'cid_route'
  | 'outbound_route'
  | 'transfer'
  | 'forward_unconditional'
  | 'forward_no_answer'
  | 'forward_busy'
  | 'boss_secretary'
  | 'feature_code'
  | 'blacklist'
  | 'voicemail'
  | 'custom_audio'
  | 'time_range'
  | 'day_night'
  | 'holiday'
  | 'external_destination'
  | 'mobile_external'
  | 'switchboard'
  | 'greeting'
  | 'fax'
  | 'hangup'
  | 'junction'
  | 'emergency_overflow';

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
    /** Mode de distribution groupe / file : simultaneous | linear | cyclic | memory | longest_idle | fewest_calls | random */
    groupType?: string;
    ringTime?: string; // e.g. "20s" (legacy)
    /** Extensions / agents membres (une par ligne ou séparées par virgule) */
    queueMembers?: string;
    /** Temps de sonnerie par agent (s) avant passage au suivant */
    agentRingTimeout?: number;
    /** Capacité max de la file (appelants en attente) */
    maxCallersInQueue?: number;
    /** Musique / annonce d'attente */
    musicOnHold?: string;
    announcePosition?: boolean;
    announceHoldTime?: boolean;
    periodicAnnounceFile?: string;
    periodicAnnounceInterval?: number;
    /** Temps de wrap-up / ACW après décroché (s) */
    wrapUpTime?: number;
    skipBusyAgents?: boolean;
    joinWhenEmpty?: boolean;
    leaveWhenEmpty?: boolean;
    callbackEnabled?: boolean;
    /** Action / destination de débordement (timeout, file pleine…) */
    overflowAction?: string;
    /** SVI : délai DTMF (s) */
    digitTimeout?: number;
    maxInvalidDigits?: number;
    invalidDestination?: string;
    timeoutDestination?: string;
    /** Menu DTMF résumé (ex: 1=Commercial; 2=Support) */
    ivrMenuMap?: string;
    
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
    hidePabxBadge?: boolean;

    /** Densité d'affichage sur le canevas : compact | standard | detailed */
    displayDensity?: 'compact' | 'standard' | 'detailed';

    // Option PABX sur mobile (ex: SFR PBU / Convergence Fixe-Mobile)
    hasPabxOption?: boolean;
    pabxOperator?: string;
    pabxOptionDetails?: string;
    pabxMobileNumber?: string;

    /** Trunk SIP / opérateur */
    trunkChannels?: number;
    trunkProvider?: string;
    codecPreference?: string;
    didRange?: string;
    /** DISA / codes / conférence */
    pinCode?: string;
    maxParticipants?: number;
    /** Parking */
    parkingSlots?: string;
    parkingTimeout?: number;
    /** Paging */
    pageZone?: string;
    /** Routage par appelant (CID) — motifs / préfixes */
    cidPatterns?: string;
    /** Boss / secrétaire */
    bossExtension?: string;
    secretaryExtension?: string;
    /** Code fonction (*xx) */
    featureCode?: string;
    /** Liste noire / blanche */
    listMode?: 'blacklist' | 'whitelist';
    /** Fax */
    faxEmail?: string;
    /** Softphone / client mobile / FMC */
    simultaneousRing?: boolean;
    /** Client softphone / app mobile IPBX (tous éditeurs) */
    mobileAppEnabled?: boolean;
    /** @deprecated préférer mobileAppEnabled */
    linkusEnabled?: boolean;
    webrtcEnabled?: boolean;
    /** Messagerie */
    voicemailToEmail?: boolean;
    voicemailEmail?: string;
    recordingMode?: string;
    hangupCause?: string;
  };
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  label: string; // e.g., "si occupé", "hors horaires", "appel entrant", etc.
  labels?: string[]; // For multiple connection names / options per connection
  labelOffset?: { x: number; y: number }; // Optional custom dragged position offset
}

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  internalNumber: string;
  sdaId: string; // Associated SDA Number
  stationType: 'IP' | 'DECT' | 'Softphone' | 'Analogique' | 'Mobile PBU';
  phoneBrand?: string;
  phoneModel: string;
  phoneModelCustom?: string;
  voicemailEnabled: boolean;
  forwardEnabled: boolean;
  forwardDestination: string;
  comment: string;
  hasPabxOption?: boolean;
  pabxOperator?: string;
  pabxMobileNumber?: string;
}

export interface PhoneLine {
  id: string;
  ndi: string;
  type: 'SIP Trunk' | 'T0' | 'T2' | 'Analogique' | 'Ligne Mobile' | 'Mobile PBU / SFR (Option PABX)';
  channels: number;
  provider: string;
  comment: string;
  hasPabxOption?: boolean;
  pabxOptionDetails?: string;
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
  /** Version lisible du schéma (ex. 1.4) */
  version?: string;
  lines: PhoneLine[];
  users: DirectoryUser[];
  templates: ReusableTemplate[];
  nodes: CallNode[];
  connections: Connection[];
  /** Zones / cadres libres sur le canevas */
  annotations?: CanvasAnnotation[];
  /** Nœuds dont la branche descendante est repliée */
  collapsedNodeIds?: string[];
  /** Journal des changements */
  changeLog?: ChangeLogEntry[];
  /** Instantanés pour comparaison avant/après */
  snapshots?: ProjectSnapshot[];
}

export interface CanvasAnnotation {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface ChangeLogEntry {
  id: string;
  at: string;
  summary: string;
  detail?: string;
}

export interface ProjectSnapshot {
  id: string;
  label: string;
  at: string;
  /** Copie partielle pour comparaison (nodes + connections + meta) */
  data: {
    projectName: string;
    siteName: string;
    version?: string;
    nodes: CallNode[];
    connections: Connection[];
    annotations?: CanvasAnnotation[];
  };
}
