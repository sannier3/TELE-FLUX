/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  Smartphone, 
  Volume2, 
  Clock, 
  User, 
  Users, 
  Layers, 
  PhoneIncoming, 
  PhoneOutgoing, 
  Hash, 
  ArrowRight, 
  Trash, 
  PhoneForwarded, 
  BookmarkCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { NodeType, ReusableTemplate, CallNode } from '../types';
import { NODE_METADATA } from '../utils/templates';

interface SidebarProps {
  onAddNode: (type: NodeType, templateProps?: CallNode['properties']) => void;
  templates: ReusableTemplate[];
  onApplyTemplate: (template: ReusableTemplate) => void;
}

export default function Sidebar({ onAddNode, templates, onApplyTemplate }: SidebarProps) {
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({
    numbers: false,
    terminals: false,
    routing: false,
    forwards: false,
    media: false,
    templates: false
  });

  const toggleCategory = (cat: string) => {
    setCollapsedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'database':
        return <Layers className="w-4 h-4 text-emerald-600" />;
      case 'phone-incoming':
        return <PhoneIncoming className="w-4 h-4 text-emerald-600" />;
      case 'hash':
        return <Hash className="w-4 h-4 text-teal-600" />;
      case 'phone':
        return <PhoneIncoming className="w-4 h-4 text-teal-600" />;
      case 'phone-outgoing':
        return <PhoneOutgoing className="w-4 h-4 text-slate-500" />;
      case 'user':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'phone-call':
        return <PhoneIncoming className="w-4 h-4 text-sky-500" />;
      case 'layers':
        return <Layers className="w-4 h-4 text-indigo-500" />;
      case 'users':
        return <Users className="w-4 h-4 text-yellow-600" />;
      case 'clock':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'phone-forwarded':
        return <PhoneForwarded className="w-4 h-4 text-violet-500" />;
      case 'phone-missed':
        return <PhoneForwarded className="w-4 h-4 text-fuchsia-500" />;
      case 'phone-off':
        return <PhoneForwarded className="w-4 h-4 text-pink-500" />;
      case 'voicemail':
        return <Volume2 className="w-4 h-4 text-rose-500" />;
      case 'volume2':
        return <Volume2 className="w-4 h-4 text-red-500" />;
      case 'sun':
        return <Clock className="w-4 h-4 text-indigo-500" />;
      case 'external-link':
        return <PhoneOutgoing className="w-4 h-4 text-blue-500" />;
      case 'smartphone':
        return <Smartphone className="w-4 h-4 text-cyan-500" />;
      case 'shield-alert':
        return <Layers className="w-4 h-4 text-red-600" />;
      default:
        return <Layers className="w-4 h-4 text-slate-500" />;
    }
  };

  const categories = [
    { id: 'numbers', label: '1. NUMÉROS & ENTRÉES', color: 'text-emerald-500' },
    { id: 'terminals', label: '2. POSTES & TERMINAUX', color: 'text-blue-500' },
    { id: 'routing', label: '3. ROUTAGE & LOGIQUE', color: 'text-amber-500' },
    { id: 'forwards', label: '4. RENVOIS & REDIRECTIONS', color: 'text-violet-500' },
    { id: 'media', label: '5. HORAIRES & MESSAGES', color: 'text-rose-500' }
  ];

  const nodesByCategory = (cat: string) => {
    return Object.entries(NODE_METADATA).filter(
      ([_, metadata]) => metadata.category === cat
    ) as [NodeType, typeof NODE_METADATA[NodeType]][];
  };

  return (
    <div className="w-80 border-r border-white/20 bg-white/40 backdrop-blur-md flex flex-col h-full overflow-hidden select-none" id="sidebar-panel">
      {/* Search or Quick note */}
      <div className="p-4 border-b border-white/20 bg-white/30">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase">Palette d'Éléments</h3>
        <p className="text-xs text-slate-500 mt-1">
          Cliquez sur un élément pour l'ajouter ou appliquez un modèle préconfiguré.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {/* Render categories & item lists */}
        {categories.map(cat => {
          const isCollapsed = collapsedCats[cat.id];
          const items = nodesByCategory(cat.id);

          return (
            <div key={cat.id} className="border border-white/40 rounded-lg bg-white/45 overflow-hidden shadow-xs backdrop-blur-xs">
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-white/40 hover:bg-[#2563eb]/10 transition-colors cursor-pointer text-left"
              >
                <span className={`text-[11px] font-bold tracking-wider ${cat.color}`}>
                  {cat.label}
                </span>
                {isCollapsed ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronUp size={14} className="text-slate-500" />}
              </button>

              {!isCollapsed && (
                <div className="p-2 grid grid-cols-1 gap-1.5 bg-white/20">
                  {items.map(([type, meta]) => (
                    <button
                      key={type}
                      id={`sidebar-item-${type}`}
                      onClick={() => onAddNode(type)}
                      className="group flex items-center justify-between p-2 rounded-md border border-white/30 bg-white/50 hover:bg-[#2563eb]/10 hover:border-blue-500/30 transition-all text-left text-xs cursor-pointer text-slate-700 font-medium"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded bg-white/60 group-hover:bg-white border group-hover:${meta.borderColor} transition-colors shadow-2xs`}>
                          {getIcon(meta.iconName)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{meta.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal line-clamp-1">{meta.defaultProps.description}</div>
                        </div>
                      </div>
                      <Plus size={14} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Reusable templates section */}
        <div className="border border-emerald-500/20 rounded-lg bg-emerald-500/5 overflow-hidden shadow-xs backdrop-blur-xs">
          <button
            onClick={() => toggleCategory('templates')}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors cursor-pointer text-left"
          >
            <span className="text-[11px] font-bold tracking-wider text-emerald-800 flex items-center gap-1.5">
              <BookmarkCheck size={14} />
              MODÈLES RÉUTILISABLES
            </span>
            {collapsedCats.templates ? <ChevronDown size={14} className="text-emerald-750" /> : <ChevronUp size={14} className="text-emerald-750" />}
          </button>

          {!collapsedCats.templates && (
            <div className="p-2 space-y-1.5 bg-white/20">
              {templates.length === 0 ? (
                <p className="text-[11px] text-slate-450 p-2 text-center italic">Aucun modèle disponible.</p>
              ) : (
                templates.map(tmpl => {
                  const meta = NODE_METADATA[tmpl.type];
                  return (
                    <div 
                      key={tmpl.id}
                      className="p-2 rounded-md border border-emerald-550/20 bg-emerald-500/5 hover:border-emerald-500/40 transition-all text-xs flex flex-col gap-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-850 line-clamp-1">{tmpl.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-white/60 text-slate-500 rounded border border-white/40">
                          {meta?.label || tmpl.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2">{tmpl.description}</p>
                      
                      <button
                        onClick={() => onApplyTemplate(tmpl)}
                        className="mt-1.5 w-full bg-emerald-600 hover:bg-emerald-700 hover:shadow-sm text-white font-medium text-[10px] py-1 rounded transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus size={10} />
                        Instancier ce modèle
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
