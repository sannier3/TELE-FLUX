/**
 * Nommage unifié des fichiers générés :
 * prefix_projet_client_site_YYYYMMDD_HHMMSS.ext
 */

export interface ExportNameMeta {
  projectName?: string;
  clientName?: string;
  siteName?: string;
}

export function slugifyFilenamePart(value?: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function formatExportTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '_',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

/** Ex. buildExportFilename(project, 'teleflux_schema', 'json') */
export function buildExportFilename(
  meta: ExportNameMeta,
  prefix: string,
  extension: string
): string {
  const parts = [
    prefix,
    slugifyFilenamePart(meta.projectName) || 'projet',
    slugifyFilenamePart(meta.clientName) || null,
    slugifyFilenamePart(meta.siteName) || null,
  ].filter(Boolean);

  const ext = extension.replace(/^\./, '');
  return `${parts.join('_')}_${formatExportTimestamp()}.${ext}`;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function triggerDataUrlDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
