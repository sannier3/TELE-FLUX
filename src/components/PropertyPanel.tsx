/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  Save, 
  Layers, 
  BookmarkCheck, 
  Info,
  Phone,
  Clock,
  Volume2,
  Smartphone,
  PhoneForwarded,
  ShieldAlert,
  Plus,
  Settings,
  Copy,
  RefreshCw
} from 'lucide-react';
import { CallNode, ReusableTemplate, NodeType } from '../types';
import { NODE_METADATA } from '../utils/templates';
import { 
  BRANDS, 
  YEALINK_MODELS, 
  POLY_MODELS, 
  GIGASET_MODELS, 
  ALE_MODELS, 
  OTHER_MODELS, 
  PLATFORMS, 
  CONFIG_METHODS, 
  STATUSES, 
  HEADSET_CONNECTION_TYPES, 
  HEADSET_BRANDS, 
  EXPANSION_MODULES, 
  EXP_MODELS 
} from '../data/phoneModels';
import {
  DISTRIBUTION_MODES,
  GROUP_FEATURE_OPTIONS,
  QUEUE_FEATURE_OPTIONS,
  IVR_FEATURE_OPTIONS,
  STATION_FEATURE_OPTIONS,
  OVERFLOW_ACTIONS,
  normalizeDistributionMode,
  PBU_FEATURE_OPTIONS,
  TRUNK_FEATURE_OPTIONS,
} from '../data/telephonyOptions';
import { densityToFlags, getDisplayDensity, DisplayDensity } from '../utils/nodeDisplay';

interface PropertyPanelProps {
  selectedNodeId: string | null;
  nodes: CallNode[];
  onUpdateNodeProperties: (id: string, updates: Partial<CallNode['properties']>) => void;
  onUpdateNodeName: (id: string, name: string) => void;
  onDeleteNode: (id: string) => void;
  onCreateTemplateFromNode: (node: CallNode, templateName: string, templateDesc: string) => void;
  onCloneNode: (id: string) => void;
  onChangeNodeType: (id: string, newType: NodeType) => void;
}

const formatTimeSchedulesToString = (schedules: { days: string[]; start: string; end: string }[]): string => {
  if (!schedules || schedules.length === 0) return 'Fermé';
  const parts = schedules.map(s => {
    if (!s.days || s.days.length === 0) return '';
    const dayMap: { [key: string]: string } = {
      'Lundi': 'Lu', 'Mardi': 'Ma', 'Mercredi': 'Me', 'Jeudi': 'Je', 'Vendredi': 'Ve', 'Samedi': 'Sa', 'Dimanche': 'Di'
    };
    const dayShorts = s.days.map(d => dayMap[d] || d.substring(0, 2));
    
    const allWeekdays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    const allWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    
    let daysStr = '';
    const hasAllWeekdays = allWeekdays.every(d => s.days.includes(d)) && s.days.length === 5;
    const hasAllWeek = allWeek.every(d => s.days.includes(d)) && s.days.length === 7;
    
    if (hasAllWeek) {
      daysStr = 'Tous les jours';
    } else if (hasAllWeekdays) {
      daysStr = 'Lu-Ve';
    } else {
      daysStr = dayShorts.join(',');
    }
    
    return `${daysStr}: ${s.start || '00:00'}-${s.end || '00:00'}`;
  }).filter(Boolean);
  
  return parts.length > 0 ? parts.join(' ; ') : 'Fermé';
};

