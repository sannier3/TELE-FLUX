/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import {
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
  Redo2,
  History,
  FileText
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
  onOpenHistory?: () => void;
  onExportPdf?: () => void;
  onBumpVersion?: () => void;
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
  canRedo,
  onOpenHistory,
  onExportPdf,
  onBumpVersion,
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
        } else {
          window.alert('Format de fichier JSON invalide pour Télé-Flux.');
        }
      } catch {
        window.alert('Erreur lors de la lecture du fichier JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="tf-header select-none px-5 py-3 flex flex-col xl:flex-row items-stretch xl:items-center gap-3 justify-between shrink-0" id="app-header">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-md shadow-brand-600/30">
            <PhoneCall size={20} className="text-white" strokeWidth={2.25} />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-bold tracking-tight text-white">Télé-Flux</div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-medium">Routage télécom</div>
            <div className="text-[9px] text-slate-500 mt-0.5 font-medium normal-case tracking-normal max-w-[11rem] leading-snug">
              Créé avec l&apos;aide de l&apos;IA pour faciliter les schémas détaillés
            </div>
          </div>
        </div>

        <div className="hidden sm:block w-px h-10 bg-white/10 shrink-0" />

        <div className="flex flex-col gap-1 min-w-0 flex-1 max-w-md">
          <input
            id="input-project-name"
            type="text"
            className="tf-input w-full"
            value={project.projectName}
            onChange={(e) => onUpdateProjectMeta({ projectName: e.target.value })}
            placeholder="Nom du projet"
          />
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <label className="flex items-center gap-1.5 min-w-0">
              <span className="shrink-0">Client</span>
              <input
                id="input-client-name"
                type="text"
                className="bg-transparent border-b border-white/15 hover:border-white/30 focus:border-brand-500 text-slate-200 px-1 py-0.5 focus:outline-none w-24 transition-colors"
                value={project.clientName}
                onChange={(e) => onUpdateProjectMeta({ clientName: e.target.value })}
                placeholder="Client"
              />
            </label>
            <label className="flex items-center gap-1.5 min-w-0">
              <span className="shrink-0">Site</span>
              <input
                id="input-site-name"
                type="text"
                className="bg-transparent border-b border-white/15 hover:border-white/30 focus:border-brand-500 text-slate-200 px-1 py-0.5 focus:outline-none w-28 transition-colors"
                value={project.siteName}
                onChange={(e) => onUpdateProjectMeta({ siteName: e.target.value })}
                placeholder="Site"
              />
            </label>
            <button
              type="button"
              onClick={onBumpVersion}
              className="shrink-0 px-1.5 py-0.5 rounded bg-brand-500/20 border border-brand-400/30 text-brand-200 font-mono font-bold hover:bg-brand-500/30 cursor-pointer"
              title="Incrémenter la version"
            >
              v{project.version || '1.0'}
            </button>
          </div>
        </div>
      </div>

      <nav className="flex items-center bg-black/30 p-1 rounded-xl border border-white/10 w-full xl:w-auto justify-between xl:justify-center gap-0.5" aria-label="Navigation principale">
        <button
          id="tab-editor"
          type="button"
          onClick={() => setActiveTab('editor')}
          className={`tf-tab ${activeTab === 'editor' ? 'tf-tab-active' : ''}`}
        >
          <SlidersHorizontal size={15} />
          <span>Conception</span>
        </button>
        <button
          id="tab-data"
          type="button"
          onClick={() => setActiveTab('data')}
          className={`tf-tab ${activeTab === 'data' ? 'tf-tab-active' : ''}`}
        >
          <UserSquare size={15} />
          <span>Postes &amp; Lignes</span>
        </button>
        <button
          id="tab-preview"
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`tf-tab ${activeTab === 'preview' ? 'tf-tab-active' : ''}`}
        >
          <Eye size={15} />
          <span>Aperçus</span>
        </button>
      </nav>

      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,application/json"
          className="hidden"
          id="import-json-file-input"
        />

        <button
          id="btn-import-json"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Importer un projet JSON"
          className="tf-btn tf-btn-ghost px-3 py-2"
        >
          <Upload size={14} />
          <span className="hidden lg:inline">Importer</span>
        </button>

        <button
          id="btn-export-json"
          type="button"
          onClick={onExportJSON}
          title="Exporter le projet en JSON"
          className="tf-btn tf-btn-ghost px-3 py-2"
        >
          <Download size={14} />
          <span className="hidden lg:inline">Exporter</span>
        </button>

        {onExportPdf && (
          <button
            type="button"
            onClick={onExportPdf}
            title="Rapport PDF 1 page (résumé + schéma + postes)"
            className="tf-btn tf-btn-ghost px-3 py-2"
          >
            <FileText size={14} />
            <span className="hidden lg:inline">PDF</span>
          </button>
        )}

        {onOpenHistory && (
          <button
            type="button"
            onClick={onOpenHistory}
            title="Instantanés (points de version manuels)"
            className="tf-btn tf-btn-ghost px-3 py-2"
          >
            <History size={14} />
            <span className="hidden lg:inline">Instantanés</span>
          </button>
        )}

        <button
          id="btn-undo"
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Annuler (Ctrl+Z)"
          className="tf-btn tf-btn-ghost px-3 py-2"
        >
          <Undo2 size={14} />
        </button>

        <button
          id="btn-redo"
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Rétablir (Ctrl+Y)"
          className="tf-btn tf-btn-ghost px-3 py-2"
        >
          <Redo2 size={14} />
        </button>

        <button
          id="btn-save-local"
          type="button"
          onClick={onSaveLocal}
          title="Sauvegarder dans le navigateur"
          className={`tf-btn px-3 py-2 ${
            hasUnsavedChanges ? 'tf-btn-primary' : 'tf-btn-ghost'
          }`}
        >
          <Save size={14} />
          <span>Sauvegarder</span>
        </button>

        <button
          id="btn-load-demo"
          type="button"
          onClick={onLoadDemo}
          title="Charger le scénario de démonstration"
          className="tf-btn px-3 py-2 bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/25"
        >
          <Layers size={14} />
          <span className="hidden sm:inline">Démo</span>
        </button>

        <button
          id="btn-reset"
          type="button"
          onClick={onReset}
          title="Réinitialiser le projet"
          className="tf-btn tf-btn-danger px-3 py-2"
        >
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Réinit.</span>
        </button>
      </div>
    </header>
  );
}
