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
  Sparkles,
  Info,
  Phone,
  Clock,
  Volume2,
  Smartphone,
  PhoneForwarded,
  ShieldAlert
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

interface PropertyPanelProps {
  selectedNodeId: string | null;
  nodes: CallNode[];
  onUpdateNodeProperties: (id: string, updates: Partial<CallNode['properties']>) => void;
  onUpdateNodeName: (id: string, name: string) => void;
  onDeleteNode: (id: string) => void;
  onCreateTemplateFromNode: (node: CallNode, templateName: string, templateDesc: string) => void;
}

export default function PropertyPanel({
  selectedNodeId,
  nodes,
  onUpdateNodeProperties,
  onUpdateNodeName,
  onDeleteNode,
  onCreateTemplateFromNode
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
      <div className="w-80 border-l border-white/25 bg-white/30 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none" id="property-panel-empty">
        <div className="p-4 bg-white/60 backdrop-blur-xs rounded-full border border-white/40 text-slate-400 shadow-sm mb-3">
          <Layers size={36} />
        </div>
        <h4 className="text-sm font-bold text-slate-700">Aucun élément sélectionné</h4>
        <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
          Sélectionnez un bloc ou une ligne sur l'espace de travail central pour configurer ses paramètres techniques et commentaires clients interactifs.
        </p>
      </div>
    );
  }

  const meta = NODE_METADATA[node.type];

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
    <div className="w-80 border-l border-white/20 bg-white/45 backdrop-blur-md flex flex-col h-full overflow-hidden shadow-xl" id="property-panel-active">
      {/* Title block */}
      <div className="p-4 border-b border-white/20 bg-white/30 shrink-0 select-none">
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-150 text-slate-600 rounded">
          {meta?.label || node.type}
        </span>
        <h3 className="text-sm font-bold text-slate-800 mt-2">Paramètres du Bloc</h3>
      </div>

      {/* Inputs list scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin text-xs">
        {/* Name Input */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-700 uppercase">Libellé du Bloc</label>
          <input
            id="prop-node-name"
            type="text"
            value={localName}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full border border-white/40 bg-white/50 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-semibold text-slate-850 transition-all"
          />
        </div>

        {/* Dynamic fields based on Node Type */}

        {/* 1. Direct number or external number */}
        {(node.type === 'sda' || node.type === 'ndi' || node.type === 'nds' || node.type === 'incoming_num' || node.type === 'mobile_external' || node.type === 'external_destination' || node.type === 'direct_line') && (
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
              <label className="text-[10px] text-slate-505 font-bold block uppercase">Plateforme Cible</label>
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
        {(node.type === 'user_station' || node.type === 'direct_line' || node.type === 'switchboard') && (
          <div className="space-y-3.5 p-3 bg-blue-50/40 rounded-lg border border-blue-100 font-medium">
            <h4 className="font-extrabold text-blue-900 text-xs border-b border-blue-100 pb-1 flex items-center justify-between">
              <span>Équipements & Matériel Poste</span>
              <span className="text-[8px] bg-blue-600 text-white font-black px-1 rounded">PRO</span>
            </h4>
            
            {node.type === 'user_station' && (
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
                <label className="text-[10px] text-slate-505 block font-bold uppercase font-sans">N° Présenté (Sortant)</label>
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
              <div className="space-y-2 p-2 bg-indigo-50/60 rounded-md border border-indigo-100 animate-fade-in text-[11px]">
                <h5 className="font-extrabold text-indigo-900 uppercase text-[9px] tracking-wider">Connexion DECT Sans-Fil</h5>
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
                  <label className="text-[9px] text-slate-505 block font-bold">MODÈLE DU MODULE DSS</label>
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
        {(node.type.startsWith('forward_') || node.type === 'transfer' || node.type === 'day_night' || node.type === 'time_range' || node.type === 'emergency_overflow') && (
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
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded shadow-2xs space-y-2 animate-fade-in">
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
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded shadow-2xs space-y-2 animate-fade-in">
                <span className="text-[9px] font-black text-indigo-800 uppercase block tracking-wider">📅 Déclenchement Programmé</span>
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

            {/* Group/Queue Internal Number */}
            {(node.type === 'queue' || node.type === 'call_group') && (
              <div className="space-y-1 mb-2">
                <label className="text-[10px] text-slate-500 block font-bold uppercase">N° de Groupement / File (Interne)</label>
                <input
                  id="prop-node-group-internal-num"
                  type="text"
                  value={localProps.internalNumber || ''}
                  onChange={(e) => handlePropertyChange('internalNumber', e.target.value)}
                  placeholder="ex: 550, 551..."
                  className="w-full border border-white/40 rounded px-2 py-1 focus:outline-none bg-white/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-850 font-mono text-xs font-semibold"
                />
              </div>
            )}

            {/* Delay in seconds before forwarding */}
            {(node.type === 'forward_no_answer' || node.type === 'queue' || node.type === 'call_group') && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block font-bold uppercase">DÉLAI AVANT RENVOI / TIMEOUT (s)</label>
                <input
                  id="prop-node-delay"
                  type="number"
                  min="1"
                  max="300"
                  value={localProps.delayBeforeForward || 15}
                  onChange={(e) => handlePropertyChange('delayBeforeForward', parseInt(e.target.value) || 15)}
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
                  <label className="text-[9px] text-slate-505 block font-bold uppercase">Code fonction associé</label>
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
                  <label className="text-[9px] text-slate-505 block font-bold uppercase">Statut ciblé</label>
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
        {(node.type === 'day_night' || node.type === 'time_range') && (
          <div className="space-y-3 p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/10 font-medium text-indigo-950">
            <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1">
              <Clock size={13} className="text-indigo-600" />
              Saisie du Calendrier / Plages Horaires
            </h4>
            
            <div className="space-y-1">
              <label className="text-[10px] block text-slate-505 font-bold uppercase">Format Plage Horaires</label>
              <input
                id="prop-node-timeschedule"
                type="text"
                value={localProps.timeSchedule || ''}
                onChange={(e) => handlePropertyChange('timeSchedule', e.target.value)}
                placeholder="ex: Lundi,Mardi 08:30-12:00, 14:00-18:00"
                className="w-full border border-white/40 rounded px-2 py-1 focus:outline-none bg-white/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[9px] text-slate-500">Précisez les jours et horaires d'ouverture (calendrier).</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] block text-slate-400 uppercase font-bold">Heures Prédéfinies</label>
              <div className="grid grid-cols-2 gap-1 text-[9px]">
                <button
                  onClick={() => handlePropertyChange('timeSchedule', 'Lundi-Vendredi 08:30-12:00, 14:00-18:00')}
                  className="bg-white/60 hover:bg-indigo-500/10 border border-white/40 py-1 px-1.5 rounded cursor-pointer text-slate-700 transition-all font-semibold"
                >
                  Bureau (Lu-Ve 8h30-18h0)
                </button>
                <button
                  onClick={() => handlePropertyChange('timeSchedule', 'Lundi-Vendredi 09:00-12:30, 14:00-17:30')}
                  className="bg-white/60 hover:bg-indigo-500/10 border border-white/40 py-1 px-1.5 rounded cursor-pointer text-slate-700 transition-all font-semibold"
                >
                  Service (Lu-Ve 9h-17h30)
                </button>
                <button
                  onClick={() => handlePropertyChange('timeSchedule', 'Lundi-Samedi 08:00-19:00')}
                  className="bg-white/60 hover:bg-indigo-500/10 border border-white/40 py-1 px-1.5 rounded cursor-pointer text-slate-700 transition-all font-semibold"
                >
                  Journée Continue
                </button>
                <button
                  onClick={() => handlePropertyChange('timeSchedule', 'Fermé')}
                  className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 py-1 px-1.5 rounded cursor-pointer text-red-700 font-bold transition-all"
                >
                  Fermeture Totale
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 8. Audio Prompt files */}
        {(node.type === 'ivr' || node.type === 'custom_audio' || node.type === 'voicemail' || node.type === 'greeting') && (
          <div className="space-y-2 p-3 bg-rose-500/5 rounded-lg border border-rose-500/10 font-medium text-rose-950">
            <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1">
              <Volume2 size={13} className="text-rose-600" />
              Configuration Audio & Messagerie
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
                  className="w-full border border-white/40 rounded px-2 py-1 focus:outline-none bg-white/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-850 font-mono text-xs font-semibold"
                />
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 block font-bold uppercase">FICHIER ASSOCIÉ (.WAV / .MP3)</label>
              <input
                id="prop-node-audio-name"
                type="text"
                value={localProps.audioMessageName || ''}
                onChange={(e) => handlePropertyChange('audioMessageName', e.target.value)}
                placeholder="ex: message_bienvenue.wav"
                className="w-full border border-white/40 rounded px-2 py-1 focus:outline-none bg-white/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-850"
              />
            </div>
            
            <div className="flex items-center gap-1.5 mt-2">
              <div className="p-1 bg-white/60 border border-white/40 rounded text-[9px] w-full text-center hover:bg-white/80 cursor-pointer text-slate-600 truncate">
                {localProps.audioMessageName || 'standard_pre_decroche.wav'}
              </div>
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

        {/* Delete button */}
        <button
          id="btn-prop-delete"
          onClick={() => {
            onDeleteNode(node.id);
          }}
          className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-700 hover:bg-rose-500 hover:text-white font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <Trash2 size={13} />
          <span>Supprimer ce bloc</span>
        </button>

        {/* Save as Reusable Model / Template Box */}
        <div className="border-t border-white/20 pt-4">
          {!isSavingTemplate ? (
            <button
              id="btn-trigger-save-tmpl"
              onClick={() => setIsSavingTemplate(true)}
              className="w-full bg-white/50 hover:bg-blue-500/10 border border-white/40 text-slate-700 font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <BookmarkCheck size={14} className="text-emerald-600" />
              <span>Enregistrer comme modèle réutilisable</span>
            </button>
          ) : (
            <div className="p-3 border border-emerald-550/20 bg-emerald-500/5 rounded-lg space-y-3.5 select-none backdrop-blur-xs shadow-2xs">
              <h4 className="font-bold text-emerald-850 text-xs flex items-center gap-1">
                <Sparkles size={13} />
                Nouveau modèle dynamique
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
