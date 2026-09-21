/**
 * Export SVG du schéma aligné sur le rendu du concepteur
 * (largeur 190px, densités, connexions au milieu des cartes).
 */

import { CallNode, CanvasAnnotation, Connection } from '../types';
import { NODE_METADATA } from './templates';
import {
  getDisplayDensity,
  getNodePrimaryLine,
  getNodeSecondaryLine,
  maxBadgesForNode,
  shouldShowBadges,
} from './nodeDisplay';
import { getExportIconSvg } from './exportIcons';

export const SCHEMA_NODE_WIDTH = 190;

export function getNodeColorScheme(color: string) {
  switch (color) {
    case 'emerald':
      return { fill: '#f0fdf4', stroke: '#10b981', header: '#059669' };
    case 'teal':
      return { fill: '#f0fdfa', stroke: '#14b8a6', header: '#0d9488' };
    case 'blue':
      return { fill: '#eff6ff', stroke: '#3b82f6', header: '#2563eb' };
    case 'sky':
      return { fill: '#f0f9ff', stroke: '#0ea5e9', header: '#0284c7' };
    case 'indigo':
      return { fill: '#f5f3ff', stroke: '#6366f1', header: '#4f46e5' };
    case 'amber':
      return { fill: '#fffbeb', stroke: '#f59e0b', header: '#d97706' };
    case 'yellow':
      return { fill: '#fefce8', stroke: '#eab308', header: '#ca8a04' };
    case 'orange':
      return { fill: '#fff7ed', stroke: '#f97316', header: '#ea580c' };
    case 'violet':
      return { fill: '#faf5ff', stroke: '#8b5cf6', header: '#7c3aed' };
    case 'purple':
      return { fill: '#faf5ff', stroke: '#a855f7', header: '#9333ea' };
    case 'fuchsia':
      return { fill: '#fdf4ff', stroke: '#d946ef', header: '#c026d3' };
    case 'pink':
      return { fill: '#fdf2f8', stroke: '#ec4899', header: '#db2777' };
    case 'slate':
    default:
      return { fill: '#f8fafc', stroke: '#64748b', header: '#475569' };
  }
}

/** Hauteur de carte alignée sur le concepteur (sans mesure DOM). */
export function estimateDesignerNodeHeight(node: CallNode): number {
  const density = getDisplayDensity(node);
  let base = density === 'compact' ? 56 : density === 'standard' ? 78 : 110;
  if (!node.properties?.hidePrimaryDetails) {
    base += density === 'compact' ? 4 : 8;
  }
  if (density === 'detailed' && shouldShowBadges(node)) base += 16;
  if (density === 'detailed' && !node.properties?.hideMetadata) base += 18;
  if (
    node.type === 'voicemail'
    && density === 'detailed'
    && node.properties?.showVoicemailTextOnNode
    && node.properties?.voicemailText
  ) {
    const lineCount = node.properties.voicemailText.split('\n').length;
    base += Math.max(24, lineCount * 12);
  }
  const primary = !node.properties?.hidePrimaryDetails ? getNodePrimaryLine(node) : '';
  const secondary = getNodeSecondaryLine(node) || '';
  const hasBody = !!(primary || secondary || (density === 'detailed' && shouldShowBadges(node)) || (density === 'detailed' && !node.properties?.hideMetadata));
  if (density === 'compact' && !hasBody) return 44;
  return base;
}

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text: string, maxChars: number): string[] {
  if (!text) return [];
  const result: string[] = [];
  for (const sLine of text.split('\n')) {
    if (!sLine.trim()) {
      result.push('');
      continue;
    }
    const words = sLine.split(/\s+/);
    let current = '';
    for (const word of words) {
      if (!current) current = word;
      else if ((current + ' ' + word).length <= maxChars) current += ` ${word}`;
      else {
        result.push(current);
        current = word;
      }
    }
    if (current) result.push(current);
  }
  return result;
}

