/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import PropertyPanel from './components/PropertyPanel';
import DataManagement from './components/DataManagement';
import PreviewSection from './components/PreviewSection';
import { TelecomProject, CallNode, Connection, NodeType, PhoneLine, DirectoryUser, ReusableTemplate, CanvasAnnotation } from './types';
import { BLANK_PROJECT, DEMO_PROJECT, NODE_METADATA } from './utils/templates';
import { TYPE_CHANGE_CARRIED_KEYS, migrateLoadedProject } from './utils/nodeDisplay';
import { createSnapshot, bumpVersion, applySnapshotData, overwriteSnapshot, deleteSnapshot } from './utils/changelog';
import { openPdfReport } from './utils/pdfReport';
import { buildExportFilename } from './utils/exportFilename';
import HistoryCompareModal from './components/HistoryCompareModal';
import { Trash2, CheckCircle, Info, X, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'data' | 'preview'>('editor');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    type: 'danger' | 'info' | 'success';
    onConfirm: () => void;
  } | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [project, setProject] = useState<TelecomProject>(() => JSON.parse(JSON.stringify(BLANK_PROJECT)));
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  /** État « vivant » gelé pendant la consultation d'un instantané */
  const historyCheckoutRef = useRef<TelecomProject | null>(null);
  const [viewingSnapshotId, setViewingSnapshotId] = useState<string | null>(null);

  // History Undo/Redo Stacks
  const [past, setPast] = useState<TelecomProject[]>([]);
  const [future, setFuture] = useState<TelecomProject[]>([]);

  // Refs to always have fresh state inside keydown event handler
  const projectRef = useRef<TelecomProject>(project);
  const pastRef = useRef<TelecomProject[]>(past);
  const futureRef = useRef<TelecomProject[]>(future);

  useEffect(() => {
    projectRef.current = project;
    pastRef.current = past;
    futureRef.current = future;
  }, [project, past, future]);

  const pushToHistory = (stateToRecord: TelecomProject) => {
    const cloned = JSON.parse(JSON.stringify(stateToRecord));
    setPast(prev => {
      const next = [...prev, cloned];
      if (next.length > 50) next.shift();
      return next;
    });
    setFuture([]);
  };

  const handleUndo = () => {
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    const newPast = pastRef.current.slice(0, pastRef.current.length - 1);

    setPast(newPast);
    setFuture(prev => [JSON.parse(JSON.stringify(projectRef.current)), ...prev]);
    setProject(previous);
    
    localStorage.setItem('teleflux_project_save', JSON.stringify(previous));
    setUnsavedChanges(true);
  };

  const handleRedo = () => {
    if (futureRef.current.length === 0) return;
    const nextState = futureRef.current[0];
    const newFuture = futureRef.current.slice(1);

    setFuture(newFuture);
    setPast(prev => [...prev, JSON.parse(JSON.stringify(projectRef.current))]);
    setProject(nextState);

    localStorage.setItem('teleflux_project_save', JSON.stringify(nextState));
    setUnsavedChanges(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        return;
      }

      const isZ = e.key.toLowerCase() === 'z';
      const isY = e.key.toLowerCase() === 'y';
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (isCtrlOrMeta) {
        if (isZ && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (isY || (isZ && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleDragStart = () => {
    pushToHistory(project);
  };

  // 1. Initial hydration from local Storage
  useEffect(() => {
    const saved = localStorage.getItem('teleflux_project_save');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.projectName !== undefined && Array.isArray(parsed.nodes)) {
          setProject(migrateLoadedProject(parsed));
        }
      } catch (err) {
        console.error('Failed to load project from local storage: ', err);
      }
    } else {
      setProject(JSON.parse(JSON.stringify(BLANK_PROJECT)));
    }
  }, []);

  // 2. Auto-save triggers whenever project state updates
  const saveProjectToLocalStorage = (nextProject: TelecomProject) => {
    localStorage.setItem('teleflux_project_save', JSON.stringify(nextProject));
    setUnsavedChanges(false);
  };

  const updateProjectState = (updates: Partial<TelecomProject> | ((prev: TelecomProject) => TelecomProject)) => {
    setProject(prev => {
      // Record current state in history
      const cloned = JSON.parse(JSON.stringify(prev));
      setPast(history => {
        const next = [...history, cloned];
        if (next.length > 50) next.shift();
        return next;
      });
      setFuture([]);

      const next = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      // Auto save
      localStorage.setItem('teleflux_project_save', JSON.stringify(next));
      setUnsavedChanges(true);
      return next;
    });
  };

  // Metadata update handler
  const handleUpdateProjectMeta = (updates: Partial<TelecomProject>) => {
    updateProjectState(updates);
  };

  // Node CRUD handlers
  const handleAddNode = (type: NodeType, templateProps?: CallNode['properties']) => {
    const meta = NODE_METADATA[type];
    const baseProps = templateProps || meta?.defaultProps || {};

    // Stagger spawn positions so nodes do not overlap centrally
    const offsetIndex = project.nodes.length;
    const spawnX = 140 + (offsetIndex % 6) * 50;
    const spawnY = 80 + (offsetIndex % 4) * 45;

    const newNode: CallNode = {
      id: `node-${Date.now()}`,
      type,
      name: `Nouveau ${meta?.label || type}`,
      x: spawnX,
      y: spawnY,
      properties: { ...baseProps }
    };

    updateProjectState(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    
    // Select the new node instantly
    setSelectedNodeId(newNode.id);
    setSelectedNodeIds([newNode.id]);
  };

  const handleUpdateNodeCoords = (id: string, x: number, y: number) => {
    setProject(prev => {
      const updatedNodes = prev.nodes.map(n => n.id === id ? { ...n, x, y } : n);
      const next = { ...prev, nodes: updatedNodes };
      localStorage.setItem('teleflux_project_save', JSON.stringify(next));
      return next;
    });
  };

  const handleSelectNodes = (ids: string[]) => {
    setSelectedNodeIds(ids);
    if (ids.length > 0) {
      setSelectedNodeId(ids[ids.length - 1]);
    } else {
      setSelectedNodeId(null);
    }
  };

  const handleUpdateNodesCoords = (updates: { id: string; x: number; y: number }[]) => {
    if (updates.length === 0) return;
    setProject(prev => {
      const coordsMap = new Map(updates.map(u => [u.id, u]));
      let changed = false;
      const updatedNodes = prev.nodes.map(n => {
        const u = coordsMap.get(n.id);
        if (u && (u.x !== n.x || u.y !== n.y)) {
          changed = true;
          return { ...n, x: u.x, y: u.y };
        }
        return n;
      });
      if (!changed) return prev;
      const next = { ...prev, nodes: updatedNodes };
      localStorage.setItem('teleflux_project_save', JSON.stringify(next));
      return next;
    });
  };

  const handleUpdateNodeProperties = (id: string, updates: Partial<CallNode['properties']>) => {
    updateProjectState(prev => {
      const updatedNodes = prev.nodes.map(n => {
        if (n.id === id) {
          return {
            ...n,
            properties: { ...n.properties, ...updates }
          };
        }
        return n;
      });
      return { ...prev, nodes: updatedNodes };
    });
  };

  const handleUpdateNodeName = (id: string, name: string) => {
    updateProjectState(prev => {
      const updatedNodes = prev.nodes.map(n => n.id === id ? { ...n, name } : n);
      return { ...prev, nodes: updatedNodes };
    });
  };

  const handleDeleteNode = (id: string) => {
    updateProjectState(prev => {
      // 1. Remove node
      const updatedNodes = prev.nodes.filter(n => n.id !== id);
      // 2. Cascade delete associated connections
      const updatedConns = prev.connections.filter(c => c.sourceId !== id && c.targetId !== id);
      return {
        ...prev,
        nodes: updatedNodes,
        connections: updatedConns
      };
    });
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
    setSelectedNodeIds(prev => prev.filter(selectedId => selectedId !== id));
  };

  // Creating reusable template from active node card configuration
  const handleCreateTemplateFromNode = (node: CallNode, templateName: string, templateDesc: string) => {
    const newTemplate: ReusableTemplate = {
      id: `t-custom-${Date.now()}`,
      name: templateName,
      description: templateDesc,
      type: node.type,
      properties: { ...node.properties }
    };

    updateProjectState(prev => ({
      ...prev,
      templates: [...prev.templates, newTemplate]
    }));
  };

  const handleCloneNode = (id: string) => {
    const source = project.nodes.find(n => n.id === id);
    if (!source) return;
    const clone: CallNode = {
      ...JSON.parse(JSON.stringify(source)),
      id: `node-${Date.now()}`,
      name: `${source.name} (copie)`,
      x: source.x + 40,
      y: source.y + 40,
    };
    updateProjectState(prev => ({
      ...prev,
      nodes: [...prev.nodes, clone],
    }));
    setSelectedNodeId(clone.id);
    setSelectedNodeIds([clone.id]);
  };

  const handleToggleCollapse = (nodeId: string) => {
    updateProjectState((prev) => {
      const current = new Set(prev.collapsedNodeIds || []);
      if (current.has(nodeId)) current.delete(nodeId);
      else current.add(nodeId);
      return { ...prev, collapsedNodeIds: [...current] };
    });
  };

  const handleUpdateAnnotations = (annotations: CanvasAnnotation[]) => {
    updateProjectState((prev) => ({ ...prev, annotations }));
  };

  const handleViewSnapshot = (snapshotId: string) => {
    const snap = project.snapshots?.find((s) => s.id === snapshotId);
    if (!snap) return;

    // Gel de l'état actuel une seule fois (dernier état connu)
    let checkout = historyCheckoutRef.current;
    if (!checkout) {
      checkout = JSON.parse(JSON.stringify(project));
      historyCheckoutRef.current = checkout;
    }

    const next = applySnapshotData(
      { ...checkout, snapshots: project.snapshots },
      snap.data
    );
    next.snapshots = project.snapshots;
    setProject(next);
    setViewingSnapshotId(snapshotId);
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setPast([]);
    setFuture([]);
    localStorage.setItem('teleflux_project_save', JSON.stringify(next));
  };

  const handleReturnToCurrent = () => {
    const checkout = historyCheckoutRef.current;
    if (!checkout) {
      setViewingSnapshotId(null);
      return;
    }
    const restored = {
      ...JSON.parse(JSON.stringify(checkout)),
      snapshots: project.snapshots,
    };
    setProject(restored);
    historyCheckoutRef.current = null;
    setViewingSnapshotId(null);
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setPast([]);
    setFuture([]);
    localStorage.setItem('teleflux_project_save', JSON.stringify(restored));
  };

  const handleOverwriteViewedSnapshot = (snapshotId: string) => {
    const next = overwriteSnapshot(project, snapshotId);
    historyCheckoutRef.current = null;
    setViewingSnapshotId(null);
    setProject(next);
    setPast([]);
    setFuture([]);
    setUnsavedChanges(true);
    localStorage.setItem('teleflux_project_save', JSON.stringify(next));
  };

  const handleSaveAsNewFromView = (label?: string) => {
    const next = createSnapshot(
      project,
      label || `Modification ${new Date().toLocaleString('fr-FR')}`
    );
    historyCheckoutRef.current = null;
    setViewingSnapshotId(null);
    setProject(next);
    setPast([]);
    setFuture([]);
    setUnsavedChanges(true);
    localStorage.setItem('teleflux_project_save', JSON.stringify(next));
  };

  const clearSnapshotView = () => {
    historyCheckoutRef.current = null;
    setViewingSnapshotId(null);
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    // Si on consultait cet instantané, revenir d'abord à l'état actuel
    if (viewingSnapshotId === snapshotId) {
      const checkout = historyCheckoutRef.current;
      if (checkout) {
        const restored = {
          ...JSON.parse(JSON.stringify(checkout)),
          snapshots: (project.snapshots || []).filter((s) => s.id !== snapshotId),
        };
        historyCheckoutRef.current = null;
        setViewingSnapshotId(null);
        setProject(restored);
        setPast([]);
        setFuture([]);
        setUnsavedChanges(true);
        localStorage.setItem('teleflux_project_save', JSON.stringify(restored));
        return;
      }
    }

    updateProjectState((prev) => deleteSnapshot(prev, snapshotId));
  };

  const handleChangeNodeType = (id: string, newType: NodeType) => {
    updateProjectState(prev => {
      const meta = NODE_METADATA[newType];
      if (!meta) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map(n => {
          if (n.id !== id) return n;
          if (n.type === newType) return n;
          const carried: CallNode['properties'] = {};
          TYPE_CHANGE_CARRIED_KEYS.forEach((key) => {
            const val = n.properties[key];
            if (val !== undefined) {
              (carried as Record<string, unknown>)[key as string] = val;
            }
          });
          return {
            ...n,
            type: newType,
            properties: {
              ...meta.defaultProps,
              ...carried,
              displayDensity: carried.displayDensity || 'standard',
              hideDescription: carried.hideDescription ?? true,
              hideBadges: carried.hideBadges ?? true,
            },
          };
        }),
      };
    });
  };

  const handleApplyTemplate = (tmpl: ReusableTemplate) => {
    handleAddNode(tmpl.type, tmpl.properties);
  };

  // Connection CRUD handlers
  const handleAddConnection = (sourceId: string, targetId: string, label: string) => {
    const newConn: Connection = {
      id: `conn-${Date.now()}`,
      sourceId,
      targetId,
      label
    };
    updateProjectState(prev => ({
      ...prev,
      connections: [...prev.connections, newConn]
    }));
  };

  const handleDeleteConnection = (id: string) => {
    updateProjectState(prev => ({
      ...prev,
      connections: prev.connections.filter(c => c.id !== id)
    }));
  };

  const handleUpdateConnectionLabel = (id: string, label: string, labels?: string[], labelOffset?: { x: number; y: number } | null) => {
    updateProjectState(prev => {
      const updatedConns = prev.connections.map(c => {
        if (c.id !== id) return c;
        const newOffset = labelOffset === null ? undefined : (labelOffset !== undefined ? labelOffset : c.labelOffset);
        return {
          ...c,
          label,
          labels: labels || c.labels,
          labelOffset: newOffset
        };
      });
      return { ...prev, connections: updatedConns };
    });
  };

  // Trunks Operator adjustments
  const handleUpdateLines = (lines: PhoneLine[]) => {
    updateProjectState({ lines });
  };

  // User Directory adjustments
  const handleUpdateUsers = (users: DirectoryUser[]) => {
    updateProjectState({ users });
  };

  // Templates adjustments
  const handleUpdateTemplates = (templates: ReusableTemplate[]) => {
    updateProjectState({ templates });
  };

  // Bulk instancer for SDA imported objects from CSV
  const handleBulkAddSDANodes = (newSdaNodes: CallNode[]) => {
    updateProjectState(prev => ({
      ...prev,
      nodes: [...prev.nodes, ...newSdaNodes]
    }));
  };

  // Global Actions: Reset to Blank
  const handleResetProject = () => {
    setModalConfig({
      isOpen: true,
      title: 'Effacer toute la programmation ?',
      message: 'Attention : Vous allez vider entièrement votre espace de travail. Toutes les modifications locales, lignes téléphoniques et les liaisons actives seront définitivement supprimées.',
      confirmText: 'Effacer le projet',
      cancelText: 'Conserver mes données',
      type: 'danger',
      onConfirm: () => {
        const clonedDefault = JSON.parse(JSON.stringify(BLANK_PROJECT));
        pushToHistory(project);
        clearSnapshotView();
        setProject(clonedDefault);
        setSelectedNodeId(null);
        setSelectedNodeIds([]);
        saveProjectToLocalStorage(clonedDefault);
        setModalConfig(null);
      }
    });
  };

  // Global Actions: Load Demo
  const handleLoadDemo = () => {
    setModalConfig({
      isOpen: true,
      title: 'Charger la démo "Acme Corp" ?',
      message: 'Attention : Cette action va écraser votre routage actuel pour charger l\'infrastructure de test complète (Groupements, SVI interactifs, Postes DECT, débordements horaires...).',
      confirmText: 'Oui, charger le scénario',
      cancelText: 'Annuler',
      type: 'info',
      onConfirm: () => {
        const clonedDemo = JSON.parse(JSON.stringify(DEMO_PROJECT));
        pushToHistory(project);
        clearSnapshotView();
        setProject(clonedDemo);
        setSelectedNodeId(null);
        setSelectedNodeIds([]);
        saveProjectToLocalStorage(clonedDemo);
        setModalConfig(null);
      }
    });
  };

  // Global Actions: Manual Save feedback
  const handleForceSave = () => {
    saveProjectToLocalStorage(project);
    setModalConfig({
      isOpen: true,
      title: 'Sauvegarde instantanée réussie',
      message: 'Tous les paramètres de configuration, le logigramme interactif, les utilisateurs et le dossier d\'exploitation ont été sécurisés dans le stockage local de votre navigateur.',
      confirmText: 'Excellent',
      type: 'success',
      onConfirm: () => {
        setModalConfig(null);
      }
    });
  };

  // Global Actions: JSON Exporter
  const handleExportJSON = () => {
    const filename = buildExportFilename(
      {
        projectName: project.projectName,
        clientName: project.clientName,
        siteName: project.siteName,
      },
      'teleflux_schema',
      'json'
    );

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
  };

  // Global Actions: Import JSON payload
  const handleLoadJSON = (loadedProject: TelecomProject) => {
    pushToHistory(project);
    const migrated = migrateLoadedProject(loadedProject);
    clearSnapshotView();
    setProject(migrated);
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    saveProjectToLocalStorage(migrated);
  };

  // Dynamic graph validations — memoized so drag/local UI updates don't recompute
  const validationAlerts = useMemo(() => {
    const alerts: { id: string; type: 'error' | 'warning'; message: string; nodeId?: string }[] = [];

    const adjList: Record<string, string[]> = {};
    project.nodes.forEach(n => { adjList[n.id] = []; });
    project.connections.forEach(c => {
      if (adjList[c.sourceId]) {
        adjList[c.sourceId].push(c.targetId);
      }
    });

    const isLooping = (nodeId: string, visited: Set<string>, recStack: Set<string>): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = adjList[nodeId] || [];
      for (const neighbor of neighbors) {
        if (recStack.has(neighbor)) {
          return true;
        }
        if (!visited.has(neighbor)) {
          if (isLooping(neighbor, visited, recStack)) return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    project.nodes.forEach(node => {
      const visited = new Set<string>();
      const recStack = new Set<string>();
      if (isLooping(node.id, visited, recStack)) {
        alerts.push({
          id: `loop-${node.id}`,
          type: 'error',
          message: `Une boucle infinie potentielle ou circuit rétroactif est rattaché à "${node.name}".`,
          nodeId: node.id
        });
      }

      if (node.type === 'sda' || node.type === 'incoming_num' || node.type === 'ndi' || node.type === 'sip_trunk') {
        const hasOutgoing = project.connections.some(c => c.sourceId === node.id);
        if (!hasOutgoing) {
          alerts.push({
            id: `sda-unbound-${node.id}`,
            type: 'warning',
            message: `Numéro d'accueil ${node.properties.number || node.name} non relié à un flux d'aiguillage actif.`,
            nodeId: node.id
          });
        }
      }

      if (node.type === 'switchboard' || node.type === 'user_station' || node.type === 'extension') {
        if (!node.properties.internalNumber) {
          alerts.push({
            id: `station-no-ext-${node.id}`,
            type: 'warning',
            message: `Le poste "${node.name}" est dépourvu de numéro d'extension interne.`,
            nodeId: node.id
          });
        }
      }

      if (node.type.startsWith('forward_') || node.type === 'transfer') {
        if (!node.properties.forwardDestination) {
          alerts.push({
            id: `forward-no-dest-${node.id}`,
            type: 'warning',
            message: `Redirection d'urgence ou renvoi "${node.name}" sans destination rattachée.`,
            nodeId: node.id
          });
        }
      }

      if (node.type === 'voicemail' || node.type === 'custom_audio') {
        if (!node.properties.audioMessageName) {
          alerts.push({
            id: `audio-no-file-${node.id}`,
            type: 'warning',
            message: `Messagerie ou annonce d'accueil "${node.name}" sans fichier audio associé (.wav).`,
            nodeId: node.id
          });
        }
      }

      if (node.type !== 'sda' && node.type !== 'incoming_num' && node.type !== 'ndi' && node.type !== 'sip_trunk') {
        const associated = project.connections.some(c => c.sourceId === node.id || c.targetId === node.id);
        if (!associated) {
          alerts.push({
            id: `orphaned-${node.id}`,
            type: 'warning',
            message: `L'élément "${node.name}" est isolé et ne fait partie d'aucun parcours d'appel.`,
            nodeId: node.id
          });
        }
      }
    });

    return alerts;
  }, [project.nodes, project.connections]);

  return (
    <div className="h-screen flex flex-col font-sans text-slate-800 antialiased tf-app" id="teleflux-app-root">
      {!isFullscreen && (
        <Header
          project={project}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onUpdateProjectMeta={handleUpdateProjectMeta}
          onLoadJSON={handleLoadJSON}
          onExportJSON={handleExportJSON}
          onReset={handleResetProject}
          onLoadDemo={handleLoadDemo}
          onSaveLocal={handleForceSave}
          hasUnsavedChanges={unsavedChanges}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={past.length > 0}
          canRedo={future.length > 0}
          onOpenHistory={() => setHistoryModalOpen(true)}
          onExportPdf={() => openPdfReport(project)}
          onBumpVersion={() => updateProjectState((prev) => bumpVersion(prev))}
        />
      )}

      {viewingSnapshotId && (
        <div className="shrink-0 px-4 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-950 flex flex-wrap items-center gap-2 justify-between z-30">
          <span>
            Consultation d&apos;un instantané
            {(() => {
              const snap = project.snapshots?.find((s) => s.id === viewingSnapshotId);
              if (!snap) return null;
              return (
                <>
                  {' '}
                  : <b>{snap.label}</b>
                  <span className="text-amber-800/80 font-medium"> ({new Date(snap.at).toLocaleString('fr-FR')})</span>
                </>
              );
            })()}
            . Modifiez si besoin, puis enregistrez ou revenez à l&apos;état actuel.
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={handleReturnToCurrent}
              className="px-2 py-1 rounded-lg bg-white border border-amber-300 font-bold cursor-pointer inline-flex items-center gap-1"
            >
              <RotateCcw size={12} />
              Revenir à l&apos;état actuel
            </button>
            <button
              type="button"
              onClick={() => handleOverwriteViewedSnapshot(viewingSnapshotId)}
              className="px-2 py-1 rounded-lg bg-amber-600 text-white font-bold cursor-pointer"
            >
              Écraser cet instantané
            </button>
            <button
              type="button"
              onClick={() => handleSaveAsNewFromView()}
              className="px-2 py-1 rounded-lg bg-brand-600 text-white font-bold cursor-pointer"
            >
              Enregistrer comme nouveau
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {activeTab === 'editor' && (
          <>
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden flex shrink-0 ${
                isSidebarOpen ? 'w-80' : 'w-0'
              }`}
            >
              <Sidebar
                onAddNode={handleAddNode}
                templates={project.templates}
                onApplyTemplate={handleApplyTemplate}
              />
            </div>

            <div
              className="absolute z-40 top-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out"
              style={{ left: isSidebarOpen ? '320px' : '0px' }}
            >
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="w-5 h-14 bg-white hover:bg-brand-50 border-y border-r border-slate-200 rounded-r-lg shadow-sm flex items-center justify-center text-slate-500 hover:text-brand-700 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                title={isSidebarOpen ? "Masquer la palette d'éléments" : "Afficher la palette d'éléments"}
              >
                {isSidebarOpen ? <ChevronLeft size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />}
              </button>
            </div>

            {/* Central visual diagram canvas flow */}
            <Workspace
              nodes={project.nodes}
              connections={project.connections}
              annotations={project.annotations}
              collapsedNodeIds={project.collapsedNodeIds}
              selectedNodeId={selectedNodeId}
              selectedNodeIds={selectedNodeIds}
              onSelectNode={setSelectedNodeId}
              onSelectNodes={handleSelectNodes}
              onUpdateNodeCoords={handleUpdateNodeCoords}
              onUpdateNodesCoords={handleUpdateNodesCoords}
              onDeleteNode={handleDeleteNode}
              onAddConnection={handleAddConnection}
              onDeleteConnection={handleDeleteConnection}
              onUpdateConnectionLabel={handleUpdateConnectionLabel}
              onToggleCollapse={handleToggleCollapse}
              onUpdateAnnotations={handleUpdateAnnotations}
              validationAlerts={validationAlerts}
              onLoadDemo={handleLoadDemo}
              onDragStart={handleDragStart}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => {
                const nextFullscreen = !isFullscreen;
                setIsFullscreen(nextFullscreen);
                if (nextFullscreen) {
                  setIsSidebarOpen(false);
                } else {
                  setIsSidebarOpen(true);
                }
              }}
              exportMeta={{
                projectName: project.projectName,
                clientName: project.clientName,
                siteName: project.siteName,
              }}
            />

            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden flex shrink-0 ${
                selectedNodeId ? 'w-80' : 'w-0'
              }`}
            >
              <PropertyPanel
                selectedNodeId={selectedNodeId}
                nodes={project.nodes}
                onUpdateNodeProperties={handleUpdateNodeProperties}
                onUpdateNodeName={handleUpdateNodeName}
                onDeleteNode={handleDeleteNode}
                onCreateTemplateFromNode={handleCreateTemplateFromNode}
                onCloneNode={handleCloneNode}
                onChangeNodeType={handleChangeNodeType}
              />
            </div>
          </>
        )}

        {activeTab === 'data' && (
          <DataManagement
            project={project}
            onUpdateLines={handleUpdateLines}
            onUpdateUsers={handleUpdateUsers}
            onUpdateTemplates={handleUpdateTemplates}
            onBulkAddSDANodes={handleBulkAddSDANodes}
          />
        )}

        {activeTab === 'preview' && (
          <PreviewSection
            project={project}
            validationAlerts={validationAlerts}
            onExportPdf={() => openPdfReport(project)}
          />
        )}
      </div>

      <HistoryCompareModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        project={project}
        viewingSnapshotId={viewingSnapshotId}
        onCreateSnapshot={(label) => {
          if (viewingSnapshotId) return;
          updateProjectState((prev) => createSnapshot(prev, label));
        }}
        onViewSnapshot={handleViewSnapshot}
        onReturnToCurrent={handleReturnToCurrent}
        onOverwriteSnapshot={handleOverwriteViewedSnapshot}
        onSaveAsNewFromView={handleSaveAsNewFromView}
        onDeleteSnapshot={handleDeleteSnapshot}
      />

      {modalConfig && modalConfig.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-ink-950/55 backdrop-blur-[2px]" id="custom-confirm-modal">
          <div className="relative w-full max-w-md overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-xl animate-scale-up">
            <div
              className={`h-1 w-full ${
                modalConfig.type === 'danger'
                  ? 'bg-rose-500'
                  : modalConfig.type === 'success'
                    ? 'bg-emerald-500'
                    : 'bg-brand-600'
              }`}
            />

            <div className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`p-3 rounded-xl shrink-0 ${
                    modalConfig.type === 'danger'
                      ? 'bg-rose-50 text-rose-600'
                      : modalConfig.type === 'success'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-brand-50 text-brand-700'
                  }`}
                >
                  {modalConfig.type === 'danger' && <Trash2 size={22} />}
                  {modalConfig.type === 'success' && <CheckCircle size={22} />}
                  {modalConfig.type === 'info' && <Info size={22} />}
                </div>

                <div className="space-y-2 flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{modalConfig.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{modalConfig.message}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setModalConfig(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  title="Fermer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                {modalConfig.cancelText && (
                  <button
                    type="button"
                    onClick={() => setModalConfig(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all cursor-pointer"
                  >
                    {modalConfig.cancelText}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => modalConfig.onConfirm()}
                  className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer ${
                    modalConfig.type === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : modalConfig.type === 'success'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-brand-600 hover:bg-brand-700'
                  }`}
                >
                  {modalConfig.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
