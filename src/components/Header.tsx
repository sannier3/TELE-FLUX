/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { 
  FileJson, 
  Download, 
  Upload, 
  RefreshCw, 
  Save, 
  SlidersHorizontal, 
  PhoneCall, 
  UserSquare, 
  Layers,
  Eye,
  Undo2,
  Redo2
} from 'lucide-react';
import { TelecomProject } from '../types';

interface HeaderProps {
  project: TelecomProject;
  activeTab: 'editor' | 'data' | 'preview';
  setActiveTab: (tab: 'editor' | 'data' | 'preview') => void;
  onUpdateProjectMeta: (updates: Partial<TelecomProject>) => void;
  onLoadJSON: (project: TelecomProject) => void;
  onExportJSON: () => void;
  onReset: () => void;
  onLoadDemo: () => void;
  onSaveLocal: () => void;
  hasUnsavedChanges: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function Header({
  project,
  activeTab,
  setActiveTab,
  onUpdateProjectMeta,
  onLoadJSON,
  onExportJSON,
  onReset,
  onLoadDemo,
  onSaveLocal,
  hasUnsavedChanges,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data && data.projectName !== undefined && Array.isArray(data.nodes)) {
          onLoadJSON(data);
          alert('Configuration chargée avec succès !');
        } else {
          alert('Format de fichier JSON invalide pour Télé-Flux.');
        }
      } catch (err) {
        alert('Erreur lors de la lecture du fichier JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <header className="glass-panel-dark text-white select-none px-6 py-4 flex flex-col md:flex-row items-center gap-4 justify-between" id="app-header">
      {/* Brand and Project metadata edit */}
      <div className="flex items-center gap-4 w-full md:w-auto">
        <div className="flex items-center gap-2 bg-[#2563eb] text-white p-2 px-3 rounded-lg font-black tracking-wider text-xl shadow-lg shadow-blue-500/20">
          <PhoneCall size={24} className="animate-pulse" />
          <span>TÉLÉ-FLUX</span>
        </div>
        
        <div className="flex flex-col gap-1 w-full max-w-sm">
          <input
            id="input-project-name"
            type="text"
            className="bg-slate-950/40 border border-white/5 font-semibold px-2.5 py-1 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full transition-all"
            value={project.projectName}
            onChange={(e) => onUpdateProjectMeta({ projectName: e.target.value })}
            placeholder="Nom du Projet"
          />
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              Client:
              <input
                id="input-client-name"
                type="text"
                className="bg-transparent border-b border-white/10 hover:border-white/30 focus:border-blue-500 text-slate-200 px-1 py-0.5 focus:outline-none w-20 transition-all"
                value={project.clientName}
                onChange={(e) => onUpdateProjectMeta({ clientName: e.target.value })}
                placeholder="Client"
              />
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1">
              Site:
              <input
                id="input-site-name"
                type="text"
                className="bg-transparent border-b border-white/10 hover:border-white/30 focus:border-blue-500 text-slate-200 px-1 py-0.5 focus:outline-none w-24 transition-all"
                value={project.siteName}
                onChange={(e) => onUpdateProjectMeta({ siteName: e.target.value })}
                placeholder="Paris"
              />
            </span>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center bg-slate-950/40 p-1.5 rounded-xl border border-white/10 backdrop-blur-md w-full md:w-auto justify-around">
        <button
          id="tab-editor"
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'editor'
              ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <SlidersHorizontal size={15} />
          <span>1. Conception</span>
        </button>
        <button
          id="tab-data"
          onClick={() => setActiveTab('data')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'data'
              ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <UserSquare size={15} />
          <span>2. Postes & Lignes</span>
        </button>
        <button
          id="tab-preview"
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'preview'
              ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Eye size={15} />
          <span>3. Aperçus & Exports</span>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
          id="import-json-file-input"
        />
        
        <button
          id="btn-import-json"
          onClick={() => fileInputRef.current?.click()}
          title="Importer un fichier JSON Télé-Flux"
          className="bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
        >
          <Upload size={14} />
          <span className="hidden lg:inline">Importer JSON</span>
        </button>

        <button
          id="btn-export-json"
          onClick={onExportJSON}
          title="Exporter le projet en JSON"
          className="bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
        >
          <Download size={14} />
          <span className="hidden lg:inline">Exporter JSON</span>
        </button>

        {/* Undo Button */}
        <button
          id="btn-undo"
          onClick={onUndo}
          disabled={!canUndo}
          title="Annuler la dernière action (Ctrl+Z)"
          className={`px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all border ${
            canUndo
              ? 'bg-white/10 text-slate-200 border-white/10 hover:bg-white/20 hover:text-white cursor-pointer shadow-sm'
              : 'bg-white/5 text-slate-500 border-transparent opacity-40 cursor-not-allowed'
          }`}
        >
          <Undo2 size={14} />
          <span className="hidden sm:inline">Annuler</span>
        </button>

        {/* Redo Button */}
        <button
          id="btn-redo"
          onClick={onRedo}
          disabled={!canRedo}
          title="Rétablir l'action annulée (Ctrl+Y)"
          className={`px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all border ${
            canRedo
              ? 'bg-white/10 text-slate-200 border-white/10 hover:bg-white/20 hover:text-white cursor-pointer shadow-sm'
              : 'bg-white/5 text-slate-500 border-transparent opacity-40 cursor-not-allowed'
          }`}
        >
          <Redo2 size={14} />
          <span className="hidden sm:inline">Rétablir</span>
        </button>

        <button
          id="btn-save-local"
          onClick={onSaveLocal}
          title="Sauvegarder dans le stockage du navigateur"
          className={`px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
            hasUnsavedChanges 
              ? 'bg-[#2563eb] text-white hover:bg-blue-700 border-blue-500 shadow-md shadow-blue-500/20' 
              : 'bg-white/10 text-slate-400 border-white/5 hover:bg-white/10 hover:text-slate-200'
          }`}
        >
          <Save size={14} />
          <span>Sauvegarder</span>
        </button>

        <button
          id="btn-load-demo"
          onClick={onLoadDemo}
          title="Charger le scénario complet de démonstration"
          className="bg-emerald-600/30 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-650/40 hover:text-white px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Layers size={14} className="text-emerald-400" />
          <span>Charger la Démo</span>
        </button>

        <button
          id="btn-reset"
          onClick={onReset}
          title="Réinitialiser et effacer tout le projet (Configuration Vierge)"
          className="bg-rose-900/20 border border-rose-900/30 text-rose-200 hover:bg-rose-900/40 hover:text-white px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>Réinitialiser (Vierge)</span>
        </button>
      </div>
    </header>
  );
}
