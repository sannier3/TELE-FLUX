/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Trash2, 
  Settings, 
  HelpCircle, 
  Link2, 
  AlertTriangle, 
  Plus, 
  MousePointer, 
  X,
  Volume2,
  Clock,
  User,
  Users,
  Layers,
  Smartphone,
  PhoneIncoming,
  PhoneOutgoing,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { CallNode, Connection, NodeType } from '../types';
import { NODE_METADATA } from '../utils/templates';

interface WorkspaceProps {
  nodes: CallNode[];
  connections: Connection[];
  selectedNodeId: string | null;
  selectedNodeIds?: string[];
  onSelectNode: (id: string | null) => void;
  onSelectNodes?: (ids: string[]) => void;
  onUpdateNodeCoords: (id: string, x: number, y: number) => void;
  onUpdateNodesCoords?: (updates: { id: string; x: number; y: number }[]) => void;
  onDeleteNode: (id: string) => void;
  onAddConnection: (sourceId: string, targetId: string, label: string) => void;
  onDeleteConnection: (id: string) => void;
  onUpdateConnectionLabel: (id: string, label: string, labels?: string[]) => void;
  validationAlerts: { id: string; type: 'error' | 'warning'; message: string; nodeId?: string }[];
  onLoadDemo?: () => void;
  onDragStart?: () => void;
}