export default function PropertyPanel({
  selectedNodeId,
  nodes,
  onUpdateNodeProperties,
  onUpdateNodeName,
  onDeleteNode,
  onCreateTemplateFromNode,
  onCloneNode,
  onChangeNodeType
}: PropertyPanelProps) {
  const node = nodes.find(n => n.id === selectedNodeId);

  // Reusable template states
  const [tmplName, setTmplName] = useState('');
  const [tmplDesc, setTmplDesc] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Active props inside local state to avoid slow rendering input lag
  const [localName, setLocalName] = useState('');
  const [localProps, setLocalProps] = useState<CallNode['properties']>({});

  useEffect(() => {
    if (node) {
      setLocalName(node.name);
      setLocalProps(node.properties || {});
      setIsSavingTemplate(false);
      setTmplName(`Modèle personnalisé ${node.name}`);
      setTmplDesc(`Configuration dérivée de l'élément ${node.name}.`);
    } else {
      setLocalName('');
      setLocalProps({});
    }
  }, [selectedNodeId, node]);

  if (!node) {
    return (
      <div className="w-80 tf-panel-right flex flex-col items-center justify-center p-6 text-center select-none" id="property-panel-empty">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 shadow-sm mb-3">
          <Layers size={32} />
        </div>
        <h4 className="text-sm font-bold text-slate-800">Aucun élément sélectionné</h4>
        <p className="text-xs text-slate-500 mt-2 max-w-[14rem] leading-relaxed">
          Sélectionnez un bloc sur le canevas pour éditer ses paramètres.
        </p>
      </div>
    );
  }

  // Callback to push local state updates to global state
  const handlePropertyChange = (key: keyof CallNode['properties'], val: any) => {
    const updatedProps = { ...localProps, [key]: val };
    setLocalProps(updatedProps);
    onUpdateNodeProperties(node.id, { [key]: val });
  };

  const handleKeyConfigChange = (key: keyof NonNullable<CallNode['properties']['keyConfig']>, val: any) => {
    const currentKeyConfig = localProps.keyConfig || {
      keyName: '',
      keyType: 'BLF',
      functionCode: '',
      concernedPost: '',
      actionTriggered: '',
      targetStatus: 'nuit',
      impactedRule: '',
      clientComment: '',
      techComment: ''
    };
    const updatedKeyConfig = { ...currentKeyConfig, [key]: val };
    handlePropertyChange('keyConfig', updatedKeyConfig);
  };

  const handleNameChange = (val: string) => {
    setLocalName(val);
    onUpdateNodeName(node.id, val);
  };

  const handleOptionToggle = (option: string) => {
    const activeOptions = localProps.additionalOptions || [];
    const nextOptions = activeOptions.includes(option)
      ? activeOptions.filter(o => o !== option)
      : [...activeOptions, option];
    handlePropertyChange('additionalOptions', nextOptions);
  };

  const saveNodeAsTemplate = () => {
    if (!tmplName.trim()) {
      alert('Veuillez spécifier un nom de modèle.');
      return;
    }
    onCreateTemplateFromNode(node, tmplName, tmplDesc);
    setIsSavingTemplate(false);
    alert('Modèle enregistré avec succès ! Il est maintenant disponible dans la palette de gauche.');
  };

  return (
    <div className="w-80 tf-panel-right flex flex-col h-full overflow-hidden" id="property-panel-active">
      <div className="p-4 border-b border-slate-200 bg-slate-50/80 shrink-0 select-none space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Paramètres du bloc</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Identité, type et contenu affiché sur le schéma</p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Type de nœud</label>
          <div className="flex items-center gap-1.5">
            <select
              id="prop-change-node-type"
              value={node.type}
              onChange={(e) => {
                const next = e.target.value as NodeType;
                if (next === node.type) return;
                const ok = window.confirm(
                  `Changer le type vers « ${NODE_METADATA[next]?.label || next} » ?\nLes champs incompatibles seront remplacés par les valeurs par défaut du nouveau type.`
                );
                if (ok) onChangeNodeType(node.id, next);
              }}
              className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              {(Object.keys(NODE_METADATA) as NodeType[]).map((t) => (
                <option key={t} value={t}>{NODE_METADATA[t].label}</option>
              ))}
            </select>
            <RefreshCw size={14} className="text-slate-400 shrink-0" title="Changer le type" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-700 uppercase">Libellé du bloc</label>
          <input
            id="prop-node-name"
            type="text"
            value={localName}
            onChange={(e) => handleNameChange(e.target.value)}
            className="tf-input-light font-semibold"
          />
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onCloneNode(node.id)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 cursor-pointer"
          >
            <Copy size={12} />
            Cloner
          </button>
          <button
            type="button"
            onClick={() => setIsSavingTemplate(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-brand-200 bg-brand-50 hover:bg-brand-100 text-[10px] font-bold text-brand-800 cursor-pointer"
          >
            <BookmarkCheck size={12} />
            Modèle
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Affichage canevas — en premier pour guider l'utilisateur */}
        <div className="space-y-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wide flex items-center gap-1">
            <Settings size={12} className="text-brand-600" />
            Affichage sur le schéma
          </h4>
          <p className="text-[10px] text-slate-500 leading-snug">
            Choisissez combien d&apos;infos apparaissent sur la carte — évite de surcharger le canevas.
          </p>
          <div className="grid grid-cols-3 gap-1">
            {([
              { id: 'compact' as DisplayDensity, label: 'Compact', hint: 'Titre + n°' },
              { id: 'standard' as DisplayDensity, label: 'Standard', hint: 'Essentiel' },
              { id: 'detailed' as DisplayDensity, label: 'Détaillé', hint: 'Tout' },
            ]).map((opt) => {
              const active = getDisplayDensity(node) === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    const flags = densityToFlags(opt.id);
                    setLocalProps(prev => ({ ...prev, ...flags }));
                    onUpdateNodeProperties(node.id, flags);
                  }}
                  className={`px-1.5 py-2 rounded-lg border text-center cursor-pointer transition-colors ${
                    active
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-brand-300'
                  }`}
                >
                  <div className="text-[10px] font-bold">{opt.label}</div>
                  <div className={`text-[8px] mt-0.5 ${active ? 'text-brand-100' : 'text-slate-400'}`}>{opt.hint}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic fields based on Node Type */}

        {/* 1. Direct number or external number */}
        {(node.type === 'sda' || node.type === 'ndi' || node.type === 'nds' || node.type === 'incoming_num' || node.type === 'mobile_external' || node.type === 'external_destination' || node.type === 'direct_line' || node.type === 'sip_trunk' || node.type === 'fax' || node.type === 'outbound_route' || node.type === 'mobile_pbu') && (
          <div className="space-y-1.5 p-3 bg-white/30 rounded-lg border border-white/40">
            <label className="block text-[11px] font-bold text-slate-700 uppercase">Numéro Téléphonique</label>
            <input
              id="prop-node-number"
              type="text"
              value={localProps.number || ''}
              onChange={(e) => handlePropertyChange('number', e.target.value)}
              placeholder="ex: 0140203000"
              className="w-full border border-white/40 bg-white/50 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-mono font-semibold"
            />
            <p className="text-[10px] text-slate-500">Pour un appel d'arrivée standard ou un transfert extérieur.</p>
          </div>
        )}

        {/* 2. Platform target and Config Method (ANY node can contain target platform & method of configuration) */}
        <div className="space-y-3 p-3 bg-slate-100/50 rounded-lg border border-white/40">
          <h4 className="font-bold text-slate-700 text-xs flex items-center justify-between">
            <span>Intégration & Compatibilité</span>
            <span className="text-[9px] bg-slate-200 text-slate-600 font-extrabold px-1.5 py-0.5 rounded uppercase">Plateforme</span>
          </h4>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold block uppercase">Plateforme Cible</label>
              <select
                id="prop-node-platform"
                value={localProps.targetPlatform || ''}
                onChange={(e) => handlePropertyChange('targetPlatform', e.target.value)}
                className="w-full border border-white/40 rounded px-2 py-1 bg-white/60 text-xs focus:ring-2 focus:ring-blue-500/10 focus:outline-none"
              >
                <option value="">-- Choisir --</option>
                {PLATFORMS.map((plat) => (
                  <option key={plat} value={plat}>{plat}</option>
                ))}
              </select>
              {localProps.targetPlatform === 'Autre' && (
                <input
                  type="text"
                  placeholder="Saisir la plateforme..."
                  value={localProps.targetPlatformCustom || ''}
                  onChange={(e) => handlePropertyChange('targetPlatformCustom', e.target.value)}
                  className="w-full border border-white/40 rounded px-2 py-1 bg-white/80 mt-1 font-semibold text-xs"
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-550 block font-bold uppercase">Méthode Config</label>
              <select
                id="prop-node-config-method"
                value={localProps.configMethod || ''}
                onChange={(e) => handlePropertyChange('configMethod', e.target.value)}
                className="w-full border border-white/40 rounded px-2 py-1 bg-white/60 text-xs focus:ring-2 focus:ring-blue-500/10 focus:outline-none"
              >
                <option value="">-- Choisir --</option>
                {CONFIG_METHODS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 3. Advanced Post / Terminal Equipment Details */}
        {(node.type === 'user_station' || node.type === 'direct_line' || node.type === 'switchboard' || node.type === 'softphone' || node.type === 'mobile_pbu') && (
          <div className="space-y-3.5 p-3 bg-blue-50/40 rounded-lg border border-blue-100 font-medium">
            <h4 className="font-extrabold text-blue-900 text-xs border-b border-blue-100 pb-1 flex items-center justify-between">
              <span>Équipements & Matériel Poste</span>
              <span className="text-[8px] bg-blue-600 text-white font-black px-1 rounded">PRO</span>
            </h4>
            
            {(node.type === 'user_station' || node.type === 'softphone' || node.type === 'mobile_pbu' || node.type === 'direct_line' || node.type === 'switchboard') && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block uppercase font-bold">Collaborateur / Usager</label>
                <input
                  id="prop-node-username"
                  type="text"
                  value={localProps.userName || ''}
                  onChange={(e) => handlePropertyChange('userName', e.target.value)}
                  placeholder="Alice Robinson"
                  className="w-full border border-white/40 rounded px-2 py-1 bg-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block font-bold uppercase">N° Interne (Ext)</label>
                <input
                  id="prop-node-internal-num"
                  type="text"
                  value={localProps.internalNumber || ''}
                  onChange={(e) => handlePropertyChange('internalNumber', e.target.value)}
                  placeholder="ex: 101"
                  className="w-full border border-white/40 rounded px-2 py-1 bg-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block font-bold uppercase">SDA Associée</label>
                <input
                  id="prop-node-associated-sda"
                  type="text"
                  value={localProps.associatedSda || ''}
                  onChange={(e) => handlePropertyChange('associatedSda', e.target.value)}
                  placeholder="ex: 0140203010"
                  className="w-full border border-white/40 rounded px-2 py-1 bg-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block font-bold uppercase font-sans">N° Présenté (Sortant)</label>
                <input
                  id="prop-node-outgoing-cid"
                  type="text"
                  value={localProps.outgoingCallerId || ''}
                  onChange={(e) => handlePropertyChange('outgoingCallerId', e.target.value)}
                  placeholder="ex: 0140203000"
                  className="w-full border border-white/40 rounded px-2 py-1 bg-white/60 focus:outline-none font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block font-bold uppercase">Adresse MAC</label>
                <input
                  id="prop-node-mac"
                  type="text"
                  value={localProps.macAddress || ''}
                  onChange={(e) => handlePropertyChange('macAddress', e.target.value)}
                  placeholder="00:15:65:AA:BB:CC"
                  className="w-full border border-white/40 rounded px-2 py-1 bg-white/60 focus:outline-none font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block font-bold">SITE / LIEU</label>
                <input
                  id="prop-node-site"
                  type="text"
                  value={localProps.siteName || ''}
                  onChange={(e) => handlePropertyChange('siteName', e.target.value)}
                  placeholder="ex: Siège Paris"
                  className="w-full border border-white/40 rounded px-2 py-1 bg-white/60 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block font-bold">SERVICE / DEP</label>
                <input
                  id="prop-node-service"
                  type="text"
                  value={localProps.serviceName || ''}
                  onChange={(e) => handlePropertyChange('serviceName', e.target.value)}
                  placeholder="ex: Support"
                  className="w-full border border-white/40 rounded px-2 py-1 bg-white/60 text-xs"
                />
              </div>
            </div>

            {/* Brand & Model Selector with fallback option */}
            <div className="space-y-2 p-2 bg-white/40 rounded-md border border-white/50">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 block uppercase font-bold">Marque du Téléphone</label>
                <select
                  id="prop-node-phone-brand"
                  value={localProps.phoneBrand || ''}
                  onChange={(e) => {
                    const b = e.target.value;
                    handlePropertyChange('phoneBrand', b);
                    handlePropertyChange('phoneModel', ''); // reset model on brand change
                  }}
                  className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 text-xs"
                >
                  <option value="">-- Choisir une marque --</option>
                  {BRANDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 block uppercase font-bold">Type de Poste</label>
                <select
                  id="prop-node-phone-type"
                  value={localProps.phoneType || 'IP'}
                  onChange={(e) => handlePropertyChange('phoneType', e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 text-xs animate-fade-in"
                >
                  <option value="IP">Poste Fixe IP</option>
                  <option value="DECT">Poste Mobile DECT</option>
                  <option value="Mobile PBU">Mobile SFR (Option PABX PBU)</option>
                  <option value="Softphone">Softphone Logiciel</option>
                  <option value="Analogique">Extension Analogique</option>
                </select>
              </div>

              {localProps.phoneBrand && (
                <div className="space-y-1 animate-fade-in">
                  <label className="text-[10px] text-slate-600 block uppercase font-bold">Modèle du Terminal</label>
                  <select
                    id="prop-node-phone-model-select"
                    value={localProps.phoneModel || ''}
                    onChange={(e) => handlePropertyChange('phoneModel', e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 text-[11px]"
                  >
                    <option value="">-- Choisir un modèle --</option>
                    {(localProps.phoneBrand === 'Yealink' ? YEALINK_MODELS : 
                      localProps.phoneBrand === 'Poly' || localProps.phoneBrand === 'Polycom' ? POLY_MODELS : 
                      localProps.phoneBrand === 'Gigaset' ? GIGASET_MODELS : 
                      localProps.phoneBrand === 'Alcatel-Lucent Enterprise' ? ALE_MODELS : 
                      OTHER_MODELS[localProps.phoneBrand || ''] || []).map((m) => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                    <option value="custom_input">Saisie libre...</option>
                  </select>

                  {/* Saisie libre si modèle non listé ou custom choisi */}
                  {(localProps.phoneModel === 'custom_input' || !((localProps.phoneBrand === 'Yealink' ? YEALINK_MODELS : 
                    localProps.phoneBrand === 'Poly' || localProps.phoneBrand === 'Polycom' ? POLY_MODELS : 
                    localProps.phoneBrand === 'Gigaset' ? GIGASET_MODELS : 
                    localProps.phoneBrand === 'Alcatel-Lucent Enterprise' ? ALE_MODELS : 
                    OTHER_MODELS[localProps.phoneBrand || ''] || []).includes(localProps.phoneModel || ''))) && (
                    <input
                      type="text"
                      placeholder="Saisir le modèle de téléphone..."
                      value={localProps.phoneModelCustom || ''}
                      onChange={(e) => handlePropertyChange('phoneModelCustom', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 bg-white mt-1 text-slate-800 text-xs font-semibold"
                    />
                  )}
                </div>
              )}
            </div>

            {/* DECT Base and Handset Fields - Conditional */}
            {(localProps.phoneType === 'DECT' || (localProps.phoneBrand === 'Gigaset' && localProps.phoneBrand !== 'Mitel')) && (
              <div className="space-y-2 p-2 bg-brand-50/60 rounded-md border border-brand-100 animate-fade-in text-[11px]">
                <h5 className="font-extrabold text-brand-900 uppercase text-[9px] tracking-wider">Connexion DECT Sans-Fil</h5>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 block font-bold">BASE DECT ASSOCIÉE</label>
                  <input
                    type="text"
                    placeholder="ex: W70B ou N670 IP PRO"
                    value={localProps.dectBaseModel || ''}
                    onChange={(e) => handlePropertyChange('dectBaseModel', e.target.value)}
                    className="w-full border border-white/40 rounded px-2 py-0.5 bg-white text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 block font-bold">COMBINÉ DECT ASSOCIÉ</label>
                  <input
                    type="text"
                    placeholder="ex: W73H ou S700H PRO"
                    value={localProps.dectHandsetModel || ''}
                    onChange={(e) => handlePropertyChange('dectHandsetModel', e.target.value)}
                    className="w-full border border-white/40 rounded px-2 py-0.5 bg-white text-xs font-semibold"
                  />
                </div>
              </div>
            )}

            {/* Extension module DSS Presence */}
            <div className="space-y-2 p-2 bg-white/40 rounded-md border border-white/50 text-[11px]">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 block uppercase font-bold">Module d'Extension</label>
                <select
                  value={localProps.hasExtensionModule || 'aucun module d\'extension'}
                  onChange={(e) => handlePropertyChange('hasExtensionModule', e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 text-xs"
                >
                  {EXPANSION_MODULES.map((ext) => (
                    <option key={ext} value={ext}>{ext}</option>
                  ))}
                </select>
              </div>

              {localProps.hasExtensionModule && localProps.hasExtensionModule !== 'aucun module d\'extension' && (
                <div className="space-y-1 animate-fade-in">
                  <label className="text-[9px] text-slate-500 block font-bold">MODÈLE DU MODULE DSS</label>
                  <select
                    value={localProps.extensionModuleModel || 'Aucun'}
                    onChange={(e) => handlePropertyChange('extensionModuleModel', e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 text-[11px]"
                  >
                    {EXP_MODELS.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  {localProps.extensionModuleModel === 'module personnalisé' && (
                    <input
                      type="text"
                      placeholder="Spécifier le modèle d'extension..."
                      value={localProps.extensionModuleCustom || ''}
                      onChange={(e) => handlePropertyChange('extensionModuleCustom', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 bg-white mt-1 text-slate-800 text-xs font-semibold"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Headset Presence */}
            <div className="space-y-2 p-2 bg-white/40 rounded-md border border-white/50 text-[11px]">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 block uppercase font-bold">Casque Téléphonique</label>
                <select
                  value={localProps.hasHeadset || 'aucun casque'}
                  onChange={(e) => handlePropertyChange('hasHeadset', e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 text-xs"
                >
                  {HEADSET_CONNECTION_TYPES.map((hc) => (
                    <option key={hc} value={hc}>{hc}</option>
                  ))}
                </select>
              </div>

              {localProps.hasHeadset && localProps.hasHeadset !== 'aucun casque' && (
                <div className="space-y-1 space-y-1.5 animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 block font-bold uppercase">Marque Casque</label>
                    <select
                      value={localProps.headsetBrand || ''}
                      onChange={(e) => handlePropertyChange('headsetBrand', e.target.value)}
                      className="w-full border border-slate-300 rounded px-1 px-1.5 py-0.5 bg-white text-xs font-semibold"
                    >
                      <option value="">-- Choisir marque --</option>
                      {HEADSET_BRANDS.map(hb => (
                        <option key={hb} value={hb}>{hb}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 block font-bold uppercase">Modèle de Casque</label>
                    <input
                      type="text"
                      placeholder="ex: Engage 65 ou custom"
                      value={localProps.headsetModel || ''}
                      onChange={(e) => handlePropertyChange('headsetModel', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-0.5 bg-white text-xs font-semibold text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Option PABX Mobile (ex: SFR PBU / Convergence Fixe-Mobile) */}
        {(node.type === 'user_station' || node.type === 'mobile_external' || node.type === 'direct_line' || node.type === 'incoming_num' || node.type === 'mobile_pbu' || localProps.phoneType === 'Mobile PBU') && (
          <div className="space-y-2.5 p-3 bg-gradient-to-r from-red-50/80 to-amber-50/80 rounded-lg border border-red-200/70 font-medium text-xs shadow-sm">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-extrabold text-slate-800 text-[11px]">
                <input
                  type="checkbox"
                  checked={!!localProps.hasPabxOption || localProps.phoneType === 'Mobile PBU'}
                  onChange={(e) => {
                    handlePropertyChange('hasPabxOption', e.target.checked);
                    if (e.target.checked && !localProps.pabxOperator) {
                      handlePropertyChange('pabxOperator', 'SFR Business (PBU)');
                    }
                  }}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer"
                />
                <span>Option PABX Mobile (SFR PBU)</span>
              </label>
              <span className="text-[8px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded uppercase">PBU / SFR</span>
            </div>

            {(localProps.hasPabxOption || localProps.phoneType === 'Mobile PBU') && (
              <div className="space-y-2 pt-2 border-t border-red-200/50 animate-fade-in text-[11px]">
                <p className="text-[10px] text-slate-600 leading-tight">
                  Intégration PABX / IPBX sur ligne mobile (Poste Business Unifié SFR, transferts, supervision, routage convergent).
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-600 block font-bold uppercase">Opérateur / Offre</label>
                    <select
                      value={localProps.pabxOperator || 'SFR Business (PBU)'}
                      onChange={(e) => handlePropertyChange('pabxOperator', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 text-xs font-semibold"
                    >
                      <option value="SFR Business (PBU)">SFR Business (PBU)</option>
                      <option value="Orange Business">Orange Business</option>
                      <option value="Bouygues Telecom Entreprises">Bouygues Telecom</option>
                      <option value="Autre Opérateur PABX">Autre Opérateur PABX</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-600 block font-bold uppercase">N° Mobile Associé</label>
                    <input
                      type="text"
                      placeholder="ex: 06 12 34 56 78"
                      value={localProps.pabxMobileNumber || localProps.number || ''}
                      onChange={(e) => handlePropertyChange('pabxMobileNumber', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 bg-white font-mono text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-600 block font-bold uppercase">Profil & Options PABX Mobile</label>
                  <input
                    type="text"
                    placeholder="ex: Convergence Fixe-Mobile PBU, Supervision & Transfert PABX"
                    value={localProps.pabxOptionDetails || ''}
                    onChange={(e) => handlePropertyChange('pabxOptionDetails', e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3.5 Groupement & File d'attente — distribution + options ACD */}
        {(node.type === 'call_group' || node.type === 'queue') && (
          <div className="space-y-3.5 p-3 bg-amber-50/50 rounded-lg border border-amber-200/80 font-medium">
            <h4 className="font-extrabold text-amber-950 text-xs border-b border-amber-200 pb-1.5 flex items-center justify-between">
              <span>{node.type === 'queue' ? "File d'attente (ACD)" : "Groupe d'appel"}</span>
              <span className="text-[8px] bg-amber-700 text-white font-black px-1.5 py-0.5 rounded uppercase">
                {node.type === 'queue' ? 'Queue' : 'Hunt'}
              </span>
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block font-bold uppercase">N° interne</label>
                <input
                  id="prop-node-group-internal-num"
                  type="text"
                  value={localProps.internalNumber || ''}
                  onChange={(e) => handlePropertyChange('internalNumber', e.target.value)}
                  placeholder="ex: 550"
                  className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-mono font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block font-bold uppercase">Nom</label>
                <input
                  id="prop-node-group-station-name"
                  type="text"
                  value={localProps.stationName || ''}
                  onChange={(e) => handlePropertyChange('stationName', e.target.value)}
                  placeholder={node.type === 'queue' ? 'ex: File Télévente' : 'ex: Service Commercial'}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 block font-bold uppercase">Mode de distribution</label>
              <select
                id="prop-node-distribution-mode"
                value={normalizeDistributionMode(localProps.groupType)}
                onChange={(e) => handlePropertyChange('groupType', e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs text-slate-800 font-semibold"
              >
                {DISTRIBUTION_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <p className="text-[9px] text-slate-500 leading-snug">
                {DISTRIBUTION_MODES.find((m) => m.value === normalizeDistributionMode(localProps.groupType))?.hint}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 block font-bold uppercase">
                Membres / agents (ext. — une par ligne ou séparées par ,)
              </label>
              <textarea
                id="prop-node-queue-members"
                rows={3}
                value={localProps.queueMembers || ''}
                onChange={(e) => handlePropertyChange('queueMembers', e.target.value)}
                placeholder={"1101\n1102\n1103"}
                className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block font-bold uppercase">Sonnerie / agent (s)</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={localProps.agentRingTimeout ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      const updatedProps = { ...localProps, agentRingTimeout: 0, ringTime: '' };
                      setLocalProps(updatedProps);
                      onUpdateNodeProperties(node.id, { agentRingTimeout: 0, ringTime: '' });
                      return;
                    }
                    const v = Math.max(0, parseInt(raw, 10) || 0);
                    const updatedProps = { ...localProps, agentRingTimeout: v, ringTime: v > 0 ? `${v}s` : '' };
                    setLocalProps(updatedProps);
                    onUpdateNodeProperties(node.id, { agentRingTimeout: v, ringTime: v > 0 ? `${v}s` : '' });
                  }}
                  placeholder="0"
                  className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block font-bold uppercase">Timeout global (s)</label>
                <input
                  id="prop-node-group-delay"
                  type="number"
                  min={0}
                  max={3600}
                  value={localProps.delayBeforeForward ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    handlePropertyChange('delayBeforeForward', raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0));
                  }}
                  placeholder="0"
                  className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-mono text-xs"
                />
              </div>
            </div>

            {node.type === 'queue' && (
              <div className="space-y-2.5 pt-1 border-t border-amber-200/80">
                <p className="text-[9px] font-bold uppercase tracking-wide text-amber-900">Options file ACD</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 block font-bold uppercase">Max en file</label>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={localProps.maxCallersInQueue ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        handlePropertyChange('maxCallersInQueue', raw === '' ? undefined : Math.max(0, parseInt(raw, 10) || 0));
                      }}
                      placeholder="—"
                      className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 block font-bold uppercase">Wrap-up / ACW (s)</label>
                    <input
                      type="number"
                      min={0}
                      max={300}
                      value={localProps.wrapUpTime ?? 0}
                      onChange={(e) => handlePropertyChange('wrapUpTime', parseInt(e.target.value, 10) || 0)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 block font-bold uppercase">Musique d&apos;attente (.wav)</label>
                  <input
                    type="text"
                    value={localProps.musicOnHold || ''}
                    onChange={(e) => handlePropertyChange('musicOnHold', e.target.value)}
                    placeholder="moh_default.wav"
                    className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 block font-bold uppercase">Annonce périodique</label>
                    <input
                      type="text"
                      value={localProps.periodicAnnounceFile || ''}
                      onChange={(e) => handlePropertyChange('periodicAnnounceFile', e.target.value)}
                      placeholder="annonce_attente.wav"
                      className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 block font-bold uppercase">Intervalle (s)</label>
                    <input
                      type="number"
                      min={5}
                      max={300}
                      value={localProps.periodicAnnounceInterval ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        handlePropertyChange('periodicAnnounceInterval', raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0));
                      }}
                      placeholder="0"
                      className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {[
                    { key: 'announcePosition' as const, label: 'Annoncer la position dans la file' },
                    { key: 'announceHoldTime' as const, label: 'Annoncer le temps d\'attente estimé' },
                    { key: 'callbackEnabled' as const, label: 'Callback (rappel automatique)' },
                    { key: 'joinWhenEmpty' as const, label: 'Autoriser entrée si aucun agent' },
                    { key: 'leaveWhenEmpty' as const, label: 'Quitter la file si plus d\'agents' },
                  ].map((opt) => (
                    <label key={opt.key} className="flex items-center gap-2 text-[11px] text-slate-700 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!localProps[opt.key]}
                        onChange={(e) => handlePropertyChange(opt.key, e.target.checked)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5 pt-1 border-t border-amber-200/80">
              <label className="flex items-center gap-2 text-[11px] text-slate-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={localProps.skipBusyAgents !== false}
                  onChange={(e) => handlePropertyChange('skipBusyAgents', e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-3.5 h-3.5 cursor-pointer"
                />
                Ignorer les agents occupés / DND
              </label>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block font-bold uppercase">Débordement (timeout / file pleine)</label>
                <select
                  value={localProps.overflowAction || ''}
                  onChange={(e) => handlePropertyChange('overflowAction', e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs text-slate-800"
                >
                  <option value="">— Non défini —</option>
                  {OVERFLOW_ACTIONS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block font-bold uppercase">Destination de débordement</label>
                <input
                  type="text"
                  value={localProps.forwardDestination || ''}
                  onChange={(e) => handlePropertyChange('forwardDestination', e.target.value)}
                  placeholder="ex: 999, autre file, 06…"
                  className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-amber-200/80">
              <p className="text-[9px] font-bold uppercase tracking-wide text-amber-900">Options actives</p>
              <div className="grid grid-cols-1 gap-1">
                {(node.type === 'queue' ? QUEUE_FEATURE_OPTIONS : GROUP_FEATURE_OPTIONS).map((option) => {
                  const active = (localProps.additionalOptions || []).includes(option);
                  return (
                    <label key={option} className="flex items-center gap-2 text-[10px] text-slate-700 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => handleOptionToggle(option)}
                        className="rounded border-slate-300 text-brand-600 w-3.5 h-3.5 cursor-pointer"
                      />
                      {option}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Nœuds avancés (trunk, files, mobile unifié, etc.) */}
        {node.type === 'sip_trunk' && (
          <div className="space-y-3 p-3 bg-emerald-50/70 rounded-lg border border-emerald-200">
            <h4 className="font-bold text-emerald-950 text-xs uppercase">Trunk SIP</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Fournisseur</label>
                <input type="text" value={localProps.trunkProvider || ''} onChange={(e) => handlePropertyChange('trunkProvider', e.target.value)} placeholder="DSTNY, SFR, Orange…" className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Canaux</label>
                <input type="number" min={1} max={500} value={localProps.trunkChannels ?? 30} onChange={(e) => handlePropertyChange('trunkChannels', parseInt(e.target.value, 10) || 30)} className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-mono text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Plage DID / SDA</label>
              <input type="text" value={localProps.didRange || ''} onChange={(e) => handlePropertyChange('didRange', e.target.value)} placeholder="0140203000–0140203099" className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Codecs</label>
              <input type="text" value={localProps.codecPreference || ''} onChange={(e) => handlePropertyChange('codecPreference', e.target.value)} placeholder="G.711, G.729, Opus…" className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs" />
            </div>
            {TRUNK_FEATURE_OPTIONS.map((option) => (
              <label key={option} className="flex items-center gap-2 text-[10px] font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={(localProps.additionalOptions || []).includes(option)} onChange={() => handleOptionToggle(option)} className="rounded border-slate-300 text-brand-600 w-3.5 h-3.5" />
                {option}
              </label>
            ))}
          </div>
        )}

        {(node.type === 'conference' || node.type === 'parking' || node.type === 'paging' || node.type === 'disa' || node.type === 'cid_route' || node.type === 'outbound_route' || node.type === 'boss_secretary' || node.type === 'feature_code' || node.type === 'blacklist' || node.type === 'fax' || node.type === 'softphone' || node.type === 'mobile_pbu') && (
          <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
              {NODE_METADATA[node.type]?.label || 'Paramètres'}
            </h4>

            {(node.type === 'conference' || node.type === 'disa') && (
              <div className="grid grid-cols-2 gap-2">
                {node.type === 'conference' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">N° salle</label>
                      <input type="text" value={localProps.internalNumber || ''} onChange={(e) => handlePropertyChange('internalNumber', e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-mono text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Participants max</label>
                      <input type="number" min={2} max={100} value={localProps.maxParticipants ?? 10} onChange={(e) => handlePropertyChange('maxParticipants', parseInt(e.target.value, 10) || 10)} className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-mono text-xs" />
                    </div>
                  </>
                )}
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Code PIN</label>
                  <input type="text" value={localProps.pinCode || ''} onChange={(e) => handlePropertyChange('pinCode', e.target.value)} placeholder="PIN d'accès" className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-mono text-xs" />
                </div>
              </div>
            )}

            {node.type === 'parking' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Slots</label>
                  <input type="text" value={localProps.parkingSlots || ''} onChange={(e) => handlePropertyChange('parkingSlots', e.target.value)} placeholder="701-710" className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-mono text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Timeout (s)</label>
                  <input type="number" min={10} max={600} value={localProps.parkingTimeout ?? 60} onChange={(e) => handlePropertyChange('parkingTimeout', parseInt(e.target.value, 10) || 60)} className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-mono text-xs" />
                </div>
              </div>
            )}

            {node.type === 'paging' && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Zone de paging</label>
                  <input type="text" value={localProps.pageZone || ''} onChange={(e) => handlePropertyChange('pageZone', e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Destinations / postes</label>
                  <textarea rows={2} value={localProps.queueMembers || ''} onChange={(e) => handlePropertyChange('queueMembers', e.target.value)} placeholder="Ext par ligne" className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-mono text-xs" />
                </div>
              </>
            )}

            {(node.type === 'cid_route' || node.type === 'blacklist') && (
              <>
                {node.type === 'blacklist' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Mode</label>
                    <select value={localProps.listMode || 'blacklist'} onChange={(e) => handlePropertyChange('listMode', e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs">
                      <option value="blacklist">Liste noire (bloquer)</option>
                      <option value="whitelist">Liste blanche (autoriser)</option>
                    </select>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Motifs / n° appelants</label>
                  <textarea rows={3} value={localProps.cidPatterns || ''} onChange={(e) => handlePropertyChange('cidPatterns', e.target.value)} placeholder={"06*\n0140*\n+33…"} className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-mono text-xs" />
                </div>
              </>
            )}

            {node.type === 'outbound_route' && (
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Préfixes / motifs</label>
                  <input type="text" value={localProps.number || ''} onChange={(e) => handlePropertyChange('number', e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Trunk / fournisseur</label>
                  <input type="text" value={localProps.trunkProvider || ''} onChange={(e) => handlePropertyChange('trunkProvider', e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">CLI présentée</label>
                  <input type="text" value={localProps.outgoingCallerId || ''} onChange={(e) => handlePropertyChange('outgoingCallerId', e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs font-mono" />
                </div>
              </div>
            )}

            {node.type === 'boss_secretary' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Ext. boss</label>
                  <input type="text" value={localProps.bossExtension || ''} onChange={(e) => handlePropertyChange('bossExtension', e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-mono text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Ext. secrétaire</label>
                  <input type="text" value={localProps.secretaryExtension || ''} onChange={(e) => handlePropertyChange('secretaryExtension', e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-mono text-xs" />
                </div>
              </div>
            )}

            {node.type === 'feature_code' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Code (* / #)</label>
                <input type="text" value={localProps.featureCode || ''} onChange={(e) => handlePropertyChange('featureCode', e.target.value)} placeholder="*72, *8, #45…" className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-mono text-xs font-semibold" />
              </div>
            )}

            {node.type === 'fax' && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">E-mail Fax2Email</label>
                  <input type="email" value={localProps.faxEmail || ''} onChange={(e) => handlePropertyChange('faxEmail', e.target.value)} placeholder="fax@entreprise.fr" className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Ext. / n° fax</label>
                  <input type="text" value={localProps.internalNumber || ''} onChange={(e) => handlePropertyChange('internalNumber', e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-mono text-xs" />
                </div>
              </div>
            )}

            {(node.type === 'softphone' || node.type === 'mobile_pbu') && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={!!localProps.linkusEnabled} onChange={(e) => handlePropertyChange('linkusEnabled', e.target.checked)} className="rounded border-slate-300 text-brand-600 w-3.5 h-3.5" />
                  Application mobile / softphone IPBX
                </label>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={!!localProps.webrtcEnabled} onChange={(e) => handlePropertyChange('webrtcEnabled', e.target.checked)} className="rounded border-slate-300 text-brand-600 w-3.5 h-3.5" />
                  WebRTC / navigateur
                </label>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={!!localProps.simultaneousRing} onChange={(e) => handlePropertyChange('simultaneousRing', e.target.checked)} className="rounded border-slate-300 text-brand-600 w-3.5 h-3.5" />
                  Sonnerie simultanée fixe + mobile
                </label>
                {node.type === 'mobile_pbu' && PBU_FEATURE_OPTIONS.map((option) => (
                  <label key={option} className="flex items-center gap-2 text-[10px] font-medium text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={(localProps.additionalOptions || []).includes(option)} onChange={() => handleOptionToggle(option)} className="rounded border-slate-300 text-brand-600 w-3.5 h-3.5" />
                    {option}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Dynamic Status Configuration System */}
        <div className="space-y-3 p-3 bg-teal-500/5 rounded-lg border border-teal-500/10">
          <h4 className="font-bold text-teal-900 text-xs flex items-center justify-between">
            <span>État Dynamique du Bloc</span>
            <span className="text-[9px] bg-teal-600 text-white font-bold px-1.5 py-0.5 rounded uppercase">Statuts</span>
          </h4>
          
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 block font-bold uppercase">Statut Courant</label>
            <select
              id="prop-node-status"
              value={localProps.nodeStatus || ''}
              onChange={(e) => handlePropertyChange('nodeStatus', e.target.value)}
              className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-xs text-slate-800"
            >
              <option value="">-- Non configuré --</option>
              {STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
              <option value="custom">Saisie libre...</option>
            </select>
            {localProps.nodeStatus === 'custom' && (
              <input
                type="text"
                placeholder="Renseigner un statut spécifique..."
                value={localProps.nodeStatusCustom || ''}
                onChange={(e) => handlePropertyChange('nodeStatusCustom', e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1 bg-white mt-1 text-slate-800 text-xs font-semibold"
              />
            )}
          </div>
        </div>

        {/* 5. Advanced Call Forwarding Configuration (Manual vs Programmed) */}
        {(node.type.startsWith('forward_') || node.type === 'transfer' || node.type === 'day_night' || node.type === 'time_range' || node.type === 'holiday' || node.type === 'emergency_overflow') && (
          <div className="space-y-3 p-3 bg-violet-500/5 rounded-lg border border-violet-500/10 font-medium">
            <h4 className="font-extrabold text-violet-900 text-xs flex items-center justify-between">
              <span>Configuration du Renvoi</span>
              <span className="text-[9px] bg-violet-600 text-white font-extrabold px-1 rounded uppercase">Flux</span>
            </h4>
            
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 block uppercase font-bold">Type de Renvoi</label>
              <select
                value={localProps.forwardType || 'none'}
                onChange={(e) => handlePropertyChange('forwardType', e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-xs text-slate-800"
              >
                <option value="none">-- Aucun / Standard --</option>
                <option value="manual">Touché / Renvoi MANUEL</option>
                <option value="scheduled">Planifié / AUTOMATIQUE/PROGRAMMÉ</option>
              </select>
            </div>

            {localProps.forwardType === 'manual' && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded shadow-sm space-y-2 animate-fade-in">
                <span className="text-[9px] font-black text-amber-800 uppercase block tracking-wider">🛠️ Activation Manuelle</span>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 block font-bold">DÉCLENCHEUR / COMMENT ACTIVER</label>
                  <input
                    type="text"
                    placeholder="ex: Touche DSS, BLF ou code *72"
                    value={localProps.manualForwardTrigger || ''}
                    onChange={(e) => handlePropertyChange('manualForwardTrigger', e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-xs font-semibold text-slate-800"
                  />
                  <p className="text-[9px] text-slate-400 italic">Ex: Touche sur Yealink, code fonction, bouton virtuel, switch jour/nuit.</p>
                </div>
              </div>
            )}

            {localProps.forwardType === 'scheduled' && (
              <div className="p-2 bg-brand-500/10 border border-brand-500/20 rounded shadow-sm space-y-2 animate-fade-in">
                <span className="text-[9px] font-black text-brand-800 uppercase block tracking-wider">📅 Déclenchement Programmé</span>
                <p className="text-[9px] text-slate-500">Automatisé via calendrier horaire, week-ends, vacances ou jours fériés.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block uppercase font-bold">Ordre de Priorité</label>
                <input
                  type="number"
                  placeholder="Ordre"
                  min="1"
                  max="20"
                  value={localProps.forwardPriority || 1}
                  onChange={(e) => handlePropertyChange('forwardPriority', parseInt(e.target.value) || 1)}
                  className="w-full border border-slate-300 rounded px-2 py-1 bg-white font-semibold text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block uppercase font-bold">Niveau d'Urgence</label>
                <select
                  value={localProps.priorityLevel || 'Normale'}
                  onChange={(e) => handlePropertyChange('priorityLevel', e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 bg-white font-semibold text-xs text-slate-800"
                >
                  <option value="Normale">Normale</option>
                  <option value="Haute">Haute</option>
                  <option value="Urgente">Urgente</option>
                  <option value="Critique">Critique</option>
                </select>
              </div>
            </div>

            {/* Delay in seconds before forwarding */}
            {node.type === 'forward_no_answer' && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block font-bold uppercase">DÉLAI AVANT RENVOI / TIMEOUT (s)</label>
                <input
                  id="prop-node-delay"
                  type="number"
                  min="0"
                  max="300"
                  value={localProps.delayBeforeForward ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    handlePropertyChange('delayBeforeForward', raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0));
                  }}
                  placeholder="0"
                  className="w-full border border-white/40 rounded px-2 py-1 focus:outline-none bg-white/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-xs"
                />
              </div>
            )}

            {/* Destination */}
            {node.type !== 'queue' && node.type !== 'call_group' && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block">DESTINATION DU RENVOI / INTERNE OU EXTERNE</label>
                <input
                  id="prop-node-forward-dest"
                  type="text"
                  value={localProps.forwardDestination || ''}
                  onChange={(e) => handlePropertyChange('forwardDestination', e.target.value)}
                  placeholder="ex: 100, 0612345678"
                  className="w-full border border-white/40 rounded px-2 py-1 focus:outline-none bg-white/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                />
              </div>
            )}

            {/* Emergency checkbox */}
            {node.type === 'emergency_overflow' && (
              <div className="flex items-center gap-2 p-1.5 bg-red-550/10 border border-red-500/20 rounded">
                <input
                  id="prop-node-emergency-active"
                  type="checkbox"
                  checked={localProps.emergencyActive || false}
                  onChange={(e) => handlePropertyChange('emergencyActive', e.target.checked)}
                  className="rounded text-red-656 focus:ring-red-400 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="prop-node-emergency-active" className="font-bold text-red-900 text-[10px] uppercase cursor-pointer">
                  ACTIVER LE ROUTAGE D'URGENCE
                </label>
              </div>
            )}
          </div>
        )}

        {node.type === 'hangup' && (
          <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-800 text-xs uppercase">Fin d&apos;appel</h4>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Cause / motif</label>
              <select
                value={localProps.hangupCause || 'Normal Clearing'}
                onChange={(e) => handlePropertyChange('hangupCause', e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs"
              >
                <option>Normal Clearing</option>
                <option>Busy</option>
                <option>No Answer</option>
                <option>Rejected</option>
                <option>Congestion</option>
                <option>Announcement then hangup</option>
              </select>
            </div>
          </div>
        )}

        {node.type === 'junction' && (
          <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300">
            <h4 className="font-bold text-slate-800 text-xs uppercase">Nœud de liaison</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Point de jonction neutre : branchez-y plusieurs entrées et/ou plusieurs sorties pour regrouper ou redistribuer le flux sans logique métier.
            </p>
          </div>
        )}

        {/* 6. Physical / Virtual Keys Switched System (BLF, DSS, Codes) */}
        <div className="space-y-3.5 p-3 bg-violet-600/[0.03] rounded-lg border border-slate-350/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">Configuration de Touche Physique (BLF / DSS / Code)</span>
            <input
              type="checkbox"
              id="enable-key-doc"
              checked={!!localProps.keyConfig}
              onChange={(e) => {
                const checked = e.target.checked;
                if (checked) {
                  handlePropertyChange('keyConfig', {
                    keyName: '',
                    keyType: 'BLF',
                    functionCode: '',
                    concernedPost: '',
                    actionTriggered: '',
                    targetStatus: 'nuit',
                    impactedRule: '',
                    clientComment: '',
                    techComment: ''
                  });
                } else {
                  handlePropertyChange('keyConfig', undefined);
                }
              }}
              className="rounded text-blue-600 focus:ring-blue-400 w-4 h-4 cursor-pointer"
            />
          </div>

          {localProps.keyConfig && (
            <div className="space-y-2.5 p-2 bg-white/50 rounded border border-white/50 animate-fade-in">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 block font-bold uppercase">Nom de la Touche</label>
                <input
                  type="text"
                  placeholder="ex: Bascule Horaires"
                  value={localProps.keyConfig.keyName || ''}
                  onChange={(e) => handleKeyConfigChange('keyName', e.target.value)}
                  className="w-full border border-slate-320 rounded px-2 py-0.5 text-xs bg-white text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 block font-bold uppercase">Type de Touche</label>
                  <select
                    value={localProps.keyConfig.keyType || 'BLF'}
                    onChange={(e) => handleKeyConfigChange('keyType', e.target.value)}
                    className="w-full border border-slate-320 rounded px-2 py-0.5 text-xs bg-white text-slate-820"
                  >
                    <option value="BLF">Touche BLF</option>
                    <option value="DSS">Touche DSS</option>
                    <option value="Physique">Bouton Physique</option>
                    <option value="Virtuelle">Bouton Virtuel Interface</option>
                    <option value="Code fonction">Code Fonction (*xx)</option>
                    <option value="Personnalisé">Personnalisé</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 block font-bold uppercase">Code fonction associé</label>
                  <input
                    type="text"
                    placeholder="ex: *74"
                    value={localProps.keyConfig.functionCode || ''}
                    onChange={(e) => handleKeyConfigChange('functionCode', e.target.value)}
                    className="w-full border border-slate-320 rounded px-2 py-0.5 text-xs bg-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 block font-bold uppercase">Poste concerné</label>
                <input
                  type="text"
                  placeholder="ex: Secrétariat (Poste 100)"
                  value={localProps.keyConfig.concernedPost || ''}
                  onChange={(e) => handleKeyConfigChange('concernedPost', e.target.value)}
                  className="w-full border border-slate-320 rounded px-2 py-0.5 text-xs bg-white text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 block font-bold uppercase">Action déclenchée</label>
                  <input
                    type="text"
                    placeholder="Bascule Jour/Nuit"
                    value={localProps.keyConfig.actionTriggered || ''}
                    onChange={(e) => handleKeyConfigChange('actionTriggered', e.target.value)}
                    className="w-full border border-slate-320 rounded px-2 py-0.5 text-xs bg-white text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 block font-bold uppercase">Statut ciblé</label>
                  <select
                    value={localProps.keyConfig.targetStatus || 'nuit'}
                    onChange={(e) => handleKeyConfigChange('targetStatus', e.target.value)}
                    className="w-full border border-slate-320 rounded px-2 py-0.5 text-xs bg-white text-slate-810 font-sans"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 block font-bold uppercase font-sans">Règle impactée</label>
                <input
                  type="text"
                  placeholder="ex: Routage principal d'entrée"
                  value={localProps.keyConfig.impactedRule || ''}
                  onChange={(e) => handleKeyConfigChange('impactedRule', e.target.value)}
                  className="w-full border border-slate-320 rounded px-2 py-0.5 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 block font-bold uppercase">Commentaire Technicien (Touche)</label>
                <input
                  type="text"
                  placeholder="Note pour l'intégration de la touche..."
                  value={localProps.keyConfig.techComment || ''}
                  onChange={(e) => handleKeyConfigChange('techComment', e.target.value)}
                  className="w-full border border-slate-320 rounded px-2 py-0.5 text-[10px] bg-white text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 block font-bold uppercase">Commentaire Client (Touche)</label>
                <input
                  type="text"
                  placeholder="Comment utiliser cette touche..."
                  value={localProps.keyConfig.clientComment || ''}
                  onChange={(e) => handleKeyConfigChange('clientComment', e.target.value)}
                  className="w-full border border-slate-320 rounded px-2 py-0.5 text-[10px] bg-white text-slate-705"
                />
              </div>
            </div>
          )}
        </div>

        {/* 7. Schedule timer and business presets */}
        {(node.type === 'day_night' || node.type === 'time_range' || node.type === 'holiday') && (
          <div className="space-y-3 p-3 bg-brand-500/5 rounded-lg border border-brand-500/10 font-medium text-brand-900">
            <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1">
              <Clock size={13} className="text-brand-600" />
              Saisie du Calendrier / Plages Horaires
            </h4>

            {/* Selector to switch between simple string or advanced multi-slot mode */}
            <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  // Switch to simple string mode
                  if (localProps.timeSchedules) {
                    handlePropertyChange('timeSchedules', undefined);
                  }
                }}
                className={`flex-1 text-[9px] py-1 font-bold rounded-sm cursor-pointer ${!localProps.timeSchedules ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Texte Simple
              </button>
              <button
                type="button"
                onClick={() => {
                  // Initialize multi-slot mode
                  if (!localProps.timeSchedules || localProps.timeSchedules.length === 0) {
                    const defaultSchedules = [{ days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'], start: '08:30', end: '18:00' }];
                    handlePropertyChange('timeSchedules', defaultSchedules);
                    // Also compile to string
                    const formatted = 'Lu-Ve: 08:30-18:00';
                    handlePropertyChange('timeSchedule', formatted);
                  }
                }}
                className={`flex-1 text-[9px] py-1 font-bold rounded-sm cursor-pointer ${localProps.timeSchedules ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Planificateur Multi-jours
              </button>
            </div>
            
            {!localProps.timeSchedules ? (
              // Simple mode
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] block text-slate-500 font-bold uppercase">Format Plage Horaires</label>
                  <input
                    id="prop-node-timeschedule"
                    type="text"
                    value={localProps.timeSchedule || ''}
                    onChange={(e) => handlePropertyChange('timeSchedule', e.target.value)}
                    placeholder="ex: Lundi,Mardi 08:30-12:00, 14:00-18:00"
                    className="w-full border border-white/40 rounded px-2.5 py-1.5 focus:outline-none bg-white/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                  />
                  <p className="text-[9px] text-slate-500">Précisez les jours et horaires d'ouverture (calendrier).</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] block text-slate-400 uppercase font-bold">Heures Prédéfinies</label>
                  <div className="grid grid-cols-2 gap-1 text-[9px]">
                    <button
                      type="button"
                      onClick={() => handlePropertyChange('timeSchedule', 'Lundi-Vendredi 08:30-12:00, 14:00-18:00')}
                      className="bg-white/60 hover:bg-brand-500/10 border border-white/40 py-1 px-1.5 rounded cursor-pointer text-slate-700 transition-all font-semibold"
                    >
                      Bureau (Lu-Ve 8h30-18h0)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePropertyChange('timeSchedule', 'Lundi-Vendredi 09:00-12:30, 14:00-17:30')}
                      className="bg-white/60 hover:bg-brand-500/10 border border-white/40 py-1 px-1.5 rounded cursor-pointer text-slate-700 transition-all font-semibold"
                    >
                      Service (Lu-Ve 9h-17h30)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePropertyChange('timeSchedule', 'Lundi-Samedi 08:00-19:00')}
                      className="bg-white/60 hover:bg-brand-500/10 border border-white/40 py-1 px-1.5 rounded cursor-pointer text-slate-700 transition-all font-semibold"
                    >
                      Journée Continue
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePropertyChange('timeSchedule', 'Fermé')}
                      className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 py-1 px-1.5 rounded cursor-pointer text-red-700 font-bold transition-all"
                    >
                      Fermeture Totale
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Multi-slot schedule builder
              <div className="space-y-3 animate-fade-in text-[11px]">
                {localProps.timeSchedules.map((sched, sIndex) => {
                  const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
                  const DAY_SHORTS: { [key: string]: string } = {
                    'Lundi': 'Lu', 'Mardi': 'Ma', 'Mercredi': 'Me', 'Jeudi': 'Je', 'Vendredi': 'Ve', 'Samedi': 'Sa', 'Dimanche': 'Di'
                  };

                  const updateSchedules = (updatedSlot: typeof sched) => {
                    const nextSchedules = [...(localProps.timeSchedules || [])];
                    nextSchedules[sIndex] = updatedSlot;
                    handlePropertyChange('timeSchedules', nextSchedules);

                    // Compile to string
                    const formatted = formatTimeSchedulesToString(nextSchedules);
                    handlePropertyChange('timeSchedule', formatted);
                  };

                  const toggleDay = (day: string) => {
                    const currentDays = sched.days || [];
                    const nextDays = currentDays.includes(day)
                      ? currentDays.filter(d => d !== day)
                      : [...currentDays, day];
                    
                    // Sort days to match natural order
                    const sortedDays = DAYS_OF_WEEK.filter(d => nextDays.includes(d));
                    updateSchedules({ ...sched, days: sortedDays });
                  };

                  const removeSlot = () => {
                    const nextSchedules = (localProps.timeSchedules || []).filter((_, i) => i !== sIndex);
                    handlePropertyChange('timeSchedules', nextSchedules);
                    const formatted = formatTimeSchedulesToString(nextSchedules);
                    handlePropertyChange('timeSchedule', formatted);
                  };

                  return (
                    <div key={sIndex} className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-700 uppercase text-[9px]">Créneau #{sIndex + 1}</span>
                        {(localProps.timeSchedules || []).length > 1 && (
                          <button
                            type="button"
                            onClick={removeSlot}
                            className="text-slate-400 hover:text-red-500 p-0.5 rounded transition-all cursor-pointer"
                            title="Supprimer ce créneau"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      {/* Day Pill Buttons */}
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 block font-bold uppercase">Jours concernés</label>
                        <div className="flex flex-wrap gap-1">
                          {DAYS_OF_WEEK.map(d => {
                            const isSelected = (sched.days || []).includes(d);
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => toggleDay(d)}
                                className={`w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-brand-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title={d}
                              >
                                {DAY_SHORTS[d]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Time Inputs */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-slate-500 block font-bold uppercase">Heure Début</label>
                          <input
                            type="time"
                            value={sched.start || '08:30'}
                            onChange={(e) => updateSchedules({ ...sched, start: e.target.value })}
                            className="w-full border border-slate-200 bg-slate-50 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-brand-500 font-semibold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 block font-bold uppercase">Heure Fin</label>
                          <input
                            type="time"
                            value={sched.end || '18:00'}
                            onChange={(e) => updateSchedules({ ...sched, end: e.target.value })}
                            className="w-full border border-slate-200 bg-slate-50 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-brand-500 font-semibold text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    const nextSchedules = [
                      ...(localProps.timeSchedules || []),
                      { days: [], start: '09:00', end: '12:00' }
                    ];
                    handlePropertyChange('timeSchedules', nextSchedules);
                  }}
                  className="w-full py-1.5 border border-dashed border-brand-400 bg-brand-50/20 text-brand-700 hover:bg-brand-50 hover:border-brand-500 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus size={11} strokeWidth={2.5} />
                  <span>Ajouter un autre horaire</span>
                </button>
                
                {/* Result display info string */}
                <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[9.5px] text-slate-600 space-y-0.5">
                  <span className="font-extrabold uppercase text-[8px] text-slate-400 block leading-none">Format compilé résultant :</span>
                  <div className="font-mono font-bold text-slate-800 break-words">{localProps.timeSchedule}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 8. Audio Prompt files + SVI avancé */}
        {(node.type === 'ivr' || node.type === 'custom_audio' || node.type === 'voicemail' || node.type === 'greeting') && (
          <div className="space-y-2 p-3 bg-rose-500/5 rounded-lg border border-rose-500/10 font-medium text-rose-950">
            <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1">
              <Volume2 size={13} className="text-rose-600" />
              Configuration Audio &amp; Messagerie
            </h4>
            
            {(node.type === 'voicemail' || node.type === 'ivr' || node.type === 'greeting') && (
              <div className="space-y-1 mb-2">
                <label className="text-[10px] text-slate-500 block font-bold uppercase">N° de Messagerie / N° Interne (Ext)</label>
                <input
                  id="prop-node-voicemail-internal-num"
                  type="text"
                  value={localProps.internalNumber || ''}
                  onChange={(e) => handlePropertyChange('internalNumber', e.target.value)}
                  placeholder="ex: 999, 220 ou votre numéro..."
                  className="w-full border border-slate-200 rounded px-2 py-1 focus:outline-none bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-mono text-xs font-semibold"
                />
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 block font-bold uppercase">Fichier associé (.wav / .mp3)</label>
              <input
                id="prop-node-audio-name"
                type="text"
                value={localProps.audioMessageName || ''}
                onChange={(e) => handlePropertyChange('audioMessageName', e.target.value)}
                placeholder="ex: message_bienvenue.wav"
                className="w-full border border-slate-200 rounded px-2 py-1 focus:outline-none bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
              />
            </div>

            {node.type === 'ivr' && (
              <div className="space-y-2.5 border-t border-rose-200/60 pt-2.5 mt-1">
                <p className="text-[9px] font-bold uppercase tracking-wide text-rose-900">Options SVI</p>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 block font-bold uppercase">Plan de touches (DTMF)</label>
                  <textarea
                    rows={3}
                    value={localProps.ivrMenuMap || ''}
                    onChange={(e) => handlePropertyChange('ivrMenuMap', e.target.value)}
                    placeholder={"1 = Commercial\n2 = Support\n0 = Standard"}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 bg-white text-xs font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 block font-bold uppercase">Timeout DTMF (s)</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={localProps.digitTimeout ?? 5}
                      onChange={(e) => handlePropertyChange('digitTimeout', parseInt(e.target.value, 10) || 5)}
                      className="w-full border border-slate-200 rounded px-2 py-1 bg-white font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 block font-bold uppercase">Max erreurs</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={localProps.maxInvalidDigits ?? 3}
                      onChange={(e) => handlePropertyChange('maxInvalidDigits', parseInt(e.target.value, 10) || 3)}
                      className="w-full border border-slate-200 rounded px-2 py-1 bg-white font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 block font-bold uppercase">Destination si touche invalide</label>
                  <input
                    type="text"
                    value={localProps.invalidDestination || ''}
                    onChange={(e) => handlePropertyChange('invalidDestination', e.target.value)}
                    placeholder="ex: répétition menu, 9, messagerie…"
                    className="w-full border border-slate-200 rounded px-2 py-1 bg-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 block font-bold uppercase">Destination si timeout</label>
                  <input
                    type="text"
                    value={localProps.timeoutDestination || ''}
                    onChange={(e) => handlePropertyChange('timeoutDestination', e.target.value)}
                    placeholder="ex: standard, raccrocher…"
                    className="w-full border border-slate-200 rounded px-2 py-1 bg-white text-xs"
                  />
                </div>
                <div className="grid grid-cols-1 gap-1 pt-1">
                  {IVR_FEATURE_OPTIONS.map((option) => {
                    const active = (localProps.additionalOptions || []).includes(option);
                    return (
                      <label key={option} className="flex items-center gap-2 text-[10px] text-slate-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => handleOptionToggle(option)}
                          className="rounded border-slate-300 text-brand-600 w-3.5 h-3.5 cursor-pointer"
                        />
                        {option}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-1.5 mt-2">
              <div className="p-1 bg-white border border-slate-200 rounded text-[9px] w-full text-center text-slate-600 truncate">
                {localProps.audioMessageName || 'standard_pre_decroche.wav'}
              </div>
            </div>

            {node.type === 'voicemail' && (
              <div className="border-t border-rose-200/50 pt-2.5 mt-2 space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!localProps.voicemailToEmail}
                    onChange={(e) => handlePropertyChange('voicemailToEmail', e.target.checked)}
                    className="rounded text-rose-600 w-4 h-4 cursor-pointer"
                  />
                  Voicemail to Email
                </label>
                {localProps.voicemailToEmail && (
                  <input
                    type="email"
                    value={localProps.voicemailEmail || ''}
                    onChange={(e) => handlePropertyChange('voicemailEmail', e.target.value)}
                    placeholder="destinataire@entreprise.fr"
                    className="w-full border border-slate-200 rounded px-2 py-1.5 bg-white text-xs"
                  />
                )}
                <div className="flex items-center justify-between">
                  <label htmlFor="prop-show-voicemail-text" className="text-[10px] text-slate-600 font-bold uppercase cursor-pointer">Afficher le texte sur le nœud</label>
                  <input
                    id="prop-show-voicemail-text"
                    type="checkbox"
                    checked={localProps.showVoicemailTextOnNode || false}
                    onChange={(e) => handlePropertyChange('showVoicemailTextOnNode', e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-400 w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 block font-bold uppercase">Texte à afficher (sauts de ligne autorisés)</label>
                  <textarea
                    id="prop-voicemail-text"
                    rows={3}
                    value={localProps.voicemailText || ''}
                    onChange={(e) => handlePropertyChange('voicemailText', e.target.value)}
                    placeholder="Saisissez le texte d'annonce ou les instructions..."
                    className="w-full border border-slate-200 bg-white rounded p-2 focus:ring-2 focus:ring-rose-500/10 focus:outline-none text-xs text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Options poste utilisateur */}
        {(node.type === 'user_station' || node.type === 'switchboard' || node.type === 'direct_line' || node.type === 'softphone' || node.type === 'mobile_pbu') && (
          <div className="space-y-2 p-3 bg-sky-50/60 rounded-lg border border-sky-200/70">
            <h4 className="font-bold text-sky-950 text-xs uppercase tracking-wide">Options téléphonie poste</h4>
            <div className="grid grid-cols-1 gap-1">
              {STATION_FEATURE_OPTIONS.map((option) => {
                const active = (localProps.additionalOptions || []).includes(option);
                return (
                  <label key={option} className="flex items-center gap-2 text-[10px] text-slate-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => handleOptionToggle(option)}
                      className="rounded border-slate-300 text-brand-600 w-3.5 h-3.5 cursor-pointer"
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* General details and comments */}
        <div className="space-y-3 border-t border-white/20 pt-4">
          {/* Main Description */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase">Description Résumée</label>
            <input
              id="prop-node-desc"
              type="text"
              value={localProps.description || ''}
              onChange={(e) => handlePropertyChange('description', e.target.value)}
              placeholder="ex: Accueil général du siège"
              className="w-full border border-white/40 bg-white/50 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
            />
          </div>

          {/* Client comment */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1">
              <span>Commentaire Client (Simplifié)</span>
            </label>
            <textarea
              id="prop-node-comment-client"
              rows={2}
              value={localProps.clientComment || ''}
              onChange={(e) => handlePropertyChange('clientComment', e.target.value)}
              placeholder="Explications claires pour vulgariser le flux pour votre client..."
              className="w-full border border-emerald-500/20 bg-emerald-500/5 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 transition-all text-xs"
            />
          </div>

          {/* Tech comment */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-blue-800 uppercase flex items-center gap-1">
              <span>Commentaire Interne Technicien</span>
            </label>
            <textarea
              id="prop-node-comment-tech"
              rows={2.5}
              value={localProps.techComment || ''}
              onChange={(e) => handlePropertyChange('techComment', e.target.value)}
              placeholder="Paramètres SIP, routage VLAN, Trunking, ou configurations spécifiques du PABX..."
              className="w-full border border-blue-500/20 bg-blue-500/5 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 transition-all text-xs"
            />
          </div>
        </div>

        {/* Affinages d'affichage (poste uniquement) */}
        {node.type === 'user_station' || node.type === 'softphone' || node.type === 'mobile_pbu' || node.type === 'direct_line'
          ? getDisplayDensity(node) !== 'compact' && (
          <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Affichage du terminal</h4>
            <label className="flex items-center gap-2 text-slate-600 font-semibold cursor-pointer text-[11px]">
              <input
                type="checkbox"
                checked={localProps.hideInternalNumber || false}
                onChange={(e) => handlePropertyChange('hideInternalNumber', e.target.checked)}
                className="rounded border-slate-300 text-brand-600 w-3.5 h-3.5 cursor-pointer"
              />
              <span>Masquer le n° interne</span>
            </label>
            <label className="flex items-center gap-2 text-slate-600 font-semibold cursor-pointer text-[11px]">
              <input
                type="checkbox"
                checked={localProps.hideExternalNumber || false}
                onChange={(e) => handlePropertyChange('hideExternalNumber', e.target.checked)}
                className="rounded border-slate-300 text-brand-600 w-3.5 h-3.5 cursor-pointer"
              />
              <span>Masquer la SDA</span>
            </label>
            {(localProps.hasPabxOption || localProps.phoneType === 'Mobile PBU' || node.type === 'mobile_pbu') && (
              <label className="flex items-center gap-2 text-slate-600 font-semibold cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={localProps.hidePabxBadge || false}
                  onChange={(e) => handlePropertyChange('hidePabxBadge', e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Masquer le badge PABX</span>
              </label>
            )}
          </div>
        ) : null}

        {/* Delete button */}
        <button
          id="btn-prop-delete"
          onClick={() => {
            onDeleteNode(node.id);
          }}
          className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-700 hover:bg-rose-500 hover:text-white font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Trash2 size={13} />
          <span>Supprimer ce bloc</span>
        </button>

        {/* Save as Reusable Model / Template Box */}
        <div className="border-t border-white/20 pt-4">
          {isSavingTemplate && (
            <div className="p-3 border border-emerald-500/20 bg-emerald-500/5 rounded-lg space-y-3.5 select-none shadow-sm">
              <h4 className="font-bold text-emerald-800 text-xs flex items-center gap-1">
                <BookmarkCheck size={13} />
                Nouveau modèle
              </h4>
              
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold">NOM DU MODELE</label>
                <input
                  id="prop-tmpl-title"
                  type="text"
                  value={tmplName}
                  onChange={(e) => setTmplName(e.target.value)}
                  className="w-full border border-white/40 rounded px-2 py-1 bg-white/50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold">DESCRIPTION DE LA CONFIG</label>
                <textarea
                  id="prop-tmpl-desc"
                  rows={2}
                  value={tmplDesc}
                  onChange={(e) => setTmplDesc(e.target.value)}
                  className="w-full border border-white/40 rounded px-2 py-1 bg-white/50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none text-[11px] text-slate-800"
                />
              </div>

              <div className="flex gap-1.5">
                <button
                  id="btn-confirm-save-tmpl"
                  onClick={saveNodeAsTemplate}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 hover:shadow-md text-white font-semibold py-1.5 rounded transition-all cursor-pointer text-center"
                >
                  Confirmer
                </button>
                <button
                  id="btn-cancel-save-tmpl"
                  onClick={() => setIsSavingTemplate(false)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1.5 rounded transition-all cursor-pointer text-center"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
