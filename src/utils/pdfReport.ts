/**
 * Rapport PDF 1 page via impression navigateur (résumé + schéma + tableau).
 */

import { TelecomProject } from '../types';
import { NODE_METADATA } from './templates';
import { distributionModeLabel } from '../data/telephonyOptions';

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSchemaSvg(project: TelecomProject, maxW = 720, maxH = 320): string {
  const nodes = project.nodes;
  if (!nodes.length) {
    return `<p style="color:#94a3b8;font-size:11px;font-style:italic">Aucun nœud sur le schéma.</p>`;
  }
  const pad = 24;
  const minX = Math.min(...nodes.map((n) => n.x)) - pad;
  const minY = Math.min(...nodes.map((n) => n.y)) - pad;
  const maxX = Math.max(...nodes.map((n) => n.x + 190)) + pad;
  const maxY = Math.max(...nodes.map((n) => n.y + 90)) + pad;
  const vbW = Math.max(1, maxX - minX);
  const vbH = Math.max(1, maxY - minY);

  const lines = project.connections
    .map((c) => {
      const s = nodes.find((n) => n.id === c.sourceId);
      const t = nodes.find((n) => n.id === c.targetId);
      if (!s || !t) return '';
      const x1 = s.x + 190 - minX;
      const y1 = s.y + 45 - minY;
      const x2 = t.x - minX;
      const y2 = t.y + 45 - minY;
      const dx = Math.max(40, Math.abs(x2 - x1) * 0.4);
      return `<path d="M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}" fill="none" stroke="#94a3b8" stroke-width="2"/>`;
    })
    .join('');

  const rects = nodes
    .map((n) => {
      const nx = n.x - minX;
      const ny = n.y - minY;
      const label = esc(n.name).slice(0, 28);
      return `<rect x="${nx}" y="${ny}" width="190" height="72" rx="8" fill="#f8fafc" stroke="#0d9488" stroke-width="1.5"/>
        <text x="${nx + 10}" y="${ny + 28}" font-size="11" font-family="system-ui,sans-serif" fill="#0f172a" font-weight="700">${label}</text>
        <text x="${nx + 10}" y="${ny + 48}" font-size="9" font-family="system-ui,sans-serif" fill="#64748b">${esc(NODE_METADATA[n.type]?.label || n.type)}</text>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" width="${maxW}" height="${maxH}" style="max-width:100%;height:auto;border:1px solid #e2e8f0;border-radius:8px;background:#fff">${lines}${rects}</svg>`;
}

function stationsTable(project: TelecomProject): string {
  const stations = project.nodes.filter((n) =>
    ['user_station', 'softphone', 'mobile_pbu', 'direct_line', 'switchboard'].includes(n.type)
  );
  if (!stations.length) {
    return `<p style="color:#94a3b8;font-size:11px;font-style:italic">Aucun terminal.</p>`;
  }
  const rows = stations
    .map((n) => {
      const p = n.properties;
      return `<tr>
        <td>${esc(p.userName || n.name)}</td>
        <td>${esc(NODE_METADATA[n.type]?.label || n.type)}</td>
        <td style="font-family:ui-monospace,monospace">${esc(p.internalNumber || '—')}</td>
        <td style="font-family:ui-monospace,monospace">${esc(p.associatedSda || p.number || p.pabxMobileNumber || '—')}</td>
      </tr>`;
    })
    .join('');
  return `<table>
    <thead><tr><th>Utilisateur</th><th>Type</th><th>Ext</th><th>SDA / N°</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function entriesSummary(project: TelecomProject): string {
  const entries = project.nodes.filter((n) =>
    ['ndi', 'sda', 'nds', 'incoming_num', 'direct_line', 'sip_trunk'].includes(n.type)
  );
  if (!entries.length) return '<li>Aucune entrée</li>';
  return entries
    .map((n) => `<li><strong>${esc(n.name)}</strong> — <code>${esc(n.properties.number || '—')}</code></li>`)
    .join('');
}

function queuesSummary(project: TelecomProject): string {
  const qs = project.nodes.filter((n) => n.type === 'queue' || n.type === 'call_group');
  if (!qs.length) return '';
  return `<h3>Files &amp; groupes</h3><ul>${qs
    .map((n) => {
      const mode = distributionModeLabel(n.properties.groupType);
      return `<li>${esc(n.name)} · ${esc(mode)}${n.properties.internalNumber ? ` · Ext ${esc(n.properties.internalNumber)}` : ''}</li>`;
    })
    .join('')}</ul>`;
}

/** Ouvre une fenêtre imprimable (PDF via « Enregistrer au format PDF »). */
export function openPdfReport(project: TelecomProject): void {
  const version = project.version || '1.0';
  const dateStr = new Date().toLocaleString('fr-FR');
  const site = project.siteName || 'Site non renseigné';
  const watermark = `${esc(site)} · v${esc(version)} · ${esc(dateStr)}`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>Rapport — ${esc(project.projectName || 'Télé-Flux')}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", system-ui, sans-serif; color: #0f172a; margin: 0; position: relative; font-size: 11px; }
  .wm {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 28px; font-weight: 800; color: rgba(15,23,42,0.06);
    transform: rotate(-28deg); letter-spacing: 0.04em; white-space: nowrap;
  }
  .page { position: relative; z-index: 1; }
  h1 { font-size: 18px; margin: 0 0 4px; color: #0f766e; }
  h2 { font-size: 13px; margin: 14px 0 6px; border-bottom: 2px solid #0d9488; padding-bottom: 3px; color: #134e4a; }
  h3 { font-size: 12px; margin: 10px 0 4px; color: #334155; }
  .meta { color: #64748b; font-size: 10px; margin-bottom: 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  ul { margin: 4px 0; padding-left: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { border: 1px solid #e2e8f0; padding: 4px 6px; text-align: left; }
  th { background: #f0fdfa; color: #134e4a; }
  .bar { height: 4px; background: linear-gradient(90deg,#10b981,#0d9488,#f59e0b); border-radius: 2px; margin-bottom: 10px; }
  .footer { margin-top: 12px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }
  @media print {
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <div class="wm">${watermark}</div>
  <div class="page">
    <div class="bar"></div>
    <h1>${esc(project.projectName || 'Schéma télécom')}</h1>
    <div class="meta">
      ${esc(project.clientName || 'Client —')} · ${esc(site)} · Auteur ${esc(project.author || '—')}<br/>
      Version <strong>${esc(version)}</strong> · Généré le ${esc(dateStr)}
    </div>

    <div class="grid">
      <div>
        <h2>Entrées</h2>
        <ul>${entriesSummary(project)}</ul>
        ${queuesSummary(project)}
      </div>
      <div>
        <h2>Chiffres clés</h2>
        <ul>
          <li>${project.nodes.length} nœuds</li>
          <li>${project.connections.length} connexions</li>
          <li>${(project.annotations || []).length} zones annotées</li>
        </ul>
      </div>
    </div>

    <h2>Schéma</h2>
    ${buildSchemaSvg(project)}

    <h2>Parc postes / SDA</h2>
    ${stationsTable(project)}

    <div class="footer">
      <span>Télé-Flux — rapport 1 page</span>
      <span>${watermark}</span>
    </div>
    <p class="no-print" style="margin-top:16px">
      <button onclick="window.print()" style="background:#0d9488;color:#fff;border:0;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer">
        Imprimer / Enregistrer en PDF
      </button>
    </p>
  </div>
  <script>setTimeout(function(){ window.print(); }, 400);</script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) {
    window.alert('Autorisez les pop-ups pour générer le PDF.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