function collectBadges(node: CallNode): string[] {
  if (!shouldShowBadges(node)) return [];
  const badges: string[] = [];
  const max = maxBadgesForNode(node);
  const p = node.properties;
  if (p.nodeStatus && badges.length < max) {
    badges.push((p.nodeStatusCustom || p.nodeStatus).toUpperCase());
  }
  if (p.forwardType === 'manual' && badges.length < max) badges.push('MAN');
  if (p.forwardType === 'scheduled' && badges.length < max) badges.push('AUTO');
  if ((p.hasPabxOption || p.phoneType === 'Mobile PBU') && !p.hidePabxBadge && badges.length < max) {
    badges.push('PABX');
  }
  if (p.keyConfig && badges.length < max) {
    badges.push(p.keyConfig.keyType === 'Code fonction' ? 'CODE' : (p.keyConfig.keyType || 'BLF'));
  }
  if (p.targetPlatform && badges.length < max) {
    badges.push(p.targetPlatform === 'Centrex opérateur' ? 'Centrex' : p.targetPlatform);
  }
  return badges;
}

export interface SchemaExportOptions {
  nodes: CallNode[];
  connections: Connection[];
  annotations?: CanvasAnnotation[];
  /** Hauteurs mesurées dans le DOM (id → px). Sinon estimation concepteur. */
  heights?: Record<string, number>;
  padding?: number;
  background?: string;
}

export interface BuiltSchemaSvg {
  svg: string;
  width: number;
  height: number;
}

