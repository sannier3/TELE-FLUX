/**
 * Instantanés manuels uniquement (pas de journal automatique).
 */

import { CallNode, ProjectSnapshot, TelecomProject } from '../types';

const MAX_SNAPSHOTS = 16;

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatLogDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Capture l'état éditable d'un projet (sans la liste des snapshots elle-même). */
export function captureProjectData(project: TelecomProject): ProjectSnapshot['data'] {
  return {
    projectName: project.projectName,
    siteName: project.siteName,
    version: project.version,
    nodes: JSON.parse(JSON.stringify(project.nodes)),
    connections: JSON.parse(JSON.stringify(project.connections)),
    annotations: JSON.parse(JSON.stringify(project.annotations || [])),
  };
}

/** Applique les données d'un instantané sur le projet courant (conserve snapshots / meta). */
export function applySnapshotData(project: TelecomProject, data: ProjectSnapshot['data']): TelecomProject {
  return {
    ...project,
    projectName: data.projectName ?? project.projectName,
    siteName: data.siteName ?? project.siteName,
    version: data.version ?? project.version,
    nodes: JSON.parse(JSON.stringify(data.nodes)),
    connections: JSON.parse(JSON.stringify(data.connections)),
    annotations: JSON.parse(JSON.stringify(data.annotations || [])),
    updatedAt: nowIso(),
  };
}

export function createSnapshot(project: TelecomProject, label?: string): TelecomProject {
  const at = nowIso();
  const snap: ProjectSnapshot = {
    id: `snap-${Date.now()}`,
    label: label || `Instantané ${formatLogDate(at)}`,
    at,
    data: captureProjectData(project),
  };
  const snapshots = [...(project.snapshots || []), snap];
  while (snapshots.length > MAX_SNAPSHOTS) snapshots.shift();
  return {
    ...project,
    snapshots,
    updatedAt: at,
  };
}

export function overwriteSnapshot(
  project: TelecomProject,
  snapshotId: string
): TelecomProject {
  const at = nowIso();
  const snapshots = (project.snapshots || []).map((s) =>
    s.id === snapshotId
      ? {
          ...s,
          at,
          label: s.label.includes('(modifié)') ? s.label : `${s.label} (modifié)`,
          data: captureProjectData(project),
        }
      : s
  );
  return { ...project, snapshots, updatedAt: at };
}

export function deleteSnapshot(
  project: TelecomProject,
  snapshotId: string
): TelecomProject {
  const snapshots = (project.snapshots || []).filter((s) => s.id !== snapshotId);
  return { ...project, snapshots, updatedAt: nowIso() };
}

export function bumpVersion(project: TelecomProject): TelecomProject {
  const raw = project.version || '1.0';
  const parts = raw.split('.').map((p) => parseInt(p, 10) || 0);
  if (parts.length < 2) parts.push(0);
  parts[parts.length - 1] += 1;
  return { ...project, version: parts.join('.'), updatedAt: nowIso() };
}

export interface SnapshotDiff {
  addedNodes: CallNode[];
  removedNodes: CallNode[];
  movedOrChanged: { before: CallNode; after: CallNode }[];
  connDelta: number;
}

export function diffSnapshots(a: ProjectSnapshot, b: ProjectSnapshot): SnapshotDiff {
  const mapA = new Map(a.data.nodes.map((n) => [n.id, n]));
  const mapB = new Map(b.data.nodes.map((n) => [n.id, n]));
  const addedNodes: CallNode[] = [];
  const removedNodes: CallNode[] = [];
  const movedOrChanged: { before: CallNode; after: CallNode }[] = [];

  mapB.forEach((n, id) => {
    if (!mapA.has(id)) addedNodes.push(n);
  });
  mapA.forEach((n, id) => {
    if (!mapB.has(id)) removedNodes.push(n);
  });
  mapA.forEach((before, id) => {
    const after = mapB.get(id);
    if (!after) return;
    if (
      before.name !== after.name
      || before.type !== after.type
      || before.x !== after.x
      || before.y !== after.y
      || JSON.stringify(before.properties) !== JSON.stringify(after.properties)
    ) {
      movedOrChanged.push({ before, after });
    }
  });

  return {
    addedNodes,
    removedNodes,
    movedOrChanged,
    connDelta: b.data.connections.length - a.data.connections.length,
  };
}
