/**
 * Instantanés manuels : créer, consulter, comparer, écraser ou enregistrer comme nouveau.
 */

import React, { useMemo, useState } from 'react';
import { X, GitCompare, Camera, History, Eye, RotateCcw, Trash2 } from 'lucide-react';
import { TelecomProject } from '../types';
import { diffSnapshots, formatLogDate } from '../utils/changelog';

interface HistoryCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: TelecomProject;
  viewingSnapshotId: string | null;
  onCreateSnapshot: (label?: string) => void;
  onViewSnapshot: (id: string) => void;
  onReturnToCurrent: () => void;
  onOverwriteSnapshot: (id: string) => void;
  onSaveAsNewFromView: (label?: string) => void;
  onDeleteSnapshot: (id: string) => void;
}

export default function HistoryCompareModal({
  isOpen,
  onClose,
  project,
  viewingSnapshotId,
  onCreateSnapshot,
  onViewSnapshot,
  onReturnToCurrent,
  onOverwriteSnapshot,
  onSaveAsNewFromView,
  onDeleteSnapshot,
}: HistoryCompareModalProps) {
  const snapshots = [...(project.snapshots || [])].reverse();
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [snapLabel, setSnapLabel] = useState('');

  const left = (project.snapshots || []).find((s) => s.id === leftId);
  const right = (project.snapshots || []).find((s) => s.id === rightId);
  const viewing = (project.snapshots || []).find((s) => s.id === viewingSnapshotId);

  const diff = useMemo(() => {
    if (!left || !right) return null;
    return diffSnapshots(left, right);
  }, [left, right]);

  const handleDelete = (id: string, label: string) => {
    if (!window.confirm(`Supprimer l’instantané « ${label} » ? Cette action est définitive.`)) return;
    if (leftId === id) setLeftId('');
    if (rightId === id) setRightId('');
    onDeleteSnapshot(id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <History size={18} className="text-brand-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Instantanés</h2>
              <p className="text-[10px] text-slate-500">Créés uniquement à la demande — pas de journal automatique</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer text-slate-500">
            <X size={18} />
          </button>
        </div>

        {viewingSnapshotId && (
          <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-950 flex flex-wrap items-center gap-2 justify-between">
            <span>
              Consultation de <b>{viewing?.label || 'instantané'}</b>
              {viewing?.at ? <> ({formatLogDate(viewing.at)})</> : null}.
              Les modifications ne sont pas le dernier état connu tant que vous n&apos;enregistrez pas.
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={onReturnToCurrent}
                className="px-2 py-1 rounded-lg bg-white border border-amber-300 font-bold cursor-pointer flex items-center gap-1"
              >
                <RotateCcw size={12} />
                Revenir à l&apos;état actuel
              </button>
              <button
                type="button"
                onClick={() => viewingSnapshotId && onOverwriteSnapshot(viewingSnapshotId)}
                className="px-2 py-1 rounded-lg bg-amber-600 text-white font-bold cursor-pointer"
              >
                Écraser cet instantané
              </button>
              <button
                type="button"
                onClick={() => onSaveAsNewFromView(snapLabel.trim() || undefined)}
                className="px-2 py-1 rounded-lg bg-brand-600 text-white font-bold cursor-pointer"
              >
                Enregistrer comme nouveau
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-3">
            <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-900">
                <Camera size={14} />
                Créer un instantané de l&apos;état actuel
              </div>
              <input
                type="text"
                value={snapLabel}
                onChange={(e) => setSnapLabel(e.target.value)}
                placeholder="Ex. Avant migration DSTNY"
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  onCreateSnapshot(snapLabel.trim() || undefined);
                  setSnapLabel('');
                }}
                disabled={!!viewingSnapshotId}
                className="w-full py-1.5 rounded-lg bg-brand-600 text-white text-[11px] font-bold cursor-pointer hover:bg-brand-700 disabled:opacity-40"
                title={viewingSnapshotId ? 'Revenez d’abord à l’état actuel, ou enregistrez depuis la barre jaune' : undefined}
              >
                Enregistrer le point de version
              </button>
            </div>

            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wide">Liste des instantanés</h3>
            <div className="max-h-72 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
              {snapshots.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic p-2">
                  Aucun instantané. Créez-en un pour pouvoir y revenir plus tard.
                </p>
              ) : (
                snapshots.map((s) => {
                  const active = viewingSnapshotId === s.id;
                  return (
                    <div
                      key={s.id}
                      className={`rounded-lg border px-2.5 py-2 flex items-center justify-between gap-2 ${
                        active ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-100'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-slate-800 truncate">{s.label}</div>
                        <div className="text-[10px] text-slate-600 font-medium mt-0.5">
                          {formatLogDate(s.at)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {s.data.nodes.length} nœuds · {s.data.connections.length} liaisons
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onViewSnapshot(s.id)}
                          disabled={active}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                        >
                          <Eye size={12} />
                          Voir
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id, s.label)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Supprimer cet instantané"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wide flex items-center gap-1.5">
              <GitCompare size={13} />
              Comparaison (optionnel)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Avant</label>
                <select
                  value={leftId}
                  onChange={(e) => setLeftId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"
                >
                  <option value="">— Choisir —</option>
                  {(project.snapshots || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.label} — {formatLogDate(s.at)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Après</label>
                <select
                  value={rightId}
                  onChange={(e) => setRightId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"
                >
                  <option value="">— Choisir —</option>
                  {(project.snapshots || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.label} — {formatLogDate(s.at)}</option>
                  ))}
                </select>
              </div>
            </div>

            {!diff ? (
              <p className="text-[11px] text-slate-400 italic">Sélectionnez deux instantanés pour comparer.</p>
            ) : (
              <div className="space-y-3 text-[11px]">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
                    <div className="text-lg font-bold text-emerald-800">+{diff.addedNodes.length}</div>
                    <div className="text-[9px] uppercase text-emerald-700">Ajoutés</div>
                  </div>
                  <div className="rounded-lg bg-rose-50 border border-rose-200 p-2">
                    <div className="text-lg font-bold text-rose-800">−{diff.removedNodes.length}</div>
                    <div className="text-[9px] uppercase text-rose-700">Supprimés</div>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-2">
                    <div className="text-lg font-bold text-amber-800">{diff.movedOrChanged.length}</div>
                    <div className="text-[9px] uppercase text-amber-700">Modifiés</div>
                  </div>
                </div>
                <p className="text-slate-500">
                  Connexions : {diff.connDelta >= 0 ? '+' : ''}{diff.connDelta}
                </p>
                {diff.addedNodes.length > 0 && (
                  <div>
                    <div className="font-bold text-emerald-800 text-[10px] uppercase mb-1">Nouveaux nœuds</div>
                    {diff.addedNodes.map((n) => (
                      <div key={n.id} className="text-emerald-700">+ {n.name}</div>
                    ))}
                  </div>
                )}
                {diff.removedNodes.length > 0 && (
                  <div>
                    <div className="font-bold text-rose-800 text-[10px] uppercase mb-1">Nœuds retirés</div>
                    {diff.removedNodes.map((n) => (
                      <div key={n.id} className="text-rose-700">− {n.name}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
