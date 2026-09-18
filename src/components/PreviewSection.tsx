/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, 
  Layers, 
  Check, 
  AlertTriangle, 
  ChevronRight, 
  Activity,
  ClipboardCheck,
  Download,
  Image,
  PhoneOff
} from 'lucide-react';
import { TelecomProject, CallNode, Connection } from '../types';
import { NODE_METADATA } from '../utils/templates';
import { distributionModeLabel } from '../data/telephonyOptions';
import { hasPositiveTimeout, getNodePrimaryLine } from '../utils/nodeDisplay';
import { buildExportFilename, triggerBlobDownload, triggerDataUrlDownload } from '../utils/exportFilename';

// Helper component to render a beautifully designed visual vector flowchart diagram in read-only reports
function FlowchartReadonlyVisual({ project, showDownload = false }: { project: TelecomProject; showDownload?: boolean }) {
  const [layoutMode, setLayoutMode] = useState<'auto-horizontal' | 'auto-vertical' | 'manual'>('auto-horizontal');
  const [detailLevel, setDetailLevel] = useState<'client' | 'simple'>('client');
  const svgRef = React.useRef<SVGSVGElement>(null);

  if (!project.nodes || project.nodes.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 mt-4 italic select-none">
        Aucun bloc de routage défini pour afficher le logigramme fonctionnel.
      </div>
    );
  }

  const nodes = project.nodes;
  const connections = project.connections;
  const isVertical = layoutMode === 'auto-vertical';

  // 1. Group nodes into independent connected subgraphs (forest components) using undirected adjacency
  const visited = new Set<string>();
  const components: string[][] = [];

  nodes.forEach(n => {
    if (!visited.has(n.id)) {
      const comp: string[] = [];
      const q = [n.id];
      visited.add(n.id);
      while (q.length > 0) {
        const curr = q.shift()!;
        comp.push(curr);
        connections.forEach(conn => {
          if (conn.sourceId === curr && !visited.has(conn.targetId)) {
            visited.add(conn.targetId);
            q.push(conn.targetId);
          }
          if (conn.targetId === curr && !visited.has(conn.sourceId)) {
            visited.add(conn.sourceId);
            q.push(conn.sourceId);
          }
        });
      }
      components.push(comp);
    }
  });

  // Solve coordinates map
  const computedCoords: Record<string, { x: number; y: number }> = {};
  const nodeWidth = 230;
  const nodeHeight = 110;

  let globalOffset = 0;

  components.forEach((compNodeIds) => {
    const compNodes = nodes.filter(n => compNodeIds.includes(n.id));
    const compConns = connections.filter(c => compNodeIds.includes(c.sourceId) && compNodeIds.includes(c.targetId));

    if (layoutMode === 'manual') {
      compNodes.forEach(n => {
        computedCoords[n.id] = { x: n.x, y: n.y };
      });
      return;
    }

    // Determine the root elements of this component (nodes without incoming connections in this component)
    let compRoots = compNodes.filter(n => !compConns.some(c => c.targetId === n.id));
    if (compRoots.length === 0 && compNodes.length > 0) {
      compRoots = [compNodes[0]];
    }

    // Execute dynamic topological BFS level routing
    const levels: Record<string, number> = {};
    const queue: string[] = [];
    compRoots.forEach(r => {
      levels[r.id] = 0;
      queue.push(r.id);
    });

    const visitCount: Record<string, number> = {};
    while (queue.length > 0) {
      const currId = queue.shift()!;
      visitCount[currId] = (visitCount[currId] || 0) + 1;
      const currLevel = levels[currId];

      if (visitCount[currId] > 6) continue; // Cycle threshold guard

      const outgoing = compConns.filter(c => c.sourceId === currId);
      outgoing.forEach(conn => {
        const tgtId = conn.targetId;
        const targetNextLevel = currLevel + 1;
        if (levels[tgtId] === undefined || targetNextLevel > levels[tgtId]) {
          levels[tgtId] = targetNextLevel;
          if (!queue.includes(tgtId)) {
            queue.push(tgtId);
          }
        }
      });
    }

    // Assign fallback level 0 for any node that didn't get one
    compNodes.forEach(n => {
      if (levels[n.id] === undefined) {
        levels[n.id] = 0;
      }
    });

    const activeCompLevels = Array.from(new Set(compNodes.map(n => levels[n.id]))).sort((a, b) => a - b);
    const maxCompLevel = activeCompLevels.length > 0 ? activeCompLevels[activeCompLevels.length - 1] : 0;

    if (layoutMode === 'auto-horizontal') {
      // Columns laying: each level is a column
      const colNodes: Record<number, CallNode[]> = {};
      activeCompLevels.forEach(lev => { colNodes[lev] = []; });
      compNodes.forEach(node => {
        const lev = levels[node.id];
        colNodes[lev].push(node);
      });

      const columnHeights = activeCompLevels.map(lev => colNodes[lev].length * 155);
      const componentMaxHeight = Math.max(...columnHeights, 180);

      activeCompLevels.forEach(lev => {
        const list = colNodes[lev];
        const count = list.length;
        const totalHeight = count * 155 - 45;
        const startY = globalOffset + (componentMaxHeight - totalHeight) / 2;

        list.forEach((node, idx) => {
          computedCoords[node.id] = {
            x: lev * 310,
            y: startY + (idx * 155)
          };
        });
      });

      globalOffset += componentMaxHeight + 70;
    } else {
      // Auto-vertical cascading tree
      // Rows laying: each level is a row
      const rowNodes: Record<number, CallNode[]> = {};
      activeCompLevels.forEach(lev => { rowNodes[lev] = []; });
      compNodes.forEach(node => {
        const lev = levels[node.id];
        rowNodes[lev].push(node);
      });

      const rowWidths = activeCompLevels.map(lev => rowNodes[lev].length * 300);
      const componentMaxWidth = Math.max(...rowWidths, 850);

      activeCompLevels.forEach(lev => {
        const list = rowNodes[lev];
        const count = list.length;
        const totalWidth = count * 300 - 70;
        const startX = (componentMaxWidth - totalWidth) / 2;

        list.forEach((node, idx) => {
          computedCoords[node.id] = {
            x: startX + (idx * 300),
            y: globalOffset + (lev * 180)
          };
        });
      });

      const compHeight = (maxCompLevel + 1) * 180;
      globalOffset += compHeight + 100;
    }
  });

  // Calculate dynamic boundaries including appropriate margins
  const computedXs = Object.values(computedCoords).map(c => c.x);
  const computedYs = Object.values(computedCoords).map(c => c.y);
  const rawMinX = computedXs.length > 0 ? Math.min(...computedXs) : 0;
  const rawMinY = computedYs.length > 0 ? Math.min(...computedYs) : 0;
  const rawMaxX = computedXs.length > 0 ? Math.max(...computedXs) + nodeWidth : 900;
  const rawMaxY = computedYs.length > 0 ? Math.max(...computedYs) + nodeHeight : 500;

  const padding = 60;
  const minX = rawMinX - padding;
  const minY = rawMinY - padding;
  const width = Math.max(250, rawMaxX - rawMinX + (padding * 2));
  const height = Math.max(150, rawMaxY - rawMinY + (padding * 2));

  // Pre-calculate positions of connection labels to avoid overlap in the print/readonly preview
  const resolvedLabels = React.useMemo(() => {
    // 1. Gather default coordinates & dimensions for all labels
    const rawLabels = connections.map(conn => {
      const src = nodes.find(n => n.id === conn.sourceId);
      const tgt = nodes.find(n => n.id === conn.targetId);
      if (!src || !tgt) return null;

      const srcCoord = computedCoords[src.id];
      const tgtCoord = computedCoords[tgt.id];
      if (!srcCoord || !tgtCoord) return null;

      const startX = isVertical ? srcCoord.x + (nodeWidth / 2) : srcCoord.x + nodeWidth;
      const startY = isVertical ? srcCoord.y + nodeHeight : srcCoord.y + (nodeHeight / 2);
      
      const endX = isVertical ? tgtCoord.x + (nodeWidth / 2) : tgtCoord.x;
      const endY = isVertical ? tgtCoord.y : tgtCoord.y + (nodeHeight / 2);

      let midX = 0;
      let midY = 0;

      if (isVertical) {
        const dy = Math.max(50, Math.abs(endY - startY) * 0.45);
        const t = 0.5;
        midX = (1 - t) * (1 - t) * (1 - t) * startX + 3 * (1 - t) * (1 - t) * t * startX + 3 * (1 - t) * t * t * endX + t * t * t * endX;
        midY = (1 - t) * (1 - t) * (1 - t) * startY + 3 * (1 - t) * (1 - t) * t * (startY + dy) + 3 * (1 - t) * t * t * (endY - dy) + t * t * t * endY;
      } else {
        const dx = Math.max(70, Math.abs(endX - startX) * 0.45);
        const t = 0.5;
        midX = (1 - t) * (1 - t) * (1 - t) * startX + 3 * (1 - t) * (1 - t) * t * (startX + dx) + 3 * (1 - t) * t * t * (endX - dx) + t * t * t * endX;
        midY = (1 - t) * (1 - t) * (1 - t) * startY + 3 * (1 - t) * (1 - t) * t * startY + 3 * (1 - t) * t * t * endY + t * t * t * endY;
      }

      const textLen = conn.label ? conn.label.length : 5;
      const labelW = (textLen * 8.4) + 16;
      const labelH = 20;

      return {
        id: conn.id,
        x: midX,
        y: midY,
        w: labelW,
        h: labelH,
        origX: midX,
        origY: midY,
        connection: conn,
        startX,
        startY,
        endX,
        endY
      };
    }).filter(Boolean) as {
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
      origX: number;
      origY: number;
      connection: Connection;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    }[];

    // 2. Map nodes as obstacles
    const nodeObstacles = Object.entries(computedCoords).map(([id, coord]) => ({
      x: coord.x,
      y: coord.y,
      w: nodeWidth,
      h: nodeHeight
    }));

    // 3. Resolve overlaps
    const resolvedCoords = rawLabels.map(l => ({ ...l }));
    const iterations = 35;

    for (let iter = 0; iter < iterations; iter++) {
      let moved = false;

      // Resolve with other labels
      for (let i = 0; i < resolvedCoords.length; i++) {
        for (let j = i + 1; j < resolvedCoords.length; j++) {
          const l1 = resolvedCoords[i];
          const l2 = resolvedCoords[j];

          const dx = l1.x - l2.x;
          const dy = l1.y - l2.y;
          const minD_X = (l1.w + l2.w) / 2 + 12;
          const minD_Y = (l1.h + l2.h) / 2 + 8;

          if (Math.abs(dx) < minD_X && Math.abs(dy) < minD_Y) {
            moved = true;
            const overlapY = minD_Y - Math.abs(dy);
            const overlapX = minD_X - Math.abs(dx);

            if (overlapY < overlapX * 1.5) {
              const pushY = (overlapY / 2) + 1;
              const signY = dy >= 0 ? 1 : -1;
              l1.y += pushY * signY;
              l2.y -= pushY * signY;
            } else {
              const pushX = (overlapX / 2) + 1;
              const signX = dx >= 0 ? 1 : -1;
              l1.x += pushX * signX;
              l2.x -= pushX * signX;
            }
          }
        }
      }

      // Resolve with node obstacles
      for (let i = 0; i < resolvedCoords.length; i++) {
        const l = resolvedCoords[i];
        for (const obs of nodeObstacles) {
          const safetyX = 16;
          const safetyY = 12;

          const lLeft = l.x - l.w / 2;
          const lRight = l.x + l.w / 2;
          const lTop = l.y - l.h / 2;
          const lBot = l.y + l.h / 2;

          const oLeft = obs.x;
          const oRight = obs.x + obs.w;
          const oTop = obs.y;
          const oBot = obs.y + obs.h;

          const overlapsX = lRight > oLeft - safetyX && lLeft < oRight + safetyX;
          const overlapsY = lBot > oTop - safetyY && lTop < oBot + safetyY;

          if (overlapsX && overlapsY) {
            moved = true;
            const pushTop = oTop - safetyY - lBot;
            const pushBot = oBot + safetyY - lTop;
            const pushLeft = oLeft - safetyX - lRight;
            const pushRight = oRight + safetyX - lLeft;

            const options = [
              { axis: 'y', val: pushTop },
              { axis: 'y', val: pushBot },
              { axis: 'x', val: pushLeft },
              { axis: 'x', val: pushRight }
            ];
            options.sort((a, b) => Math.abs(a.val) - Math.abs(b.val));
            const best = options[0];

            if (best.axis === 'y') {
              l.y += best.val;
            } else {
              l.x += best.val;
            }
          }
        }
      }

      if (!moved) break;
    }

    return resolvedCoords;
  }, [connections, nodes, computedCoords, isVertical, nodeWidth, nodeHeight]);

  // High quality matching HEX colors for SVG elements matching the telecom themes
  const getColorScheme = (color: string) => {
    switch (color) {
      case 'emerald':
        return { fill: '#f0fdf4', stroke: '#10b981', header: '#059669', badgeBg: '#d1fae5', badgeTxt: '#065f46' };
      case 'teal':
        return { fill: '#f0fdfa', stroke: '#14b8a6', header: '#0d9488', badgeBg: '#ccfbf1', badgeTxt: '#115e59' };
      case 'blue':
        return { fill: '#eff6ff', stroke: '#3b82f6', header: '#2563eb', badgeBg: '#dbeafe', badgeTxt: '#1e40af' };
      case 'sky':
        return { fill: '#f0f9ff', stroke: '#0ea5e9', header: '#0284c7', badgeBg: '#e0f2fe', badgeTxt: '#0369a1' };
      case 'indigo':
        return { fill: '#f5f3ff', stroke: '#6366f1', header: '#4f46e5', badgeBg: '#e0e7ff', badgeTxt: '#3730a3' };
      case 'amber':
        return { fill: '#fffbeb', stroke: '#f59e0b', header: '#d97706', badgeBg: '#fef3c7', badgeTxt: '#92400e' };
      case 'yellow':
        return { fill: '#fefce8', stroke: '#eab308', header: '#ca8a04', badgeBg: '#fef9c3', badgeTxt: '#854d0e' };
      case 'orange':
        return { fill: '#fff7ed', stroke: '#f97316', header: '#ea580c', badgeBg: '#ffedd5', badgeTxt: '#9a3412' };
      case 'violet':
        return { fill: '#faf5ff', stroke: '#8b5cf6', header: '#7c3aed', badgeBg: '#f3e8ff', badgeTxt: '#6b21a8' };
      case 'purple':
        return { fill: '#faf5ff', stroke: '#a855f7', header: '#9333ea', badgeBg: '#f3e8ff', badgeTxt: '#6b21a8' };
      case 'fuchsia':
        return { fill: '#fdf4ff', stroke: '#d946ef', header: '#c026d3', badgeBg: '#fae8ff', badgeTxt: '#86198f' };
      case 'pink':
        return { fill: '#fdf2f8', stroke: '#ec4899', header: '#db2777', badgeBg: '#fce7f3', badgeTxt: '#9d174d' };
      case 'slate':
      default:
        return { fill: '#f8fafc', stroke: '#64748b', header: '#475569', badgeBg: '#e2e8f0', badgeTxt: '#334155' };
    }
  };

  // isVertical is declared at the top of the component functions

  const handleDownloadSVG = () => {
    try {
      const svgElement = svgRef.current;
      if (!svgElement) return;
      
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svgElement);
      
      // Ensure namespaces are present
      if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if (!source.match(/^<svg[^>]+xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/)) {
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
      }
      
      // Inject physical dimensions matching viewport so third party viewers can scale correctly
      if (!source.match(/^<svg[^>]+width=/)) {
        source = source.replace(/^<svg/, `<svg width="${width}" height="${height}"`);
      }
      
      const xmlHeader = '<?xml version="1.0" encoding="utf-8"?>\n';
      const svgBlob = new Blob([xmlHeader + source], { type: 'image/svg+xml;charset=utf-8' });
      const filename = buildExportFilename(project, 'teleflux_schema', 'svg');
      triggerBlobDownload(svgBlob, filename);
    } catch (e) {
      console.error('Failed to download SVG:', e);
    }
  };

  const handleDownloadPNG = () => {
    try {
      const svgElement = svgRef.current;
      if (!svgElement) return;
      
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svgElement);
      
      if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if (!source.match(/^<svg[^>]+xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/)) {
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
      }
      
      // Explicit physical width and height attributes are critical so browser's 'Image' respects coordinates
      if (!source.match(/^<svg[^>]+width=/)) {
        source = source.replace(/^<svg/, `<svg width="${width}" height="${height}"`);
      }
      
      const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const img = new window.Image();
      const scale = 5.0; // Dynamic ultra-crisp resolution scale
      img.width = width * scale;
      img.height = height * scale;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff'; // Pristine white BG
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const pngUrl = canvas.toDataURL('image/png', 1.0);
          const filename = buildExportFilename(project, 'teleflux_schema', 'png');
          triggerDataUrlDownload(pngUrl, filename);
        }
        URL.revokeObjectURL(svgUrl);
      };
      img.src = svgUrl;
    } catch (e) {
      console.error('Failed to download PNG:', e);
    }
  };

  return (
    <div className="w-full bg-slate-50 border border-slate-200 p-5 rounded-2xl shadow-sm mt-4 print:bg-white print:border-none print:p-0 print:shadow-none select-none">
      {/* Interactive Control Header block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden mb-4 bg-white p-3.5 rounded-xl border border-slate-100">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Logigramme de Routage</h4>
          </div>
          <p className="text-[11px] text-slate-500">
            Ajustez le rendu visuel pour le client ou l{'\''}/exportation PDF. Rien ne se superpose.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick high-quality downloads if showDownload is requested */}
          {showDownload && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 gap-1 mr-1">
              <button
                onClick={handleDownloadSVG}
                className="px-2.5 py-1.5 rounded-md text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer flex items-center gap-1"
                title="Exporter le schéma au format vectoriel .SVG (sans perte de qualité)"
              >
                <Download size={11} />
                <span>SVG Vectoriel</span>
              </button>
              <button
                onClick={handleDownloadPNG}
                className="px-2.5 py-1.5 rounded-md text-[10px] font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all cursor-pointer flex items-center gap-1"
                title="Exporter le schéma au format image haute définition .PNG (2.5x)"
              >
                <Image size={11} />
                <span>PNG HD</span>
              </button>
            </div>
          )}

          {/* Layout Orientation settings */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setLayoutMode('auto-horizontal')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                layoutMode === 'auto-horizontal' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Alignement parfait de gauche à droite"
            >
              Horizontal Auto
            </button>
            <button
              onClick={() => setLayoutMode('auto-vertical')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                layoutMode === 'auto-vertical' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Cascade descendante étape par étape"
            >
              Vertical Auto
            </button>
            <button
              onClick={() => setLayoutMode('manual')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                layoutMode === 'manual' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Utiliser l'agencement libre dessiné sur la grille de construction"
            >
              Manuel (Grille)
            </button>
          </div>

          {/* Details toggle options */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setDetailLevel('client')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                detailLevel === 'client' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Affiche les extensions internes, poste IP, NDIs et paramètres complets"
            >
              Détaillé (Client)
            </button>
            <button
              onClick={() => setDetailLevel('simple')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                detailLevel === 'simple' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Affiche uniquement les noms de blocs essentiels"
            >
              Simplifié
            </button>
          </div>
        </div>
      </div>

      {/* Dotted vector SVG canvas container */}
      <div className="overflow-x-auto border border-slate-200 bg-white rounded-xl shadow-sm print:border-slate-300">
        <svg 
          ref={svgRef}
          viewBox={`${minX} ${minY} ${width} ${height}`} 
          className="w-full h-auto min-w-[900px]"
          style={{ maxHeight: 'none' }}
        >
          <defs>
            <marker
              id="arrow-readonly"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
            </marker>
            <marker
              id="dot-readonly"
              viewBox="0 0 10 10"
              refX="5"
              refY="5"
              markerWidth="4"
              markerHeight="4"
            >
              <circle cx="5" cy="5" r="5" fill="#94a3b8" />
            </marker>
          </defs>

          {/* Grid background dotted rendering */}
          <pattern id="grid-readonly-new" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#f8fafc" />
          </pattern>
          <rect x={minX} y={minY} width={width} height={height} fill="url(#grid-readonly-new)" />

          {/* Render connections curves with direction-dependent exit offsets */}
          {resolvedLabels.map(l => {
            const conn = l.connection;
            let pathD = '';
            if (isVertical) {
              const dy = Math.max(50, Math.abs(l.endY - l.startY) * 0.45);
              pathD = `M ${l.startX} ${l.startY} C ${l.startX} ${l.startY + dy}, ${l.endX} ${l.endY - dy}, ${l.endX} ${l.endY}`;
            } else {
              const dx = Math.max(70, Math.abs(l.endX - l.startX) * 0.45);
              pathD = `M ${l.startX} ${l.startY} C ${l.startX + dx} ${l.startY}, ${l.endX - dx} ${l.endY}, ${l.endX} ${l.endY}`;
            }

            const dist = Math.sqrt((l.x - l.origX) ** 2 + (l.y - l.origY) ** 2);

            return (
              <g key={`readonly-conn-${conn.id}`}>
                {/* Visual connection line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="3"
                  markerEnd="url(#arrow-readonly)"
                  markerStart="url(#dot-readonly)"
                />

                {/* Draw high-craft leash pointer if the label has been relocated to prevent overlapping */}
                {conn.label && dist > 8 && (
                  <line
                    x1={l.origX}
                    y1={l.origY}
                    x2={l.x}
                    y2={l.y}
                    stroke="#94a3b8"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                    className="opacity-70"
                  />
                )}

                {/* Label Badge */}
                {conn.label && (
                  <g transform={`translate(${l.x}, ${l.y})`} className="transition-all duration-205">
                    <rect
                      x={-((conn.label.length * 4.2) + 8)}
                      y={-10}
                      width={(conn.label.length * 8.4) + 16}
                      height={20}
                      rx={5}
                      fill="#475569"
                      stroke="#1e293b"
                      strokeWidth="1.5"
                    />
                    <text
                      textAnchor="middle"
                      y={3.5}
                      fill="#ffffff"
                      fontSize="9.5"
                      fontWeight="black"
                      fontFamily="monospace, Courier"
                    >
                      {conn.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Render nodes boxes */}
          {nodes.map(node => {
            const meta = NODE_METADATA[node.type];
            if (!meta) return null;
            const scheme = getColorScheme(meta.color);
            const coord = computedCoords[node.id];
            if (!coord) return null;

            // Highlight primary identifiers for client verification
            const isNdi = ['ndi', 'sda', 'incoming_num', 'direct_line'].includes(node.type);
            const hasExt = !!node.properties.internalNumber;
            const extNum = node.properties.internalNumber;
            const mainNum = node.properties.number || node.properties.outgoingCallerId;

            // Custom subtitle configuration lines
            let detailLine1 = '';
            let detailLine2 = '';

            const getPhoneModelStr = (props: any) => {
              if (!props.phoneBrand) return '';
              const model = props.phoneModel;
              const modelCustom = props.phoneModelCustom;
              const modelStr = (!model || model === 'custom_input') ? (modelCustom || '') : model;
              return `${props.phoneBrand} ${modelStr}`.trim();
            };

            // Type-specific detailed data formatting for Schema view boxes
            switch (node.type) {
              case 'ndi':
                detailLine1 = `Nº: ${node.properties.number || '0xxx'}`;
                detailLine2 = node.properties.targetPlatform ? `SDA DST: ${node.properties.targetPlatform}` : '';
                break;
              case 'user_station': {
                detailLine1 = `Numéro: ${node.properties.internalNumber || ''}`;
                if (node.properties.userName && node.properties.userName !== "Nom Utilisateur" && node.properties.userName !== node.name) {
                  detailLine1 += ` (${node.properties.userName})`;
                }
                const modelStr = getPhoneModelStr(node.properties);
                if (modelStr) {
                  detailLine2 = `Poste: ${modelStr}`;
                } else if (node.properties.phoneType) {
                  detailLine2 = `Type: ${node.properties.phoneType}`;
                }
                break;
              }
              case 'call_group':
              case 'queue':
                detailLine1 = `${node.type === 'queue' ? 'File' : 'Groupe'}: ${node.properties.internalNumber || '—'} · ${distributionModeLabel(node.properties.groupType)}`;
                if (node.properties.delayBeforeForward && node.properties.delayBeforeForward > 0) {
                  detailLine2 = `Timeout: ${node.properties.delayBeforeForward}s`;
                } else {
                  detailLine2 = node.properties.description || '';
                }
                break;
              case 'voicemail':
                detailLine1 = `Messagerie: ${node.properties.internalNumber || ''}`;
                detailLine2 = `Fichier: ${node.properties.audioMessageName || 'standard.wav'}`;
                break;
              case 'ivr':
                detailLine1 = `Menu IVR: ${node.properties.internalNumber || ''}`;
                detailLine2 = `Fichier: ${node.properties.audioMessageName || 'choix.wav'}`;
                break;
              case 'time_range':
                detailLine1 = `Plage: ${node.properties.timeSchedule || 'Horaires'}`;
                detailLine2 = (node.properties as any).timezone ? `Fuseau: ${(node.properties as any).timezone}` : '';
                break;
              case 'custom_audio':
                detailLine1 = `Audio: ${node.properties.audioMessageName || ''}`;
                detailLine2 = node.properties.description || '';
                break;
              case 'emergency_overflow':
                detailLine1 = `Urgence: ${node.properties.emergencyActive ? '🔴 ACTIF' : '🟢 Inactif'}`;
                detailLine2 = node.properties.forwardDestination ? `Vers: ${node.properties.forwardDestination}` : 'Sécurisation';
                break;
              case 'incoming_num':
                detailLine1 = `Entrant: ${node.properties.number || 'Toutes SDA'}`;
                detailLine2 = node.properties.description || '';
                break;
              case 'outgoing_num':
                detailLine1 = `Sortant: ${node.properties.number || 'Présentation'}`;
                detailLine2 = node.properties.description || '';
                break;
              case 'hangup':
                detailLine1 = `Fin d'appel`;
                detailLine2 = `Raccroché immédiat`;
                break;
              case 'junction':
                detailLine1 = 'Nœud de liaison';
                detailLine2 = 'Jonction multi-entrées / multi-sorties';
                break;
              default:
                if (node.properties.number) {
                  detailLine1 = `Nº: ${node.properties.number}`;
                } else if (node.properties.internalNumber) {
                  detailLine1 = `Ext: ${node.properties.internalNumber}`;
                } else if (node.properties.userName) {
                  detailLine1 = `Utilisateur: ${node.properties.userName}`;
                }
                break;
            }

            // Fallback for detailLine2 if still empty and we have custom configuration info
            if (!detailLine2) {
              if (node.properties.associatedSda) {
                detailLine2 = `SDA Directe: ${node.properties.associatedSda}`;
              } else if (node.properties.clientComment || node.properties.techComment) {
                detailLine2 = node.properties.clientComment || node.properties.techComment || '';
              }
            }

            return (
              <g key={`readonly-node-${node.id}`} transform={`translate(${coord.x}, ${coord.y})`}>
                {/* Node Box card shadow wrapper */}
                <rect
                  width={nodeWidth}
                  height={nodeHeight}
                  rx={12}
                  fill={scheme.fill}
                  stroke={scheme.stroke}
                  strokeWidth="2.5"
                  filter="drop-shadow(0px 4px 6px rgba(15, 23, 42, 0.05))"
                />

                {/* Left side decorative bar with category primary color */}
                <path
                  d="M 1.5 12 A 10.5 10.5 0 0 1 12 1.5 L 12 1.5 L 12 108.5 L 12 108.5 A 10.5 10.5 0 0 1 1.5 98 Z"
                  fill={scheme.header}
                />

                {/* Node Top Category Title label */}
                <text
                  x={18}
                  y={22}
                  fill={scheme.header}
                  fontSize="9"
                  fontWeight="900"
                  fontFamily="sans-serif, Arial"
                  letterSpacing="0.8"
                >
                  {(meta.label || node.type).toUpperCase()}
                </text>

                {/* Top Right custom Telecom Badge (NDI label vs Internal short extension number) */}
                {detailLevel === 'client' && (
                  <g transform={`translate(${nodeWidth - 10}, 16)`}>
                    {hasExt ? (
                      <g>
                        <rect
                          x={-62}
                          y={-8}
                          width={62}
                          height={16}
                          rx={4}
                          fill="#dbeafe"
                          stroke="#3b82f6"
                          strokeWidth="1"
                        />
                        <text
                          x={-31}
                          textAnchor="middle"
                          y={4}
                          fill="#1e40af"
                          fontSize="8.5"
                          fontWeight="extrabold"
                          fontFamily="monospace, Courier"
                        >
                          EXT {extNum}
                        </text>
                      </g>
                    ) : isNdi ? (
                      <g>
                        <rect
                          x={-72}
                          y={-8}
                          width={72}
                          height={16}
                          rx={4}
                          fill="#fef3c7"
                          stroke="#f59e0b"
                          strokeWidth="1"
                        />
                        <text
                          x={-36}
                          textAnchor="middle"
                          y={4}
                          fill="#92400e"
                          fontSize="8"
                          fontWeight="extrabold"
                          fontFamily="sans-serif, Arial"
                        >
                          NUM. PUBLIC
                        </text>
                      </g>
                    ) : null}
                  </g>
                )}

                {/* Node Title human string */}
                <text
                  x={18}
                  y={46}
                  fill="#0f172a"
                  fontSize="13"
                  fontWeight="900"
                  fontFamily="sans-serif, Arial"
                >
                  {node.name.length > 22 ? `${node.name.substring(0, 20)}...` : node.name}
                </text>

                {/* Config detail line 1 */}
                {detailLine1 && (
                  <text
                    x={18}
                    y={66}
                    fill="#334155"
                    fontSize="10"
                    fontFamily="monospace, Courier"
                    fontWeight="bold"
                  >
                    {detailLine1}
                  </text>
                )}

                {/* Config detail line 2 (for multi-line custom clients) */}
                {detailLevel === 'client' && detailLine2 ? (
                  <text
                    x={18}
                    y={82}
                    fill="#475569"
                    fontSize="9"
                    fontFamily="sans-serif, Arial"
                    fontWeight="medium"
                  >
                    {detailLine2.length > 32 ? `${detailLine2.substring(0, 30)}...` : detailLine2}
                  </text>
                ) : null}

                {/* Bottom type label badge */}
                <g transform={`translate(18, ${detailLevel === 'client' && detailLine2 ? 89 : 76})`}>
                  <rect
                    width={90}
                    height={13}
                    rx={3}
                    fill="#f1f5f9"
                    stroke="#cbd5e1"
                    strokeWidth="0.5"
                  />
                  <text
                    x={6}
                    y={9.5}
                    fill="#64748b"
                    fontSize="7.5"
                    fontWeight="bold"
                    fontFamily="sans-serif, Arial"
                  >
                    type: {node.type}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}


interface PreviewSectionProps {
  project: TelecomProject;
  validationAlerts: { id: string; type: "error" | "warning"; message: string; nodeId?: string }[];
  onExportPdf?: () => void;
}

const ENTRY_TYPES = new Set(["ndi", "sda", "nds", "incoming_num", "direct_line", "sip_trunk"]);

type PreviewView = "summary" | "simulator" | "schema";

function isEntryNode(type: string) {
  return ENTRY_TYPES.has(type);
}

function formatNumber(node: CallNode) {
  return node.properties.number || node.properties.associatedSda || "—";
}

export default function PreviewSection({ project, validationAlerts, onExportPdf }: PreviewSectionProps) {
  const [activeView, setActiveView] = useState<PreviewView>("summary");
  const [selectedIncomingNodeId, setSelectedIncomingNodeId] = useState("");
  const [simActive, setSimActive] = useState(false);
  const [simCurrentNodeId, setSimCurrentNodeId] = useState("");
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [simStepsCount, setSimStepsCount] = useState(0);
  const [simTimeMode, setSimTimeMode] = useState<"day" | "night">("day");
  const [simCallOutcome, setSimCallOutcome] = useState<"answered" | "busy" | "no_answer">("answered");

  const entryNodes = useMemo(
    () => project.nodes.filter((n) => isEntryNode(n.type)),
    [project.nodes]
  );

  const stations = useMemo(
    () => project.nodes.filter((n) =>
      n.type === "user_station"
      || n.type === "switchboard"
      || n.type === "extension"
      || n.type === "softphone"
      || n.type === "mobile_pbu"
      || n.type === "direct_line"
    ),
    [project.nodes]
  );

  const softphones = useMemo(() => project.nodes.filter((n) => n.type === "softphone"), [project.nodes]);
  const mobiles = useMemo(() => project.nodes.filter((n) => n.type === "mobile_pbu" || n.type === "mobile_external"), [project.nodes]);

  const ivrs = useMemo(() => project.nodes.filter((n) => n.type === "ivr"), [project.nodes]);
  const queues = useMemo(
    () => project.nodes.filter((n) => n.type === "queue" || n.type === "call_group"),
    [project.nodes]
  );

  useEffect(() => {
    if (!selectedIncomingNodeId && entryNodes.length > 0) {
      setSelectedIncomingNodeId(entryNodes[0].id);
    } else if (selectedIncomingNodeId && !entryNodes.some((n) => n.id === selectedIncomingNodeId)) {
      setSelectedIncomingNodeId(entryNodes[0]?.id || "");
    }
  }, [entryNodes, selectedIncomingNodeId]);

  const describeTarget = (target: CallNode) => {
    const p = target.properties || {};
    const meta = NODE_METADATA[target.type];
    const bits: string[] = [];

    if (target.type === "user_station" || target.type === "softphone" || target.type === "direct_line") {
      bits.push(getNodePrimaryLine(target));
      if (target.type === "softphone") bits.push("softphone");
      return bits.filter(Boolean).join(" · ");
    }
    if (target.type === "switchboard") {
      return `Standard ${p.internalNumber || "9"}${p.userName ? ` — ${p.userName}` : ""}`;
    }
    if (target.type === "mobile_pbu") {
      return getNodePrimaryLine(target);
    }
    if (target.type === "ivr") {
      const opts: string[] = [`SVI « ${target.name} »`];
      if (p.audioMessageName) opts.push(p.audioMessageName);
      if (hasPositiveTimeout(p.digitTimeout)) opts.push(`DTMF ${p.digitTimeout}s`);
      return opts.join(" · ");
    }
    if (target.type === "queue" || target.type === "call_group") {
      const opts: string[] = [target.name];
      opts.push(distributionModeLabel(p.groupType));
      if (p.internalNumber) opts.push(`Ext ${p.internalNumber}`);
      if (hasPositiveTimeout(p.delayBeforeForward)) opts.push(`timeout ${p.delayBeforeForward}s`);
      if (hasPositiveTimeout(p.agentRingTimeout)) opts.push(`sonnerie ${p.agentRingTimeout}s`);
      if (p.overflowAction) opts.push(`débord. → ${p.overflowAction}`);
      if (p.maxCallersInQueue != null && p.maxCallersInQueue > 0) opts.push(`max ${p.maxCallersInQueue}`);
      return opts.join(" · ");
    }
    if (target.type === "voicemail") return `Messagerie ${target.name}${p.internalNumber ? ` (${p.internalNumber})` : ""}`;
    if (target.type.startsWith("forward_") || target.type === "transfer") {
      const t = `Renvoi → ${p.forwardDestination || target.name}`;
      return hasPositiveTimeout(p.delayBeforeForward) ? `${t} (${p.delayBeforeForward}s)` : t;
    }
    if (target.type === "day_night" || target.type === "time_range" || target.type === "holiday") {
      return `${meta?.label || target.type}${p.timeSchedule ? ` · ${p.timeSchedule}` : ""}`;
    }
    if (target.type === "sip_trunk") return getNodePrimaryLine(target);
    if (target.type === "hangup") return target.properties.hangupCause || "Raccroché";
    if (target.type === "junction") return `Liaison « ${target.name} »`;
    return target.name;
  };

  const nodeAccent = (type: string) => {
    const color = NODE_METADATA[type as keyof typeof NODE_METADATA]?.color || "slate";
    const map: Record<string, { bar: string; chip: string; text: string; soft: string }> = {
      emerald: { bar: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-800 border-emerald-200", text: "text-emerald-700", soft: "bg-emerald-50 border-emerald-100" },
      teal: { bar: "bg-teal-500", chip: "bg-teal-100 text-teal-800 border-teal-200", text: "text-teal-700", soft: "bg-teal-50 border-teal-100" },
      amber: { bar: "bg-amber-500", chip: "bg-amber-100 text-amber-900 border-amber-200", text: "text-amber-800", soft: "bg-amber-50 border-amber-100" },
      yellow: { bar: "bg-yellow-500", chip: "bg-yellow-100 text-yellow-900 border-yellow-200", text: "text-yellow-800", soft: "bg-yellow-50 border-yellow-100" },
      orange: { bar: "bg-orange-500", chip: "bg-orange-100 text-orange-900 border-orange-200", text: "text-orange-800", soft: "bg-orange-50 border-orange-100" },
      sky: { bar: "bg-sky-500", chip: "bg-sky-100 text-sky-800 border-sky-200", text: "text-sky-700", soft: "bg-sky-50 border-sky-100" },
      cyan: { bar: "bg-cyan-500", chip: "bg-cyan-100 text-cyan-800 border-cyan-200", text: "text-cyan-700", soft: "bg-cyan-50 border-cyan-100" },
      rose: { bar: "bg-rose-500", chip: "bg-rose-100 text-rose-800 border-rose-200", text: "text-rose-700", soft: "bg-rose-50 border-rose-100" },
      violet: { bar: "bg-violet-500", chip: "bg-violet-100 text-violet-800 border-violet-200", text: "text-violet-700", soft: "bg-violet-50 border-violet-100" },
      indigo: { bar: "bg-indigo-500", chip: "bg-indigo-100 text-indigo-800 border-indigo-200", text: "text-indigo-700", soft: "bg-indigo-50 border-indigo-100" },
      blue: { bar: "bg-blue-500", chip: "bg-blue-100 text-blue-800 border-blue-200", text: "text-blue-700", soft: "bg-blue-50 border-blue-100" },
      slate: { bar: "bg-slate-500", chip: "bg-slate-100 text-slate-800 border-slate-200", text: "text-slate-700", soft: "bg-slate-50 border-slate-200" },
    };
    return map[color] || map.slate;
  };

  type PathLine = {
    depth: number;
    text: string;
    kind: "step" | "loop" | "end";
  };

  const isCallEndNode = (node: CallNode) =>
    node.type === "hangup";

  const buildPathLines = (nodeId: string, depth: number, lines: PathLine[], visited: Set<string>) => {
    if (visited.has(nodeId)) {
      lines.push({ depth, text: "↺ boucle détectée", kind: "loop" });
      return;
    }
    visited.add(nodeId);
    const conns = project.connections.filter((c) => c.sourceId === nodeId);
    if (conns.length === 0) {
      // Feuille sans suite : pas de ligne « fin » — sauf si le nœud courant est un hangup
      // (déjà affiché en amont comme étape). On s'arrête simplement.
      return;
    }
    conns.forEach((conn) => {
      const target = project.nodes.find((n) => n.id === conn.targetId);
      if (!target) return;
      const label = conn.label || "suite";
      const desc = describeTarget(target);
      if (isCallEndNode(target)) {
        lines.push({
          depth,
          text: `→ [${label}] ${desc}`,
          kind: "end",
        });
        // Pas de descente : c'est la fin d'appel
        return;
      }
      lines.push({
        depth,
        text: `→ [${label}] ${desc}`,
        kind: "step",
      });
      buildPathLines(target.id, depth + 1, lines, new Set(visited));
    });
  };

  const scenarioOutline = useMemo(() => {
    return entryNodes.map((entry) => {
      const lines: PathLine[] = [];
      buildPathLines(entry.id, 0, lines, new Set());
      return { entry, lines };
    });
  }, [entryNodes, project.connections, project.nodes]);

  const startSimulation = () => {
    if (!selectedIncomingNodeId) {
      window.alert("Sélectionnez un numéro d'entrée pour démarrer.");
      return;
    }
    const nodeObj = project.nodes.find((n) => n.id === selectedIncomingNodeId);
    if (!nodeObj) return;
    setSimActive(true);
    setSimCurrentNodeId(nodeObj.id);
    setSimStepsCount(1);
    setSimLogs([
      `Appel entrant sur ${formatNumber(nodeObj)} (${nodeObj.name})`,
      `Contexte : ${simTimeMode === "day" ? "horaires jour" : "horaires nuit"} · résultat agent : ${
        simCallOutcome === "answered" ? "décroché" : simCallOutcome === "busy" ? "occupé" : "non réponse"
      }`,
    ]);
  };

  const advanceSimulation = (targetNodeId: string, labelUsed: string) => {
    const targetNode = project.nodes.find((n) => n.id === targetNodeId);
    if (!targetNode) return;
    setSimCurrentNodeId(targetNode.id);
    setSimStepsCount((prev) => prev + 1);
    let logMsg = `Aiguillage [${labelUsed}] → ${targetNode.name}`;
    if (targetNode.type === "user_station" || targetNode.type === "softphone") {
      logMsg += ` — sonnerie Ext ${targetNode.properties.internalNumber || "?"} (${targetNode.properties.userName || targetNode.name})`;
    } else if (targetNode.type === "voicemail") {
      logMsg += " — messagerie vocale";
    } else if (targetNode.type === "ivr") {
      logMsg += " — menu SVI";
    } else if (targetNode.type === "queue" || targetNode.type === "call_group") {
      logMsg += " — file / groupe d'appel";
    } else if (targetNode.type.startsWith("forward_")) {
      logMsg += ` — renvoi ${targetNode.properties.forwardDestination || ""}`;
    } else if (targetNode.type === "hangup") {
      logMsg += " — fin d'appel";
    } else if (targetNode.type === "junction") {
      logMsg += " — nœud de liaison";
    }
    setSimLogs((prev) => [...prev, logMsg]);
  };

  const resetSimulation = () => {
    setSimActive(false);
    setSimCurrentNodeId("");
    setSimLogs([]);
    setSimStepsCount(0);
  };

  const activeSimNode = project.nodes.find((n) => n.id === simCurrentNodeId);
  const activeSimNodeMeta = activeSimNode ? NODE_METADATA[activeSimNode.type] : null;
  const availableSimOutlets = activeSimNode
    ? project.connections.filter((c) => c.sourceId === activeSimNode.id)
    : [];

  const scoreConnectionForContext = (conn: Connection) => {
    const labels = (conn.labels && conn.labels.length ? conn.labels : [conn.label || ""])
      .join(" ")
      .toLowerCase();
    let score = 0;
    if (simTimeMode === "night" && /(nuit|fermé|hors horaire|fermeture|holiday)/.test(labels)) score += 3;
    if (simTimeMode === "day" && /(jour|ouvert|horaire|accueil)/.test(labels)) score += 2;
    if (simCallOutcome === "busy" && /(occupé|busy|saturation)/.test(labels)) score += 3;
    if (simCallOutcome === "no_answer" && /(non.?r[eé]ponse|no.?answer|timeout|sans r[eé]ponse)/.test(labels)) score += 3;
    if (simCallOutcome === "answered" && /(r[eé]pondu|décroché|ok|suite|direct)/.test(labels)) score += 1;
    return score;
  };

  const availableSimOutletsSorted = [...availableSimOutlets].sort(
    (a, b) => scoreConnectionForContext(b) - scoreConnectionForContext(a)
  );

  const navBtn = (id: PreviewView, label: string, icon: React.ReactNode) => (
    <button
      key={id}
      type="button"
      onClick={() => setActiveView(id)}
      className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
        activeView === id ? "bg-brand-600 text-white" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
      }`}
    >
      <span className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </span>
      <Check size={12} className={activeView === id ? "text-white" : "text-transparent"} />
    </button>
  );

  return (
    <div className="flex-1 overflow-hidden flex flex-col lg:flex-row select-none animate-fade-in" id="preview-section-panel">
      <aside className="w-full lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-5 flex flex-col justify-between shrink-0">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Aperçus</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Résumé du scénario et simulation d&apos;appels entrants.
            </p>
          </div>
          <div className="space-y-1">
            {navBtn("summary", "Résumé du scénario", <ClipboardCheck size={15} />)}
            {navBtn("simulator", "Simulateur d'appels", <Activity size={15} />)}
            {navBtn("schema", "Schéma & export", <Layers size={15} />)}
          </div>

          {validationAlerts.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wide text-amber-800 flex items-center gap-1">
                <AlertTriangle size={12} />
                Diagnostics ({validationAlerts.length})
              </div>
              <ul className="space-y-1 max-h-36 overflow-y-auto">
                {validationAlerts.slice(0, 8).map((a) => (
                  <li key={a.id} className="text-[10px] text-amber-900 leading-snug">
                    {a.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 overflow-auto p-6 bg-slate-100">
        {activeView === "summary" && (
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden relative">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-brand-500 to-amber-400" />
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4 pt-1">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-brand-700">Scénario télécom</p>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">{project.projectName || "Sans titre"}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {project.clientName || "Client non renseigné"}
                    {project.siteName ? ` · ${project.siteName}` : ""}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Entrées", value: entryNodes.length, cls: "from-emerald-50 to-emerald-100/60 border-emerald-200 text-emerald-900" },
                    { label: "SVI", value: ivrs.length, cls: "from-amber-50 to-amber-100/60 border-amber-200 text-amber-900" },
                    { label: "Files / groupes", value: queues.length, cls: "from-orange-50 to-orange-100/60 border-orange-200 text-orange-900" },
                    { label: "Terminaux", value: stations.length, cls: "from-sky-50 to-sky-100/60 border-sky-200 text-sky-900" },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-xl border bg-gradient-to-b px-3 py-2 min-w-[88px] ${s.cls}`}>
                      <div className="text-lg font-bold">{s.value}</div>
                      <div className="text-[10px] font-semibold uppercase opacity-80">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                  <div className="font-bold text-emerald-900 mb-2">Numéros d&apos;entrée</div>
                  {entryNodes.length === 0 ? (
                    <p className="text-slate-400 italic">Aucun NDI / SDA / numéro entrant.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {entryNodes.map((n) => {
                        const accent = nodeAccent(n.type);
                        return (
                          <li key={n.id} className="flex items-center justify-between gap-2">
                            <span className={`font-semibold truncate ${accent.text}`}>{n.name}</span>
                            <span className={`font-mono shrink-0 px-1.5 py-0.5 rounded border text-[10px] ${accent.chip}`}>
                              {formatNumber(n)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50/30 p-3 md:col-span-2">
                  <div className="font-bold text-sky-900 mb-2">Parc terminaux (postes, softphones, mobiles…)</div>
                  {stations.length === 0 ? (
                    <p className="text-slate-400 italic">Aucun terminal sur le canevas.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
                      {stations.map((n) => {
                        const accent = nodeAccent(n.type);
                        return (
                          <div key={n.id} className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 ${accent.soft}`}>
                            <div className="min-w-0">
                              <div className={`truncate font-semibold ${accent.text}`}>
                                {n.properties.userName || n.name}
                              </div>
                              <div className="text-[9px] text-slate-500 truncate">
                                {NODE_METADATA[n.type]?.label}
                                {n.properties.phoneModel ? ` · ${n.properties.phoneModel}` : ""}
                              </div>
                            </div>
                            <span className="font-mono text-[10px] text-slate-600 shrink-0">
                              {n.properties.internalNumber
                                ? `Ext ${n.properties.internalNumber}`
                                : n.properties.pabxMobileNumber || n.properties.number || "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {(softphones.length > 0 || mobiles.length > 0) && (
                    <p className="mt-2 text-[10px] text-slate-500">
                      Dont {softphones.length} softphone{softphones.length > 1 ? "s" : ""}
                      {mobiles.length > 0 ? ` · ${mobiles.length} mobile${mobiles.length > 1 ? "s" : ""}` : ""}
                    </p>
                  )}
                </div>
              </div>

              {queues.length > 0 && (
                <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/30 p-3">
                  <div className="font-bold text-orange-900 text-xs mb-2">Files &amp; groupes — options actives</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {queues.map((n) => {
                      const accent = nodeAccent(n.type);
                      const p = n.properties;
                      const tags: string[] = [distributionModeLabel(p.groupType)];
                      if (hasPositiveTimeout(p.delayBeforeForward)) tags.push(`Timeout ${p.delayBeforeForward}s`);
                      if (hasPositiveTimeout(p.agentRingTimeout)) tags.push(`Sonnerie ${p.agentRingTimeout}s`);
                      if (p.overflowAction) tags.push(p.overflowAction);
                      if (p.maxCallersInQueue != null && p.maxCallersInQueue > 0) tags.push(`Max ${p.maxCallersInQueue}`);
                      if (p.musicOnHold) tags.push(`MOH ${p.musicOnHold}`);
                      return (
                        <div key={n.id} className={`rounded-lg border px-2.5 py-2 ${accent.soft}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${accent.bar}`} />
                            <span className={`text-xs font-bold truncate ${accent.text}`}>{n.name}</span>
                            {p.internalNumber ? (
                              <span className="ml-auto font-mono text-[9px] text-slate-500">Ext {p.internalNumber}</span>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {tags.map((t) => (
                              <span key={t} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${accent.chip}`}>
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Parcours depuis chaque entrée</h3>
              {scenarioOutline.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Ajoutez des numéros d&apos;entrée pour générer le résumé.</p>
              ) : (
                scenarioOutline.map(({ entry, lines }) => {
                  const accent = nodeAccent(entry.type);
                  return (
                    <div key={entry.id} className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className={`px-4 py-2.5 flex items-center justify-between gap-3 border-b ${accent.soft}`}>
                        <div className="min-w-0 flex items-center gap-2">
                          <span className={`w-2 h-8 rounded-full shrink-0 ${accent.bar}`} />
                          <div className="min-w-0">
                            <div className={`text-xs font-bold truncate ${accent.text}`}>{entry.name}</div>
                            <div className="text-[10px] text-slate-500">{NODE_METADATA[entry.type]?.label || entry.type}</div>
                          </div>
                        </div>
                        <span className={`font-mono text-xs font-semibold shrink-0 px-2 py-1 rounded-lg border ${accent.chip}`}>
                          {formatNumber(entry)}
                        </span>
                      </div>
                      <div className="px-4 py-3 space-y-1">
                        {lines.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic pl-2">Aucune connexion sortante</p>
                        ) : (
                          lines.map((line, i) => (
                            <div
                              key={`${entry.id}-${i}`}
                              style={{ paddingLeft: `${8 + line.depth * 20}px` }}
                              className={`relative text-[11px] leading-relaxed rounded-lg px-2.5 py-1.5 border ${
                                line.kind === "loop"
                                  ? "bg-rose-50 border-rose-200 text-rose-800"
                                  : line.kind === "end"
                                  ? "bg-slate-800 border-slate-700 text-slate-100"
                                  : "bg-white border-slate-100 text-slate-700"
                              }`}
                            >
                              {line.depth > 0 && (
                                <span
                                  className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-200"
                                  style={{ left: `${line.depth * 20 - 6}px` }}
                                  aria-hidden
                                />
                              )}
                              <span className="font-mono">
                                {line.text}
                                {line.kind === "end" ? (
                                  <span className="ml-2 text-[9px] font-bold uppercase tracking-wide text-amber-300">
                                    fin d&apos;appel
                                  </span>
                                ) : null}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeView === "simulator" && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-4xl mx-auto shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                <Activity size={20} className="text-brand-600" />
                Simulateur d&apos;appels
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Composez un numéro d&apos;entrée (NDI, SDA, ligne directe…) puis choisissez l&apos;aiguillage à chaque étape.
              </p>
            </div>

            {!simActive ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Numéro d&apos;entrée à tester</label>
                  <select
                    value={selectedIncomingNodeId}
                    onChange={(e) => setSelectedIncomingNodeId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-semibold"
                  >
                    <option value="">— Sélectionnez une entrée —</option>
                    {entryNodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {formatNumber(n)} — {n.name}
                      </option>
                    ))}
                  </select>
                  {entryNodes.length === 0 && (
                    <p className="text-[11px] text-amber-700">
                      Aucune entrée détectée. Ajoutez un bloc NDI, SDA ou numéro entrant dans Conception.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Contexte horaire</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSimTimeMode("day")}
                      className={`py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                        simTimeMode === "day" ? "bg-amber-500 text-white border-amber-500" : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      Jour
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimTimeMode("night")}
                      className={`py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                        simTimeMode === "night" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      Nuit
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Résultat au poste / file</label>
                  <select
                    value={simCallOutcome}
                    onChange={(e) => setSimCallOutcome(e.target.value as "answered" | "busy" | "no_answer")}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-xs text-slate-800 font-semibold"
                  >
                    <option value="answered">Décroché / abouti</option>
                    <option value="busy">Occupé</option>
                    <option value="no_answer">Non-réponse</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={startSimulation}
                  disabled={!selectedIncomingNodeId}
                  className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg text-xs cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  <Play size={14} className="fill-current" />
                  Lancer l&apos;appel simulé
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 p-5 border border-brand-200 bg-brand-50/30 rounded-2xl flex flex-col justify-between gap-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-brand-100 pb-2">
                      <span className="text-xs font-bold text-brand-900 uppercase">Étape {simStepsCount}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-500 text-white rounded-md font-bold uppercase">En cours</span>
                    </div>
                    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                      <span className="text-[9px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase">
                        {activeSimNodeMeta?.label || "Bloc"}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{activeSimNode?.name}</h4>
                      {activeSimNode && isEntryNode(activeSimNode.type) && (
                        <div className="font-mono text-xs text-brand-700">{formatNumber(activeSimNode)}</div>
                      )}
                      <p className="text-xs text-slate-600">
                        {activeSimNode?.properties.description || activeSimNode?.properties.clientComment || "Sans descriptif."}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Aiguillage</span>
                      {availableSimOutletsSorted.length === 0 ? (
                        <div className="p-4 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs text-center font-semibold">
                          Fin de parcours à cette étape.
                        </div>
                      ) : (
                        availableSimOutletsSorted.map((conn) => {
                          const subTarget = project.nodes.find((n) => n.id === conn.targetId);
                          const hint = scoreConnectionForContext(conn) >= 3;
                          return (
                            <button
                              key={conn.id}
                              type="button"
                              onClick={() => advanceSimulation(conn.targetId, conn.label || "suite")}
                              className={`w-full p-3 bg-white hover:bg-slate-50 border rounded-xl text-left text-xs transition-colors cursor-pointer flex items-center justify-between group font-semibold text-slate-700 ${
                                hint ? "border-brand-400 ring-1 ring-brand-200" : "border-slate-200 hover:border-brand-400"
                              }`}
                            >
                              <span>
                                <b className="text-brand-800">[{conn.label || "suite"}]</b> → {subTarget?.name}
                                {hint ? <span className="ml-2 text-[9px] text-brand-600 uppercase">contexte</span> : null}
                              </span>
                              <ChevronRight size={14} className="text-slate-400 group-hover:text-brand-600" />
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetSimulation}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-lg text-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <PhoneOff size={13} />
                    Raccrocher
                  </button>
                </div>
                <div className="p-4 bg-slate-950 rounded-2xl font-mono flex flex-col">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3">Journal d&apos;appel</span>
                  <div className="space-y-2 text-[11px] text-teal-300 overflow-y-auto max-h-[320px] flex-1">
                    {simLogs.map((log, i) => (
                      <div key={i} className="leading-snug">{log}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === "schema" && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-5xl mx-auto shadow-sm space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                  <Layers size={20} className="text-brand-600" />
                  Schéma &amp; export
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Logigramme exportable SVG/PNG, ou rapport PDF 1 page (résumé + schéma + postes) avec filigrane site / date / version.
                </p>
              </div>
              {onExportPdf && (
                <button
                  type="button"
                  onClick={onExportPdf}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Rapport PDF 1 page
                </button>
              )}
            </div>
            <FlowchartReadonlyVisual project={project} showDownload={true} />
          </div>
        )}
      </div>
    </div>
  );
}
