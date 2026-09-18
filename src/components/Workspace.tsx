/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { TutorialModal } from './TutorialModal';
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
  AlignHorizontalDistributeCenter,
  ZoomIn,
  ZoomOut,
  Download,
  Image,
  Maximize2,
  Minimize2,
  Edit3,
  Cable,
  Monitor,
  KeyRound,
  Radio,
  Ban,
  Printer,
  Route,
  CalendarOff,
  UserCog,
  Filter,
  CircleParking,
  Waypoints,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Square,
  Search
} from 'lucide-react';
import { CallNode, Connection, NodeType, CanvasAnnotation } from '../types';
import { NODE_METADATA } from '../utils/templates';
import { distributionModeLabel } from '../data/telephonyOptions';
import {
  getNodePrimaryLine,
  getNodeSecondaryLine,
  shouldShowBadges,
  maxBadgesForNode,
  getDisplayDensity,
} from '../utils/nodeDisplay';
import { getDescendantIds, getHiddenNodeIds } from '../utils/graphHelpers';
import CanvasNavTools from './CanvasNavTools';

interface WorkspaceProps {
  nodes: CallNode[];
  connections: Connection[];
  annotations?: CanvasAnnotation[];
  collapsedNodeIds?: string[];
  selectedNodeId: string | null;
  selectedNodeIds?: string[];
  onSelectNode: (id: string | null) => void;
  onSelectNodes?: (ids: string[]) => void;
  onUpdateNodeCoords: (id: string, x: number, y: number) => void;
  onUpdateNodesCoords?: (updates: { id: string; x: number; y: number }[]) => void;
  onDeleteNode: (id: string) => void;
  onAddConnection: (sourceId: string, targetId: string, label: string) => void;
  onDeleteConnection: (id: string) => void;
  onUpdateConnectionLabel: (id: string, label: string, labels?: string[], labelOffset?: { x: number; y: number } | null) => void;
  onToggleCollapse?: (nodeId: string) => void;
  onUpdateAnnotations?: (annotations: CanvasAnnotation[]) => void;
  validationAlerts: { id: string; type: 'error' | 'warning'; message: string; nodeId?: string }[];
  onLoadDemo?: () => void;
  onDragStart?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function Workspace({
  nodes,
  connections,
  annotations = [],
  collapsedNodeIds = [],
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
  onToggleCollapse,
  onUpdateAnnotations,
  validationAlerts,
  onLoadDemo,
  onDragStart,
  isFullscreen = false,
  onToggleFullscreen
}: WorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasMovedNode = useRef(false);
  const dragRafRef = useRef<number | null>(null);
  const pendingDragUpdates = useRef<{ id: string; x: number; y: number }[] | null>(null);
  const [livePositions, setLivePositions] = useState<Record<string, { x: number; y: number }> | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [initialDragPositions, setInitialDragPositions] = useState<{ [id: string]: { x: number; y: number } }>({});
  const [dragStartMouse, setDragStartMouse] = useState({ x: 0, y: 0 });
  const [drawingConnSourceId, setDrawingConnSourceId] = useState<string | null>(null);
  const [drawingConnStartPos, setDrawingConnStartPos] = useState<{ x: number; y: number } | null>(null);
  const [domHeights, setDomHeights] = useState<Record<string, number>>({});
  const [draggingLabelId, setDraggingLabelId] = useState<string | null>(null);
  const [dragLabelStartMouse, setDragLabelStartMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragLabelInitialOffset, setDragLabelInitialOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [drawingAnnot, setDrawingAnnot] = useState<{ x: number; y: number } | null>(null);
  const [viewportBox, setViewportBox] = useState({ left: 0, top: 0, w: 2000, h: 1200 });

  const hiddenIds = React.useMemo(
    () => getHiddenNodeIds(collapsedNodeIds, connections, nodes),
    [collapsedNodeIds, connections, nodes]
  );

  const visibleNodes = React.useMemo(
    () => nodes.filter((n) => !hiddenIds.has(n.id)),
    [nodes, hiddenIds]
  );

  const visibleConnections = React.useMemo(
    () => connections.filter((c) => !hiddenIds.has(c.sourceId) && !hiddenIds.has(c.targetId)),
    [connections, hiddenIds]
  );

  const NODE_CARD_W = 190;
  const CANVAS_MIN_W = 2000;
  const CANVAS_MIN_H = 1400;
  const CANVAS_PAD = 480;

  const getResolvedPos = (node: CallNode) => {
    const live = livePositions?.[node.id];
    return live ? live : { x: node.x, y: node.y };
  };

  const canvasSize = React.useMemo(() => {
    let maxX = CANVAS_MIN_W;
    let maxY = CANVAS_MIN_H;
    visibleNodes.forEach((node) => {
      const pos = getResolvedPos(node);
      const density = getDisplayDensity(node);
      const h = domHeights[node.id] || (density === 'compact' ? 56 : density === 'standard' ? 78 : 110);
      maxX = Math.max(maxX, pos.x + NODE_CARD_W + CANVAS_PAD);
      maxY = Math.max(maxY, pos.y + h + CANVAS_PAD);
    });
    annotations.forEach((a) => {
      maxX = Math.max(maxX, a.x + a.width + CANVAS_PAD);
      maxY = Math.max(maxY, a.y + a.height + CANVAS_PAD);
    });
    return { width: Math.ceil(maxX), height: Math.ceil(maxY) };
  }, [visibleNodes, livePositions, domHeights, annotations]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sync = () => {
      setViewportBox({
        left: el.scrollLeft - 240,
        top: el.scrollTop - 240,
        w: el.clientWidth + 480,
        h: el.clientHeight + 480,
      });
    };
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    return () => el.removeEventListener('scroll', sync);
  }, []);

  const focusNode = (id: string) => {
    onSelectNode(id);
    onSelectNodes?.([id]);
    const node = nodes.find((n) => n.id === id);
    const el = containerRef.current;
    if (!node || !el) return;
    el.scrollTo({
      left: Math.max(0, node.x - el.clientWidth / 2 + 95),
      top: Math.max(0, node.y - el.clientHeight / 2 + 55),
      behavior: 'smooth',
    });
  };

  const nodesInView = React.useMemo(() => {
    if (livePositions) return visibleNodes;
    return visibleNodes.filter((n) => {
      const pos = getResolvedPos(n);
      return (
        pos.x + NODE_CARD_W >= viewportBox.left
        && pos.x <= viewportBox.left + viewportBox.w
        && pos.y + 120 >= viewportBox.top
        && pos.y <= viewportBox.top + viewportBox.h
      );
    });
  }, [visibleNodes, viewportBox, livePositions]);

  React.useLayoutEffect(() => {
    const newHeights: Record<string, number> = {};
    let changed = false;

    nodes.forEach(node => {
      const el = document.getElementById(`node-${node.id}`);
      if (el && el.offsetHeight > 0) {
        newHeights[node.id] = el.offsetHeight;
        if (domHeights[node.id] !== el.offsetHeight) {
          changed = true;
        }
      }
    });

    if (changed) {
      setDomHeights(prev => ({ ...prev, ...newHeights }));
    }

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        let hasChanges = false;
        const updates: Record<string, number> = {};
        entries.forEach(entry => {
          const id = entry.target.id.replace('node-', '');
          const height = entry.target.getBoundingClientRect().height;
          if (id && height > 0) {
            updates[id] = height;
            hasChanges = true;
          }
        });
        if (hasChanges) {
          setDomHeights(prev => ({ ...prev, ...updates }));
        }
      });

      nodes.forEach(node => {
        const el = document.getElementById(`node-${node.id}`);
        if (el) observer.observe(el);
      });

      return () => observer.disconnect();
    }
  }, [nodes, connections]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.0);

  // States for custom connection label typing
  const [editingLabel, setEditingLabel] = useState<{ connId: string; index: number } | null>(null);
  const [tempLabelValue, setTempLabelValue] = useState("");

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
    const x = (e.clientX - (rect?.left || 0) + (containerRef.current?.scrollLeft || 0)) / zoom;
    const y = (e.clientY - (rect?.top || 0) + (containerRef.current?.scrollTop || 0)) / zoom;
    
    hoverTimerRef.current = setTimeout(() => {
      setHoveredNode(node);
      setTooltipPos({ x: x + 15, y: y + 15 });
    }, 600);
  };

  const handleNodeMouseMove = (e: React.MouseEvent) => {
    if (hoveredNode) {
      const rect = containerRef.current?.getBoundingClientRect();
      const x = (e.clientX - (rect?.left || 0) + (containerRef.current?.scrollLeft || 0)) / zoom;
      const y = (e.clientY - (rect?.top || 0) + (containerRef.current?.scrollTop || 0)) / zoom;
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
    if (props.hasPabxOption || props.phoneType === 'Mobile PBU') {
      list.push({ label: "Option Mobile", value: `Option PABX (${props.pabxOperator || 'SFR PBU'})` });
    }
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
    if (props.delayBeforeForward && props.delayBeforeForward > 0) list.push({ label: "Délai / Timeout", value: `${props.delayBeforeForward}s` });
    if (props.groupType) list.push({ label: "Distribution", value: distributionModeLabel(props.groupType) });
    if (props.agentRingTimeout) list.push({ label: "Sonnerie agent", value: `${props.agentRingTimeout}s` });
    if (props.maxCallersInQueue) list.push({ label: "Max en file", value: String(props.maxCallersInQueue) });
    if (props.musicOnHold) list.push({ label: "MOH", value: props.musicOnHold });
    if (props.overflowAction) list.push({ label: "Débordement", value: props.overflowAction });
    if (props.queueMembers) {
      const count = props.queueMembers.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean).length;
      if (count) list.push({ label: "Membres", value: String(count) });
    }
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
    const mouseX = (e.clientX - rect.left + containerRef.current.scrollLeft) / zoom;
    const mouseY = (e.clientY - rect.top + containerRef.current.scrollTop) / zoom;

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
      const mouseX = (e.clientX - rect.left + containerRef.current.scrollLeft) / zoom;
      const mouseY = (e.clientY - rect.top + containerRef.current.scrollTop) / zoom;
      
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
    const mouseX = (e.clientX - rect.left + containerRef.current.scrollLeft) / zoom;
    const mouseY = (e.clientY - rect.top + containerRef.current.scrollTop) / zoom;

    // 1. Handle node dragging or multi-dragging (local only — commit on mouseup)
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

        nextX = Math.round(nextX / 10) * 10;
        nextY = Math.round(nextY / 10) * 10;
        nextX = Math.max(10, nextX);
        nextY = Math.max(10, nextY);

        updates.push({ id, x: nextX, y: nextY });
      });

      if (updates.length > 0) {
        pendingDragUpdates.current = updates;
        if (dragRafRef.current == null) {
          dragRafRef.current = requestAnimationFrame(() => {
            dragRafRef.current = null;
            const pending = pendingDragUpdates.current;
            if (!pending) return;
            const next: Record<string, { x: number; y: number }> = {};
            pending.forEach((u) => {
              next[u.id] = { x: u.x, y: u.y };
            });
            setLivePositions(next);
          });
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

    // 4. Handle connection label dragging
    if (draggingLabelId) {
      const dx = mouseX - dragLabelStartMouse.x;
      const dy = mouseY - dragLabelStartMouse.y;
      const newOffsetX = Math.round(dragLabelInitialOffset.x + dx);
      const newOffsetY = Math.round(dragLabelInitialOffset.y + dy);

      const conn = connections.find(c => c.id === draggingLabelId);
      if (conn) {
        onUpdateConnectionLabel(conn.id, conn.label, conn.labels, { x: newOffsetX, y: newOffsetY });
      }
    }
  };

  const handleWorkspaceMouseUp = (e: React.MouseEvent) => {
    if (drawingConnSourceId) {
      // Check if mouse release is over a node or port
      const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
      let targetNodeId: string | null = null;

      if (elementUnderCursor) {
        const inletEl = elementUnderCursor.closest('[id^="inlet-"]');
        const nodeEl = elementUnderCursor.closest('[id^="node-"]');
        const outletEl = elementUnderCursor.closest('[id^="outlet-"]');

        if (inletEl) {
          targetNodeId = inletEl.id.replace('inlet-', '');
        } else if (nodeEl) {
          targetNodeId = nodeEl.id.replace('node-', '');
        } else if (outletEl) {
          targetNodeId = outletEl.id.replace('outlet-', '');
        }
      }

      if (targetNodeId && targetNodeId !== drawingConnSourceId) {
        completeConnection(e, targetNodeId);
        setDrawingConnStartPos(null);
        setDraggingNodeId(null);
        setSelectionBoxStart(null);
        setSelectionBoxCurrent(null);
        setInitialSelectedIdsAtBoxStart([]);
        return;
      }

      // If user dragged away significantly (>12px) and released on empty space, cancel connection drawing
      if (drawingConnStartPos) {
        const dist = Math.hypot(e.clientX - drawingConnStartPos.x, e.clientY - drawingConnStartPos.y);
        if (dist > 12) {
          setDrawingConnSourceId(null);
          setDrawingConnStartPos(null);
        }
      }
    }

    // Commit local drag positions once (avoids re-rendering App + localStorage every pixel)
    if (draggingNodeId && hasMovedNode.current) {
      const pending = pendingDragUpdates.current;
      let commitMap: { id: string; x: number; y: number }[] = [];
      if (pending) {
        commitMap = pending;
      } else if (livePositions) {
        commitMap = Object.keys(livePositions).map((id) => ({
          id,
          x: livePositions[id].x,
          y: livePositions[id].y,
        }));
      }
      if (commitMap.length > 0) {
        if (onUpdateNodesCoords) {
          onUpdateNodesCoords(commitMap);
        } else {
          commitMap.forEach((u) => onUpdateNodeCoords(u.id, u.x, u.y));
        }
      }
    }
    if (dragRafRef.current != null) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    pendingDragUpdates.current = null;
    setLivePositions(null);

    setDraggingNodeId(null);
    setDraggingLabelId(null);
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

          // Keep cards on the canvas (infinite growth — only min bound)
          nextX = Math.max(10, nextX);
          nextY = Math.max(10, nextY);

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
    e.preventDefault();
    setDrawingConnSourceId(nodeId);
    setDrawingConnStartPos({ x: e.clientX, y: e.clientY });

    const sourceNode = nodes.find(n => n.id === nodeId);
    if (sourceNode) {
      const outlet = getNodeOutlet(nodeId);
      setMousePos(outlet);
    }
  };

  const completeConnection = (e: React.MouseEvent | Event, targetId: string) => {
    if ('stopPropagation' in e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    if (!drawingConnSourceId) return;

    if (drawingConnSourceId === targetId) {
      setDrawingConnSourceId(null);
      setDrawingConnStartPos(null);
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
    setDrawingConnStartPos(null);
  };

  // Get dynamic actual height of node card for perfectly aligned visual connection paths
  const getNodeCardHeight = (node: CallNode) => {
    if (domHeights[node.id]) {
      return domHeights[node.id];
    }
    const el = typeof document !== 'undefined' ? document.getElementById(`node-${node.id}`) : null;
    if (el && el.offsetHeight > 0) {
      return el.offsetHeight;
    }
    const density = getDisplayDensity(node);
    let base = density === 'compact' ? 56 : density === 'standard' ? 78 : 110;
    if (!node.properties?.hidePrimaryDetails) {
      base += density === 'compact' ? 4 : 8;
    }
    if (density === 'detailed' && shouldShowBadges(node)) base += 16;
    if (density === 'detailed' && !node.properties?.hideMetadata) base += 18;
    if (node.type === 'voicemail' && density === 'detailed' && node.properties?.showVoicemailTextOnNode && node.properties?.voicemailText) {
      const lineCount = node.properties.voicemailText.split('\n').length;
      base += Math.max(24, lineCount * 12);
    }
    return base;
  };

  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const pos = getResolvedPos(node);
    const h = getNodeCardHeight(node);
    return {
      x: pos.x + 95,
      y: pos.y + (h / 2)
    };
  };

  const getNodeOutlet = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const pos = getResolvedPos(node);
    const h = getNodeCardHeight(node);
    return {
      x: pos.x + 190,
      y: pos.y + (h / 2)
    };
  };

  const getNodeInlet = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const pos = getResolvedPos(node);
    const h = getNodeCardHeight(node);
    return {
      x: pos.x,
      y: pos.y + (h / 2)
    };
  };

  // Pre-calculate positions of connection labels to avoid overlap in the interactive design canvas
  const resolvedLabels = React.useMemo(() => {
    // 1. Gather default coordinates & dimensions for all labels
    const rawLabels = visibleConnections.map(conn => {
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
      const currentLabels = conn.labels && conn.labels.length > 0 ? conn.labels : [conn.label];
      const maxTextLen = Math.max(...currentLabels.map(lbl => lbl ? lbl.length : 5));
      const labelW = (maxTextLen * 6.5) + 38;
      const labelH = currentLabels.length * 18 + (currentLabels.length - 1) * 4 + 20;

      const hasOffset = conn.labelOffset && typeof conn.labelOffset.x === 'number' && typeof conn.labelOffset.y === 'number';

      return {
        id: conn.id,
        x: hasOffset ? midX + conn.labelOffset!.x : midX,
        y: hasOffset ? midY + conn.labelOffset!.y : midY,
        w: labelW,
        h: labelH,
        origX: midX,
        origY: midY,
        connection: conn,
        isCustomPosition: hasOffset
      };
    }).filter(l => l.w > 0);

    // 2. Map nodes as obstacles
    const nodeObstacles = visibleNodes.map(node => {
      const pos = getResolvedPos(node);
      return {
        x: pos.x,
        y: pos.y,
        w: 190,
        h: getNodeCardHeight(node)
      };
    });

    // During drag: skip expensive collision resolution (midpoints only)
    if (livePositions) {
      return rawLabels.map(l => ({ ...l }));
    }

    // 3. Resolve overlaps iteratively
    const resolvedCoords = rawLabels.map(l => ({ ...l }));
    const iterations = 35;

    for (let iter = 0; iter < iterations; iter++) {
      let moved = false;

      // Resolve labels with other labels
      for (let i = 0; i < resolvedCoords.length; i++) {
        const l1 = resolvedCoords[i];
        if (l1.isCustomPosition) continue;

        for (let j = i + 1; j < resolvedCoords.length; j++) {
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
              const pushY = (overlapY / (l2.isCustomPosition ? 1 : 2)) + 1;
              const signY = dy >= 0 ? 1 : -1;
              l1.y += pushY * signY;
              if (!l2.isCustomPosition) l2.y -= pushY * signY;
            } else {
              const pushX = (overlapX / (l2.isCustomPosition ? 1 : 2)) + 1;
              const signX = dx >= 0 ? 1 : -1;
              l1.x += pushX * signX;
              if (!l2.isCustomPosition) l2.x -= pushX * signX;
            }
          }
        }
      }

      // Resolve labels with node obstacles (so they guide smoothly around content cards)
      for (let i = 0; i < resolvedCoords.length; i++) {
        const l = resolvedCoords[i];
        if (l.isCustomPosition) continue;

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
  }, [visibleConnections, visibleNodes, livePositions, domHeights]);

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
        return <PhoneIncoming className={`${cls} text-brand-600`} />;
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
        return <Clock className={`${cls} text-brand-500`} />;
      case 'external-link':
        return <Link2 className={`${cls} text-blue-500`} />;
      case 'smartphone':
        return <Smartphone className={`${cls} text-cyan-500`} />;
      case 'shield-alert':
        return <AlertTriangle className={`${cls} text-red-600`} />;
      case 'cable':
        return <Cable className={`${cls} text-emerald-800`} />;
      case 'monitor':
        return <Monitor className={`${cls} text-sky-600`} />;
      case 'key':
        return <KeyRound className={`${cls} text-orange-600`} />;
      case 'radio':
        return <Radio className={`${cls} text-amber-700`} />;
      case 'parking':
        return <CircleParking className={`${cls} text-slate-600`} />;
      case 'filter':
        return <Filter className={`${cls} text-teal-700`} />;
      case 'route':
        return <Route className={`${cls} text-slate-700`} />;
      case 'user-cog':
        return <UserCog className={`${cls} text-fuchsia-600`} />;
      case 'ban':
        return <Ban className={`${cls} text-rose-700`} />;
      case 'calendar':
        return <CalendarOff className={`${cls} text-rose-600`} />;
      case 'printer':
        return <Printer className={`${cls} text-slate-600`} />;
      case 'volume-2':
        return <Volume2 className={`${cls} text-emerald-700`} />;
      case 'waypoints':
        return <Waypoints className={`${cls} text-slate-600`} />;
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

  const exportAsImage = (format: 'png' | 'svg') => {
    try {
      if (nodes.length === 0) return;

      // 2. Escape XML helper
      const escapeXml = (unsafe: string) => {
        return unsafe.replace(/[<>&'"]/g, (c) => {
          switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
          }
        });
      };

      const wrapTextWithNewlines = (text: string, maxChars: number): string[] => {
        if (!text) return [];
        const sourceLines = text.split('\n');
        const result: string[] = [];
        for (const sLine of sourceLines) {
          if (!sLine.trim()) {
            result.push('');
            continue;
          }
          const words = sLine.split(/\s+/);
          let currentLine = '';
          for (const word of words) {
            if (!currentLine) {
              currentLine = word;
            } else if ((currentLine + ' ' + word).length <= maxChars) {
              currentLine += ' ' + word;
            } else {
              result.push(currentLine);
              currentLine = word;
            }
          }
          if (currentLine) {
            result.push(currentLine);
          }
        }
        return result;
      };

      // 1. Compute bounds with dynamic node heights
      const computedXs = nodes.map(n => n.x);
      const computedYs = nodes.map(n => n.y);
      const rawMinX = Math.min(...computedXs);
      const rawMinY = Math.min(...computedYs);
      const rawMaxX = Math.max(...computedXs) + 190;

      // Find actual rawMaxY taking into account dynamic heights of nodes
      let rawMaxY = Math.max(...computedYs) + 110;
      nodes.forEach(node => {
        const titleLines = wrapTextWithNewlines(node.name, 22);
        const detailLine1 = !node.properties?.hidePrimaryDetails ? getNodePrimaryLine(node) : '';
        const detailLine2 = getNodeSecondaryLine(node) || '';

        const d1Lines = wrapTextWithNewlines(detailLine1, 26);
        const d2Lines = wrapTextWithNewlines(detailLine2, 30);

        let totalTextHeight = titleLines.length * 14;
        if (d1Lines.length > 0) totalTextHeight += 4 + d1Lines.length * 12;
        if (d2Lines.length > 0) totalTextHeight += 4 + d2Lines.length * 11;

        const nh = Math.max(110, 46 + totalTextHeight + 24);
        const bottomEdge = node.y + nh;
        if (bottomEdge > rawMaxY) {
          rawMaxY = bottomEdge;
        }
      });

      const padding = 60;
      const minX = rawMinX - padding;
      const minY = rawMinY - padding;
      const width = Math.max(250, rawMaxX - rawMinX + (padding * 2));
      const height = Math.max(150, rawMaxY - rawMinY + (padding * 2));

      // 3. SVG Head and Defs
      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #ffffff;">`;
      svgContent += `
        <defs>
          <marker id="arrow-readonly" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
          </marker>
        </defs>
      `;

      // 4. Render connection curves
      connections.forEach(conn => {
        const src = nodes.find(n => n.id === conn.sourceId);
        const tgt = nodes.find(n => n.id === conn.targetId);
        if (!src || !tgt) return;

        const startX = src.x + 190 - minX;
        const startY = src.y + 45 - minY;
        const endX = tgt.x - minX;
        const endY = tgt.y + 45 - minY;

        const dx = Math.max(70, Math.abs(endX - startX) * 0.45);
        const pathData = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

        svgContent += `<path d="${pathData}" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-readonly)" />`;
      });

      // 5. Render connection labels
      resolvedLabels.forEach(label => {
        const validLabels = ((label.connection.labels && label.connection.labels.length > 0) 
          ? label.connection.labels 
          : [label.connection.label]).filter(Boolean) as string[];

        if (validLabels.length === 0) return;

        const lx = label.x - minX;
        const ly = label.y - minY;
        const pillHeight = 16;
        const pillGap = 4;
        const totalHeight = validLabels.length * pillHeight + (validLabels.length - 1) * pillGap;
        const startY = ly - totalHeight / 2;

        const maxLen = Math.max(...validLabels.map(l => l.length));
        const pillWidth = maxLen * 5.8 + 14;

        validLabels.forEach((lbl, idx) => {
          const py = startY + idx * (pillHeight + pillGap);
          svgContent += `
            <g>
              <rect x="${lx - pillWidth / 2}" y="${py}" width="${pillWidth}" height="${pillHeight}" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" />
              <text x="${lx}" y="${py + 11.5}" text-anchor="middle" fill="#0f766e" font-size="8.5" font-family="sans-serif, Arial" font-weight="extrabold">${escapeXml(lbl)}</text>
            </g>
          `;
        });
      });

      // 6. Render individual blocks (nodes)
      nodes.forEach(node => {
        const meta = NODE_METADATA[node.type];
        if (!meta) return;
        const scheme = getColorScheme(meta.color || 'slate');

        const nx = node.x - minX;
        const ny = node.y - minY;
        const nw = 190;

        // Compute text lines for layout and height
        const titleLines = wrapTextWithNewlines(node.name, 22);
        const detailLine1 = !node.properties?.hidePrimaryDetails ? getNodePrimaryLine(node) : '';
        const detailLine2 = getNodeSecondaryLine(node) || '';

        const d1Lines = wrapTextWithNewlines(detailLine1, 26);
        const d2Lines = wrapTextWithNewlines(detailLine2, 30);

        let totalTextHeight = titleLines.length * 14;
        if (d1Lines.length > 0) totalTextHeight += 4 + d1Lines.length * 12;
        if (d2Lines.length > 0) totalTextHeight += 4 + d2Lines.length * 11;

        const nh = Math.max(110, 46 + totalTextHeight + 24);

        // Card base & Decorative left band
        svgContent += `
          <g>
            <rect x="${nx}" y="${ny}" width="${nw}" height="${nh}" rx="12" fill="${scheme.fill}" stroke="${scheme.stroke}" stroke-width="2" />
            <path d="M ${nx + 1.5} ${ny + 12} A 10.5 10.5 0 0 1 ${nx + 12} ${ny + 1.5} L ${nx + 12} ${ny + 1.5} L ${nx + 12} ${ny + nh - 1.5} L ${nx + 12} ${ny + nh - 1.5} A 10.5 10.5 0 0 1 ${nx + 1.5} ${ny + nh - 12} Z" fill="${scheme.header}" />
            <text x="${nx + 18}" y="${ny + 22}" fill="${scheme.header}" font-size="9" font-weight="900" font-family="sans-serif, Arial" letter-spacing="0.8">${meta.label.toUpperCase()}</text>
        `;

        // Extension Badge (export SVG uniquement si détaillé)
        if (node.properties?.internalNumber && getDisplayDensity(node) === 'detailed' && !node.properties?.hidePrimaryDetails) {
          svgContent += `
            <g transform="translate(${nx + nw - 10}, ${ny + 16})">
              <rect x="-62" y="-8" width="62" height="16" rx="4" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1" />
              <text x="-31" text-anchor="middle" y="4" fill="#334155" font-size="8.5" font-weight="bold" font-family="sans-serif, Arial">N°${node.properties.internalNumber}</text>
            </g>
          `;
        }

        // Draw dynamic text lines with perfect offsets
        let currentY = ny + 46;

        titleLines.forEach((line) => {
          svgContent += `
            <text x="${nx + 18}" y="${currentY}" fill="#0f172a" font-size="12" font-weight="900" font-family="sans-serif, Arial">${escapeXml(line)}</text>
          `;
          currentY += 14;
        });

        if (d1Lines.length > 0) {
          currentY += 4;
          d1Lines.forEach((line) => {
            svgContent += `
              <text x="${nx + 18}" y="${currentY}" fill="#334155" font-size="10" font-family="sans-serif, Arial" font-weight="bold">${escapeXml(line)}</text>
            `;
            currentY += 12;
          });
        }

        if (d2Lines.length > 0) {
          currentY += 4;
          d2Lines.forEach((line) => {
            svgContent += `
              <text x="${nx + 18}" y="${currentY}" fill="#475569" font-size="9" font-family="sans-serif, Arial" font-weight="medium">${escapeXml(line)}</text>
            `;
            currentY += 11;
          });
        }

        // PABX Badge in SVG export if configured and not hidden
        if ((node.properties?.hasPabxOption || node.properties?.phoneType === 'Mobile PBU') && !node.properties?.hidePabxBadge && !node.properties?.hideBadges && !node.properties?.hideMetadata) {
          svgContent += `
            <g transform="translate(${nx + nw - 55}, ${ny + nh - 21})">
              <rect width="45" height="13" rx="3" fill="#fee2e2" stroke="#fca5a5" stroke-width="0.8" />
              <text x="22.5" text-anchor="middle" y="9.5" fill="#991b1b" font-size="7.5" font-weight="900" font-family="sans-serif, Arial">PABX</text>
            </g>
          `;
        }

        // Bottom type label badge unless hideMetadata
        if (!node.properties?.hideMetadata) {
          svgContent += `
            <g transform="translate(${nx + 18}, ${ny + nh - 21})">
              <rect width="90" height="13" rx="3" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="0.5" />
              <text x="6" y="9.5" fill="#64748b" font-size="7.5" font-weight="bold" font-family="sans-serif, Arial">${meta.label.toUpperCase()}</text>
              <text x="164" y="9.5" text-anchor="end" fill="#94a3b8" font-size="7" font-family="monospace, Courier">x:${node.x} y:${node.y}</text>
            </g>
          `;
        }

        svgContent += `</g>`;
      });

      svgContent += `</svg>`;

      // 7. Perform Action based on format
      if (format === 'svg') {
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `schema_telecom_${Date.now()}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // PNG export
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new window.Image();
        const scale = 4.0; // HD scaling
        img.width = width * scale;
        img.height = height * scale;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = width * scale;
          canvas.height = height * scale;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const pngUrl = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = `schema_telecom_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
          URL.revokeObjectURL(url);
        };
        img.src = url;
      }
    } catch (e) {
      console.error('Failed to export:', e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative" id="workspace-wrapper">
      {validationAlerts.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3 overflow-x-auto text-xs shrink-0 select-none">
          <div className="flex items-center gap-1.5 font-bold text-amber-800 shrink-0">
            <AlertTriangle size={14} />
            <span>Diagnostics ({validationAlerts.length})</span>
          </div>
          <div className="flex items-center gap-3 divide-x divide-amber-200">
            {validationAlerts.map((alert, idx) => (
              <button
                key={idx}
                type="button"
                className="pl-3 text-amber-800 hover:text-amber-950 transition-colors cursor-pointer text-left"
                onClick={() => alert.nodeId && onSelectNode(alert.nodeId)}
                title="Sélectionner le bloc concerné"
              >
                {alert.message}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="tf-toolbar py-2 px-4 text-[11px] text-slate-600 flex flex-wrap gap-2 items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="tf-chip">{visibleNodes.length} nœuds{hiddenIds.size ? ` · ${hiddenIds.size} masqués` : ''}</span>
          <span className="tf-chip">{visibleConnections.length} connexions</span>
          {nodes.length > 0 && (
            <button
              id="btn-auto-layout"
              type="button"
              onClick={triggerRepulsionAnimation}
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wide transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              title="Espacer les nœuds automatiquement"
            >
              <AlignHorizontalDistributeCenter size={12} />
              <span>Espacer</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-2.5 py-1 rounded-md text-[10px] cursor-pointer flex items-center gap-1"
            title="Rechercher (Ctrl+F)"
          >
            <Search size={12} />
            Rechercher
          </button>

          <button
            type="button"
            onClick={() => setAnnotationMode((v) => !v)}
            className={`font-semibold px-2.5 py-1 rounded-md text-[10px] cursor-pointer flex items-center gap-1 border ${
              annotationMode
                ? 'bg-amber-500 border-amber-500 text-white'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Dessiner une zone / cadre (bâtiment, salle…)"
          >
            <Square size={12} />
            Zone
          </button>

          <div className="flex items-center gap-0.5 bg-white rounded-md p-0.5 border border-slate-200 ml-1">
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(0.4, prev - 0.15))}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
              title="Zoom arrière"
            >
              <ZoomOut size={12} />
            </button>
            <span className="font-mono text-[10px] font-semibold px-1.5 text-slate-700 select-none min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(2.0, prev + 0.15))}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
              title="Zoom avant"
            >
              <ZoomIn size={12} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1.0)}
              className="px-1.5 py-0.5 hover:bg-slate-100 rounded text-slate-600 font-semibold text-[9px] cursor-pointer border border-slate-200"
              title="Réinitialiser le zoom"
            >
              100%
            </button>
          </div>

          {onToggleFullscreen && (
            <button
              id="btn-toggle-fullscreen"
              type="button"
              onClick={onToggleFullscreen}
              className={`flex items-center gap-1 font-semibold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wide transition-colors cursor-pointer border ${
                isFullscreen
                  ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            >
              {isFullscreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
              <span>{isFullscreen ? 'Quitter' : 'Plein écran'}</span>
            </button>
          )}

          <button
            id="btn-open-tutorial-top"
            type="button"
            onClick={() => setIsTutorialOpen(true)}
            className="flex items-center gap-1 font-semibold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wide transition-colors cursor-pointer border bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
            title="Tutoriel et raccourcis"
          >
            <HelpCircle size={11} className="text-brand-600" />
            <span>Tutoriel</span>
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {drawingConnSourceId ? (
            <span className="text-brand-700 font-semibold text-[10px]">
              Connexion en cours — cliquez une destination (Échap pour annuler)
            </span>
          ) : (
            <span className="text-[10px] hidden md:inline text-slate-400">
              Glissez pour organiser · tirez depuis (+) pour lier
            </span>
          )}

          {nodes.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => exportAsImage('svg')}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-2 py-1 rounded-md text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                title="Exporter en SVG"
              >
                <Download size={11} />
                <span>SVG</span>
              </button>
              <button
                type="button"
                onClick={() => exportAsImage('png')}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-2.5 py-1 rounded-md text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                title="Exporter en PNG HD"
              >
                <Image size={11} />
                <span>PNG</span>
              </button>
            </div>
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
        className="flex-1 overflow-auto relative scrollbar-thin scroll-smooth animate-fade-in bg-[#f0f4f8]"
        id="panning-canvas-container"
        style={{ cursor: drawingConnSourceId ? 'cell' : 'default' }}
      >
        {/* Render clean empty state warning overlay if workspace has 0 nodes */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-6 z-30 pointer-events-none">
            <div className="max-w-md w-full bg-white rounded-2xl p-7 border border-slate-200 shadow-lg pointer-events-auto text-center space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mx-auto border border-brand-100">
                <PhoneIncoming size={22} />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-xl tracking-tight">Canevas vide</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Ajoutez des blocs depuis la palette ou chargez le scénario de démonstration pour démarrer.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-2.5 text-xs text-slate-600">
                <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">Démarrage rapide</div>
                <div className="flex gap-2">
                  <span className="font-bold text-brand-700 font-mono">1</span>
                  <span>Ajoutez numéros, postes et règles depuis le panneau de gauche.</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-brand-700 font-mono">2</span>
                  <span>
                    Reliez les blocs en tirant depuis le <span className="font-bold text-brand-700">(+)</span> à droite d&apos;un nœud.
                  </span>
                </div>
              </div>

              {onLoadDemo && (
                <button
                  id="btn-load-demo-empty"
                  type="button"
                  onClick={onLoadDemo}
                  className="w-full bg-brand-600 text-white hover:bg-brand-700 px-4 py-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Layers size={14} />
                  <span>Charger la démo Acme Corp</span>
                </button>
              )}

              <button
                id="btn-open-tutorial-empty"
                type="button"
                onClick={() => setIsTutorialOpen(true)}
                className="w-full bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-slate-200 cursor-pointer"
              >
                <HelpCircle size={15} className="text-brand-600" />
                <span>Tutoriel &amp; raccourcis</span>
              </button>
            </div>
          </div>
        )}

        <div 
          className="tf-canvas-grid relative"
          id="grid-canvas-stage"
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
            cursor: annotationMode ? 'crosshair' : undefined,
          }}
          onMouseDown={(e) => {
            if (!annotationMode || !onUpdateAnnotations) return;
            if ((e.target as HTMLElement).closest('[id^="node-"], [id^="outlet-"], [id^="inlet-"]')) return;
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const x = (e.clientX - rect.left) / zoom;
            const y = (e.clientY - rect.top) / zoom;
            setDrawingAnnot({ x, y });
            e.stopPropagation();
          }}
          onMouseUp={(e) => {
            if (!annotationMode || !drawingAnnot || !onUpdateAnnotations) return;
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const x2 = (e.clientX - rect.left) / zoom;
            const y2 = (e.clientY - rect.top) / zoom;
            const x = Math.min(drawingAnnot.x, x2);
            const y = Math.min(drawingAnnot.y, y2);
            const width = Math.max(80, Math.abs(x2 - drawingAnnot.x));
            const height = Math.max(48, Math.abs(y2 - drawingAnnot.y));
            const label = window.prompt('Nom de la zone (ex. Bâtiment A)', 'Zone') || 'Zone';
            onUpdateAnnotations([
              ...annotations,
              {
                id: `ann-${Date.now()}`,
                label,
                x,
                y,
                width,
                height,
                color: '#0d9488',
              },
            ]);
            setDrawingAnnot(null);
            setAnnotationMode(false);
            e.stopPropagation();
          }}
        >
          {/* Annotations / zones */}
          {annotations.map((a) => (
            <div
              key={a.id}
              className="absolute rounded-xl border-2 border-dashed pointer-events-auto group"
              style={{
                left: a.x,
                top: a.y,
                width: a.width,
                height: a.height,
                borderColor: a.color || '#0d9488',
                background: `${a.color || '#0d9488'}14`,
                zIndex: 5,
              }}
            >
              <div
                className="absolute -top-2.5 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-sm"
                style={{ background: a.color || '#0d9488' }}
              >
                {a.label}
              </div>
              {onUpdateAnnotations && (
                <button
                  type="button"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-white/90 text-rose-600 rounded p-0.5 cursor-pointer border border-rose-200"
                  title="Supprimer la zone"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateAnnotations(annotations.filter((x) => x.id !== a.id));
                  }}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}

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
            {visibleConnections.map(conn => {
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
                  className="absolute bg-brand-500/15 border border-brand-500 rounded pointer-events-none z-50"
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
              let nextLabels = [...currentLabels];
              nextLabels[index] = value;
              // Clean up any empty strings if there are multiple elements, to avoid empty pills alongside non-empty ones
              if (nextLabels.length > 1) {
                nextLabels = nextLabels.filter(lbl => lbl && lbl.trim() !== "");
              }
              onUpdateConnectionLabel(conn.id, nextLabels[0] || '', nextLabels);
            };
            
            const handleAddLabel = () => {
              // If the current labels are just empty or single empty label, replace it
              const hasActualLabels = currentLabels.some(lbl => lbl && lbl.trim() !== "");
              const nextLabels = hasActualLabels ? [...currentLabels, 'touche 0'] : ['appel direct'];
              onUpdateConnectionLabel(conn.id, nextLabels[0], nextLabels);
            };
            
            const handleRemoveLabelAt = (index: number) => {
              const nextLabels = currentLabels.filter((_, i) => i !== index);
              onUpdateConnectionLabel(conn.id, nextLabels[0] || '', nextLabels);
            };

            const hasVisibleLabels = currentLabels.some(lbl => lbl && lbl.trim() !== "");

            const handleLabelMouseDown = (e: React.MouseEvent) => {
              const target = e.target as HTMLElement;
              if (target.closest('input, select, option, button')) {
                return;
              }
              e.stopPropagation();
              e.preventDefault();

              if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const mouseX = (e.clientX - rect.left + containerRef.current.scrollLeft) / zoom;
                const mouseY = (e.clientY - rect.top + containerRef.current.scrollTop) / zoom;

                const currentOffsetX = conn.labelOffset?.x ?? (l.x - l.origX);
                const currentOffsetY = conn.labelOffset?.y ?? (l.y - l.origY);

                setDraggingLabelId(conn.id);
                setDragLabelStartMouse({ x: mouseX, y: mouseY });
                setDragLabelInitialOffset({ x: currentOffsetX, y: currentOffsetY });
              }
            };

            const handleLabelDoubleClick = (e: React.MouseEvent) => {
              const target = e.target as HTMLElement;
              if (target.closest('input, select, option, button')) {
                return;
              }
              e.stopPropagation();
              e.preventDefault();
              setDraggingLabelId(null);
              // Double click resets label position to automatic midpoint
              onUpdateConnectionLabel(conn.id, conn.label, conn.labels, null);
            };

            const isDraggingThisLabel = draggingLabelId === conn.id;

            return (
              <div
                key={`label-${conn.id}`}
                onMouseDown={handleLabelMouseDown}
                onDoubleClick={handleLabelDoubleClick}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 text-[10px] text-slate-700 select-none cursor-grab active:cursor-grabbing transition-all duration-150 ${
                  isDraggingThisLabel ? 'scale-105 shadow-md z-30' : ''
                }`}
                style={{ left: l.x, top: l.y }}
                title="Glissez-déposez pour déplacer l'étiquette. Double-cliquez pour la réinitialiser."
              >
                {hasVisibleLabels && (
                  <div className="flex flex-col gap-1 items-center">
                    {currentLabels.map((lbl, idx) => {
                      if (!lbl || lbl.trim() === "") return null;

                      const isEditingThis = editingLabel?.connId === conn.id && editingLabel?.index === idx;

                      return (
                        <div 
                          key={idx} 
                          className="flex items-center gap-1 bg-white/90  text-slate-900 rounded-md px-1.5 py-0.5 hover:bg-white transition-all shadow-sm border border-slate-200"
                        >
                          {isEditingThis ? (
                            <input
                              type="text"
                              value={tempLabelValue}
                              autoFocus
                              onChange={(e) => setTempLabelValue(e.target.value)}
                              onBlur={() => {
                                handleUpdateLabelAt(idx, tempLabelValue);
                                setEditingLabel(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateLabelAt(idx, tempLabelValue);
                                  setEditingLabel(null);
                                } else if (e.key === 'Escape') {
                                  setEditingLabel(null);
                                }
                              }}
                              className="bg-white border border-blue-500 rounded px-1 py-0.5 text-[9px] font-bold text-black outline-none text-center transition-all"
                              style={{ width: `${Math.max(3, tempLabelValue.length + 1.5)}ch`, minWidth: '3rem' }}
                              placeholder="Saisir..."
                              id={`input-label-${conn.id}-${idx}`}
                            />
                          ) : (
                            <>
                              <select
                                value={lbl}
                                onChange={(e) => {
                                  if (e.target.value === '__custom__') {
                                    setEditingLabel({ connId: conn.id, index: idx });
                                    setTempLabelValue(lbl);
                                  } else {
                                    handleUpdateLabelAt(idx, e.target.value);
                                  }
                                }}
                                className="bg-transparent border-none font-extrabold text-[9px] text-black focus:outline-none cursor-pointer text-center px-0.5 appearance-none"
                                style={{ width: `${Math.max(1.5, lbl.length + 0.8)}ch`, minWidth: '1.2rem', maxWidth: '22rem' }}
                                id={`select-label-${conn.id}-${idx}`}
                              >
                                <option value="">(Sans étiquette)</option>
                                {CONNECTION_LABEL_PRESETS.map((p, i) => (
                                  p && <option key={i} value={p}>{p}</option>
                                ))}
                                {!CONNECTION_LABEL_PRESETS.includes(lbl) && lbl && (
                                  <option value={lbl}>{lbl}</option>
                                )}
                                <option value="__custom__">✍️ Saisir un texte...</option>
                              </select>

                              <button
                                onClick={() => {
                                  setEditingLabel({ connId: conn.id, index: idx });
                                  setTempLabelValue(lbl);
                                }}
                                className="text-slate-500 hover:text-blue-600 p-0.5 rounded-full hover:bg-blue-50 transition-colors shrink-0 cursor-pointer"
                                title="Modifier le libellé (saisir une valeur)"
                                id={`edit-label-btn-${conn.id}-${idx}`}
                              >
                                <Edit3 size={8} strokeWidth={2.5} />
                              </button>
                            </>
                          )}
                          
                          <button
                            onClick={() => handleRemoveLabelAt(idx)}
                            className="text-slate-500 hover:text-red-500 p-0.5 rounded-full hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                            title="Supprimer ce libellé"
                            id={`remove-label-btn-${conn.id}-${idx}`}
                          >
                            <X size={8} strokeWidth={2.5} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Centered minimal + button to add option */}
                <button
                  onClick={handleAddLabel}
                  className="w-5 h-5 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 rounded-full transition-all shadow-sm cursor-pointer border border-blue-100 hover:scale-110 active:scale-95"
                  title="Ajouter un autre choix/nom de touche à cette même connexion"
                  id={`add-label-btn-${conn.id}`}
                >
                  <Plus size={11} strokeWidth={3} />
                </button>
              </div>
            );
          })}

          {/* Render individual telephony blocks as absolute-positioned cards */}
          {nodesInView.map(node => {
            const meta = NODE_METADATA[node.type];
            if (!meta) return null;
            const isSelected = selectedNodeId === node.id || (selectedNodeIds || []).includes(node.id);
            const hasAlert = validationAlerts.some(a => a.nodeId === node.id);
            const pos = getResolvedPos(node);
            const isDraggingThis = !!livePositions?.[node.id];
            const density = getDisplayDensity(node);
            const primary = !node.properties?.hidePrimaryDetails ? getNodePrimaryLine(node) : '';
            const secondary = getNodeSecondaryLine(node);
            const showBadges = shouldShowBadges(node);
            const showMeta = density === 'detailed' && !node.properties?.hideMetadata;
            const showVoicemailExtra =
              node.type === 'voicemail' &&
              density === 'detailed' &&
              !!node.properties.showVoicemailTextOnNode &&
              !!node.properties.voicemailText;
            const hasBodyContent = !!(primary || secondary || showBadges || showMeta || showVoicemailExtra || hasAlert);
            const minHClass =
              density === 'compact'
                ? (hasBodyContent ? 'min-h-[56px]' : 'min-h-[44px]')
                : density === 'standard'
                ? 'min-h-[72px]'
                : 'min-h-[96px]';

            return (
              <div
                id={`node-${node.id}`}
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onMouseUp={(e) => drawingConnSourceId && drawingConnSourceId !== node.id ? completeConnection(e, node.id) : null}
                onMouseEnter={(e) => handleNodeMouseEnter(e, node)}
                onMouseMove={handleNodeMouseMove}
                onMouseLeave={handleNodeMouseLeave}
                className={`absolute w-[190px] ${minHClass} h-auto flex flex-col rounded-xl glass-node border select-none ${
                  hasBodyContent ? 'pb-1' : 'pb-0'
                } ${
                  isDraggingThis ? '' : 'transition-[box-shadow,transform,min-height] duration-150'
                } ${
                  isSelected 
                    ? 'border-brand-500 ring-4 ring-brand-500/10 shadow-xl scale-[1.02]' 
                    : hasAlert
                    ? 'border-amber-400 bg-amber-500/5 shadow-md'
                    : node.type === 'junction'
                    ? 'border-slate-300 border-dashed shadow-sm bg-slate-50/80'
                    : 'border-slate-200 shadow-sm'
                }`}
                style={{ left: pos.x, top: pos.y, zIndex: isSelected || isDraggingThis ? 30 : 20 }}
              >
                <div className={`px-2.5 ${density === 'compact' ? 'py-1' : 'py-1.5'} ${
                  hasBodyContent ? 'rounded-t-xl border-b border-white/20' : 'rounded-xl'
                } bg-white/40 flex items-center justify-between drag-handle gap-1`}>
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="shrink-0">{getIcon(meta.iconName, meta.category)}</span>
                    <span className="text-[11px] font-extrabold text-slate-800 break-words whitespace-normal leading-tight" title={node.name}>
                      {node.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-0.5 shrink-0">
                    {(() => {
                      const childCount = getDescendantIds(node.id, connections, nodes).length;
                      if (childCount === 0 || !onToggleCollapse) return null;
                      const isCollapsed = collapsedNodeIds.includes(node.id);
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleCollapse(node.id);
                          }}
                          className="text-slate-400 hover:text-brand-600 hover:bg-brand-50 p-0.5 rounded transition-all cursor-pointer flex items-center"
                          title={isCollapsed ? `Déplier la branche (${childCount})` : `Replier la branche (${childCount})`}
                        >
                          {isCollapsed ? <ChevronRightIcon size={12} /> : <ChevronDown size={12} />}
                          {isCollapsed && (
                            <span className="text-[8px] font-bold text-brand-700 ml-0.5">+{childCount}</span>
                          )}
                        </button>
                      );
                    })()}
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

                {hasBodyContent && (
                <div className={`${density === 'compact' ? 'p-1.5 gap-0.5' : 'p-2 gap-1'} flex flex-col text-left relative overflow-hidden bg-white/20 rounded-b-xl`}>
                  {hasAlert && (
                    <div className="absolute right-1 bottom-1 p-0.5 bg-amber-500 text-white rounded-full shadow-sm z-10" title="Problème détecté">
                      <AlertTriangle size={10} className="animate-pulse" />
                    </div>
                  )}

                  {(primary || secondary || showVoicemailExtra) && (
                    <div className="text-[10px] break-words whitespace-normal leading-snug">
                      {primary ? (
                        <span className="font-semibold text-slate-800 block">{primary}</span>
                      ) : null}
                      {secondary ? (
                        <span className="block text-slate-500 text-[9px] font-medium mt-0.5 leading-tight">
                          {secondary}
                        </span>
                      ) : null}
                      {showVoicemailExtra && (
                          <div className="mt-1 p-1 rounded bg-rose-50 border border-rose-100 text-[8.5px] font-normal text-rose-800 break-words whitespace-pre-wrap leading-tight">
                            &ldquo;{node.properties.voicemailText}&rdquo;
                          </div>
                        )}
                    </div>
                  )}

                  {showBadges && (
                    <div className="flex flex-wrap gap-1 select-none pointer-events-none">
                      {(() => {
                        const badges: React.ReactNode[] = [];
                        const max = maxBadgesForNode(node);
                        if (node.properties.nodeStatus && badges.length < max) {
                          badges.push(
                            <span
                              key="status"
                              className={`inline-flex items-center gap-0.5 text-[7px] font-black px-1 rounded-xs border leading-tight ${
                                ['disponible', 'ouvert', 'jour'].includes(node.properties.nodeStatus)
                                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800'
                                  : ['fermé', 'nuit', 'indisponible', 'hors service'].includes(node.properties.nodeStatus)
                                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-800'
                                  : 'bg-amber-500/10 border-amber-500/25 text-amber-800'
                              }`}
                            >
                              <span className="truncate max-w-[50px] uppercase">
                                {node.properties.nodeStatusCustom || node.properties.nodeStatus}
                              </span>
                            </span>
                          );
                        }
                        if (node.properties.forwardType === 'manual' && badges.length < max) {
                          badges.push(
                            <span key="fwd-man" className="inline-flex text-[7px] font-black px-1 rounded-xs bg-amber-500/10 border border-amber-500/25 text-amber-800 uppercase">
                              MAN
                            </span>
                          );
                        }
                        if (node.properties.forwardType === 'scheduled' && badges.length < max) {
                          badges.push(
                            <span key="fwd-auto" className="inline-flex text-[7px] font-black px-1 rounded-xs bg-cyan-500/10 border border-cyan-500/25 text-cyan-800 uppercase">
                              AUTO
                            </span>
                          );
                        }
                        if (
                          (node.properties.hasPabxOption || node.properties.phoneType === 'Mobile PBU') &&
                          !node.properties.hidePabxBadge &&
                          badges.length < max
                        ) {
                          badges.push(
                            <span key="pabx" className="inline-flex text-[7px] font-extrabold px-1 py-0.5 rounded-xs bg-red-600 text-white">
                              PABX
                            </span>
                          );
                        }
                        if (node.properties.keyConfig && badges.length < max) {
                          badges.push(
                            <span key="key" className="inline-flex text-[7px] font-black px-1 rounded-xs bg-purple-500/10 border border-purple-500/25 text-purple-800 uppercase">
                              {node.properties.keyConfig.keyType === 'Code fonction' ? 'CODE' : (node.properties.keyConfig.keyType || 'BLF')}
                            </span>
                          );
                        }
                        if (node.properties.targetPlatform && badges.length < max) {
                          badges.push(
                            <span key="plat" className="inline-flex text-[7px] font-extrabold px-1 rounded-xs bg-slate-500/10 border border-slate-500/25 text-slate-800">
                              <span className="truncate max-w-[40px]">
                                {node.properties.targetPlatform === 'Centrex opérateur' ? 'Centrex' : node.properties.targetPlatform}
                              </span>
                            </span>
                          );
                        }
                        return badges;
                      })()}
                    </div>
                  )}

                  {showMeta && (
                    <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100/50">
                      <span className="truncate bg-white/40 border border-white/40 px-1 py-0.5 rounded text-slate-700 font-medium shadow-sm">
                        {meta.label}
                      </span>
                    </div>
                  )}
                </div>
                )}

                {/* VISUAL PORTS — centrés verticalement sur la hauteur réelle (ResizeObserver) */}
                <div
                  id={`inlet-${node.id}`}
                  onClick={(e) => drawingConnSourceId ? completeConnection(e, node.id) : null}
                  onMouseUp={(e) => drawingConnSourceId ? completeConnection(e, node.id) : null}
                  className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border bg-white focus:outline-none transition-all z-35 cursor-pointer ${
                    drawingConnSourceId 
                      ? 'border-blue-500 bg-blue-105 ring-4 ring-blue-550/20 animate-pulse scale-125' 
                      : 'border-slate-300 hover:bg-slate-100 hover:border-slate-450 hover:scale-125'
                  }`}
                  title={drawingConnSourceId ? "Relâchez ou cliquez pour brancher la connexion ici" : "Port d'entrée direct d'appels"}
                />

                <button
                  id={`outlet-${node.id}`}
                  onMouseDown={(e) => startDrawingConnection(e, node.id)}
                  onMouseUp={(e) => drawingConnSourceId && drawingConnSourceId !== node.id ? completeConnection(e, node.id) : null}
                  className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-slate-300 bg-white hover:bg-brand-600 hover:border-brand-600 hover:scale-125 transition-all z-30 flex items-center justify-center cursor-crosshair group-hover:scale-110"
                  title="Faites glisser et relâchez sur un autre nœud pour créer une liaison"
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

      <CanvasNavTools
        nodes={nodes}
        hiddenIds={hiddenIds}
        canvasWidth={canvasSize.width}
        canvasHeight={canvasSize.height}
        containerRef={containerRef}
        onFocusNode={focusNode}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
      />

      {/* Interactive Usage Tutorial Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  );
}
