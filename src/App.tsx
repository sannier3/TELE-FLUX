/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import PropertyPanel from './components/PropertyPanel';
import DataManagement from './components/DataManagement';
import PreviewSection from './components/PreviewSection';
import { TelecomProject, CallNode, Connection, NodeType, PhoneLine, DirectoryUser, ReusableTemplate } from './types';
import { INITIAL_DEFAULT_PROJECT, BLANK_PROJECT, NODE_METADATA } from './utils/templates';
import { AlertTriangle, Trash2, CheckCircle, Info, X } from 'lucide-react';

export default function App() {
  // Navigation tabs view: 'editor' | 'data' | 'preview'
  const [activeTab, setActiveTab] = useState<'editor' | 'data' | 'preview'>('editor');
  
  // Custom styled React Modal Dialog configuration state
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    type: 'danger' | 'info' | 'success';
    onConfirm: () => void;
  } | null>(null);
  
  // Selected visual node
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  
  // Main Project State holding everything
  const [project, setProject] = useState<TelecomProject>(() => JSON.parse(JSON.stringify(INITIAL_DEFAULT_PROJECT)));
  
  // Flag to display visual Save indicator feedback
  const [unsavedChanges, setUnsavedChanges] = useState(false);

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
      const isZ = e.key.toLowerCase() === 'z';
      const isY = e.key.toLowerCase() === 'y';
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (isCtrlOrMeta) {
        if (isZ) {
          e.preventDefault();
          handleUndo();
        } else if (isY) {
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
        if (parsed && parsed.projectName && Array.isArray(parsed.nodes)) {
          setProject(parsed);
        }
      } catch (err) {
        console.error('Failed to load project from local storage: ', err);
      }
    } else {
      setProject(JSON.parse(JSON.stringify(INITIAL_DEFAULT_PROJECT)));
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
    // Avoid re-triggering heavy alerts on minor pixel drag
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
    // Avoid heavy re-renders during dragging by directly updating coordinate state
    setProject(prev => {
      const coordsMap = new Map(updates.map(u => [u.id, u]));
      const updatedNodes = prev.nodes.map(n => {
        const u = coordsMap.get(n.id);
        if (u) {
          return { ...n, x: u.x, y: u.y };
        }
        return n;
      });
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

  const handleUpdateConnectionLabel = (id: string, label: string, labels?: string[]) => {
    updateProjectState(prev => {
      const updatedConns = prev.connections.map(c => c.id === id ? { ...c, label, labels: labels || c.labels } : c);
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
        const clonedDemo = JSON.parse(JSON.stringify(INITIAL_DEFAULT_PROJECT));
        pushToHistory(project);
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
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `teleflux_schema_${project.projectName.toLowerCase().replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
  };

  // Global Actions: Import JSON payload
  const handleLoadJSON = (loadedProject: TelecomProject) => {
    pushToHistory(project);
    setProject(loadedProject);
    setSelectedNodeId(null);
    saveProjectToLocalStorage(loadedProject);
  };

  // Dynamic graph validations loop & warnings calculator
  const computeValidationAlerts = () => {
    const alerts: { id: string; type: 'error' | 'warning'; message: string; nodeId?: string }[] = [];

    // Helper: checks cycle dfs
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
      // 1. Loop detection
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

      // 2. Unlinked entry SDA
      if (node.type === 'sda' || node.type === 'incoming_num') {
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

      // 3. User phone station without extension code
      if (node.type === 'user_station' || node.type === 'switchboard') {
        if (!node.properties.internalNumber) {
          alerts.push({
            id: `station-no-ext-${node.id}`,
            type: 'warning',
            message: `Le poste "${node.name}" est dépourvu de numéro d'extension interne.`,
            nodeId: node.id
          });
        }
      }

      // 4. Redirection without forwarding extension
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

      // 5. Voicemail without standard voice-note prompt
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

      // 6. Complete isolated orphaned blocks
      if (node.type !== 'sda' && node.type !== 'incoming_num' && node.type !== 'ndi') {
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
  };

  const validationAlerts = computeValidationAlerts();

  return (
    <div className="h-screen flex flex-col font-sans text-slate-800 antialiased bg-ambient-mesh" id="teleflux-app-root">
      {/* Top Application Header Control Bar */}
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
      />

      {/* Main Body View */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {activeTab === 'editor' && (
          <>
            {/* Left toolbox node builder palette */}
            <Sidebar
              onAddNode={handleAddNode}
              templates={project.templates}
              onApplyTemplate={handleApplyTemplate}
            />

            {/* Central visual diagram canvas flow */}
            <Workspace
              nodes={project.nodes}
              connections={project.connections}
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
              validationAlerts={validationAlerts}
              onLoadDemo={handleLoadDemo}
              onDragStart={handleDragStart}
            />

            {/* Right details configuration properties sidebar */}
            <PropertyPanel
              selectedNodeId={selectedNodeId}
              nodes={project.nodes}
              onUpdateNodeProperties={handleUpdateNodeProperties}
              onUpdateNodeName={handleUpdateNodeName}
              onDeleteNode={handleDeleteNode}
              onCreateTemplateFromNode={handleCreateTemplateFromNode}
            />
          </>
        )}

        {/* Tab 2: Databases and spreadsheet records */}
        {activeTab === 'data' && (
          <DataManagement
            project={project}
            onUpdateLines={handleUpdateLines}
            onUpdateUsers={handleUpdateUsers}
            onUpdateTemplates={handleUpdateTemplates}
            onBulkAddSDANodes={handleBulkAddSDANodes}
          />
        )}

        {/* Tab 3: Previews, printable reports and simulator */}
        {activeTab === 'preview' && (
          <PreviewSection
            project={project}
            validationAlerts={validationAlerts}
          />
        )}
      </div>

      {/* Custom styled modal dialog */}
      {modalConfig && modalConfig.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" id="custom-confirm-modal">
          <div className="relative w-full max-w-md overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-2xl animate-scale-up" style={{ animation: 'scaleUp 0.15s ease-out' }}>
            {/* Top decorative hazard block */}
            <div className={`h-1.5 w-full ${
              modalConfig.type === 'danger' ? 'bg-rose-500' :
              modalConfig.type === 'success' ? 'bg-emerald-500' : 'bg-[#2563eb]'
            }`} />
            
            <div className="p-6">
              <div className="flex items-start gap-4">
                {/* Icon based on alert type */}
                <div className={`p-3 rounded-xl shrink-0 ${
                  modalConfig.type === 'danger' ? 'bg-rose-50 text-rose-600' :
                  modalConfig.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {modalConfig.type === 'danger' && <Trash2 size={24} />}
                  {modalConfig.type === 'success' && <CheckCircle size={24} />}
                  {modalConfig.type === 'info' && <Info size={24} />}
                </div>

                <div className="space-y-2 flex-1">
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {modalConfig.title}
                  </h3>
                  <p className="text-xs text-slate-650 leading-relaxed">
                    {modalConfig.message}
                  </p>
                </div>

                <button 
                  onClick={() => setModalConfig(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  title="Fermer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3">
                {modalConfig.cancelText && (
                  <button
                    onClick={() => setModalConfig(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all cursor-pointer"
                  >
                    {modalConfig.cancelText}
                  </button>
                )}
                <button
                  onClick={() => {
                    modalConfig.onConfirm();
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
                    modalConfig.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/10' :
                    modalConfig.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10' : 'bg-[#2563eb] hover:bg-blue-700 shadow-blue-500/10'
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
