/**
 * Minimap + recherche Ctrl+F pour le canevas.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Map } from 'lucide-react';
import { CallNode } from '../types';
import { matchNodeSearch } from '../utils/graphHelpers';
import { NODE_METADATA } from '../utils/templates';

interface CanvasNavToolsProps {
  nodes: CallNode[];
  hiddenIds: Set<string>;
  canvasWidth: number;
  canvasHeight: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onFocusNode: (id: string) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
}

export default function CanvasNavTools({
  nodes,
  hiddenIds,
  canvasWidth,
  canvasHeight,
  containerRef,
  onFocusNode,
  searchOpen,
  setSearchOpen,
}: CanvasNavToolsProps) {
  const [query, setQuery] = useState('');
  const [showMinimap, setShowMinimap] = useState(true);
  const [view, setView] = useState({ left: 0, top: 0, w: 1, h: 1 });
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleNodes = useMemo(
    () => nodes.filter((n) => !hiddenIds.has(n.id)),
    [nodes, hiddenIds]
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return visibleNodes.filter((n) => matchNodeSearch(n, query)).slice(0, 40);
  }, [visibleNodes, query]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [searchOpen]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setView({
        left: el.scrollLeft,
        top: el.scrollTop,
        w: el.clientWidth,
        h: el.clientHeight,
      });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [containerRef]);

  const mmW = 168;
  const mmH = 112;
  const scaleX = mmW / Math.max(canvasWidth, 1);
  const scaleY = mmH / Math.max(canvasHeight, 1);
  const scale = Math.min(scaleX, scaleY);

  const jumpMinimap = (e: React.MouseEvent<SVGSVGElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / scale;
    const my = (e.clientY - rect.top) / scale;
    el.scrollTo({
      left: Math.max(0, mx - el.clientWidth / 2),
      top: Math.max(0, my - el.clientHeight / 2),
      behavior: 'smooth',
    });
  };

  return (
    <>
      {searchOpen && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 w-[min(420px,92%)] bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
            <Search size={14} className="text-brand-600 shrink-0" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un nœud (nom, ext, SDA…)"
              className="flex-1 text-xs outline-none bg-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchOpen(false);
                if (e.key === 'Enter' && results[0]) {
                  onFocusNode(results[0].id);
                  setSearchOpen(false);
                }
              }}
            />
            <kbd className="text-[9px] text-slate-400 border border-slate-200 px-1 rounded">Esc</kbd>
            <button type="button" onClick={() => setSearchOpen(false)} className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer">
              <X size={14} />
            </button>
          </div>
          {query.trim() && (
            <div className="max-h-56 overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic px-3 py-2">Aucun résultat</p>
              ) : (
                results.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      onFocusNode(n.id);
                      setSearchOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-brand-50 border-b border-slate-50 cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-slate-800 truncate">{n.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {NODE_METADATA[n.type]?.label}
                      {n.properties.internalNumber ? ` · Ext ${n.properties.internalNumber}` : ''}
                      {n.properties.number ? ` · ${n.properties.number}` : ''}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-3 right-3 z-30 flex flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={() => setShowMinimap((v) => !v)}
          className="bg-white/95 border border-slate-200 shadow-sm rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer flex items-center gap-1"
          title="Afficher / masquer la minimap"
        >
          <Map size={12} />
          Minimap
        </button>
        {showMinimap && (
          <div className="bg-white/95 border border-slate-200 shadow-lg rounded-xl p-1.5 backdrop-blur-sm">
            <svg
              width={mmW}
              height={mmH}
              className="rounded-lg bg-slate-100 cursor-crosshair"
              onClick={jumpMinimap}
            >
              {visibleNodes.map((n) => (
                <rect
                  key={n.id}
                  x={n.x * scale}
                  y={n.y * scale}
                  width={Math.max(3, 190 * scale)}
                  height={Math.max(2, 70 * scale)}
                  rx={1}
                  fill="#0d9488"
                  opacity={0.55}
                />
              ))}
              <rect
                x={view.left * scale}
                y={view.top * scale}
                width={view.w * scale}
                height={view.h * scale}
                fill="rgba(59,130,246,0.12)"
                stroke="#3b82f6"
                strokeWidth={1}
              />
            </svg>
          </div>
        )}
      </div>
    </>
  );
}
