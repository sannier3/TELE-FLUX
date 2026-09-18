/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
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
  PhoneForwarded,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
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
  Search,
  X,
  Waypoints
} from 'lucide-react';
import { NodeType, ReusableTemplate, CallNode } from '../types';
import { NODE_METADATA } from '../utils/templates';

interface SidebarProps {
  onAddNode: (type: NodeType, templateProps?: CallNode['properties']) => void;
  templates: ReusableTemplate[];
  onApplyTemplate: (template: ReusableTemplate) => void;
}

export default function Sidebar({ onAddNode, templates, onApplyTemplate }: SidebarProps) {
  const [search, setSearch] = useState('');
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
    const cls = 'w-4 h-4';
    switch (iconName) {
      case 'database':
        return <Layers className={`${cls} text-emerald-600`} />;
      case 'phone-incoming':
        return <PhoneIncoming className={`${cls} text-emerald-600`} />;
      case 'hash':
        return <Hash className={`${cls} text-teal-600`} />;
      case 'phone':
        return <PhoneIncoming className={`${cls} text-teal-600`} />;
      case 'phone-outgoing':
        return <PhoneOutgoing className={`${cls} text-slate-500`} />;
      case 'user':
        return <User className={`${cls} text-sky-600`} />;
      case 'phone-call':
        return <PhoneIncoming className={`${cls} text-sky-500`} />;
      case 'layers':
        return <Layers className={`${cls} text-slate-600`} />;
      case 'users':
        return <Users className={`${cls} text-amber-600`} />;
      case 'clock':
        return <Clock className={`${cls} text-amber-500`} />;
      case 'phone-forwarded':
        return <PhoneForwarded className={`${cls} text-violet-500`} />;
      case 'phone-missed':
        return <PhoneForwarded className={`${cls} text-fuchsia-500`} />;
      case 'phone-off':
        return <PhoneForwarded className={`${cls} text-pink-500`} />;
      case 'voicemail':
        return <Volume2 className={`${cls} text-rose-500`} />;
      case 'volume2':
        return <Volume2 className={`${cls} text-red-500`} />;
      case 'sun':
        return <Clock className={`${cls} text-slate-600`} />;
      case 'external-link':
        return <PhoneOutgoing className={`${cls} text-sky-600`} />;
      case 'smartphone':
        return <Smartphone className={`${cls} text-cyan-600`} />;
      case 'shield-alert':
        return <ShieldAlert className={`${cls} text-red-600`} />;
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
        return <Layers className={`${cls} text-slate-500`} />;
    }
  };

  const categories = [
    { id: 'numbers', label: 'Numéros & entrées', accent: 'text-emerald-700' },
    { id: 'terminals', label: 'Postes & terminaux', accent: 'text-sky-700' },
    { id: 'routing', label: 'Routage & logique', accent: 'text-amber-700' },
    { id: 'forwards', label: 'Renvois & redirections', accent: 'text-violet-700' },
    { id: 'media', label: 'Horaires & messages', accent: 'text-rose-700' }
  ];

  const query = search.trim().toLowerCase();

  const matchesQuery = (label: string, description?: string, type?: string) => {
    if (!query) return true;
    return (
      label.toLowerCase().includes(query) ||
      (description || '').toLowerCase().includes(query) ||
      (type || '').toLowerCase().includes(query)
    );
  };

  const nodesByCategory = (cat: string) => {
    return (Object.entries(NODE_METADATA).filter(
      ([type, metadata]) =>
        metadata.category === cat &&
        matchesQuery(metadata.label, metadata.defaultProps.description, type)
    ) as [NodeType, (typeof NODE_METADATA)[NodeType]][]);
  };

  const filteredTemplates = useMemo(
    () =>
      templates.filter((t) =>
        matchesQuery(t.name, t.description, t.type)
      ),
    [templates, query]
  );

  const totalMatches = useMemo(() => {
    if (!query) return null;
    const nodeCount = Object.entries(NODE_METADATA).filter(([type, m]) =>
      matchesQuery(m.label, m.defaultProps.description, type)
    ).length;
    return nodeCount + filteredTemplates.length;
  }, [query, filteredTemplates.length]);

  return (
    <aside className="w-80 tf-panel flex flex-col h-full overflow-hidden select-none" id="sidebar-panel">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 space-y-2.5">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Palette d&apos;éléments</h2>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Recherchez puis ajoutez un bloc au canevas.
          </p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            id="palette-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (SVI, file, trunk…)"
            className="w-full pl-8 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Effacer"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {totalMatches != null && (
          <p className="text-[10px] text-slate-500 font-medium">
            {totalMatches === 0 ? 'Aucun résultat' : `${totalMatches} résultat${totalMatches > 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {categories.map(cat => {
          const items = nodesByCategory(cat.id);
          if (query && items.length === 0) return null;
          const isCollapsed = query ? false : collapsedCats[cat.id];

          return (
            <div key={cat.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => !query && toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer text-left"
              >
                <span className={`text-[11px] font-bold tracking-wide uppercase ${cat.accent}`}>
                  {cat.label}
                  {query && <span className="ml-1.5 text-slate-400 font-semibold normal-case">({items.length})</span>}
                </span>
                {!query && (
                  isCollapsed ? (
                    <ChevronDown size={14} className="text-slate-400" />
                  ) : (
                    <ChevronUp size={14} className="text-slate-400" />
                  )
                )}
              </button>

              {!isCollapsed && (
                <div className="p-2 grid grid-cols-1 gap-1 border-t border-slate-100 bg-slate-50/40">
                  {items.map(([type, meta]) => (
                    <button
                      key={type}
                      id={`sidebar-item-${type}`}
                      type="button"
                      onClick={() => onAddNode(type)}
                      className="group flex items-center justify-between p-2 rounded-lg border border-transparent hover:border-brand-200 hover:bg-brand-50/60 transition-all text-left text-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-md bg-white border border-slate-200 group-hover:border-brand-300 shrink-0">
                          {getIcon(meta.iconName)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 truncate">{meta.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal truncate">
                            {meta.defaultProps.description}
                          </div>
                        </div>
                      </div>
                      <Plus size={14} className="text-slate-300 group-hover:text-brand-600 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {(filteredTemplates.length > 0 || !query) && (
          <div className="rounded-xl border border-brand-200 bg-brand-50/40 overflow-hidden">
            <button
              type="button"
              onClick={() => !query && toggleCategory('templates')}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-brand-50 transition-colors cursor-pointer text-left"
            >
              <span className="text-[11px] font-bold tracking-wide uppercase text-brand-800 flex items-center gap-1.5">
                <BookmarkCheck size={14} />
                Modèles réutilisables
              </span>
              {!query && (
                collapsedCats.templates ? (
                  <ChevronDown size={14} className="text-brand-700" />
                ) : (
                  <ChevronUp size={14} className="text-brand-700" />
                )
              )}
            </button>

            {(!query ? !collapsedCats.templates : true) && (
              <div className="p-2 space-y-1.5 border-t border-brand-100">
                {filteredTemplates.length === 0 ? (
                  <p className="text-[11px] text-slate-400 p-2 text-center italic">Aucun modèle disponible.</p>
                ) : (
                  filteredTemplates.map(tmpl => {
                    const meta = NODE_METADATA[tmpl.type];
                    return (
                      <div
                        key={tmpl.id}
                        className="p-2.5 rounded-lg border border-brand-100 bg-white hover:border-brand-300 transition-all text-xs flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-800 truncate">{tmpl.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200 shrink-0">
                            {meta?.label || tmpl.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-2">{tmpl.description}</p>
                        <button
                          type="button"
                          onClick={() => onApplyTemplate(tmpl)}
                          className="mt-1 w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold text-[10px] py-1.5 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus size={10} />
                          Instancier
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