export default function Workspace({
  nodes,
  connections,
  selectedNodeId,
  selectedNodeIds = [],
  onSelectNode,
  onSelectNodes,
  onUpdateNodeCoords,
  onUpdateNodesCoords,
  onDeleteNode,
  onAddConnection,
  onDeleteConnection,
  onUpdateConnectionLabel,
  validationAlerts,
  onLoadDemo,
  onDragStart
}: WorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasMovedNode = useRef(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [initialDragPositions, setInitialDragPositions] = useState<{ [id: string]: { x: number; y: number } }>({});
  const [dragStartMouse, setDragStartMouse] = useState({ x: 0, y: 0 });
  const [drawingConnSourceId, setDrawingConnSourceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // States for standard drag multiselect box (Windows style)
  const [selectionBoxStart, setSelectionBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionBoxCurrent, setSelectionBoxCurrent] = useState<{ x: number; y: number } | null>(null);
  const [initialSelectedIdsAtBoxStart, setInitialSelectedIdsAtBoxStart] = useState<string[]>([]);
  const isSelectionBoxDragging = useRef(false);

  // Tooltip Prolonged Hover State and Timer
  const [hoveredNode, setHoveredNode] = useState<CallNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const hoverTimerRef = useRef<any>(null);

  // Handle keys like Escape to abort connection drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawingConnSourceId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleWorkspaceClick = (e: React.MouseEvent) => {
    if (isSelectionBoxDragging.current) {
      isSelectionBoxDragging.current = false;
      return;
    }

    if (
      e.target === containerRef.current || 
      (e.target as HTMLElement).id === 'grid-svg' || 
      (e.target as HTMLElement).id === 'grid-canvas-stage'
    ) {
      if (onSelectNodes) {
        onSelectNodes([]);
      } else {
        onSelectNode(null);
      }
      setDrawingConnSourceId(null);
    }
  };

  const handleNodeMouseEnter = (e: React.MouseEvent, node: CallNode) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    
    const rect = containerRef.current?.getBoundingClientRect();
    const x = e.clientX - (rect?.left || 0) + (containerRef.current?.scrollLeft || 0);
    const y = e.clientY - (rect?.top || 0) + (containerRef.current?.scrollTop || 0);
    
    hoverTimerRef.current = setTimeout(() => {
      setHoveredNode(node);
      setTooltipPos({ x: x + 15, y: y + 15 });
    }, 600);
  };

  const handleNodeMouseMove = (e: React.MouseEvent) => {
    if (hoveredNode) {
      const rect = containerRef.current?.getBoundingClientRect();
      const x = e.clientX - (rect?.left || 0) + (containerRef.current?.scrollLeft || 0);
      const y = e.clientY - (rect?.top || 0) + (containerRef.current?.scrollTop || 0);
      setTooltipPos({ x: x + 15, y: y + 15 });
    }
  };

  const handleNodeMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredNode(null);
  };

  const getTooltipContent = (node: CallNode) => {
    const list: { label: string; value: string }[] = [];
    const props = node.properties || {};
    
    if (node.name) list.push({ label: "Nom du nœud", value: node.name });
    if (props.description) list.push({ label: "Description", value: props.description });
    if (props.internalNumber) list.push({ label: "N° Interne", value: props.internalNumber });
    if (props.number) list.push({ label: "N° Téléphonique", value: props.number });
    if (props.associatedSda) list.push({ label: "SDA rattachée", value: props.associatedSda });
    if (props.outgoingCallerId) list.push({ label: "N° Sortant présenté", value: props.outgoingCallerId });
    if (props.userName) list.push({ label: "Utilisateur", value: props.userName });
    
    if (props.phoneBrand) {
      const modelStr = (!props.phoneModel || props.phoneModel === 'custom_input') ? (props.phoneModelCustom || '') : props.phoneModel;
      list.push({ label: "Téléphone", value: `${props.phoneBrand} ${modelStr}`.trim() });
    }
    if (props.phoneType) list.push({ label: "Type de poste", value: props.phoneType });
    if (props.macAddress) list.push({ label: "Adresse MAC", value: props.macAddress });
    if (props.dectBaseModel) list.push({ label: "Base DECT", value: props.dectBaseModel });
    if (props.dectHandsetModel) list.push({ label: "Combiné DECT", value: props.dectHandsetModel });
    if (props.hasExtensionModule && props.hasExtensionModule !== 'aucun module d\'extension') {
      const m = props.extensionModuleModel === 'module personnalisé' ? props.extensionModuleCustom : props.extensionModuleModel;
      list.push({ label: "Module DSS", value: m || props.hasExtensionModule });
    }
    if (props.hasHeadset && props.hasHeadset !== 'aucun casque') {
      list.push({ label: "Casque", value: `${props.headsetBrand || ''} ${props.headsetModel || ''} (${props.hasHeadset})`.trim() });
    }
    
    if (props.forwardDestination) list.push({ label: "Dest. Renvoi", value: props.forwardDestination });
    if (props.forwardType && props.forwardType !== 'none') list.push({ label: "Type Renvoi", value: props.forwardType === 'manual' ? 'Manuel' : 'Automatique/Horaire' });
    if (props.delayBeforeForward) list.push({ label: "Délai / Timeout", value: `${props.delayBeforeForward}s` });
    if (props.priorityLevel) list.push({ label: "Urgence", value: props.priorityLevel });
    if (props.nodeStatus) list.push({ label: "Statut courant", value: props.nodeStatusCustom || props.nodeStatus });
    
    if (props.audioMessageName) list.push({ label: "Message Audio", value: props.audioMessageName });
    if (props.voicemailText) list.push({ label: "Texte Messagerie", value: props.voicemailText });
    if (props.timeSchedule) list.push({ label: "Plages Horaires", value: props.timeSchedule });
    
    if (props.clientComment) list.push({ label: "Note Client", value: props.clientComment });
    if (props.techComment) list.push({ label: "Note Tech", value: props.techComment });
    
    return list;
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    const isBg = e.target === containerRef.current || 
                 (e.target as HTMLElement).id === 'grid-svg' || 
                 (e.target as HTMLElement).id === 'grid-canvas-stage';
    if (!isBg) return;

    if (drawingConnSourceId) return;

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const mouseY = e.clientY - rect.top + containerRef.current.scrollTop;

    setSelectionBoxStart({ x: mouseX, y: mouseY });
    setSelectionBoxCurrent({ x: mouseX, y: mouseY });
    isSelectionBoxDragging.current = false;

    const isShiftPressed = e.shiftKey || e.ctrlKey || e.metaKey;
    const currentSelected = [...selectedNodeIds];
    setInitialSelectedIdsAtBoxStart(isShiftPressed ? currentSelected : []);

    if (!isShiftPressed && onSelectNodes) {
      onSelectNodes([]);
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: CallNode) => {
    if (drawingConnSourceId) return; // Don't drag if drawing connection
    e.stopPropagation();
    
    let nextSelectedIds = [...selectedNodeIds];
    const isShiftPressed = e.shiftKey || e.ctrlKey || e.metaKey;
    const isAlreadySelected = nextSelectedIds.includes(node.id);

    if (isShiftPressed) {
      if (isAlreadySelected) {
        nextSelectedIds = nextSelectedIds.filter(id => id !== node.id);
      } else {
        nextSelectedIds.push(node.id);
      }
    } else {
      if (!isAlreadySelected) {
        nextSelectedIds = [node.id];
      }
    }

    if (onSelectNodes) {
      onSelectNodes(nextSelectedIds);
    } else {
      onSelectNode(node.id);
    }
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + containerRef.current.scrollLeft;
      const mouseY = e.clientY - rect.top + containerRef.current.scrollTop;
      
      setDraggingNodeId(node.id);
      setDragStartMouse({ x: mouseX, y: mouseY });

      // Save starting coordinates of ALL nodes in the selection
      const positions: { [id: string]: { x: number; y: number } } = {};
      nodes.forEach(n => {
        if (nextSelectedIds.includes(n.id)) {
          positions[n.id] = { x: n.x, y: n.y };
        }
      });
      setInitialDragPositions(positions);
      hasMovedNode.current = false;
    }
  };

  const handleWorkspaceMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const mouseY = e.clientY - rect.top + containerRef.current.scrollTop;

    // 1. Handle node dragging or multi-dragging
    if (draggingNodeId) {
      if (!hasMovedNode.current) {
        hasMovedNode.current = true;
        if (onDragStart) {
          onDragStart();
        }
      }
      const dx = mouseX - dragStartMouse.x;
      const dy = mouseY - dragStartMouse.y;

      const updates: { id: string; x: number; y: number }[] = [];

      Object.keys(initialDragPositions).forEach(id => {
        const initial = initialDragPositions[id];
        if (!initial) return;

        let nextX = initial.x + dx;
        let nextY = initial.y + dy;

        // Snapping to 10px grid
        nextX = Math.round(nextX / 10) * 10;
        nextY = Math.round(nextY / 10) * 10;

        // Keep within boundaries (prevent nodes leaking out of the bounds/screen)
        nextX = Math.max(10, Math.min(2200, nextX));
        nextY = Math.max(10, Math.min(1650, nextY));

        updates.push({ id, x: nextX, y: nextY });
      });

      if (updates.length > 0) {
        if (onUpdateNodesCoords) {
          onUpdateNodesCoords(updates);
        } else {
          updates.forEach(u => onUpdateNodeCoords(u.id, u.x, u.y));
        }
      }
    }

    // 2. Handle selection box dragging (Windows style)
    if (selectionBoxStart) {
      setSelectionBoxCurrent({ x: mouseX, y: mouseY });

      const dx = Math.abs(mouseX - selectionBoxStart.x);
      const dy = Math.abs(mouseY - selectionBoxStart.y);
      if (dx > 5 || dy > 5) {
        isSelectionBoxDragging.current = true;
      }

      const x1 = Math.min(selectionBoxStart.x, mouseX);
      const x2 = Math.max(selectionBoxStart.x, mouseX);
      const y1 = Math.min(selectionBoxStart.y, mouseY);
      const y2 = Math.max(selectionBoxStart.y, mouseY);

      // Node size representation: Width = 190, Height = 100
      const intersectedNodeIds: string[] = [];
      nodes.forEach(node => {
        const nodeLeft = node.x;
        const nodeRight = node.x + 190;
        const nodeTop = node.y;
        const nodeBottom = node.y + 100;

        const intersects = !(nodeLeft > x2 || nodeRight < x1 || nodeTop > y2 || nodeBottom < y1);
        if (intersects) {
          intersectedNodeIds.push(node.id);
        }
      });

      if (onSelectNodes) {
        const updatedSelection = new Set([...initialSelectedIdsAtBoxStart]);
        intersectedNodeIds.forEach(id => {
          updatedSelection.add(id);
        });
        onSelectNodes(Array.from(updatedSelection));
      }
    }

    // 3. Handle connection line drawing
    if (drawingConnSourceId) {
      setMousePos({ x: mouseX, y: mouseY });
    }
  };

  const handleWorkspaceMouseUp = () => {
    setDraggingNodeId(null);
    setSelectionBoxStart(null);
    setSelectionBoxCurrent(null);
    setInitialSelectedIdsAtBoxStart([]);
  };

  const triggerRepulsionAnimation = () => {
    let currentNodes = [...nodes];
    let iteration = 0;
    const maxIterations = 50;

    const step = () => {
      let moved = false;
      const updatedNodes = currentNodes.map(node => {
        let fx = 0;
        let fy = 0;

        // 1. Repulsion from other nodes
        currentNodes.forEach(other => {
          if (other.id === node.id) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          // Node standard dimensions: W=190, H=100.
          // Ideal center separation: horizontal=270, vertical=150
          if (absDx < 260 && absDy < 140) {
            const forceX = absDx < 10 ? (Math.random() - 0.5) * 8 : dx;
            const forceY = absDy < 10 ? (Math.random() - 0.5) * 8 : dy;
            const dist = Math.sqrt(forceX * forceX + forceY * forceY) || 1;
            const intensity = (260 - absDx) * 0.2;
            fx += (forceX / dist) * intensity;
            fy += (forceY / dist) * (140 - absDy) * 0.2;
          }
        });

        // 2. Repulsion from connection labels (so text is never hidden!)
        connections.forEach(conn => {
          const s = currentNodes.find(n => n.id === conn.sourceId);
          const eNode = currentNodes.find(n => n.id === conn.targetId);
          if (!s || !eNode) return;

          // Compute connection midX, midY
          const startX = s.x + 190;
          const startY = s.y + 45;
          const endX = eNode.x;
          const endY = eNode.y + 45;

          const dx = Math.max(80, Math.abs(endX - startX) * 0.5);
          const t = 0.5;
          const midX = (1 - t) * (1 - t) * (1 - t) * startX + 3 * (1 - t) * (1 - t) * t * (startX + dx) + 3 * (1 - t) * t * t * (endX - dx) + t * t * t * endX;
          const midY = (1 - t) * (1 - t) * (1 - t) * startY + 3 * (1 - t) * (1 - t) * t * startY + 3 * (1 - t) * t * t * endY + t * t * t * endY;

          // Center of current node
          const cx = node.x + 95;
          const cy = node.y + 50;

          const diffX = cx - midX;
          const diffY = cy - midY;
          const absDiffX = Math.abs(diffX);
          const absDiffY = Math.abs(diffY);

          // If label coordinates fall inside or near the node rectangle (W=190, H=100)
          if (absDiffX < 140 && absDiffY < 90) {
            const dist = Math.sqrt(diffX * diffX + diffY * diffY) || 1;
            const fIntensityX = (140 - absDiffX) * 0.35;
            const fIntensityY = (90 - absDiffY) * 0.35;
            fx += (diffX / dist) * fIntensityX;
            fy += (diffY / dist) * fIntensityY;
          }
        });

        // Apply forces to node position
        if (Math.abs(fx) > 0.1 || Math.abs(fy) > 0.1) {
          const maxStep = 30; // Caps transition step to prevent node exploding off
          const moveX = Math.max(-maxStep, Math.min(maxStep, fx));
          const moveY = Math.max(-maxStep, Math.min(maxStep, fy));

          let nextX = Math.round(node.x + moveX);
          let nextY = Math.round(node.y + moveY);

          // Boundaries checking (ensures cards NEVER overflow the viewport/canvas)
          nextX = Math.max(10, Math.min(2200, nextX));
          nextY = Math.max(10, Math.min(1650, nextY));

          if (nextX !== node.x || nextY !== node.y) {
            moved = true;
            return { ...node, x: nextX, y: nextY };
          }
        }

        return node;
      });

      if (moved && iteration < maxIterations) {
        currentNodes = updatedNodes;
        iteration++;
        
        if (onUpdateNodesCoords) {
          onUpdateNodesCoords(updatedNodes.map(n => ({ id: n.id, x: n.x, y: n.y })));
        } else {
          updatedNodes.forEach(n => onUpdateNodeCoords(n.id, n.x, n.y));
        }

        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  };

  const startDrawingConnection = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDrawingConnSourceId(nodeId);
    
    // Initialize mouse position
    const sourceNode = nodes.find(n => n.id === nodeId);
    if (sourceNode && containerRef.current) {
      setMousePos({
        x: sourceNode.x + 190,
        y: sourceNode.y + 45
      });
    }
  };

  const completeConnection = (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (!drawingConnSourceId) return;

    if (drawingConnSourceId === targetId) {
      setDrawingConnSourceId(null);
      return;
    }

    // Check if connection already exists
    const exists = connections.some(
      c => c.sourceId === drawingConnSourceId && c.targetId === targetId
    );

    if (!exists) {
      // Prompt a basic label or default to first choice
      onAddConnection(drawingConnSourceId, targetId, 'appel direct');
    }
    setDrawingConnSourceId(null);
  };

  // Estimate dynamic height of node card for visual connections
  const getNodeCardHeight = (node: CallNode) => {
    let base = 110;
    if (node.type === 'voicemail' && node.properties?.showVoicemailTextOnNode && node.properties?.voicemailText) {
      const lineCount = node.properties.voicemailText.split('\n').length;
      base += Math.max(30, lineCount * 12);
    } else if (node.properties?.description && node.properties.description.length > 25) {
      base += 15;
    }
    return base;
  };

  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const h = getNodeCardHeight(node);
    return {
      x: node.x + 95,
      y: node.y + (h / 2)
    };
  };

  const getNodeOutlet = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const h = getNodeCardHeight(node);
    return {
      x: node.x + 190,
      y: node.y + (h / 2)
    };
  };

  const getNodeInlet = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const h = getNodeCardHeight(node);
    return {
      x: node.x,
      y: node.y + (h / 2)
    };
  };

  // Pre-calculate positions of connection labels to avoid overlap in the interactive design canvas
  const resolvedLabels = React.useMemo(() => {
    // 1. Gather default coordinates & dimensions for all labels
    const rawLabels = connections.map(conn => {
      const start = getNodeOutlet(conn.sourceId);
      const end = getNodeInlet(conn.targetId);
      if (!start || !end) {
        return {
          id: conn.id,
          x: 0,
          y: 0,
          w: 0,
          h: 0,
          origX: 0,
          origY: 0,
          connection: conn
        };
      }

      const dx = Math.max(80, Math.abs(end.x - start.x) * 0.5);
      const t = 0.5; // mid point parameter
      const midX = (1 - t) * (1 - t) * (1 - t) * start.x + 3 * (1 - t) * (1 - t) * t * (start.x + dx) + 3 * (1 - t) * t * t * (end.x - dx) + t * t * t * end.x;
      const midY = (1 - t) * (1 - t) * (1 - t) * start.y + 3 * (1 - t) * (1 - t) * t * start.y + 3 * (1 - t) * t * t * end.y + t * t * t * end.y;

      // Dropdown + action button takes about (textLength * 6.5) + 38 px
      const textLen = conn.label ? conn.label.length : 5;
      const labelW = (textLen * 6.5) + 38;
      const labelH = 26;

      return {
        id: conn.id,
        x: midX,
        y: midY,
        w: labelW,
        h: labelH,
        origX: midX,
        origY: midY,
        connection: conn
      };
    }).filter(l => l.w > 0);

    // 2. Map nodes as obstacles
    const nodeObstacles = nodes.map(node => ({
      x: node.x,
      y: node.y,
      w: 190,
      h: getNodeCardHeight(node)
    }));

    // 3. Resolve overlaps iteratively
    const resolvedCoords = rawLabels.map(l => ({ ...l }));
    const iterations = 35;

    for (let iter = 0; iter < iterations; iter++) {
      let moved = false;

      // Resolve labels with other labels
      for (let i = 0; i < resolvedCoords.length; i++) {
        for (let j = i + 1; j < resolvedCoords.length; j++) {
          const l1 = resolvedCoords[i];
          const l2 = resolvedCoords[j];

          const dx = l1.x - l2.x;
          const dy = l1.y - l2.y;
          const minD_X = (l1.w + l2.w) / 2 + 12; // with 12px margin
          const minD_Y = (l1.h + l2.h) / 2 + 8;  // with 8px margin

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

      // Resolve labels with node obstacles (so they guide smoothly around content cards)
      for (let i = 0; i < resolvedCoords.length; i++) {
        const l = resolvedCoords[i];
        for (const obs of nodeObstacles) {
          const safetyX = 14;
          const safetyY = 10;

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
  }, [connections, nodes]);

  const getIcon = (iconName: string, category: string) => {
    const cls = "w-4 h-4";
    switch (iconName) {
      case 'database':
        return <Layers className={`${cls} text-emerald-600`} />;
      case 'phone-incoming':
        return <PhoneIncoming className={`${cls} text-emerald-700`} />;
      case 'hash':
        return <AlertCircle className={`${cls} text-teal-600`} />;
      case 'phone':
        return <PhoneIncoming className={`${cls} text-indigo-600`} />;
      case 'phone-outgoing':
        return <PhoneOutgoing className={`${cls} text-slate-500`} />;
      case 'user':
        return <User className={`${cls} text-blue-600`} />;
      case 'phone-call':
        return <PhoneIncoming className={`${cls} text-sky-500`} />;
      case 'layers':
        return <Layers className={`${cls} text-amber-500`} />;
      case 'users':
        return <Users className={`${cls} text-yellow-600`} />;
      case 'clock':
        return <Clock className={`${cls} text-amber-500`} />;
      case 'phone-forwarded':
        return <Link2 className={`${cls} text-violet-500`} />;
      case 'phone-missed':
        return <Link2 className={`${cls} text-fuchsia-500`} />;
      case 'phone-off':
        return <Link2 className={`${cls} text-pink-500`} />;
      case 'voicemail':
        return <Volume2 className={`${cls} text-rose-500`} />;
      case 'volume2':
        return <Volume2 className={`${cls} text-red-500`} />;
      case 'sun':
        return <Clock className={`${cls} text-indigo-500`} />;
      case 'external-link':
        return <Link2 className={`${cls} text-blue-500`} />;
      case 'smartphone':
        return <Smartphone className={`${cls} text-cyan-500`} />;
      case 'shield-alert':
        return <AlertTriangle className={`${cls} text-red-600 animate-bounce`} />;
      default:
        return <HelpCircle className={`${cls} text-slate-400`} />;
    }
  };

  // Connection flow labels options
  const CONNECTION_LABEL_PRESETS = [
    'appel entrant',
    'appel entrant (externe)',
    'appel entrant (interne)',
    'appel interne',
    'appel externe',
    'si occupé',
    'si non-réponse',
    'hors horaires',
    'jours ouvrés',
    'touche 0',
    'touche 1',
    'touche 2',
    'touche 3',
    'touche 4',
    'touche 5',
    'touche 6',
    'touche 7',
    'touche 8',
    'touche 9',
    'débordement',
    'messagerie',
    'sinon',
    'renvoi direct',
    'renvoi manuel',
    'urgence / secours',
    'fermeture exceptionnelle',
    'renvoi sur non-réponse',
    'renvoi sur indisponibilité',
    "fin d'appel / raccroché"
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden relative" id="workspace-wrapper">
      {/* Dynamic validation alerts banner */}
      {validationAlerts.length > 0 && (
        <div className="bg-amber-500/10 backdrop-blur-md border-b border-amber-500/20 px-4 py-2 flex items-center gap-3 overflow-x-auto text-xs shrink-0 select-none">
          <div className="flex items-center gap-1 font-bold text-amber-800">
            <AlertTriangle size={15} />
            <span>DIAGNOSTICS ({validationAlerts.length}) :</span>
          </div>
          <div className="flex items-center gap-4 divide-x divide-amber-500/20">
            {validationAlerts.map((alert, idx) => (
              <span 
                key={idx} 
                className="pl-4 text-amber-700 hover:text-amber-950 transition-colors cursor-pointer flex items-center gap-1"
                onClick={() => alert.nodeId && onSelectNode(alert.nodeId)}
                title="Cliquez pour sélectionner le bloc en erreur"
              >
                ● {alert.message}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Editor instructions or stats bar */}
      <div className="bg-white/45 backdrop-blur-md border-b border-white/20 py-1.5 px-4 text-[11px] text-slate-600 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <span className="bg-white/40 px-2 py-0.5 rounded border border-white/40 font-semibold text-slate-700 shadow-2xs">{nodes.length} Nœuds</span>
          <span className="bg-white/40 px-2 py-0.5 rounded border border-white/40 font-semibold text-slate-700 shadow-2xs">{connections.length} Connexions</span>
          {nodes.length > 0 && (
            <button
              id="btn-auto-layout"
              onClick={triggerRepulsionAnimation}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-2.5 py-1 rounded-lg text-[9.5px] uppercase tracking-wide transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer flex items-center gap-1 shrink-0 ml-1.5"
              title="Espacer les nœuds pour dégager le texte des connexions"
            >
              <Sparkles size={11} className="animate-pulse" />
              <span>Espacer Automatiquement</span>
            </button>
          )}
        </div>
        <div>
          {drawingConnSourceId ? (
            <span className="text-blue-600 font-semibold animate-pulse">
              [CONSTRUCTION EN COURS] Clickez sur un nœud de destination pour lier (Échap pour annuler)
            </span>
          ) : (
            <span>Glissez les blocs pour organiser. Cliquez-glissez du bouton <span className="text-blue-650 font-bold">(+)</span> pour relier.</span>
          )}
        </div>
      </div>

      {/* Main Spacious Canvas container scroll overflow */}
      <div
        ref={containerRef}
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleWorkspaceMouseMove}
        onMouseUp={handleWorkspaceMouseUp}
        onClick={handleWorkspaceClick}
        className="flex-1 overflow-auto relative scrollbar-thin scroll-smooth animate-fade-in"
        id="panning-canvas-container"
        style={{ cursor: drawingConnSourceId ? 'cell' : 'default' }}
      >
        {/* Render clean empty state warning overlay if workspace has 0 nodes */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-6 z-30 pointer-events-none">
            <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-2xl p-6 border border-slate-200 shadow-xl pointer-events-auto text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <PhoneIncoming size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-lg">Espace de travail vierge</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Votre programmation est actuellement vide. Commencez à construire votre routage téléphonique ou chargez le scénario de démonstration :
                </p>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-left space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <span>💡 Guide de démarrage :</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>Cliquez sur les boutons du panneau de gauche pour ajouter des blocs (Numéros, Postes, Routage).</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>Reliez les blocs en glissant depuis l'icône <span className="font-bold text-blue-600 font-mono text-[13px]">(+)</span> à droite d'un bloc.</span>
                </div>
              </div>

              {onLoadDemo && (
                <button
                  id="btn-load-demo-empty"
                  onClick={onLoadDemo}
                  className="w-full bg-[#2563eb] text-white hover:bg-blue-700 px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 cursor-pointer"
                >
                  <Layers size={14} />
                  <span>Activer la Démo Acme Corp</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div 
          className="w-[2400px] h-[1800px] bg-transparent relative"
          id="grid-canvas-stage"
          style={{
            backgroundImage: 'radial-gradient(var(--grid-dot) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          {/* SVG Overlay containing all connection paths and curves */}
          <svg
            id="grid-svg"
            className="absolute inset-0 pointer-events-none w-full h-full"
            style={{ zIndex: 10 }}
          >
            {/* Draw active connection line preview */}
            {drawingConnSourceId && (
              (() => {
                const outlet = getNodeOutlet(drawingConnSourceId);
                const dx = Math.abs(mousePos.x - outlet.x) * 0.4;
                const pathStr = `M ${outlet.x},${outlet.y} C ${outlet.x + dx},${outlet.y} ${mousePos.x - dx},${mousePos.y} ${mousePos.x},${mousePos.y}`;
                return (
                  <path
                    d={pathStr}
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    fill="none"
                    className="animate-pulse"
                  />
                );
              })()
            )}

            {/* Draw existing connections */}
            {connections.map(conn => {
              const start = getNodeOutlet(conn.sourceId);
              const end = getNodeInlet(conn.targetId);
              
              if (!start || !end) return null;

              // Compute nice curved path
              const dx = Math.max(80, Math.abs(end.x - start.x) * 0.5);
              const curveX1 = start.x + dx;
              const curveY1 = start.y;
              const curveX2 = end.x - dx;
              const curveY2 = end.y;
              const pathStr = `M ${start.x},${start.y} C ${curveX1},${curveY1} ${curveX2},${curveY2} ${end.x},${end.y}`;

              // Arrow points directly
              return (
                <g key={conn.id} className="group pointer-events-auto">
                  {/* Invisible thicker interaction path for easier selection */}
                  <path
                    d={pathStr}
                    stroke="transparent"
                    strokeWidth="12"
                    fill="none"
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConnection(conn.id);
                    }}
                  />
                  {/* Beautiful visual connector line */}
                  <path
                    d={pathStr}
                    stroke={selectedNodeId === conn.sourceId ? '#3b82f6' : '#94a3b8'}
                    strokeWidth={selectedNodeId === conn.sourceId ? '2.5' : '2'}
                    fill="none"
                    className="group-hover:stroke-teal-500 transition-colors"
                  />
                  {/* Arrowhead endpoint */}
                  <polygon
                    points={`${end.x},${end.y} ${end.x - 7},${end.y - 4} ${end.x - 7},${end.y + 4}`}
                    fill={selectedNodeId === conn.sourceId ? '#3b82f6' : '#94a3b8'}
                    className="group-hover:fill-teal-500 transition-colors"
                  />
                </g>
              );
            })}

            {/* Draw a subtle indicator pointer / leash for any displaced connection labels */}
            {resolvedLabels.map(l => {
              const dist = Math.sqrt((l.x - l.origX) ** 2 + (l.y - l.origY) ** 2);
              if (dist < 8) return null; // Only draw leash if displaced significantly
              
              return (
                <line
                  key={`leash-${l.id}`}
                  x1={l.origX}
                  y1={l.origY}
                  x2={l.x}
                  y2={l.y}
                  stroke={selectedNodeId === l.connection.sourceId ? '#3b82f6' : '#94a3b8'}
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  className="opacity-70 animate-pulse"
                />
              );
            })}
          </svg>

          {/* Visual selection box for Windows style multiselect */}
          {selectionBoxStart && selectionBoxCurrent && (
            (() => {
              const x = Math.min(selectionBoxStart.x, selectionBoxCurrent.x);
              const y = Math.min(selectionBoxStart.y, selectionBoxCurrent.y);
              const w = Math.abs(selectionBoxStart.x - selectionBoxCurrent.x);
              const h = Math.abs(selectionBoxStart.y - selectionBoxCurrent.y);
              return (
                <div 
                  className="absolute bg-blue-550/15 border border-blue-500 rounded pointer-events-none z-50 shadow-xs"
                  style={{
                    left: x,
                    top: y,
                    width: w,
                    height: h,
                  }}
                />
              );
            })()
          )}

          {/* Connection Labels Badges overlaid as HTML elements for better text display and form select option inputs */}
          {resolvedLabels.map(l => {
            const conn = l.connection;
            const currentLabels = conn.labels && conn.labels.length > 0 ? conn.labels : [conn.label];
            
            const handleUpdateLabelAt = (index: number, value: string) => {
              const nextLabels = [...currentLabels];
              nextLabels[index] = value;
              onUpdateConnectionLabel(conn.id, nextLabels[0], nextLabels);
            };
            
            const handleAddLabel = () => {
              const nextLabels = [...currentLabels, 'touche 0'];
              onUpdateConnectionLabel(conn.id, nextLabels[0], nextLabels);
            };
            
            const handleRemoveLabelAt = (index: number) => {
              if (currentLabels.length <= 1) return;
              const nextLabels = currentLabels.filter((_, i) => i !== index);
              onUpdateConnectionLabel(conn.id, nextLabels[0], nextLabels);
            };

            return (
              <div
                key={`label-${conn.id}`}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 text-[10px] text-slate-700 transition-all duration-200 select-none"
                style={{ left: l.x, top: l.y }}
              >
                {/* Horizontal list of active labels as light, pretty borderless pills */}
                <div className="flex flex-col gap-1 items-center">
                  {currentLabels.map((lbl, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-teal-50/95 backdrop-blur-xs text-teal-900 rounded-full px-2 py-0.5 shadow-sm border border-teal-100 hover:bg-teal-100/95 hover:scale-[1.03] transition-all">
                      <select
                        value={lbl}
                        onChange={(e) => handleUpdateLabelAt(idx, e.target.value)}
                        className="bg-transparent border-none font-extrabold text-[9px] text-teal-800 focus:outline-none cursor-pointer text-center px-1 appearance-none"
                        id={`select-label-${conn.id}-${idx}`}
                      >
                        {CONNECTION_LABEL_PRESETS.map((p, i) => (
                          <option key={i} value={p}>{p}</option>
                        ))}
                        {!CONNECTION_LABEL_PRESETS.includes(lbl) && (
                          <option value={lbl}>{lbl}</option>
                        )}
                      </select>
                      
                      {currentLabels.length > 1 && (
                        <button
                          onClick={() => handleRemoveLabelAt(idx)}
                          className="text-teal-600 hover:text-red-500 p-0.5 rounded-full hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                          title="Supprimer ce libellé"
                        >
                          <X size={8} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Centered minimal + button to add option */}
                <button
                  onClick={handleAddLabel}
                  className="w-5 h-5 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 rounded-full transition-all shadow-xs cursor-pointer border border-blue-100 hover:scale-110 active:scale-95"
                  title="Ajouter un autre choix/nom de touche à cette même connexion"
                  id={`add-label-btn-${conn.id}`}
                >
                  <Plus size={11} strokeWidth={3} />
                </button>
              </div>
            );
          })}

          {/* Render individual telephony blocks as absolute-positioned cards */}
          {nodes.map(node => {
            const meta = NODE_METADATA[node.type];
            if (!meta) return null;
            const isSelected = selectedNodeId === node.id || (selectedNodeIds || []).includes(node.id);
            const hasAlert = validationAlerts.some(a => a.nodeId === node.id);

            return (
              <div
                id={`node-${node.id}`}
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onMouseEnter={(e) => handleNodeMouseEnter(e, node)}
                onMouseMove={handleNodeMouseMove}
                onMouseLeave={handleNodeMouseLeave}
                className={`absolute w-[190px] min-h-[110px] h-auto flex flex-col rounded-xl glass-node border select-none transition-all pb-1 ${
                  isSelected 
                    ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-xl scale-[1.02]' 
                    : hasAlert
                    ? 'border-amber-450 bg-amber-500/5 shadow-md shadow-amber-500/5'
                    : 'border-white/40 shadow-sm'
                }`}
                style={{ left: node.x, top: node.y, zIndex: isSelected ? 30 : 20 }}
              >
                {/* Node Title header with colored category header bar */}
                <div className={`px-2.5 py-1.5 rounded-t-xl bg-white/40 border-b border-white/20 flex items-center justify-between drag-handle gap-1`}>
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="shrink-0">{getIcon(meta.iconName, meta.category)}</span>
                    <span className="text-[11px] font-extrabold text-slate-800 break-words whitespace-normal leading-tight" title={node.name}>
                      {node.name}
                    </span>
                  </div>
                  
                  {/* Internal short number badge if available */}
                  {node.properties?.internalNumber && (
                    <span className="shrink-0 text-[8.5px] font-mono font-bold bg-slate-200/80 px-1 py-0.5 rounded text-slate-700 hover:bg-slate-300 transition-colors" title={`Numéro interne : ${node.properties.internalNumber}`}>
                      N°{node.properties.internalNumber}
                    </span>
                  )}

                  {/* Action buttons on node card */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNode(node.id);
                      }}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-500/10 p-0.5 rounded transition-all cursor-pointer"
                      title="Supprimer ce bloc"
                      id={`workspace-delete-node-${node.id}`}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {/* Node body displaying current configurations directly inside the flow */}
                <div className="flex-1 p-2 flex flex-col justify-between text-left relative overflow-hidden bg-white/20 rounded-b-xl gap-1.5">
                  {/* Warning overlay icon if block has warning status */}
                  {hasAlert && (
                    <div className="absolute right-1 bottom-1 p-0.5 bg-amber-500 text-white rounded-full shadow-sm z-10" title="Problème détecté">
                      <AlertTriangle size={10} className="animate-pulse" />
                    </div>
                  )}

                  {/* Primary context text display with wrap */}
                  <div className="text-[10px] text-slate-500 break-words whitespace-normal leading-snug">
                    {node.type === 'sda' || node.type === 'ndi' || node.type === 'nds' ? (
                      <span className="font-semibold text-slate-800 block">No: {node.properties.number || 'Non configuré'}</span>
                    ) : node.type === 'user_station' ? (
                      <span className="font-semibold text-slate-800 block">Poste {node.properties.internalNumber} : {node.properties.userName || node.properties.stationName}</span>
                    ) : node.type === 'switchboard' ? (
                      <span className="font-semibold text-slate-800 block">Standard: {node.properties.internalNumber || '9'}</span>
                    ) : node.type === 'voicemail' ? (
                      <div className="font-semibold text-slate-800 block">
                        <span>Bv: {node.properties.internalNumber || '999'}</span>
                        {node.properties.showVoicemailTextOnNode && node.properties.voicemailText && (
                          <div className="mt-1 p-1 rounded bg-rose-50 border border-rose-100 text-[8.5px] font-normal text-rose-800 break-words whitespace-pre-wrap leading-tight font-sans">
                            "{node.properties.voicemailText}"
                          </div>
                        )}
                      </div>
                    ) : node.type === 'ivr' ? (
                      <span className="text-amber-800 font-semibold block">{node.properties.audioMessageName || 'SVI par défaut'}</span>
                    ) : node.type === 'day_night' || node.type === 'time_range' ? (
                      <span className="text-indigo-800 font-semibold block break-words whitespace-normal leading-tight">{node.properties.timeSchedule || 'Horaires 24h'}</span>
                    ) : node.type === 'forward_unconditional' || node.type === 'forward_no_answer' || node.type === 'forward_busy' || node.type === 'transfer' ? (
                      <span className="text-violet-800 font-semibold block">Vers: {node.properties.forwardDestination || 'Inconnu'}</span>
                    ) : node.type === 'mobile_external' ? (
                      <span className="font-semibold text-slate-800 block">Mob: {node.properties.number || '06...'}</span>
                    ) : (
                      <span className="block text-slate-700">{node.properties.description || meta.label}</span>
                    )}

                    {/* Secondary display if description was set */}
                    {node.properties.description && (
                      <span className="block text-[8.5px] text-slate-400 italic mt-0.5 break-words whitespace-normal leading-tight">
                        {node.properties.description}
                      </span>
                    )}
                  </div>

                  {/* Row of badges/indicators for advanced features */}
                  {(node.properties?.nodeStatus || node.properties?.forwardType || node.properties?.keyConfig || node.properties?.targetPlatform) && (
                    <div className="flex flex-wrap gap-1 select-none pointer-events-none">
                      {node.properties.nodeStatus && (
                        <span className={`inline-flex items-center gap-0.5 text-[7px] font-black px-1 rounded-xs border leading-tight ${
                          ['disponible', 'ouvert', 'jour'].includes(node.properties.nodeStatus)
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800'
                            : ['fermé', 'nuit', 'indisponible', 'hors service'].includes(node.properties.nodeStatus)
                            ? 'bg-rose-500/10 border-rose-500/25 text-rose-800'
                            : ['urgence', 'd\'astreinte', 'débordement actif'].includes(node.properties.nodeStatus)
                            ? 'bg-amber-500/10 border-amber-500/25 text-amber-800'
                            : 'bg-teal-500/10 border-teal-500/25 text-teal-850'
                        }`}>
                          <span className={`w-1 h-1 rounded-full shrink-0 ${
                            ['disponible', 'ouvert', 'jour'].includes(node.properties.nodeStatus)
                              ? 'bg-emerald-500 animate-pulse'
                              : ['fermé', 'nuit', 'indisponible', 'hors service'].includes(node.properties.nodeStatus)
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`} />
                          <span className="truncate max-w-[45px] uppercase">{node.properties.nodeStatusCustom || node.properties.nodeStatus}</span>
                        </span>
                      )}

                      {node.properties.forwardType === 'manual' && (
                        <span className="inline-flex items-center gap-0.5 text-[7px] font-black px-1 rounded-xs bg-amber-500/10 border border-amber-550/25 text-amber-850" title="Renvoi Manuel activé">
                          <span>🖐️</span>
                          <span className="uppercase text-[6px]">MAN</span>
                        </span>
                      )}

                      {node.properties.forwardType === 'scheduled' && (
                        <span className="inline-flex items-center gap-0.5 text-[7px] font-black px-1 rounded-xs bg-cyan-500/10 border border-cyan-500/25 text-cyan-850" title="Renvoi Programmé / Horaire">
                          <span>📅</span>
                          <span className="uppercase text-[6px]">AUTO</span>
                        </span>
                      )}

                      {node.properties.keyConfig && (
                        <span className="inline-flex items-center gap-0.5 text-[7px] font-black px-1 rounded-xs bg-purple-500/10 border border-purple-500/25 text-purple-850" title="Touche Physique ou BLF rattachée">
                          <span>🔑</span>
                          <span className="uppercase text-[6px]">{node.properties.keyConfig.keyType === 'Code fonction' ? 'CODE' : (node.properties.keyConfig.keyType || 'BLF')}</span>
                        </span>
                      )}

                      {node.properties.targetPlatform && (
                        <span className="inline-flex items-center text-[7px] font-extrabold px-1 rounded-xs bg-slate-500/10 border border-slate-500/25 text-slate-800" title={`Plateforme : ${node.properties.targetPlatform}`}>
                          <span className="truncate max-w-[32px]">{node.properties.targetPlatform === 'Centrex opérateur' ? 'Centrex' : node.properties.targetPlatform}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Secondary small indicators info */}
                  <div className="flex items-center justify-between text-[9px] text-slate-400 mt-auto pt-1 border-t border-slate-100/50">
                    <span className="truncate bg-white/40 border border-white/40 px-1 py-0.5 rounded text-slate-705 font-medium shadow-2xs">
                      {meta.label}
                    </span>
                    <span className="italic font-mono text-[8px] opacity-75 shrink-0">
                      x:{node.x} y:{node.y}
                    </span>
                  </div>
                </div>

                {/* VISUAL PORTS */}
                {/* 1. Receiving Inlet dot on left border (Allows completing a connection line) - perfectly centered vertically */}
                <div
                  id={`inlet-${node.id}`}
                  onClick={(e) => drawingConnSourceId ? completeConnection(e, node.id) : null}
                  className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border bg-white focus:outline-none transition-all z-35 cursor-pointer ${
                    drawingConnSourceId 
                      ? 'border-blue-500 bg-blue-105 ring-4 ring-blue-550/20 animate-pulse scale-125' 
                      : 'border-slate-300 hover:bg-slate-100 hover:border-slate-450 hover:scale-125'
                  }`}
                  title={drawingConnSourceId ? "Cliquez pour brancher le commutateur ici" : "Port d'entrée direct d'appels"}
                />

                {/* 2. Emitting Outlet button/dot on right border (Allows drawing a connection line) - perfectly centered vertically */}
                <button
                  id={`outlet-${node.id}`}
                  onMouseDown={(e) => startDrawingConnection(e, node.id)}
                  className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-slate-300 bg-white hover:bg-[#2563eb] hover:border-[#2563eb] hover:scale-125 transition-all z-35 flex items-center justify-center cursor-crosshair group-hover:scale-110"
                  title="Faites glisser ou cliquez pour créer une liaison sortante"
                >
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full hover:bg-white" />
                </button>
              </div>
            );
          })}

          {/* Tooltip Prolonged Hover Overlay */}
          {hoveredNode && (
            <div
              className="absolute bg-slate-900/95 backdrop-blur-md border border-slate-750 text-white p-3 rounded-lg shadow-xl text-[10px] max-w-xs space-y-1.5 select-none z-50 pointer-events-none"
              style={{ left: tooltipPos.x, top: tooltipPos.y }}
            >
              <h5 className="font-extrabold text-blue-400 border-b border-slate-800 pb-1 mb-1 text-[11px]">
                Détails du nœud : {hoveredNode.name}
              </h5>
              <div className="grid grid-cols-[85px_1fr] gap-x-2 gap-y-1">
                {getTooltipContent(hoveredNode).map((item, i) => (
                  <React.Fragment key={i}>
                    <span className="text-slate-400 font-bold truncate uppercase text-[8px]">{item.label}</span>
                    <span className="text-slate-100 break-words whitespace-normal font-medium">{item.value}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
