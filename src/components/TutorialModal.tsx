import React, { useState } from 'react';
import { 
  X, 
  MousePointer, 
  Move, 
  Keyboard, 
  Sparkles, 
  RotateCcw, 
  PlusCircle, 
  Trash2, 
  CheckCircle2,
  HelpCircle,
  MousePointerClick
} from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'labels' | 'connections' | 'nodes' | 'shortcuts'>('labels');

  // Sub-modes for Connections (selected via the 3 bottom cards)
  const [activeConnMode, setActiveConnMode] = useState<0 | 1 | 2>(0);

  // Sub-modes for Node Organization (selected via the 3 bottom cards)
  const [activeNodeCase, setActiveNodeCase] = useState<0 | 1 | 2>(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <HelpCircle size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Tutoriel d'utilisation &amp; Gestuelle</span>
                <span className="bg-indigo-500/30 text-indigo-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-indigo-400/30">
                  Guide Rapide
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Découvrez les gestes interactifs, animations et raccourcis pour concevoir vos schémas SVI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors cursor-pointer"
            title="Fermer le tutoriel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('labels')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'labels'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Move size={14} className={activeTab === 'labels' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Étiquettes (Drag &amp; Dbl-Clic)</span>
          </button>

          <button
            onClick={() => setActiveTab('connections')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'connections'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <PlusCircle size={14} className={activeTab === 'connections' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Liaisons &amp; Connecteurs</span>
          </button>

          <button
            onClick={() => setActiveTab('nodes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'nodes'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles size={14} className={activeTab === 'nodes' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Organisation des Blocs</span>
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'shortcuts'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Keyboard size={14} className={activeTab === 'shortcuts' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Raccourcis Clavier</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ========================================== */}
          {/* TAB 1: ETIQUETTES (DRAG & DBL-CLIC RESET)  */}
          {/* ========================================== */}
          {activeTab === 'labels' && (
            <div className="space-y-6">
              {/* Animation Graphic Area */}
              <div className="relative h-52 bg-slate-900 rounded-2xl border border-slate-800 p-4 overflow-hidden flex items-center justify-center">
                {/* SVG connection line background */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <path
                    d="M 80 130 C 220 130, 260 70, 400 70 L 580 70"
                    fill="none"
                    stroke="#41598c"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                  />
                  {/* Start Node stub */}
                  <rect x="30" y="105" width="90" height="50" rx="8" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
                  <text x="75" y="135" textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="bold">SVI Ventes</text>
                  
                  {/* End Node stub */}
                  <rect x="580" y="45" width="100" height="50" rx="8" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
                  <text x="630" y="75" textAnchor="middle" fill="#a7f3d0" fontSize="11" fontWeight="bold">Poste Alice</text>
                </svg>

                {/* Animated Drag Label */}
                <div className="absolute top-[75px] left-[250px] animate-tutorial-label-move bg-slate-800/90 text-slate-100 border border-indigo-400/80 rounded-lg px-3 py-1.5 shadow-xl flex items-center gap-2 text-xs font-medium backdrop-blur-md z-10">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span>Appui Touche 1 (Commercial)</span>
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-400/30">
                    Étiquette
                  </span>
                </div>

                {/* Click Halo Ripples (Only appear at grab & double click moments) */}
                <div className="absolute left-[250px] top-[75px] w-8 h-8 rounded-full border-2 border-indigo-400 bg-indigo-500/30 animate-tutorial-label-ripple1 pointer-events-none z-20" />
                <div className="absolute left-[325px] top-[113px] w-8 h-8 rounded-full border-2 border-indigo-400 bg-indigo-500/30 animate-tutorial-label-ripple2 pointer-events-none z-20" />

                {/* Animated Mouse Cursor */}
                <div className="absolute animate-tutorial-label-cursor pointer-events-none z-30 text-white drop-shadow-md">
                  <MousePointer size={22} className="fill-indigo-500 text-white" />
                </div>

                {/* Status Badges on Canvas */}
                <div className="absolute bottom-3 left-3 bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-1.5 text-[11px] text-slate-300 flex items-center gap-2">
                  <RotateCcw size={13} className="text-indigo-400 shrink-0" />
                  <span><b>1. Glisser-déposer :</b> Déplace l'étiquette &bull; <b>2. Double-clic :</b> Replace au centre</span>
                </div>
              </div>

              {/* Explanations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-indigo-50/70 border border-indigo-150 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-indigo-950 text-xs">
                    <Move size={15} className="text-indigo-600" />
                    <span>1. Déplacement Libre des Étiquettes</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Maintenez le clic gauche sur n'importe quelle étiquette (ex: <i>« Si occupé »</i>, <i>« Horaires Nuit »</i>) et déplacez-la librement sur le canevas pour éviter qu'elle ne chevauche d'autres éléments.
                  </p>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-150 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-950 text-xs">
                    <RotateCcw size={15} className="text-emerald-600" />
                    <span>2. Réinitialisation par Double-Clic</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Un simple <b>double-clic sur l'étiquette</b> annule son décalage personnalisé et la repositionne instantanément au centre automatique de la liaison courbe.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 2: CONNECTIONS (2 CREATION MODES + DEL)*/}
          {/* ========================================== */}
          {activeTab === 'connections' && (
            <div className="space-y-6">
              {/* Animation Graphic Stage */}
              <div className="relative h-56 bg-slate-900 rounded-2xl border border-slate-800 p-4 overflow-hidden flex items-center justify-between">
                {/* Source Node A Card */}
                <div className="absolute left-[40px] top-[45px] w-[190px] h-[110px] bg-slate-800 border-2 border-blue-500/80 rounded-xl p-3 shadow-xl text-white z-10 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                    <span className="text-xs font-extrabold text-blue-300 truncate">SDA 0140203000</span>
                    <span className="text-[9px] bg-blue-500/20 text-blue-300 font-mono px-1 rounded">N°1</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Ligne Entrante Général</div>
                  <div className="text-[9px] text-slate-500 border-t border-slate-700/60 pt-1">Bloc Source</div>

                  {/* Outlet (+) handle on right edge middle (centered vertically at y=100) */}
                  <div className={`absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold text-[11px] border border-white shadow-md z-20 ${
                    activeConnMode === 0 || activeConnMode === 1 ? 'bg-blue-600 ring-4 ring-blue-500/40 animate-pulse scale-110' : 'bg-slate-600'
                  }`} title="Port de sortie (+)">
                    +
                  </div>
                </div>

                {/* Target Node B Card */}
                <div className="absolute left-[450px] top-[45px] w-[190px] h-[110px] bg-slate-800 border-2 border-emerald-500/80 rounded-xl p-3 shadow-xl text-white z-10 flex flex-col justify-between">
                  {/* Target inlet connection point (small circular port on left border - NO text inside) */}
                  <div className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 transition-all z-20 ${
                    activeConnMode === 0 || activeConnMode === 1 ? 'border-emerald-400 bg-emerald-100 ring-4 ring-emerald-500/40 animate-pulse scale-110' : 'border-slate-400'
                  }`} title="Port d'entrée de destination" />

                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                    <span className="text-xs font-extrabold text-emerald-300 truncate">SVI Accueil</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-1 rounded">Menu</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Menu Vocal Interactif</div>
                  <div className="text-[9px] text-slate-500 border-t border-slate-700/60 pt-1">Bloc Cible</div>
                </div>

                {/* SVG connection paths and arrowheads matching designer exact coordinates */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-15">
                  {/* MODE 0: Clic-à-Clic (+) */}
                  {activeConnMode === 0 && (
                    <>
                      {/* Preview dynamic line while cursor travels */}
                      <g className="animate-tutorial-conn-mode1-preview">
                        <path
                          d="M 230 100 C 330 100, 350 100, 450 100"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3"
                          strokeDasharray="6 4"
                        />
                      </g>
                      {/* Locked solid line after click on target */}
                      <g className="animate-tutorial-conn-mode1-solid">
                        <path
                          d="M 230 100 C 330 100, 350 100, 450 100"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2.5"
                        />
                        <polygon
                          points="450,100 442,96 442,104"
                          fill="#3b82f6"
                        />
                      </g>
                    </>
                  )}

                  {/* MODE 1: Glisser-Déposer (+) */}
                  {activeConnMode === 1 && (
                    <>
                      {/* Preview line while dragging */}
                      <g className="animate-tutorial-conn-mode1-preview">
                        <path
                          d="M 230 100 C 330 100, 350 100, 450 100"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="3"
                          strokeDasharray="5 5"
                        />
                      </g>
                      {/* Locked solid line on release */}
                      <g className="animate-tutorial-conn-mode1-solid">
                        <path
                          d="M 230 100 C 330 100, 350 100, 450 100"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2.5"
                        />
                        <polygon
                          points="450,100 442,96 442,104"
                          fill="#3b82f6"
                        />
                      </g>
                    </>
                  )}

                  {/* MODE 2: Suppression Simple */}
                  {activeConnMode === 2 && (
                    <g className="animate-tutorial-conn-delete-state">
                      <path
                        d="M 230 100 C 330 100, 350 100, 450 100"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2.5"
                      />
                      <polygon
                        points="450,100 442,96 442,104"
                        fill="#3b82f6"
                      />
                    </g>
                  )}
                </svg>

                {/* Connection Label Badges positioned at midpoint (340, 100) */}
                {activeConnMode !== 2 && (
                  <div className="absolute top-[100px] left-[340px] -translate-x-1/2 -translate-y-1/2 text-[11px] bg-slate-800 text-slate-100 border border-blue-400/80 px-2.5 py-1 rounded-md font-semibold shadow-md z-20 animate-tutorial-conn-mode1-solid">
                    Appel Direct
                  </div>
                )}

                {activeConnMode === 2 && (
                  <div className="absolute top-[100px] left-[340px] -translate-x-1/2 -translate-y-1/2 text-[11px] bg-slate-800 text-slate-100 border border-blue-400/80 px-2.5 py-1 rounded-md font-semibold shadow-md z-20 animate-tutorial-conn-delete-state flex items-center gap-1.5">
                    <span>Appel Direct</span>
                    <span className="text-[9px] bg-red-500/40 text-red-200 px-1 py-0.2 rounded border border-red-400/40 font-mono">Suppr</span>
                  </div>
                )}

                {/* Click Halo Ripples (Fires ONLY at exact click events) */}
                {activeConnMode === 0 && (
                  <>
                    <div className="absolute left-[230px] top-[100px] w-8 h-8 rounded-full border-2 border-blue-400 bg-blue-500/30 animate-tutorial-conn-mode1-ripple-outlet pointer-events-none z-20" />
                    <div className="absolute left-[450px] top-[100px] w-8 h-8 rounded-full border-2 border-emerald-400 bg-emerald-500/30 animate-tutorial-conn-mode1-ripple-inlet pointer-events-none z-20" />
                  </>
                )}
                {activeConnMode === 1 && (
                  <div className="absolute left-[230px] top-[100px] w-8 h-8 rounded-full border-2 border-blue-400 bg-blue-500/30 animate-tutorial-conn-mode2-ripple pointer-events-none z-20" />
                )}
                {activeConnMode === 2 && (
                  <div className="absolute left-[280px] top-[100px] w-8 h-8 rounded-full border-2 border-red-500 bg-red-500/30 animate-tutorial-conn-delete-ripple pointer-events-none z-20" />
                )}

                {/* Mouse Cursor Animations for each mode */}
                {activeConnMode === 0 && (
                  <div className="absolute animate-tutorial-conn-mode1-cursor pointer-events-none z-30 text-white drop-shadow-md">
                    <MousePointer size={22} className="fill-blue-500 text-white" />
                  </div>
                )}
                {activeConnMode === 1 && (
                  <div className="absolute animate-tutorial-conn-mode2-cursor pointer-events-none z-30 text-white drop-shadow-md">
                    <MousePointer size={22} className="fill-blue-500 text-white" />
                  </div>
                )}
                {activeConnMode === 2 && (
                  <div className="absolute animate-tutorial-conn-delete-cursor pointer-events-none z-30 text-white drop-shadow-md">
                    <MousePointer size={22} className="fill-red-500 text-white" />
                  </div>
                )}
              </div>

              {/* 3 Interactive Selector Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div 
                  onClick={() => setActiveConnMode(0)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    activeConnMode === 0 ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/30' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <MousePointerClick size={14} className="text-blue-600" />
                    <span>Moyen 1 : Clic-à-Clic (+)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Cliquez sur le poinçon bleu <b className="text-blue-600 font-mono">(+)</b> du bloc source, puis cliquez sur l'ancrage vert du bloc cible.
                  </p>
                </div>

                <div 
                  onClick={() => setActiveConnMode(1)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    activeConnMode === 1 ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/30' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <Move size={14} className="text-blue-600" />
                    <span>Moyen 2 : Glisser-Déposer (+)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Maintenez le clic sur le bouton <b className="text-blue-600 font-mono">(+)</b> et tirez le fil directement jusqu'au bloc de destination.
                  </p>
                </div>

                <div 
                  onClick={() => setActiveConnMode(2)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    activeConnMode === 2 ? 'bg-red-50 border-red-300 ring-2 ring-red-400/30' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <Trash2 size={14} className="text-red-600" />
                    <span>Suppression Simple</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Cliquez directement sur la ligne de liaison (ou sur son étiquette) puis appuyez sur <kbd className="px-1 bg-slate-200 rounded text-[10px]">Suppr</kbd> ou <kbd className="px-1 bg-slate-200 rounded text-[10px]">Backspace</kbd>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 3: ORGANISATION DES BLOCS (3 CASES)    */}
          {/* ========================================== */}
          {activeTab === 'nodes' && (
            <div className="space-y-6">
              {/* Animation Stage Window for Node Cases */}
              <div className="relative h-56 bg-slate-900 rounded-2xl border border-slate-800 p-4 overflow-hidden flex items-center justify-center">
                {/* CASE 0: DRAG NODE */}
                {activeNodeCase === 0 && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="absolute top-10 left-24 animate-tutorial-node-drag-card w-48 bg-slate-800 border-2 border-indigo-500 rounded-xl p-3 shadow-xl text-white z-10">
                      <div className="text-xs font-bold text-indigo-300 flex items-center justify-between">
                        <span>Poste Alice (101)</span>
                        <Move size={12} className="text-indigo-400" />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Glisser par l'en-tête</div>
                    </div>

                    <div className="absolute animate-tutorial-node-drag-cursor pointer-events-none z-30 text-white drop-shadow-md">
                      <MousePointer size={22} className="fill-indigo-500 text-white" />
                    </div>
                  </div>
                )}

                {/* CASE 1: AUTO SPACE */}
                {activeNodeCase === 1 && (
                  <div className="relative w-full h-full flex items-center justify-around px-8">
                    {/* Top Simulated Auto-space button */}
                    <div className="absolute top-3 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5 border border-emerald-400 animate-pulse z-20">
                      <Sparkles size={13} />
                      <span>Espacer Automatiquement</span>
                    </div>

                    {/* Nodes adjusting positions */}
                    <div className="animate-tutorial-node-space1 w-36 bg-slate-800 border-2 border-emerald-400/80 rounded-xl p-2.5 text-white">
                      <div className="text-xs font-bold text-emerald-300">SVI Accueil</div>
                      <div className="text-[10px] text-slate-400">Position Réalignée</div>
                    </div>

                    <div className="animate-tutorial-node-space2 w-36 bg-slate-800 border-2 border-emerald-400/80 rounded-xl p-2.5 text-white">
                      <div className="text-xs font-bold text-emerald-300">Groupement Ventes</div>
                      <div className="text-[10px] text-slate-400">Position Réalignée</div>
                    </div>
                  </div>
                )}

                {/* CASE 2: MARQUEE SELECTION */}
                {activeNodeCase === 2 && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* Multi selection box animation */}
                    <div className="absolute top-8 left-16 border-2 border-dashed border-indigo-400 bg-indigo-500/20 rounded-lg animate-tutorial-marquee-box pointer-events-none z-20" />

                    <div className="flex gap-8 z-10">
                      <div className="w-36 bg-slate-800 border-2 border-indigo-400 rounded-xl p-2.5 text-white shadow-lg">
                        <div className="text-xs font-bold text-indigo-300">Poste Alice</div>
                        <div className="text-[10px] text-slate-300">Encadré / Sélectionné</div>
                      </div>

                      <div className="w-36 bg-slate-800 border-2 border-indigo-400 rounded-xl p-2.5 text-white shadow-lg">
                        <div className="text-xs font-bold text-indigo-300">Poste Bob</div>
                        <div className="text-[10px] text-slate-300">Encadré / Sélectionné</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3 Interactive Selector Cards for Node Cases */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div 
                  onClick={() => setActiveNodeCase(0)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    activeNodeCase === 0 
                      ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-500/30 shadow-sm' 
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeNodeCase === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      <Move size={15} />
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs">1. Glisser &amp; Déplacer</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Attrapez une carte par son en-tête pour la repositionner n'importe où sur le canevas.
                  </p>
                </div>

                <div 
                  onClick={() => setActiveNodeCase(1)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    activeNodeCase === 1 
                      ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/30 shadow-sm' 
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeNodeCase === 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      <Sparkles size={15} />
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs">2. Espacer Automatiquement</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Un clic sur le bouton vert réaligne proprement tous les blocs sans aucun chevauchement.
                  </p>
                </div>

                <div 
                  onClick={() => setActiveNodeCase(2)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    activeNodeCase === 2 
                      ? 'bg-purple-50/90 border-purple-300 ring-2 ring-purple-500/30 shadow-sm' 
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeNodeCase === 2 ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      <MousePointer size={15} />
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs">3. Sélection Rectangulaire</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Encadrez plusieurs éléments avec la souris pour les déplacer en groupe facilement.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 4: SHORTCUTS & SUMMARY                 */}
          {/* ========================================== */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Récapitulatif des Raccourcis Clavier &amp; Gestes Rapides
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-700 font-medium">Supprimer élément ou liaison</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-3xs font-mono font-bold text-[10px]">Suppr</kbd>
                    <span className="text-slate-400">/</span>
                    <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-3xs font-mono font-bold text-[10px]">Backspace</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-indigo-50/70 border border-indigo-150 rounded-xl">
                  <span className="text-indigo-950 font-semibold">Replacer étiquette au centre</span>
                  <span className="bg-white border border-indigo-200 text-indigo-700 font-bold px-2 py-1 rounded shadow-3xs text-[10px]">
                    Double-clic sur l'étiquette
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-700 font-medium">Annuler action (Undo)</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-3xs font-mono font-bold text-[10px]">Ctrl</kbd>
                    <span className="text-slate-400">+</span>
                    <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-3xs font-mono font-bold text-[10px]">Z</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-700 font-medium">Rétablir action (Redo)</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-3xs font-mono font-bold text-[10px]">Ctrl</kbd>
                    <span className="text-slate-400">+</span>
                    <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-3xs font-mono font-bold text-[10px]">Y</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl col-span-1 md:col-span-2">
                  <span className="text-slate-700 font-medium">Annuler le tracé d'une liaison en cours</span>
                  <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-3xs font-mono font-bold text-[10px]">Échap (ESC)</kbd>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>Toutes vos modifications sont sauvegardées automatiquement.</span>
          </div>

          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            J'ai compris, fermer
          </button>
        </div>
      </div>
    </div>
  );
};
