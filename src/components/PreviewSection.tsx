/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Printer, 
  Play, 
  Smartphone, 
  ArrowRight, 
  Layers, 
  RefreshCw, 
  HelpCircle, 
  User, 
  Users, 
  Check, 
  AlertTriangle, 
  Sliders, 
  ChevronRight, 
  Activity,
  ClipboardCheck,
  ShieldCheck,
  Download,
  Image,
  PhoneOff
} from 'lucide-react';
import { TelecomProject, CallNode, Connection } from '../types';
import { NODE_METADATA } from '../utils/templates';

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

  const padding = 50;
  const minX = rawMinX - padding;
  const minY = rawMinY - padding;
  const width = Math.max(950, rawMaxX - rawMinX + (padding * 2));
  const height = Math.max(450, rawMaxY - rawMinY + (padding * 2));

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

  const isVertical = layoutMode === 'auto-vertical';

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
      
      const xmlHeader = '<?xml version="1.0" encoding="utf-8"?>\n';
      const svgBlob = new Blob([xmlHeader + source], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      const safeName = (project.projectName || 'telecom').toLowerCase().replace(/[^a-z0-9]+/g, '_');
      downloadLink.download = `schema_${safeName}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
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
      
      const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2.5; // High definition scaling
        canvas.width = width * scale;
        canvas.height = height * scale;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff'; // Pristine white BG
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          const safeName = (project.projectName || 'telecom').toLowerCase().replace(/[^a-z0-9]+/g, '_');
          downloadLink.download = `schema_${safeName}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        URL.revokeObjectURL(svgUrl);
      };
      img.src = svgUrl;
    } catch (e) {
      console.error('Failed to download PNG:', e);
    }
  };

  return (
    <div className="w-full bg-slate-50 border border-slate-200 p-5 rounded-2xl shadow-2xs mt-4 print:bg-white print:border-none print:p-0 print:shadow-none select-none">
      {/* Interactive Control Header block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden mb-4 bg-white p-3.5 rounded-xl border border-slate-150">
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
            <div className="flex items-center bg-slate-150 p-0.5 rounded-lg border border-slate-200 gap-1 mr-1">
              <button
                onClick={handleDownloadSVG}
                className="px-2.5 py-1.5 rounded-md text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1"
                title="Exporter le schéma au format vectoriel .SVG (sans perte de qualité)"
              >
                <Download size={11} />
                <span>SVG Vectoriel</span>
              </button>
              <button
                onClick={handleDownloadPNG}
                className="px-2.5 py-1.5 rounded-md text-[10px] font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1"
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
                layoutMode === 'auto-horizontal' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Alignement parfait de gauche à droite"
            >
              Horizontal Auto
            </button>
            <button
              onClick={() => setLayoutMode('auto-vertical')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                layoutMode === 'auto-vertical' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Cascade descendante étape par étape"
            >
              Vertical Auto
            </button>
            <button
              onClick={() => setLayoutMode('manual')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                layoutMode === 'manual' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                detailLevel === 'client' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Affiche les extensions internes, poste IP, NDIs et paramètres complets"
            >
              Détaillé (Client)
            </button>
            <button
              onClick={() => setDetailLevel('simple')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                detailLevel === 'simple' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Affiche uniquement les noms de blocs essentiels"
            >
              Simplifié
            </button>
          </div>
        </div>
      </div>

      {/* Dotted vector SVG canvas container */}
      <div className="overflow-x-auto border border-slate-200 bg-white rounded-xl shadow-xs print:border-slate-300">
        <svg 
          ref={svgRef}
          viewBox={`${minX} ${minY} ${width} ${height}`} 
          className="w-full h-auto min-w-[900px]"
          style={{ maxHeight: '650px' }}
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
          {connections.map(conn => {
            const src = nodes.find(n => n.id === conn.sourceId);
            const tgt = nodes.find(n => n.id === conn.targetId);
            if (!src || !tgt) return null;

            const srcCoord = computedCoords[src.id];
            const tgtCoord = computedCoords[tgt.id];
            if (!srcCoord || !tgtCoord) return null;

            // Connection exit and entry anchors change depending on vertical/horizontal orientation
            const startX = isVertical ? srcCoord.x + (nodeWidth / 2) : srcCoord.x + nodeWidth;
            const startY = isVertical ? srcCoord.y + nodeHeight : srcCoord.y + (nodeHeight / 2);
            
            const endX = isVertical ? tgtCoord.x + (nodeWidth / 2) : tgtCoord.x;
            const endY = isVertical ? tgtCoord.y : tgtCoord.y + (nodeHeight / 2);

            let pathD = '';
            let midX = 0;
            let midY = 0;

            if (isVertical) {
              const dy = Math.max(50, Math.abs(endY - startY) * 0.45);
              pathD = `M ${startX} ${startY} C ${startX} ${startY + dy}, ${endX} ${endY - dy}, ${endX} ${endY}`;
              
              const t = 0.5;
              midX = (1 - t) * (1 - t) * (1 - t) * startX + 3 * (1 - t) * (1 - t) * t * startX + 3 * (1 - t) * t * t * endX + t * t * t * endX;
              midY = (1 - t) * (1 - t) * (1 - t) * startY + 3 * (1 - t) * (1 - t) * t * (startY + dy) + 3 * (1 - t) * t * t * (endY - dy) + t * t * t * endY;
            } else {
              const dx = Math.max(70, Math.abs(endX - startX) * 0.45);
              pathD = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;
              
              const t = 0.5;
              midX = (1 - t) * (1 - t) * (1 - t) * startX + 3 * (1 - t) * (1 - t) * t * (startX + dx) + 3 * (1 - t) * t * t * (endX - dx) + t * t * t * endX;
              midY = (1 - t) * (1 - t) * (1 - t) * startY + 3 * (1 - t) * (1 - t) * t * startY + 3 * (1 - t) * t * t * endY + t * t * t * endY;
            }

            return (
              <g key={`readonly-conn-${conn.id}`}>
                <path
                  d={pathD}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="3"
                  markerEnd="url(#arrow-readonly)"
                  markerStart="url(#dot-readonly)"
                />
                {conn.label && (
                  <g transform={`translate(${midX}, ${midY})`}>
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
                detailLine1 = `Group Ext: ${node.properties.internalNumber || 'Simultané'}`;
                if (node.properties.delayBeforeForward) {
                  detailLine2 = `Délai: ${node.properties.delayBeforeForward}s`;
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
  validationAlerts: { id: string; type: 'error' | 'warning'; message: string; nodeId?: string }[];
}

type PreviewView = 'client' | 'tech' | 'incoming' | 'station' | 'simulator' | 'schema_only';

export default function PreviewSection({ project, validationAlerts }: PreviewSectionProps) {
  const [activeView, setActiveView] = useState<PreviewView>('client');

  // Text summary auto-generation
  const [textSummary, setTextSummary] = useState('');

  // Simulator states
  const [selectedIncomingNodeId, setSelectedIncomingNodeId] = useState<string>('');
  const [simActive, setSimActive] = useState(false);
  const [simCurrentNodeId, setSimCurrentNodeId] = useState<string>('');
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [simStepsCount, setSimStepsCount] = useState(0);

  // Vue Filtres states
  const [filterSDA, setFilterSDA] = useState<string>('');
  const [filterStation, setFilterStation] = useState<string>('');

  // Generate text summary based on flowchart on mount/updating
  useEffect(() => {
    generateFlowchartSummary();
    
    // Auto populate simulator dropdown with first sda or incoming number
    const entrance = project.nodes.find(n => n.type === 'sda' || n.type === 'incoming_num');
    if (entrance && !selectedIncomingNodeId) {
      setSelectedIncomingNodeId(entrance.id);
    }
  }, [project]);

  const generateFlowchartSummary = () => {
    if (project.nodes.length === 0) {
      setTextSummary("Le schéma d'appel est actuellement vide. Ajoutez des blocs dans l'onglet Conception.");
      return;
    }

    let summaryLines: string[] = [];
    summaryLines.push(`=== RÉSUMÉ DU SCÉNARIO TÉLÉCOMS : ${project.projectName} ===`);
    summaryLines.push(`Client : ${project.clientName} | Site rattaché : ${project.siteName}`);
    summaryLines.push(`Généré le : ${new Date().toLocaleDateString('fr-FR')} par ${project.author || 'Télé-Flux'}`);
    summaryLines.push('---------------------------------------------------------');

    // Find entry points
    const entryNodes = project.nodes.filter(n => n.type === 'sda' || n.type === 'incoming_num' || n.type === 'ndi');
    
    if (entryNodes.length === 0) {
      summaryLines.push("[!] Attention : Aucun numéro d'arrivée ou racine d'appel n'a été détecté.");
    } else {
      entryNodes.forEach(entry => {
        summaryLines.push(`\n📞 POINT D'ENTRÉE : ${entry.name} (${entry.properties.number || '01XXXXXXXX'})`);
        if (entry.properties.description) {
          summaryLines.push(`   Description: ${entry.properties.description}`);
        }
        
        describePathFromNode(entry.id, '   ', summaryLines, new Set<string>());
      });
    }

    // Add list of terminals
    summaryLines.push('\n---------------------------------------------------------');
    summaryLines.push(`📂 RÉPERTOIRE & PARC DE TERMINAUX (${project.users.length} postes) :`);
    project.users.forEach(u => {
      summaryLines.push(` - Poste ${u.internalNumber} : ${u.name} | Matériel: ${u.phoneModel} (${u.stationType})`);
      if (u.sdaId) summaryLines.push(`   * Rattaché à la SDA: ${u.sdaId}`);
      if (u.voicemailEnabled) summaryLines.push(`   * Messagerie vocale : Active`);
      if (u.forwardEnabled && u.forwardDestination) summaryLines.push(`   * Renvoi automatique actif vers : ${u.forwardDestination}`);
    });

    setTextSummary(summaryLines.join('\n'));
  };

  const describePathFromNode = (nodeId: string, indent: string, lines: string[], visited: Set<string>) => {
    if (visited.has(nodeId)) {
      lines.push(`${indent}🔁 [BOUCLE INSERÉE / RENSEIGNEMENT DE SECURITÉ] Retour à un élément déjà traité.`);
      return;
    }
    visited.add(nodeId);

    const conns = project.connections.filter(c => c.sourceId === nodeId);
    if (conns.length === 0) {
      lines.push(`${indent}🛑 [FIN DU FLUX - Pas d'aiguillage sortant]`);
      return;
    }

    conns.forEach(conn => {
      const target = project.nodes.find(n => n.id === conn.targetId);
      if (!target) return;

      const meta = NODE_METADATA[target.type];
      let details = '';
      
      if (target.type === 'user_station') {
        details = `Poste ${target.properties.internalNumber || ''} de ${target.properties.userName || target.name}`;
      } else if (target.type === 'voicemail') {
        details = `Messagerie ${target.properties.internalNumber || ''} (audio: ${target.properties.audioMessageName || 'standard'})`;
      } else if (target.type === 'ivr') {
        details = `Menu Serveur Vocal (SVI) "${target.name}"`;
      } else if (target.type === 'transfer' || target.type.startsWith('forward_')) {
        details = `Redirection vers ${target.properties.forwardDestination || 'Inconnu'}`;
      } else if (target.type === 'day_night') {
        details = `Plan horaires (${target.properties.timeSchedule || '24h'})`;
      } else if (target.properties.number) {
        details = `Numéro ${target.properties.number}`;
      } else {
        details = `${target.name}`;
      }

      lines.push(`${indent}➔ [Option: ${conn.label}] ⇨ ${meta?.label || target.type} : ${details}`);
      describePathFromNode(target.id, indent + '   ', lines, new Set(visited));
    });
  };

  // Trigger browser print action
  const handlePrint = () => {
    window.print();
  };

  // Call simulator step controller
  const startSimulation = () => {
    if (!selectedIncomingNodeId) {
      alert("Veuillez sélectionner un numéro d'arrivée pour démarrer l'appel.");
      return;
    }
    const nodeObj = project.nodes.find(n => n.id === selectedIncomingNodeId);
    if (!nodeObj) return;

    setSimActive(true);
    setSimCurrentNodeId(nodeObj.id);
    setSimStepsCount(1);
    setSimLogs([`[08:29] 📞 Appel Téléphonique entrant sur la SDA : ${nodeObj.properties.number || 'Numéro principal'} (${nodeObj.name})`]);
  };

  const advanceSimulation = (targetNodeId: string, labelUsed: string) => {
    const targetNode = project.nodes.find(n => n.id === targetNodeId);
    if (!targetNode) return;

    setSimCurrentNodeId(targetNode.id);
    setSimStepsCount(prev => prev + 1);
    
    let logMsg = `➔ Aiguillage [${labelUsed}] : Direction le bloc "${targetNode.name}"`;
    
    if (labelUsed.toLowerCase().includes('externe')) {
      logMsg += ` (Désigné spécifiquement pour numéros Externes)`;
    } else if (labelUsed.toLowerCase().includes('interne')) {
      logMsg += ` (Désigné spécifiquement pour appels Internes)`;
    }
    
    // Append specific functional simulation messages
    if (targetNode.type === 'user_station') {
      logMsg += ` ⇨ Le poste de ${targetNode.properties.userName || 'l\'agent'} (Interne ${targetNode.properties.internalNumber}) se met à sonner...`;
    } else if (targetNode.type === 'voicemail') {
      logMsg += ` ⇨ Message vocal d'absence diffusé ("${targetNode.properties.audioMessageName || 'accueil.wav'}"). L'appelant peut laisser un message.`;
    } else if (targetNode.type === 'ivr') {
      logMsg += ` ⇨ Diffusion du menu interactif vocal SVI : "${targetNode.properties.audioMessageName || 'svi.wav'}". Choix clavier disponible.`;
    } else if (targetNode.type === 'day_night') {
      logMsg += ` ⇨ Vérification des plages horaires d'ouverture : ${targetNode.properties.timeSchedule || '8h30-18h'}.`;
    } else if (targetNode.type.startsWith('forward_')) {
      logMsg += ` ⇨ Renvoi d'appel automatique activé vers : ${targetNode.properties.forwardDestination || 'destination'}.`;
    } else if (targetNode.type === 'hangup') {
      logMsg += ` ⇨ 🛑 Appel raccroché de façon automatique / Fin d'appel planifiée.`;
    }

    setSimLogs(prev => [...prev, logMsg]);
  };

  const resetSimulation = () => {
    setSimActive(false);
    setSimCurrentNodeId('');
    setSimLogs([]);
    setSimStepsCount(0);
  };

  const activeSimNode = project.nodes.find(n => n.id === simCurrentNodeId);
  const activeSimNodeMeta = activeSimNode ? NODE_METADATA[activeSimNode.type] : null;
  const availableSimOutlets = activeSimNode
    ? project.connections.filter(c => c.sourceId === activeSimNode.id)
    : [];

  return (
    <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-transparent select-none animate-fade-in" id="preview-section-panel">
      {/* View Sidebar Selector - Printable ignored */}
      <div className="w-full lg:w-72 bg-white/40 backdrop-blur-md border-b lg:border-b-0 lg:border-r border-white/20 p-5 flex flex-col justify-between shrink-0 select-none print:hidden">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Aperçus & Rapports</h3>
            <p className="text-xs text-slate-500 mt-1">Examinez le schéma sous forme de contrat commercial, de fiche d'intervention ou testez-le avec notre émulateur d'appels.</p>
          </div>

          <div className="space-y-1">
            <button
              id="btn-view-client"
              onClick={() => setActiveView('client')}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeView === 'client' ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-2">
                <ClipboardCheck size={15} />
                <span>Vue Client (Simplifiée)</span>
              </span>
              <Check size={12} className={activeView === 'client' ? 'text-white' : 'text-transparent'} />
            </button>

            <button
              id="btn-view-tech"
              onClick={() => setActiveView('tech')}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeView === 'tech' ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-2">
                <Sliders size={15} />
                <span>Vue Technicien (Détaillée)</span>
              </span>
              <Check size={12} className={activeView === 'tech' ? 'text-white' : 'text-transparent'} />
            </button>

            <button
              id="btn-view-incoming"
              onClick={() => setActiveView('incoming')}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeView === 'incoming' ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText size={15} />
                <span>Vue par Numéro Entrant</span>
              </span>
              <Check size={12} className={activeView === 'incoming' ? 'text-white' : 'text-transparent'} />
            </button>

            <button
              id="btn-view-station"
              onClick={() => setActiveView('station')}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeView === 'station' ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-2">
                <User size={15} />
                <span>Vue par Poste Utilisateur</span>
              </span>
              <Check size={12} className={activeView === 'station' ? 'text-white' : 'text-transparent'} />
            </button>

            <button
              id="btn-view-schema-only"
              onClick={() => setActiveView('schema_only')}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeView === 'schema_only' ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-2">
                <Layers size={15} />
                <span>Vue Schéma Uniquement</span>
              </span>
              <Check size={12} className={activeView === 'schema_only' ? 'text-white' : 'text-transparent'} />
            </button>

            <button
              id="btn-view-simulator"
              onClick={() => setActiveView('simulator')}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeView === 'simulator' ? 'bg-[#2563eb] text-white hover:bg-blue-600 shadow-md shadow-blue-500/10' : 'bg-amber-100/50 text-amber-900 hover:bg-amber-100/80 hover:border-amber-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <Activity size={15} />
                <span>Simulateur d'Appel Interactif</span>
              </span>
              <Play size={10} className="fill-current text-current font-bold" />
            </button>
          </div>
        </div>

        {/* Print instructions */}
        <div className="pt-6 border-t border-slate-100 hidden lg:block">
          <button
            onClick={handlePrint}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer"
          >
            <Printer size={14} />
            <span>Imprimer ou PDF (Ctrl+P)</span>
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-2">La mise en page s'adapte automatiquement à l'impression.</p>
        </div>
      </div>

      {/* Primary preview documents stage container */}
      <div className="flex-1 overflow-auto p-6 bg-slate-100 print:bg-white print:p-0">
        
        {/* VIEW 1: CLIENT VIEW REPORT (PRINT READY) */}
        {activeView === 'client' && (
          <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-4xl mx-auto shadow-sm space-y-8 print:border-none print:shadow-none" id="preview-client-doc">
            {/* Report Header Logo box */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-6">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-emerald-600 font-extrabold font-mono">Maquette d'Architecture Validée</span>
                <h1 className="text-2xl font-black text-slate-950 mt-1 uppercase">PLAN DE CONFIGURATION TÉLÉPHONIQUE</h1>
                <p className="text-xs text-slate-500 mt-1">Maquette fonctionnelle vulgarisée rédigée pour le client : <b>{project.clientName || 'Acme Corp'}</b></p>
              </div>
              <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200/60 text-right select-none">
                <div className="text-xs font-extrabold uppercase tracking-wide">Document Client</div>
                <div className="text-[10px] text-emerald-600 mt-1 font-semibold">{project.projectName}</div>
              </div>
            </div>

            {/* Quick presentation stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Client de l'Offre</span>
                <span className="text-sm font-bold text-slate-800 mt-1 block">{project.clientName || 'Non désigné'}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Site d'Installation</span>
                <span className="text-sm font-bold text-slate-800 mt-1 block">{project.siteName || 'Non désigné'}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Administrateur Télécom</span>
                <span className="text-sm font-bold text-slate-800 mt-1 block">{project.author || 'Technicien Privé'}</span>
              </div>
            </div>

            {/* Read-only vector flowchart schema for PDF/Image Approval */}
            <FlowchartReadonlyVisual project={project} />

            {/* Flowchart list plain english */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wide">
                🧭 Comment sont redirigés vos numéros de téléphone principal :
              </h3>
              
              <div className="space-y-3.5">
                {project.nodes.filter(n => n.type === 'sda' || n.type === 'incoming_num').map(node => (
                  <div key={node.id} className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/10">
                    <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm mb-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>Numéro direct : {node.properties.number || 'non configuré'} ({node.name})</span>
                    </div>
                    {node.properties.clientComment ? (
                      <p className="text-xs text-slate-600 italic pl-5">« {node.properties.clientComment} »</p>
                    ) : (
                      <p className="text-xs text-slate-400 pl-5 italic">Aucune note explicative rédigée pour le client.</p>
                    )}

                    {/* Next step translation */}
                    <div className="mt-3.5 pl-5 space-y-2 border-l-2 border-emerald-200">
                      {project.connections.filter(c => c.sourceId === node.id).map(conn => {
                        const target = project.nodes.find(n => n.id === conn.targetId);
                        if (!target) return null;
                        return (
                          <div key={conn.id} className="text-xs flex items-start gap-2 text-slate-700 leading-normal">
                            <span className="text-teal-600 font-extrabold shrink-0">↳ [{conn.label}] ⇨</span>
                            <div>
                              <span><b>{target.name}</b></span>
                              {target.properties.clientComment && (
                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">« {target.properties.clientComment} »</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary list of clients devices IP Phones */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wide">
                💻 Vos Téléphones de Bureaux et Utilisateurs :
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.users.map(u => (
                  <div key={u.id} className="p-4 rounded-xl border border-slate-150/80 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                      <span className="font-extrabold text-slate-800 text-xs">{u.name} (Poste {u.internalNumber})</span>
                      <span className="text-[9px] font-bold bg-blue-50 border border-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        {u.phoneModel}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 space-y-1">
                      {u.sdaId && <div>• Numéro rattaché direct : <span className="font-mono text-slate-700 font-bold">{u.sdaId}</span></div>}
                      <div>• Type de matériel : {u.stationType === 'IP' ? 'Téléphone IP Fixe de Bureau' : u.stationType === 'DECT' ? 'Téléphone Sans Fil DECT' : u.stationType === 'Softphone' ? 'Logiciel sur Ordinateur' : 'Poste Analogique habituel'}</div>
                      {u.voicemailEnabled && <div className="text-emerald-700 font-medium">• Boîte vocale d'absence active</div>}
                      {u.forwardEnabled && u.forwardDestination && <div className="text-indigo-700 font-medium">• Renvoi actif automatique vers : {u.forwardDestination}</div>}
                      {u.comment && <div className="text-[10px] italic text-slate-400 mt-1.5">Note: {u.comment}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Signature Box (For client approval stamp) */}
            <div className="grid grid-cols-2 gap-6 pt-12 border-t border-slate-200 select-none">
              <div className="p-4 border border-dashed border-slate-200 bg-slate-50/20 rounded-xl flex flex-col justify-between h-36">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Cachet et Visa du Client (Bon pour accord) :</span>
                <div className="text-slate-300 text-xs italic">Date de signature : ______ / ______ / 20__</div>
              </div>
              <div className="p-4 border border-dashed border-slate-200 bg-slate-50/20 rounded-xl flex flex-col justify-between h-36">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Visa Technicien Télécom validateurs :</span>
                <div className="text-emerald-600 text-xs font-extrabold flex items-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span>Configurable vérifié et conforme pour livraison</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: TECHNICIAN FULL DETAILED TRUNKS & CONFIG BLUEPRINT (PRINT READY) */}
        {activeView === 'tech' && (
          <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-4xl mx-auto shadow-sm space-y-8 print:border-none print:shadow-none" id="preview-tech-doc">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-6">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-blue-600 font-mono">Dossier d'Exploitation Technique - Commutateur Vox/VoIP</span>
                <h1 className="text-2xl font-black text-slate-900 mt-1">SPÉCIFICATIONS D'INSTALLATION ET ROUTAGES</h1>
                <p className="text-xs text-slate-500 mt-1">Règles techniques, Trunks, renvois, délais d'astreinte SIP.</p>
              </div>
              <div className="bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-200/60 text-right select-none">
                <div className="text-xs font-extrabold uppercase">Fiche Exploitation</div>
                <div className="text-[10px] text-blue-600 mt-1 font-mono font-bold">PORT INGRESS 3000</div>
              </div>
            </div>

            {/* Trunks section */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-500">I. CONFIGURATION DU TRUNK SIP (ENTREPRISES LIAISONS)</h3>
              <div className="bg-slate-900 rounded-xl overflow-hidden text-slate-200 border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 font-bold text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                      <th className="p-3">NDI Pilote</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Canaux Simultanés</th>
                      <th className="p-3">Opérateur Partenaire</th>
                      <th className="p-3">Observations d'exploitation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-[11px] font-mono">
                    {project.lines.map(line => (
                      <tr key={line.id} className="hover:bg-slate-900/60">
                        <td className="p-3 font-bold text-white">{line.ndi}</td>
                        <td className="p-3 text-slate-300">{line.type}</td>
                        <td className="p-3 text-teal-400 font-black">{line.channels} CH</td>
                        <td className="p-3 text-slate-300">{line.provider}</td>
                        <td className="p-3 text-slate-400 font-sans">{line.comment || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Read-only vector flowchart schema for IP Configuration & Astreinte */}
            <FlowchartReadonlyVisual project={project} />

            {/* Diagram list with technical notes */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-500">II. TABLE DE ROUTAGE ET PARAMETRES DES BLOCS TELECOM</h3>
              <div className="space-y-2">
                {project.nodes.map(node => {
                  const meta = NODE_METADATA[node.type];
                  return (
                    <div key={node.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{node.name}</span>
                          <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                            {meta?.label || node.type}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">Node-UUID: #{node.id}</span>
                      </div>
                      
                      {/* Technical internal characteristics */}
                      <div className="grid grid-cols-2 gap-4 text-xs mt-2 text-slate-600">
                        <div className="space-y-1">
                          {node.properties.number && <div>• <b>Numéro externe :</b> <span className="font-mono">{node.properties.number}</span></div>}
                          {node.properties.internalNumber && <div>• <b>Code d'extension interne :</b> <span className="font-mono font-bold text-indigo-700">{node.properties.internalNumber}</span></div>}
                          
                          {/* Equipment & Matériel */}
                          {node.properties.phoneBrand && (
                            <div>• <b>Équipement :</b> {node.properties.phoneBrand} {node.properties.phoneModel === 'custom_input' ? node.properties.phoneModelCustom : node.properties.phoneModel} 
                              {node.properties.phoneType && <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded ml-1 uppercase">{node.properties.phoneType}</span>}
                            </div>
                          )}
                          {node.properties.macAddress && <div>• <b>Adresse MAC :</b> <span className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">{node.properties.macAddress}</span></div>}
                          {node.properties.associatedSda && <div>• <b>SDA Rattachée :</b> <span className="font-mono">{node.properties.associatedSda}</span></div>}
                          {node.properties.outgoingCallerId && <div>• <b>N° Sortant Présenté :</b> <span className="font-mono">{node.properties.outgoingCallerId}</span></div>}
                          {node.properties.siteName && <div>• <b>Site :</b> {node.properties.siteName} {node.properties.serviceName && <span>({node.properties.serviceName})</span>}</div>}
                          
                          {/* DECT fields */}
                          {node.properties.phoneType === 'DECT' && (node.properties.dectBaseModel || node.properties.dectHandsetModel) && (
                            <div className="text-[11px] bg-indigo-50 text-indigo-950 p-1.5 rounded border border-indigo-100 mt-1">
                              <strong>Base DECT:</strong> {node.properties.dectBaseModel || 'N/A'} | <strong>Combiné:</strong> {node.properties.dectHandsetModel || 'N/A'}
                            </div>
                          )}

                          {/* Accessories */}
                          {node.properties.hasExtensionModule && node.properties.hasExtensionModule !== "aucun module d'extension" && (
                            <div>• <b>Module DSS :</b> {node.properties.hasExtensionModule} ({node.properties.extensionModuleModel === 'module personnalisé' ? node.properties.extensionModuleCustom : node.properties.extensionModuleModel})</div>
                          )}
                          {node.properties.hasHeadset && node.properties.hasHeadset !== 'aucun casque' && (
                            <div>• <b>Casque audio :</b> {node.properties.hasHeadset} ({node.properties.headsetBrand} {node.properties.headsetModel})</div>
                          )}

                          {node.properties.delayBeforeForward && <div>• <b>Délai / Tempisation d'attente (s) :</b> <span className="font-mono text-rose-700 font-black">{node.properties.delayBeforeForward} sec</span></div>}
                          {node.properties.forwardDestination && <div>• <b>Cible de débordement / d'aiguillage :</b> <span className="font-mono font-bold text-violet-700">{node.properties.forwardDestination}</span></div>}
                        </div>
                        <div className="space-y-1">
                          {node.properties.timeSchedule && <div>• <b>Plage horaire d'ouverture :</b> <span className="font-mono text-amber-800">{node.properties.timeSchedule}</span></div>}
                          {node.properties.audioMessageName && <div>• <b>Prompt Fichier Audio .wav :</b> <span className="font-mono text-rose-800 truncate block">{node.properties.audioMessageName}</span></div>}
                          {node.properties.emergencyActive !== undefined && <div>• <b>Scénario d'urgence forcé :</b> <span className="font-bold text-rose-600">{node.properties.emergencyActive ? 'OUI (Routage Forcé)' : 'NON (Mode normal)'}</span></div>}
                          
                          {/* target platform */}
                          {(node.properties.targetPlatform || node.properties.configMethod) && (
                            <div>• <b>Plateforme Telecom :</b> <b className="text-blue-700">{node.properties.targetPlatform === 'Autre' ? node.properties.targetPlatformCustom : node.properties.targetPlatform}</b> {node.properties.configMethod && <span>via <i>{node.properties.configMethod}</i></span>}</div>
                          )}

                          {/* dynamic status */}
                          {node.properties.nodeStatus && (
                            <div>• <b>État Dynamique :</b> <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-850 border border-teal-200">{node.properties.nodeStatusCustom || node.properties.nodeStatus}</span></div>
                          )}

                          {/* forward configuration type */}
                          {node.properties.forwardType && node.properties.forwardType !== 'none' && (
                            <div className="mt-1 bg-violet-50 text-violet-950 p-1.5 rounded border border-violet-100 text-[11px]">
                              <b>Modes de Renvoi :</b> <span className="uppercase font-bold text-violet-850">{node.properties.forwardType === 'manual' ? 'Manuel' : 'Programmé / Temporel'}</span>
                              {node.properties.forwardPriority && <span className="ml-2 font-mono text-indigo-700">(Prio: {node.properties.forwardPriority})</span>}
                              {node.properties.priorityLevel && <span className="ml-1 text-[9px] bg-red-100 border border-red-200 text-red-700 px-1 rounded uppercase font-bold">{node.properties.priorityLevel}</span>}
                              {node.properties.forwardType === 'manual' && node.properties.manualForwardTrigger && (
                                <div className="mt-1 text-[10px] text-slate-500">▶ Déclencheur: <i>{node.properties.manualForwardTrigger}</i></div>
                              )}
                            </div>
                          )}

                          {/* Key Switch */}
                          {node.properties.keyConfig && (
                            <div className="mt-1 bg-amber-50 text-amber-950 p-1.5 rounded border border-amber-200 text-[11px] space-y-0.5">
                              <span className="font-bold text-[9px] text-amber-850 uppercase block">🔑 TOUCHE PHYSIQUE / BLF / DSS</span>
                              <div><b>Nom :</b> {node.properties.keyConfig.keyName || 'Sans libellé'} | <b>Type :</b> {node.properties.keyConfig.keyType}</div>
                              {node.properties.keyConfig.functionCode && <div><b>Code :</b> <code className="font-mono bg-white px-1 border border-slate-200 rounded">{node.properties.keyConfig.functionCode}</code></div>}
                              {node.properties.keyConfig.concernedPost && <div><b>Poste visé :</b> {node.properties.keyConfig.concernedPost}</div>}
                              {node.properties.keyConfig.actionTriggered && <div><b>Action :</b> {node.properties.keyConfig.actionTriggered}</div>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Technical comment */}
                      {node.properties.techComment && (
                        <div className="mt-3 bg-blue-50/50 border border-blue-100 p-2.5 rounded text-[11px] text-blue-900 leading-normal">
                          <b>NOTE INTEGRATEUR SYSTÈME :</b> {node.properties.techComment}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Diagnostic system list print */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-500">III. RAPPORT DE CONTROLE QUALITÉ & ERREURS</h3>
              <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/20 text-xs text-slate-600">
                {validationAlerts.length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-700 font-extrabold">
                    <Check size={16} className="text-emerald-500 shrink-0" />
                    <span>ZÉRO ERREUR TECHNIQUE CONSTATÉE. Le scénario est validé pour déploiement sur Asterisk/Xivo/PABX Cloud.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <span className="text-rose-700 font-extrabold flex items-center gap-1.5">
                      <AlertTriangle size={15} />
                      ATTENTION : {validationAlerts.length} avertissements techniques nuisibles au déploiement ont été relevés :
                    </span>
                    <ul className="list-disc list-inside space-y-1 pl-4">
                      {validationAlerts.map((a, i) => (
                        <li key={i} className="text-slate-700 font-medium">
                          Bloc <span className="font-bold">"{project.nodes.find(n => n.id === a.nodeId)?.name || 'N/A'}"</span>: {a.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: VIEW BY INCOMING PHONE NUMBER (FILTERING) */}
        {activeView === 'incoming' && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-4xl mx-auto shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Visualisation par numéro d'accès SDA</h3>
              <p className="text-xs text-slate-500 mt-1">Sélectionnez une SDA pour voir la suite des raccordements associés.</p>
            </div>

            <div className="flex items-center gap-2.5">
              <label className="text-xs font-bold text-slate-700 shrink-0">Choisir une SDA :</label>
              <select
                value={filterSDA}
                onChange={(e) => setFilterSDA(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none w-64 font-mono font-bold"
                id="select-filter-sda"
              >
                <option value="">-- Sélectionnez une SDA --</option>
                {project.nodes.filter(n => n.type === 'sda' || n.type === 'incoming_num').map(n => (
                  <option key={n.id} value={n.id}>{n.properties.number || 'Inconnu'} - {n.name}</option>
                ))}
              </select>
            </div>

            {filterSDA ? (
              (() => {
                const sdaNode = project.nodes.find(n => n.id === filterSDA);
                if (!sdaNode) return null;
                
                // Track visited nodes to prevent loop crash inside renderer
                const renderedVisited = new Set<string>();

                const renderStepLine = (nodeId: string, depth = 0) => {
                  if (renderedVisited.has(nodeId)) {
                    return (
                      <div className="pl-4 border-l border-red-300 py-1 text-[11px] text-red-600 font-mono">
                        🔁 [ERREUR SYSTEME] Boucle d'appel infinie détectée ! Le scénario va planter.
                      </div>
                    );
                  }
                  renderedVisited.add(nodeId);

                  const activeNode = project.nodes.find(n => n.id === nodeId);
                  if (!activeNode) return null;
                  const meta = NODE_METADATA[activeNode.type];

                  const childConnections = project.connections.filter(c => c.sourceId === nodeId);

                  return (
                    <div className="space-y-4">
                      {/* Row block style representing active step */}
                      <div className="flex items-center gap-3.5 p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 max-w-2xl shadow-xs">
                        <div className="p-2 bg-white rounded border border-slate-300 font-bold shrink-0">
                          <Layers size={16} className="text-slate-600" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-xs">{activeNode.name}</div>
                          <div className="text-[10px] text-slate-500">
                            Type: <span className="font-semibold text-slate-700">{meta?.label || activeNode.type}</span>
                            {activeNode.properties.internalNumber && ` | Interne : ${activeNode.properties.internalNumber}`}
                            {activeNode.properties.audioMessageName && ` | Audio : ${activeNode.properties.audioMessageName}`}
                          </div>
                        </div>
                      </div>

                      {/* Output paths mapping */}
                      {childConnections.length > 0 && (
                        <div className="pl-6 space-y-4 border-l-2 border-slate-350">
                          {childConnections.map(conn => {
                            const targetId = conn.targetId;
                            return (
                              <div key={conn.id} className="space-y-2">
                                <div className="text-[10px] font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 inline-block">
                                  Option: {conn.label}
                                </div>
                                {renderStepLine(targetId, depth + 1)}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <div className="space-y-6 pt-4 border-t border-slate-100 select-none">
                    <h4 className="text-xs font-bold uppercase text-slate-400">Arbre d'aiguillage de l'appel :</h4>
                    {renderStepLine(filterSDA)}
                  </div>
                );
              })()
            ) : (
              <div className="p-8 text-center italic text-slate-400 text-xs">Veuillez désigner un numéro d'accès ci-dessus.</div>
            )}
          </div>
        )}

        {/* VIEW 4: VIEW VIA INDIVIDUAL PHONE STATION / USER */}
        {activeView === 'station' && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-4xl mx-auto shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Visualisation par poste d'utilisateur</h3>
              <p className="text-xs text-slate-500 mt-1">Voyez instantanément quels flux du schéma général débouchent sur un poste en particulier.</p>
            </div>

            <div className="flex items-center gap-2.5">
              <label className="text-xs font-bold text-slate-700 shrink-0">Choisir un poste :</label>
              <select
                value={filterStation}
                onChange={(e) => setFilterStation(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none w-64"
                id="select-filter-station"
              >
                <option value="">-- Sélectionnez un Poste --</option>
                {project.nodes.filter(n => n.type === 'user_station' || n.type === 'switchboard').map(n => (
                  <option key={n.id} value={n.id}>{n.name} (Interne {n.properties.internalNumber || 'ext'})</option>
                ))}
              </select>
            </div>

            {filterStation ? (
              (() => {
                const targetNode = project.nodes.find(n => n.id === filterStation);
                if (!targetNode) return null;

                // Find incoming routes to this target station
                const parentsConnections: string[] = [];
                
                // Breadth first or simple traverse
                const findPathsTo = (nodeId: string, currentPath: string[]) => {
                  if (nodeId === targetNode.id) {
                    parentsConnections.push(currentPath.join(' ➔ '));
                    return;
                  }
                  
                  // Avoid infinite loops
                  if (currentPath.length > 8) return;

                  const conns = project.connections.filter(c => c.sourceId === nodeId);
                  conns.forEach(c => {
                    const src = project.nodes.find(n => n.id === nodeId);
                    findPathsTo(c.targetId, [...currentPath, `${src?.name} [${c.label}]`]);
                  });
                };

                // Root nodes to scan paths from
                const roots = project.nodes.filter(n => n.type === 'sda' || n.type === 'incoming_num');
                roots.forEach(r => findPathsTo(r.id, [r.name]));

                return (
                  <div className="space-y-4 pt-4 border-t border-slate-100 select-none">
                    <h4 className="text-xs font-bold uppercase text-slate-400">Flux menant à ce poste :</h4>
                    {parentsConnections.length === 0 ? (
                      <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded border border-rose-100">
                        ⚠️ Ce poste n'est relié à aucun numéro d'accès direct ni SVI. Il est impossible pour un client externe de le joindre en l'état actuel !
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {parentsConnections.map((pathStr, i) => (
                          <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                            <span className="font-medium text-slate-700 font-mono">{pathStr} ➔ <b className="text-slate-900">{targetNode.name}</b></span>
                            <div className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                              Actif
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="p-8 text-center italic text-slate-400 text-xs">Veuillez désigner un poste ci-dessus.</div>
            )}
          </div>
        )}

        {/* VIEW 5: INTERACTIVE SIMULATOR EMULATOR (STUNNING EXTRA CUSTOM ELEMENT) */}
        {activeView === 'simulator' && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-4xl mx-auto shadow-sm space-y-6" id="preview-simulator-panel">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-950 flex items-center gap-2">
                <Activity size={20} className="text-amber-500 animate-pulse" />
                ÉMULATEUR ET SIMULATEUR DE FLUX TÉLÉCOMS
              </h3>
              <p className="text-xs text-slate-505 mt-1 leading-normal">
                Testez vos routages en conditions réelles : lancez un appel sur l'un de vos numéros et choisissez à chaque aiguillage interactif l'option ou la condition simulée pour tracer pas à pas le parcours de l'appelant.
              </p>
            </div>

            {!simActive ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 max-w-xl mx-auto text-left select-none">
                <h4 className="text-xs font-bold uppercase text-slate-700">DÉMARRER UN TEST D’APPEL SVI & ASTREINTE :</h4>
                
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Choisissez le numéro d'appel sortant à tester :</label>
                  <select
                    value={selectedIncomingNodeId}
                    onChange={(e) => setSelectedIncomingNodeId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-xs text-slate-800 focus:outline-none font-bold"
                  >
                    <option value="">-- Sélectionnez une entrée --</option>
                    {project.nodes.filter(n => n.type === 'sda' || n.type === 'incoming_num').map(n => (
                      <option key={n.id} value={n.id}>{n.properties.number || '01XXXX'} - {n.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  id="btn-trigger-simulator"
                  onClick={startSimulation}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-lg text-xs select-none cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  <Play size={14} className="fill-current" />
                  <span>LANCER L'APPEL SIMULÉ</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 align-stretch">
                {/* Active step control panel */}
                <div className="md:col-span-2 p-5 border border-amber-200 bg-amber-50/20 rounded-2xl flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-amber-200/50 pb-2">
                      <span className="text-xs font-bold text-amber-900 uppercase">Étape Active de l'Appel #{simStepsCount}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-500 text-white rounded-full font-bold uppercase tracking-wider animate-pulse">Ligne Connectée</span>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                      <span className="text-[9px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase">
                        {activeSimNodeMeta?.label || 'Bloc inconnu'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{activeSimNode?.name}</h4>
                      <p className="text-xs text-slate-600 italic">« {activeSimNode?.properties.description || activeSimNode?.properties.clientComment || 'Pas de descriptif d\'explications.'} »</p>
                      
                      {activeSimNode?.properties.internalNumber && (
                        <div className="text-[11px] font-mono text-slate-500">Poste d'arrivée : <b>Ext {activeSimNode.properties.internalNumber}</b></div>
                      )}
                    </div>

                    {/* Available routes decision buttons */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">AIGUILLAGE DISPONIBLE :</span>
                      {availableSimOutlets.length === 0 ? (
                        <div className="p-4 rounded-lg bg-orange-100 text-orange-950 border border-orange-200 text-xs text-center font-bold">
                          🏁 L'appel est terminé à cette étape (renvoi externe, messagerie, ou poste final atteint).
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {availableSimOutlets.map(conn => {
                            const subTarget = project.nodes.find(n => n.id === conn.targetId);
                            return (
                              <button
                                key={conn.id}
                                onClick={() => advanceSimulation(conn.targetId, conn.label)}
                                className="p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-amber-400 rounded-xl text-left text-xs transition-all cursor-pointer flex items-center justify-between group font-semibold text-slate-700"
                              >
                                <span>Aiguiller sur : <b className="text-teal-800">[{conn.label}]</b> ⇨ {subTarget?.name}</span>
                                <ChevronRight size={14} className="text-slate-400 group-hover:text-amber-600 transition-colors" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={resetSimulation}
                    className="mt-6 w-full bg-red-600 hover:bg-red-700 active:scale-98 text-white font-extrabold py-2.5 rounded-lg text-xs cursor-pointer text-center flex items-center justify-center gap-2 shadow-md transition-all uppercase tracking-wide"
                  >
                    <PhoneOff size={13} />
                    <span>Raccrocher / Fin d'appel</span>
                  </button>
                </div>

                {/* Display active call log history terminal */}
                <div className="p-4 bg-slate-950 border border-slate-900 rounded-2xl flex flex-col justify-between text-left font-mono">
                  <div className="space-y-3 overflow-y-auto max-h-[300px] scrollbar-thin">
                    <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest block">📝 LOGS COMMUTATEUR EN TEMPS RÉEL</span>
                    <div className="space-y-2 text-[11px] text-teal-300">
                      {simLogs.map((log, i) => (
                        <div key={i} className="leading-snug">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-4 border-t border-slate-800 pt-3 text-[10px] text-slate-400 text-center uppercase tracking-wider font-extrabold flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>TRACE EN COURS VIA SIM_01_AST</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 6: SCHEMA ONLY (HIGH DEFINITION VIEW + DOWNLOAD SVG/PNG) */}
        {activeView === 'schema_only' && (
          <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-5xl mx-auto shadow-sm space-y-6" id="preview-schema-only-panel">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-950 uppercase flex items-center gap-2">
                <Layers size={20} className="text-emerald-600" />
                Dossier Graphique - Vue Schéma Uniquement
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-normal">
                Examinez le schéma d'acheminement télécom de votre projet dans sa forme la plus épurée. Vous pouvez le télécharger ci-dessous en haute résolution vectorielle (.SVG) ou image (.PNG) pour vos dossiers.
              </p>
            </div>

            <FlowchartReadonlyVisual project={project} showDownload={true} />

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-650 space-y-2">
              <span className="font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                💡 Recommandations et Qualité d'Exportation :
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-500 pl-2">
                <li>Le format <b className="text-slate-800">SVG Vectoriel</b> offre une résolution infinie sans aucune pixelisation. Idéal pour l'impression haute définition, les intégrations PDF professionnelles ou vos présentations techniques.</li>
                <li>Le format <b className="text-slate-800">PNG HD</b> est exporté avec un facteur d'échelle à double densité (2.5x), garantissant une netteté cristalline sur toutes les liseuses d'images standard ou documents bureautiques Microsoft Word / PPT.</li>
                <li>Vous pouvez ajuster l'affichage (horizontal, vertical, manuel) et le niveau de détail (client détaillé, simplifié) en temps réel via la barre de filtres du logigramme pour adapter votre téléchargement.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Text Summarizer (Universal generated textbox) - Printable ignored */}
        {activeView !== 'simulator' && activeView !== 'schema_only' && (
          <div className="bg-slate-900 border border-slate-950 p-6 rounded-2xl max-w-4xl mx-auto shadow-sm text-left mt-8 print:hidden select-none">
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-teal-400 mb-2">📄 TRANCRIPTION ET RESUMÉ TEXTUEL AUTOMATIQUE</h3>
            <p className="text-[11px] text-slate-400 mb-4 leading-normal">
              Ci-dessous, retrouvez l'explication verbale textuelle du scénario, générée à la volée. Copiez ce rapport directement pour l'ajouter à vos devis, cahiers de charges ou récapitulatifs d'emails clients.
            </p>
            <textarea
              id="textarea-text-summary"
              rows={11}
              readOnly
              value={textSummary}
              className="w-full bg-slate-950/80 border border-slate-800 text-teal-200/90 rounded-lg p-3 text-xs font-mono select-all focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}
