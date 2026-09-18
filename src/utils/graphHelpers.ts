/**
 * Helpers de graphe : descendants, collapse, recherche.
 */

import { CallNode, Connection } from '../types';

/** Tous les descendants (BFS) d'un nœud via les connexions sortantes. */
export function getDescendantIds(
  rootId: string,
  connections: Connection[],
  nodes: CallNode[]
): string[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const adj = new Map<string, string[]>();
  connections.forEach((c) => {
    if (!adj.has(c.sourceId)) adj.set(c.sourceId, []);
    adj.get(c.sourceId)!.push(c.targetId);
  });

  const out: string[] = [];
  const visited = new Set<string>([rootId]);
  const queue = [...(adj.get(rootId) || [])];

  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id) || !nodeIds.has(id)) continue;
    visited.add(id);
    out.push(id);
    (adj.get(id) || []).forEach((n) => {
      if (!visited.has(n)) queue.push(n);
    });
  }
  return out;
}

/** Ensemble des nœuds masqués car descendants d'un nœud replié. */
export function getHiddenNodeIds(
  collapsedNodeIds: string[] | undefined,
  connections: Connection[],
  nodes: CallNode[]
): Set<string> {
  const hidden = new Set<string>();
  (collapsedNodeIds || []).forEach((rootId) => {
    getDescendantIds(rootId, connections, nodes).forEach((id) => hidden.add(id));
  });
  return hidden;
}

export function matchNodeSearch(node: CallNode, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const hay = [
    node.name,
    node.type,
    node.properties.number,
    node.properties.internalNumber,
    node.properties.userName,
    node.properties.associatedSda,
    node.properties.description,
    node.properties.stationName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}
