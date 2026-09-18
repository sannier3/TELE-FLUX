/**
 * Affichage synthétique des nœuds sur le canevas.
 * compact = minimal | standard = utile | detailed = tout
 */

import { CallNode, TelecomProject } from '../types';
import { NODE_METADATA } from '../utils/templates';
import { distributionModeLabel } from '../data/telephonyOptions';

export type DisplayDensity = 'compact' | 'standard' | 'detailed';

/** Timeout / délai significatif (> 0). */
export function hasPositiveTimeout(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function getDisplayDensity(node: CallNode): DisplayDensity {
  const d = node.properties?.displayDensity;
  if (d === 'compact' || d === 'standard' || d === 'detailed') return d;
  // Anciens projets sans displayDensity → affichage détaillé
  return 'detailed';
}

export function densityToFlags(density: DisplayDensity): Partial<CallNode['properties']> {
  switch (density) {
    case 'compact':
      return {
        displayDensity: 'compact',
        hidePrimaryDetails: false,
        hideDescription: true,
        hideBadges: true,
        hideMetadata: true,
      };
    case 'detailed':
      return {
        displayDensity: 'detailed',
        hidePrimaryDetails: false,
        hideDescription: false,
        hideBadges: false,
        hideMetadata: false,
      };
    case 'standard':
    default:
      return {
        displayDensity: 'standard',
        hidePrimaryDetails: false,
        hideDescription: true,
        hideBadges: true,
        hideMetadata: true,
      };
  }
}

/** Migre un projet chargé (JSON / localStorage) vers les flags d'affichage actuels. */
export function migrateLoadedProject(project: TelecomProject): TelecomProject {
  if (!project?.nodes) return project;
  const nodes = project.nodes.map((n) => {
    if (
      n.properties?.displayDensity === 'compact'
      || n.properties?.displayDensity === 'standard'
      || n.properties?.displayDensity === 'detailed'
    ) {
      return n;
    }
    return {
      ...n,
      properties: {
        ...n.properties,
        ...densityToFlags('detailed'),
      },
    };
  });
  return {
    ...project,
    version: project.version || '1.0',
    annotations: project.annotations || [],
    collapsedNodeIds: project.collapsedNodeIds || [],
    changeLog: project.changeLog || [],
    snapshots: project.snapshots || [],
    nodes,
  };
}

/** Ligne utilisateur type « poste » (ext + SDA + nom). */
function formatStationLikeLine(p: CallNode['properties'], fallback: string): string {
  const parts: string[] = [];
  if (!p.hideInternalNumber && p.internalNumber) parts.push(`Ext ${p.internalNumber}`);
  if (!p.hideExternalNumber && p.associatedSda) parts.push(`SDA ${p.associatedSda}`);
  if (p.userName) parts.push(p.userName);
  return parts.join(' · ') || fallback;
}

/** Ligne principale sous le titre (identifiant métier). */
export function getNodePrimaryLine(node: CallNode): string {
  const p = node.properties || {};
  switch (node.type) {
    case 'ndi':
    case 'sda':
    case 'nds':
    case 'incoming_num':
      return p.number ? `N° ${p.number}` : 'N° non configuré';
    case 'outgoing_num':
    case 'outbound_route':
      return p.number || p.outgoingCallerId || 'Sortant';
    case 'sip_trunk':
      return [p.trunkProvider || 'Trunk SIP', p.trunkChannels != null ? `${p.trunkChannels} ch.` : '']
        .filter(Boolean)
        .join(' · ');
    case 'user_station':
      return formatStationLikeLine(p, 'Poste');
    case 'switchboard': {
      const parts: string[] = [`Standard ${p.internalNumber || '9'}`];
      if (p.userName) parts.push(p.userName);
      return parts.join(' · ');
    }
    case 'direct_line': {
      const parts: string[] = [];
      if (p.number) parts.push(p.number);
      if (p.internalNumber) parts.push(`Ext ${p.internalNumber}`);
      if (p.userName) parts.push(p.userName);
      return parts.join(' · ') || 'Ligne directe';
    }
    case 'softphone':
      return formatStationLikeLine(p, 'Softphone');
    case 'mobile_pbu': {
      const parts: string[] = [];
      if (p.pabxMobileNumber || p.number) parts.push(p.pabxMobileNumber || p.number!);
      if (p.internalNumber) parts.push(`Ext ${p.internalNumber}`);
      if (p.userName) parts.push(p.userName);
      return parts.join(' · ') || 'Mobile unifié';
    }
    case 'mobile_external':
      return p.number || 'Mobile';
    case 'voicemail':
      return `Mess. ${p.internalNumber || '999'}`;
    case 'call_group':
      return [
        p.internalNumber ? `Gr ${p.internalNumber}` : 'Groupe',
        distributionModeLabel(p.groupType),
      ].join(' · ');
    case 'queue':
      return [
        p.internalNumber ? `File ${p.internalNumber}` : 'File',
        distributionModeLabel(p.groupType),
      ].join(' · ');
    case 'ivr':
      return p.audioMessageName || 'SVI';
    case 'conference':
      return `Conf ${p.internalNumber || ''}`.trim();
    case 'parking':
      return `Parc ${p.parkingSlots || ''}`.trim();
    case 'paging':
      return p.pageZone || 'Paging';
    case 'disa':
      return p.pinCode ? 'DISA · PIN' : 'DISA';
    case 'cid_route':
      return p.cidPatterns?.split('\n')[0] || 'Routage CID';
    case 'boss_secretary':
      return `Boss ${p.bossExtension || '—'} / Sec ${p.secretaryExtension || '—'}`;
    case 'feature_code':
      return p.featureCode || 'Code * / #';
    case 'blacklist':
      return p.listMode === 'whitelist' ? 'Liste blanche' : 'Liste noire';
    case 'holiday':
    case 'day_night':
    case 'time_range':
      return p.timeSchedule || 'Horaires';
    case 'fax':
      return p.number || p.faxEmail || 'Fax';
    case 'transfer':
    case 'forward_unconditional':
    case 'forward_no_answer':
    case 'forward_busy':
      return p.forwardDestination ? `→ ${p.forwardDestination}` : 'Sans destination';
    case 'hangup':
      return p.hangupCause || 'Fin d\'appel';
    case 'junction':
      return p.description ? p.description.split('\n')[0] : 'Jonction';
    case 'external_destination':
      return p.forwardDestination || p.number || 'Externe';
    default:
      return p.description || NODE_METADATA[node.type]?.label || node.type;
  }
}

/** Ligne secondaire optionnelle (standard / detailed). */
export function getNodeSecondaryLine(node: CallNode): string | null {
  const density = getDisplayDensity(node);
  if (density === 'compact') return null;
  const p = node.properties || {};

  if (node.type === 'call_group' || node.type === 'queue') {
    const bits: string[] = [];
    if (p.stationName) bits.push(p.stationName);
    if (hasPositiveTimeout(p.delayBeforeForward)) bits.push(`Timeout ${p.delayBeforeForward}s`);
    if (hasPositiveTimeout(p.agentRingTimeout)) bits.push(`Sonnerie ${p.agentRingTimeout}s`);
    return bits.join(' · ') || null;
  }
  if (node.type === 'user_station' && p.phoneModel) return p.phoneModel;
  if (node.type === 'softphone') {
    if (p.phoneModel) return p.phoneModel;
    return density === 'detailed' ? 'Client softphone' : null;
  }
  if (node.type === 'mobile_pbu' && p.pabxOperator) return p.pabxOperator;
  if (node.type === 'direct_line' && p.phoneModel) return p.phoneModel;
  if (node.type === 'sip_trunk' && p.didRange) return `DID ${p.didRange}`;
  if (node.type === 'ivr' && p.ivrMenuMap) return p.ivrMenuMap.split('\n')[0];
  if (node.type === 'voicemail' && p.showVoicemailTextOnNode && p.voicemailText) {
    return p.voicemailText.split('\n')[0];
  }
  if (density === 'detailed' && p.description) return p.description;
  return null;
}

export function shouldShowBadges(node: CallNode): boolean {
  const density = getDisplayDensity(node);
  if (density === 'compact') return false;
  if (density === 'standard') return false;
  if (node.properties.hideBadges) return false;
  return true;
}

export function maxBadgesForNode(node: CallNode): number {
  return getDisplayDensity(node) === 'detailed' ? 4 : 0;
}

/** Propriétés conservées lors d'un changement de type de nœud. */
export const TYPE_CHANGE_CARRIED_KEYS: (keyof CallNode['properties'])[] = [
  'number',
  'description',
  'techComment',
  'clientComment',
  'internalNumber',
  'targetPlatform',
  'targetPlatformCustom',
  'configMethod',
  'nodeStatus',
  'nodeStatusCustom',
  'associatedSda',
  'outgoingCallerId',
  'stationName',
  'userName',
  'audioMessageName',
  'forwardDestination',
  'delayBeforeForward',
  'timeSchedule',
  'timeSchedules',
  'groupType',
  'queueMembers',
  'agentRingTimeout',
  'ringTime',
  'displayDensity',
  'hidePrimaryDetails',
  'hideDescription',
  'hideBadges',
  'hideMetadata',
  'hideInternalNumber',
  'hideExternalNumber',
  'hidePabxBadge',
  'hasPabxOption',
  'pabxOperator',
  'pabxMobileNumber',
  'pabxOptionDetails',
  'phoneBrand',
  'phoneModel',
  'phoneType',
  'siteName',
  'serviceName',
];