export function buildDesignerSchemaSvg(opts: SchemaExportOptions): BuiltSchemaSvg {
  const {
    nodes,
    connections,
    annotations = [],
    heights = {},
    padding = 48,
    background = '#ffffff',
  } = opts;

  if (!nodes.length) {
    return { svg: '', width: 0, height: 0 };
  }

  const heightOf = (n: CallNode) =>
    (heights[n.id] && heights[n.id] > 0 ? heights[n.id] : estimateDesignerNodeHeight(n));

  let rawMinX = Math.min(...nodes.map((n) => n.x), ...annotations.map((a) => a.x));
  let rawMinY = Math.min(...nodes.map((n) => n.y), ...annotations.map((a) => a.y));
  let rawMaxX = Math.max(
    ...nodes.map((n) => n.x + SCHEMA_NODE_WIDTH),
    ...annotations.map((a) => a.x + a.width)
  );
  let rawMaxY = Math.max(
    ...nodes.map((n) => n.y + heightOf(n)),
    ...annotations.map((a) => a.y + a.height)
  );

  if (!Number.isFinite(rawMinX)) {
    rawMinX = 0;
    rawMinY = 0;
    rawMaxX = 400;
    rawMaxY = 300;
  }

  const minX = rawMinX - padding;
  const minY = rawMinY - padding;
  const width = Math.max(280, rawMaxX - rawMinX + padding * 2);
  const height = Math.max(180, rawMaxY - rawMinY + padding * 2);

  const outlet = (n: CallNode) => ({
    x: n.x + SCHEMA_NODE_WIDTH - minX,
    y: n.y + heightOf(n) / 2 - minY,
  });
  const inlet = (n: CallNode) => ({
    x: n.x - minX,
    y: n.y + heightOf(n) / 2 - minY,
  });

  let body = '';

  // Annotations (zones)
  annotations.forEach((a) => {
    const color = a.color || '#0d9488';
    const ax = a.x - minX;
    const ay = a.y - minY;
    body += `
      <rect x="${ax}" y="${ay}" width="${a.width}" height="${a.height}" rx="12" fill="${color}14" stroke="${color}" stroke-width="2" stroke-dasharray="6 4"/>
      <rect x="${ax + 8}" y="${ay - 10}" width="${Math.min(a.width - 16, Math.max(40, a.label.length * 6.5 + 12))}" height="16" rx="4" fill="${color}"/>
      <text x="${ax + 14}" y="${ay + 2}" fill="#ffffff" font-size="10" font-weight="700" font-family="Outfit, system-ui, sans-serif">${esc(a.label)}</text>
    `;
  });

  // Connections
  body += `<defs>
    <marker id="tf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#94a3b8"/>
    </marker>
  </defs>`;

  connections.forEach((conn) => {
    const src = nodes.find((n) => n.id === conn.sourceId);
    const tgt = nodes.find((n) => n.id === conn.targetId);
    if (!src || !tgt) return;
    const s = outlet(src);
    const e = inlet(tgt);
    const dx = Math.max(80, Math.abs(e.x - s.x) * 0.5);
    body += `<path d="M ${s.x},${s.y} C ${s.x + dx},${s.y} ${e.x - dx},${e.y} ${e.x},${e.y}" fill="none" stroke="#94a3b8" stroke-width="2" marker-end="url(#tf-arrow)"/>`;

    const labels = ((conn.labels && conn.labels.length > 0) ? conn.labels : [conn.label]).filter(Boolean) as string[];
    if (!labels.length) return;

    const t = 0.5;
    const midX =
      (1 - t) ** 3 * s.x
      + 3 * (1 - t) ** 2 * t * (s.x + dx)
      + 3 * (1 - t) * t ** 2 * (e.x - dx)
      + t ** 3 * e.x;
    const midY =
      (1 - t) ** 3 * s.y
      + 3 * (1 - t) ** 2 * t * s.y
      + 3 * (1 - t) * t ** 2 * e.y
      + t ** 3 * e.y;
    const ox = conn.labelOffset?.x || 0;
    const oy = conn.labelOffset?.y || 0;
    const lx = midX + ox;
    const ly = midY + oy;
    const pillH = 16;
    const gap = 3;
    const totalH = labels.length * pillH + (labels.length - 1) * gap;
    const startY = ly - totalH / 2;
    labels.forEach((lbl, idx) => {
      const pw = Math.max(28, lbl.length * 5.6 + 12);
      const py = startY + idx * (pillH + gap);
      body += `
        <rect x="${lx - pw / 2}" y="${py}" width="${pw}" height="${pillH}" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2"/>
        <text x="${lx}" y="${py + 11.5}" text-anchor="middle" fill="#0f766e" font-size="8.5" font-weight="800" font-family="Outfit, system-ui, sans-serif">${esc(lbl)}</text>
      `;
    });
  });

  // Nodes — même logique visuelle que le concepteur
  nodes.forEach((node) => {
    const meta = NODE_METADATA[node.type];
    if (!meta) return;
    const scheme = getNodeColorScheme(meta.color || 'slate');
    const density = getDisplayDensity(node);
    const nh = heightOf(node);
    const nx = node.x - minX;
    const ny = node.y - minY;
    const isJunction = node.type === 'junction';
    const primary = !node.properties?.hidePrimaryDetails ? getNodePrimaryLine(node) : '';
    const secondary = getNodeSecondaryLine(node) || '';
    const showBadges = shouldShowBadges(node);
    const showMeta = density === 'detailed' && !node.properties?.hideMetadata;
    const showVm =
      node.type === 'voicemail'
      && density === 'detailed'
      && !!node.properties.showVoicemailTextOnNode
      && !!node.properties.voicemailText;
    const hasBody = !!(primary || secondary || showBadges || showMeta || showVm);
    const headerH = density === 'compact' ? (hasBody ? 28 : nh) : 34;
    const nameLines = wrapText(node.name, density === 'compact' ? 18 : 17);
    const dash = isJunction ? ' stroke-dasharray="4 3"' : '';
    const iconSize = density === 'compact' ? 12 : 14;
    const iconX = nx + 10;
    const iconY = ny + Math.max(6, (Math.min(headerH, nh) - iconSize) / 2);
    const textX = nx + 10 + iconSize + 6;

    body += `
      <g>
        <rect x="${nx}" y="${ny}" width="${SCHEMA_NODE_WIDTH}" height="${nh}" rx="12" fill="${scheme.fill}" stroke="${scheme.stroke}" stroke-width="1.5"${dash}/>
        <path d="M ${nx + 1} ${ny + 10} A 9 9 0 0 1 ${nx + 5} ${ny + 1} L ${nx + 5} ${ny + headerH} L ${nx + 1} ${ny + headerH} Z" fill="${scheme.header}" opacity="0.95"/>
        <rect x="${nx}" y="${ny}" width="${SCHEMA_NODE_WIDTH}" height="${headerH}" rx="12" fill="rgba(255,255,255,0.35)"/>
        ${hasBody ? `<line x1="${nx}" y1="${ny + headerH}" x2="${nx + SCHEMA_NODE_WIDTH}" y2="${ny + headerH}" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>` : ''}
        ${getExportIconSvg(meta.iconName, iconX, iconY, iconSize, scheme.header)}
    `;

    let ty = ny + (density === 'compact' ? 17 : 20);
    nameLines.slice(0, density === 'compact' ? 2 : 3).forEach((line) => {
      body += `<text x="${textX}" y="${ty}" fill="#0f172a" font-size="11" font-weight="800" font-family="Outfit, system-ui, sans-serif">${esc(line)}</text>`;
      ty += 13;
    });

    if (hasBody) {
      let cy = ny + headerH + (density === 'compact' ? 12 : 14);
      if (primary) {
        wrapText(primary, 28).slice(0, 3).forEach((line) => {
          body += `<text x="${nx + 12}" y="${cy}" fill="#1e293b" font-size="10" font-weight="700" font-family="Outfit, system-ui, sans-serif">${esc(line)}</text>`;
          cy += 12;
        });
      }
      if (secondary) {
        wrapText(secondary, 30).slice(0, 3).forEach((line) => {
          body += `<text x="${nx + 12}" y="${cy}" fill="#64748b" font-size="9" font-weight="500" font-family="Outfit, system-ui, sans-serif">${esc(line)}</text>`;
          cy += 11;
        });
      }
      if (showVm && node.properties.voicemailText) {
        cy += 2;
        wrapText(`“${node.properties.voicemailText}”`, 32).slice(0, 4).forEach((line) => {
          body += `<text x="${nx + 12}" y="${cy}" fill="#9f1239" font-size="8" font-family="Outfit, system-ui, sans-serif">${esc(line)}</text>`;
          cy += 10;
        });
      }
      if (showBadges) {
        let bx = nx + 12;
        const by = Math.min(cy + 4, ny + nh - 22);
        collectBadges(node).forEach((b) => {
          const bw = Math.max(22, b.length * 5.2 + 8);
          const isPabx = b === 'PABX';
          body += `
            <rect x="${bx}" y="${by}" width="${bw}" height="12" rx="2" fill="${isPabx ? '#dc2626' : '#ffffff'}" stroke="${isPabx ? '#dc2626' : '#cbd5e1'}" stroke-width="0.8"/>
            <text x="${bx + bw / 2}" y="${by + 9}" text-anchor="middle" fill="${isPabx ? '#ffffff' : '#334155'}" font-size="7" font-weight="800" font-family="Outfit, system-ui, sans-serif">${esc(b)}</text>
          `;
          bx += bw + 4;
        });
      }
      if (showMeta) {
        const label = meta.label;
        const lw = Math.min(120, label.length * 5.5 + 10);
        body += `
          <rect x="${nx + 12}" y="${ny + nh - 18}" width="${lw}" height="12" rx="3" fill="rgba(255,255,255,0.55)" stroke="#e2e8f0" stroke-width="0.6"/>
          <text x="${nx + 16}" y="${ny + nh - 9}" fill="#334155" font-size="8" font-weight="600" font-family="Outfit, system-ui, sans-serif">${esc(label)}</text>
        `;
      }
    }

    body += `</g>`;
  });

  const svg = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color:${background}">
  <rect width="100%" height="100%" fill="${background}"/>
  ${body}
</svg>`;

  return { svg, width, height };
}

export async function rasterizeSvgToPng(
  svg: string,
  width: number,
  height: number,
  scale = 3
): Promise<string> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('SVG rasterize failed'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png', 1.0);
  } finally {
    URL.revokeObjectURL(url);
  }
}
