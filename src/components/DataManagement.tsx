/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Layers, 
  Users, 
  PhoneCall, 
  BookmarkCheck,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { TelecomProject, PhoneLine, DirectoryUser, ReusableTemplate, NodeType } from '../types';
import { PHONE_MODELS, PROVIDERS } from '../utils/templates';
import { 
  BRANDS, 
  YEALINK_MODELS, 
  POLY_MODELS, 
  GIGASET_MODELS, 
  ALE_MODELS, 
  OTHER_MODELS 
} from '../data/phoneModels';
import { 
  exportUsersToCSV, 
  exportLinesToCSV, 
  exportSDAsToCSV, 
  importUsersFromCSV, 
  importLinesFromCSV, 
  importSDAsFromCSV 
} from '../utils/csv';

interface DataManagementProps {
  project: TelecomProject;
  onUpdateLines: (lines: PhoneLine[]) => void;
  onUpdateUsers: (users: DirectoryUser[]) => void;
  onUpdateTemplates: (templates: ReusableTemplate[]) => void;
  onBulkAddSDANodes: (nodes: any[]) => void;
}

type SubTab = 'lines' | 'users' | 'templates';

export default function DataManagement({
  project,
  onUpdateLines,
  onUpdateUsers,
  onUpdateTemplates,
  onBulkAddSDANodes
}: DataManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('users');
  
  // CSV Import state message
  const [csvFeedback, setCsvFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Dynamic suggestions from active design diagram scheme
  const nodesWithInternal = (project.nodes || []).filter(n => n.properties && n.properties.internalNumber);

  const sdaSuggestions = Array.from(new Set(
    (project.nodes || [])
      .map(n => {
        if (!n.properties) return '';
        if (n.type === 'ndi' || n.type === 'incoming_num') {
          return n.properties.number;
        }
        return n.properties.associatedSda;
      })
      .filter((num): num is string => !!num && num.trim() !== '')
  ));

  // File Inputs references
  const linesFileRef = useRef<HTMLInputElement>(null);
  const usersFileRef = useRef<HTMLInputElement>(null);
  const sdaFileRef = useRef<HTMLInputElement>(null);

  // Line CRUD
  const handleAddLine = () => {
    const newLine: PhoneLine = {
      id: `l-manual-${Date.now()}`,
      ndi: '01 00 00 04' + Math.floor(Math.random() * 90 + 10),
      type: 'SIP Trunk',
      channels: 10,
      provider: PROVIDERS[0],
      comment: 'Trunk additionnel automatique.'
    };
    onUpdateLines([...project.lines, newLine]);
  };

  const handleUpdateLine = (id: string, updates: Partial<PhoneLine>) => {
    const nextLines = project.lines.map(l => l.id === id ? { ...l, ...updates } : l);
    onUpdateLines(nextLines);
  };

  const handleDeleteLine = (id: string) => {
    if (confirm('Voulez-vous supprimer cette ligne de la base ?')) {
      onUpdateLines(project.lines.filter(l => l.id !== id));
    }
  };

  // User/Post CRUD
  const handleAddUser = () => {
    const newUser: DirectoryUser = {
      id: `u-manual-${Date.now()}`,
      name: 'Collaborateur ' + (project.users.length + 1),
      email: '',
      internalNumber: String(100 + project.users.length + 1),
      sdaId: '',
      stationType: 'IP',
      phoneModel: PHONE_MODELS[0],
      voicemailEnabled: false,
      forwardEnabled: false,
      forwardDestination: '',
      comment: ''
    };
    onUpdateUsers([...project.users, newUser]);
  };

  const handleUpdateUser = (id: string, updates: Partial<DirectoryUser>) => {
    const nextUsers = project.users.map(u => u.id === id ? { ...u, ...updates } : u);
    onUpdateUsers(nextUsers);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Voulez-vous supprimer ce poste/utilisateur de l\'annuaire ?')) {
      onUpdateUsers(project.users.filter(u => u.id !== id));
    }
  };

  // Template CRUD
  const handleDeleteTemplate = (id: string) => {
    if (confirm('Voulez-vous supprimer ce modèle réutilisable ?')) {
      onUpdateTemplates(project.templates.filter(t => t.id !== id));
    }
  };

  // CSV Exporters
  const downloadUsersCSV = () => {
    const csvContent = exportUsersToCSV(project.users);
    triggerDownload(csvContent, `teleflux_poste_utilisateurs_${project.clientName || 'client'}.csv`);
  };

  const downloadLinesCSV = () => {
    const csvContent = exportLinesToCSV(project.lines);
    triggerDownload(csvContent, `teleflux_lignes_trunks_${project.clientName || 'client'}.csv`);
  };

  const downloadSdaCSV = () => {
    const csvContent = exportSDAsToCSV(project.nodes);
    triggerDownload(csvContent, `teleflux_numeros_sda_${project.clientName || 'client'}.csv`);
  };

  const triggerDownload = (content: string, filename: string) => {
    // Force UTF-8 BOM so Excel opens accented characters like 'é', 'à' instantly
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Importers handlers
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'lines' | 'users' | 'sda') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (target === 'lines') {
          const imported = importLinesFromCSV(text);
          if (imported.length > 0) {
            onUpdateLines([...project.lines, ...imported]);
            showFeedback('success', `${imported.length} lignes Trunk SIP importées avec succès !`);
          } else {
            showFeedback('error', "Aucune ligne valide trouvée dans le CSV. Vérifiez l'en-tête et les cellules séparatrices (point-virgule ;).");
          }
        } else if (target === 'users') {
          const imported = importUsersFromCSV(text);
          if (imported.length > 0) {
            onUpdateUsers([...project.users, ...imported]);
            showFeedback('success', `${imported.length} utilisateurs importés dans l'annuaire !`);
          } else {
            showFeedback('error', "Aucun utilisateur trouvé. Assurez-vous que le fichier utilise bien le séparateur point-virgule.");
          }
        } else if (target === 'sda') {
          const importedNodes = importSDAsFromCSV(text);
          if (importedNodes.length > 0) {
            onBulkAddSDANodes(importedNodes);
            showFeedback('success', `${importedNodes.length} numéros SDA générés directement sur l'éditeur visuel !`);
          } else {
            showFeedback('error', "Aucun numéro SDA trouvé à instancier.");
          }
        }
      } catch (err) {
        showFeedback('error', "Échec de lecture du fichier CSV. Format incorrect.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // clear input
  };

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setCsvFeedback({ type, msg });
    setTimeout(() => setCsvFeedback(null), 6000);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-transparent select-none animate-fade-in" id="data-management-panel">
      {/* Feedback banner */}
      {csvFeedback && (
        <div className={`px-6 py-2.5 flex items-center justify-between text-xs font-bold shrink-0 shadow backdrop-blur-md ${
          csvFeedback.type === 'success' ? 'bg-emerald-600/90 text-white' : 'bg-rose-600/90 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle size={16} />
            <span>{csvFeedback.msg}</span>
          </div>
          <button onClick={() => setCsvFeedback(null)} className="hover:opacity-80 font-bold">×</button>
        </div>
      )}

      {/* Sub tabs configuration bar */}
      <div className="bg-white/45 backdrop-blur-md border-b border-white/20 px-6 py-1 flex items-center justify-between shrink-0 h-14 select-none">
        <div className="flex items-center gap-3">
          <button
            id="subtab-users"
            onClick={() => setActiveSubTab('users')}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'users' ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/5'
            }`}
          >
            <Users size={15} />
            <span>Postes & Utilisateurs ({project.users.length})</span>
          </button>
          
          <button
            id="subtab-lines"
            onClick={() => setActiveSubTab('lines')}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'lines' ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/5'
            }`}
          >
            <PhoneCall size={15} />
            <span>Lignes & Trunks ({project.lines.length})</span>
          </button>

          <button
            id="subtab-templates"
            onClick={() => setActiveSubTab('templates')}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'templates' ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/5'
            }`}
          >
            <BookmarkCheck size={15} />
            <span>Modèles Disponibles ({project.templates.length})</span>
          </button>
        </div>

        {/* Global CSV instructions */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <HelpCircle size={14} />
          <span>Séparateur CSV attendu : point-virgule <b>(;)</b> pour compatibilité Excel.</span>
        </div>
      </div>

      {/* Content pane depending on active tab */}
      <div className="flex-1 overflow-auto p-6 scrollbar-thin">
        {activeSubTab === 'users' && (
          <div className="space-y-6">
            {/* Table actions bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Annuaire des Postes Utilisateurs</h3>
                <p className="text-xs text-slate-500 mt-1">Configurez les postes IP de vos collaborateurs, l'activation des messageries et les raccordements directes.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  id="btn-add-user"
                  onClick={handleAddUser}
                  className="bg-slate-900 text-teal-400 hover:bg-slate-800 text-xs font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Ajouter un poste</span>
                </button>
                <button
                  id="btn-export-users-csv"
                  onClick={downloadUsersCSV}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                >
                  <Download size={14} />
                  <span>Télécharger CSV</span>
                </button>
                
                {/* CSV Uploader */}
                <input
                  type="file"
                  ref={usersFileRef}
                  onChange={(e) => handleCSVUpload(e, 'users')}
                  accept=".csv"
                  className="hidden"
                  id="csv-users-uploader-input"
                />
                <button
                  id="btn-import-users-csv"
                  onClick={() => usersFileRef.current?.click()}
                  className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Importer CSV</span>
                </button>
              </div>
            </div>

            {/* 1. Sync from Scheme Panel */}
            {nodesWithInternal.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-fade-in shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers size={14} className="text-blue-600 animate-pulse" />
                      Raccordement et Synchro avec la conception graphique ({nodesWithInternal.length} détectés)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Les éléments dessinés dans votre schéma de routage (postes, répondeurs, serveurs) possèdent des numéros internes que vous pouvez importer ou synchroniser directement dans l'annuaire.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newUsers = [...project.users];
                      let count = 0;
                      nodesWithInternal.forEach(node => {
                        const exists = newUsers.some(u => 
                          u.internalNumber === node.properties.internalNumber || 
                          u.name.toLowerCase() === node.name.toLowerCase()
                        );
                        if (!exists) {
                          const mappedType = node.type === 'user_station' 
                            ? (node.properties.phoneType === 'Softphone' ? 'Softphone' : node.properties.phoneType === 'DECT' ? 'DECT' : 'IP')
                            : 'Analogique';
                          newUsers.push({
                            id: `u-sync-${node.id}`,
                            name: node.name,
                            email: '',
                            internalNumber: node.properties.internalNumber || '',
                            sdaId: node.properties.associatedSda || '',
                            stationType: mappedType as any,
                            phoneBrand: node.properties.phoneBrand || 'Yealink',
                            phoneModel: node.properties.phoneModel || '',
                            phoneModelCustom: node.properties.phoneModelCustom || '',
                            voicemailEnabled: node.type === 'voicemail' || !!(node.properties as any).voicemailEnabled,
                            forwardEnabled: false,
                            forwardDestination: '',
                            comment: `Recopié de la conception (${node.type})`
                          });
                          count++;
                        }
                      });
                      if (count > 0) {
                        onUpdateUsers(newUsers);
                        alert(`${count} poste(s) importé(s) !`);
                      } else {
                        alert("Tous les éléments du schéma de conception sont déjà enregistrés dans votre annuaire !");
                      }
                    }}
                    className="text-[10px] bg-blue-600 text-white font-extrabold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-all cursor-pointer whitespace-nowrap shadow-xs uppercase tracking-wide shrink-0"
                  >
                    Tout importer à l'annuaire
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {nodesWithInternal.map(node => {
                    const matchedUser = project.users.find(u => 
                      u.internalNumber === node.properties.internalNumber ||
                      u.name.toLowerCase() === node.name.toLowerCase()
                    );

                    const hasDiff = matchedUser && (
                      matchedUser.name !== node.name ||
                      matchedUser.internalNumber !== (node.properties.internalNumber || '') ||
                      matchedUser.phoneBrand !== node.properties.phoneBrand ||
                      matchedUser.phoneModel !== node.properties.phoneModel ||
                      matchedUser.phoneModelCustom !== node.properties.phoneModelCustom ||
                      matchedUser.sdaId !== (node.properties.associatedSda || '') ||
                      matchedUser.voicemailEnabled !== (node.type === 'voicemail' || !!(node.properties as any).voicemailEnabled)
                    );

                    // Map brand and models for displaying
                    const brand = node.properties.phoneBrand || '';
                    const model = node.properties.phoneModel === 'custom_input' ? node.properties.phoneModelCustom : node.properties.phoneModel;
                    const fullModel = brand ? `${brand} ${model || ''}`.trim() : '';

                    return (
                      <div key={node.id} className="p-2 border rounded-lg bg-white border-slate-200 hover:border-blue-300 transition-colors flex items-center justify-between text-xs gap-2">
                        <div className="space-y-0.5 truncate flex-1">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                            <span className="truncate">{node.name}</span>
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1 py-0.2 rounded font-mono font-bold border border-blue-105 shrink-0">
                              {node.properties.internalNumber}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 justify-between">
                            <span>Secteur: <b className="font-extrabold text-slate-600 uppercase">{node.type}</b></span>
                            {fullModel && <span className="bg-slate-100 text-slate-700 px-1 rounded text-[9px] truncate max-w-[80px]">{fullModel}</span>}
                          </div>
                          {node.properties.associatedSda && (
                            <div className="text-[9px] font-mono text-cyan-800 bg-cyan-50/50 border border-cyan-100 px-1 py-0.2 rounded inline-block">
                              SDA: {node.properties.associatedSda}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0">
                          {matchedUser ? (
                            hasDiff ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const mappedType = node.type === 'user_station' 
                                    ? (node.properties.phoneType === 'Softphone' ? 'Softphone' : node.properties.phoneType === 'DECT' ? 'DECT' : 'IP')
                                    : 'Analogique';
                                  handleUpdateUser(matchedUser.id, {
                                    name: node.name,
                                    internalNumber: node.properties.internalNumber || '',
                                    sdaId: node.properties.associatedSda || '',
                                    stationType: mappedType as any,
                                    phoneBrand: node.properties.phoneBrand || 'Yealink',
                                    phoneModel: node.properties.phoneModel || '',
                                    phoneModelCustom: node.properties.phoneModelCustom || '',
                                    voicemailEnabled: node.type === 'voicemail' || !!(node.properties as any).voicemailEnabled,
                                  });
                                }}
                                className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-extrabold px-2 py-1 rounded text-[9px] cursor-pointer transition-colors"
                                title="Aligner l'annuaire avec ce que vous avez dessiné dans le schéma"
                              >
                                Align
                              </button>
                            ) : (
                              <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 select-none">
                                ✓ Relié
                              </span>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const mappedType = node.type === 'user_station' 
                                  ? (node.properties.phoneType === 'Softphone' ? 'Softphone' : node.properties.phoneType === 'DECT' ? 'DECT' : 'IP')
                                  : 'Analogique';
                                onUpdateUsers([...project.users, {
                                  id: `u-sync-${node.id}`,
                                  name: node.name,
                                  email: '',
                                  internalNumber: node.properties.internalNumber || '',
                                  sdaId: node.properties.associatedSda || '',
                                  stationType: mappedType as any,
                                  phoneBrand: node.properties.phoneBrand || 'Yealink',
                                  phoneModel: node.properties.phoneModel || '',
                                  phoneModelCustom: node.properties.phoneModelCustom || '',
                                  voicemailEnabled: node.type === 'voicemail' || !!(node.properties as any).voicemailEnabled,
                                  forwardEnabled: false,
                                  forwardDestination: '',
                                  comment: `Synchronisé du schéma (${node.type})`
                                }]);
                              }}
                              className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-extrabold px-2 py-1 rounded text-[9px] cursor-pointer transition-all active:scale-95"
                            >
                              + Relier
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Datalist suggestion with SDAs from design schema */}
            <datalist id="sda-suggestions-list">
              {sdaSuggestions.map((num, i) => (
                <option key={i} value={num} />
              ))}
            </datalist>

            {/* Main Users Spreadsheet Grid */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-slate-300 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <th className="p-3 w-48">Utilisateur / Nom du Poste</th>
                      <th className="p-3 w-28">N° Interne (Ext)</th>
                      <th className="p-3 w-40">Email</th>
                      <th className="p-3 w-36">SDA Associée</th>
                      <th className="p-3 w-32">Type</th>
                      <th className="p-3 w-44">Modèle Téléphone</th>
                      <th className="p-3 w-20">Messagerie</th>
                      <th className="p-3 w-20">Renvoi</th>
                      <th className="p-3 w-40">Observations</th>
                      <th className="p-3 w-12 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {project.users.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center italic text-slate-400">Aucun collaborateur raccordé pour l'instant.</td>
                      </tr>
                    ) : (
                      project.users.map(u => (
                        <tr key={u.id} id={`row-user-${u.id}`} className="hover:bg-slate-50">
                          <td className="p-2.5 font-semibold text-slate-800">
                            <input
                              type="text"
                              value={u.name}
                              onChange={(e) => handleUpdateUser(u.id, { name: e.target.value })}
                              className="bg-transparent hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1.5 py-1 w-full border-none font-semibold text-slate-800 text-xs"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={u.internalNumber}
                              onChange={(e) => handleUpdateUser(u.id, { internalNumber: e.target.value })}
                              className="bg-transparent hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1.5 py-1 w-full border-none font-mono font-bold"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="email"
                              value={u.email}
                              onChange={(e) => handleUpdateUser(u.id, { email: e.target.value })}
                              className="bg-transparent hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1.5 py-1 w-full border-none text-slate-600 font-medium"
                              placeholder="ex@acme.com"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={u.sdaId}
                              onChange={(e) => handleUpdateUser(u.id, { sdaId: e.target.value })}
                              className="bg-transparent hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1.5 py-1 w-full border-none text-slate-700 font-mono"
                              placeholder="ex: 0140203001"
                              list="sda-suggestions-list"
                              title="Double-cliquez pour voir les numéros NDI/SDA du schéma"
                            />
                          </td>
                          <td className="p-2.5">
                            <select
                              value={u.stationType}
                              onChange={(e) => handleUpdateUser(u.id, { stationType: e.target.value as any })}
                              className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 w-full text-slate-700 font-medium"
                            >
                              <option value="IP">IP Fixe</option>
                              <option value="DECT">Sans fil DECT</option>
                              <option value="Softphone">Softphone PC</option>
                              <option value="Analogique">Analogique</option>
                            </select>
                          </td>
                          <td className="p-2.5">
                            <div className="space-y-1 min-w-[155px]">
                              {/* Brand Selector */}
                              <select
                                value={u.phoneBrand || ''}
                                onChange={(e) => {
                                  const b = e.target.value;
                                  handleUpdateUser(u.id, { phoneBrand: b, phoneModel: '' });
                                }}
                                className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 w-full text-[10px] text-slate-700 font-bold"
                              >
                                <option value="">-- Marque --</option>
                                {BRANDS.map(b => (
                                  <option key={b} value={b}>{b}</option>
                                ))}
                              </select>

                              {/* Model Selector depending on brand */}
                              {u.phoneBrand ? (
                                <select
                                  value={u.phoneModel || ''}
                                  onChange={(e) => handleUpdateUser(u.id, { phoneModel: e.target.value })}
                                  className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 w-full text-[10px] text-slate-700"
                                >
                                  <option value="">-- Modèle --</option>
                                  {(u.phoneBrand === 'Yealink' ? YEALINK_MODELS : 
                                    u.phoneBrand === 'Poly' || u.phoneBrand === 'Polycom' ? POLY_MODELS : 
                                    u.phoneBrand === 'Gigaset' ? GIGASET_MODELS : 
                                    u.phoneBrand === 'Alcatel-Lucent Enterprise' ? ALE_MODELS : 
                                    OTHER_MODELS[u.phoneBrand || ''] || []).map(m => (
                                      <option key={m} value={m}>{m}</option>
                                  ))}
                                  <option value="custom_input">Autre (Saisie libre)...</option>
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="Modèle direct..."
                                  value={u.phoneModel || ''}
                                  onChange={(e) => handleUpdateUser(u.id, { phoneModel: e.target.value })}
                                  className="bg-transparent hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 w-full border border-slate-200 text-[10px] text-slate-700"
                                />
                              )}

                              {/* Custom Model Text Input */}
                              {(u.phoneModel === 'custom_input' || (u.phoneBrand && !((u.phoneBrand === 'Yealink' ? YEALINK_MODELS : 
                                u.phoneBrand === 'Poly' || u.phoneBrand === 'Polycom' ? POLY_MODELS : 
                                u.phoneBrand === 'Gigaset' ? GIGASET_MODELS : 
                                u.phoneBrand === 'Alcatel-Lucent Enterprise' ? ALE_MODELS : 
                                OTHER_MODELS[u.phoneBrand || ''] || []).includes(u.phoneModel || '')))) && (
                                <input
                                  type="text"
                                  placeholder="Saisir modèle..."
                                  value={u.phoneModelCustom || ''}
                                  onChange={(e) => handleUpdateUser(u.id, { phoneModelCustom: e.target.value })}
                                  className="bg-white border border-slate-300 rounded px-1 py-0.5 w-full text-[10px] text-slate-800 font-semibold"
                                />
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={u.voicemailEnabled}
                              onChange={(e) => handleUpdateUser(u.id, { voicemailEnabled: e.target.checked })}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-400 cursor-pointer"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={u.forwardEnabled}
                              onChange={(e) => handleUpdateUser(u.id, { forwardEnabled: e.target.checked })}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-400 cursor-pointer animate-pulse"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={u.comment}
                              onChange={(e) => handleUpdateUser(u.id, { comment: e.target.value })}
                              className="bg-transparent hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1.5 py-1 w-full border-none text-slate-500"
                              placeholder="ex: Poste d'accueil"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              id={`delete-user-${u.id}`}
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Retirer ce poste"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'lines' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Gestion des Lignes de Tête & Trunks</h3>
                <p className="text-xs text-slate-500 mt-1">Déclarez les liaisons opérateurs physiques ou logiques raccordées à votre commutateur central.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  id="btn-add-line"
                  onClick={handleAddLine}
                  className="bg-slate-900 text-teal-400 hover:bg-slate-800 text-xs font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Ajouter un Trunk IP</span>
                </button>
                <button
                  id="btn-export-lines-csv"
                  onClick={downloadLinesCSV}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                >
                  <Download size={14} />
                  <span>Télécharger CSV</span>
                </button>

                {/* CSV operator Line uploader */}
                <input
                  type="file"
                  ref={linesFileRef}
                  onChange={(e) => handleCSVUpload(e, 'lines')}
                  accept=".csv"
                  className="hidden"
                  id="csv-lines-uploader-input"
                />
                <button
                  id="btn-import-lines-csv"
                  onClick={() => linesFileRef.current?.click()}
                  className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Importer CSV</span>
                </button>
              </div>
            </div>

            {/* Trunks list */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-300 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <th className="p-3 w-48">NDI de tête</th>
                    <th className="p-3 w-40">Type de Ligne</th>
                    <th className="p-3 w-32">Canaux Voix</th>
                    <th className="p-3 w-56">Opérateur Télécom</th>
                    <th className="p-3">Notes de raccordement</th>
                    <th className="p-3 w-20 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {project.lines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center italic text-slate-400">Aucun Trunk Opérateur déclaré pour le moment.</td>
                    </tr>
                  ) : (
                    project.lines.map(line => (
                      <tr key={line.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <input
                            type="text"
                            value={line.ndi}
                            onChange={(e) => handleUpdateLine(line.id, { ndi: e.target.value })}
                            className="bg-transparent hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1.5 py-1 w-full border-none font-mono font-bold text-slate-800"
                            placeholder="01 40..."
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={line.type}
                            onChange={(e) => handleUpdateLine(line.id, { type: e.target.value as any })}
                            className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 w-full text-slate-700"
                          >
                            <option value="SIP Trunk">SIP Trunk (VoIP)</option>
                            <option value="T0">T0 (ISDN / Numéris)</option>
                            <option value="T2">T2 (ISDN / Numéris étendu)</option>
                            <option value="Analogique">Ligne analogique</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="1"
                            value={line.channels}
                            onChange={(e) => handleUpdateLine(line.id, { channels: parseInt(e.target.value) || 1 })}
                            className="bg-transparent hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1.5 py-1 w-full border-none font-mono text-slate-700 font-bold"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={line.provider}
                            onChange={(e) => handleUpdateLine(line.id, { provider: e.target.value })}
                            className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 w-full text-slate-700"
                          >
                            {PROVIDERS.map((pr, i) => (
                              <option key={i} value={pr}>{pr}</option>
                            ))}
                            <option value="Autre">Autre</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={line.comment}
                            onChange={(e) => handleUpdateLine(line.id, { comment: e.target.value })}
                            className="bg-transparent hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1.5 py-1 w-full border-none text-slate-500"
                            placeholder="ex: SBC de repli IP raccordé"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteLine(line.id)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Retirer cette ligne"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* SDA Bulk creator from CSV block */}
            <div className="p-5 border border-amber-200 bg-amber-50/40 rounded-xl space-y-3.5">
              <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                <FileSpreadsheet size={15} />
                CRÉATEUR RAPIDE ET IMPORT DE NUMÉROS SDA SUR L'ÉDITEUR
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                Pour créer instantanément sur votre zone de travail graphique une liste complète de numéros SDA sous forme de blocs sans avoir à les créer un par un, préparez un tableau ou fichier CSV, puis importez-le ci-dessous.
              </p>
              
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={sdaFileRef}
                  onChange={(e) => handleCSVUpload(e, 'sda')}
                  accept=".csv"
                  className="hidden"
                  id="csv-sda-uploader-input"
                />
                <button
                  id="btn-import-sda-csv"
                  onClick={() => sdaFileRef.current?.click()}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Upload size={14} />
                  <span>Importer et instancier des SDA et raccordements directes (.csv)</span>
                </button>
                
                <button
                  id="btn-export-sda-csv"
                  onClick={downloadSdaCSV}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={14} />
                  <span>Télécharger les SDA actives (.csv)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'templates' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <h3 className="text-sm font-bold text-slate-800">Modèles Réutilisables Enregistrés</h3>
              <p className="text-xs text-slate-500 mt-1">
                Voici la liste des modèles enregistrés localement dans votre session de conception. Vous pouvez les glisser ou cliquer depuis le menu latéral gauche à tout moment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.templates.map(tmpl => (
                <div key={tmpl.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                      <span className="font-bold text-slate-800 text-xs">{tmpl.name}</span>
                      <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold uppercase px-1.5 py-0.5 rounded">
                        {tmpl.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-normal mb-3">{tmpl.description}</p>
                    
                    {/* Display serialized internal params */}
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-150 text-[10px] text-slate-600 space-y-1 font-mono">
                      {tmpl.properties.phoneModel && <div>• Modèle IP: {tmpl.properties.phoneModel}</div>}
                      {tmpl.properties.timeSchedule && <div>• Horaires: {tmpl.properties.timeSchedule}</div>}
                      {tmpl.properties.audioMessageName && <div>• Message: {tmpl.properties.audioMessageName}</div>}
                      {tmpl.properties.delayBeforeForward && <div>• Délai: {tmpl.properties.delayBeforeForward}s</div>}
                      {tmpl.properties.forwardDestination && <div>• Cible: {tmpl.properties.forwardDestination}</div>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTemplate(tmpl.id)}
                    className="mt-4 w-full bg-rose-50 hover:bg-rose-100/80 border border-rose-200 text-rose-700 font-bold py-1.5 rounded transition-all flex items-center justify-center gap-1.5 text-[11px] cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Retirer ce modèle de la palette</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
