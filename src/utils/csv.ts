/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DirectoryUser, PhoneLine, CallNode } from '../types';

// Helper to escape CSV cell values
function escapeCSVCell(val: string | number | boolean | undefined | null): string {
  if (val === undefined || val === null) return '';
  const str = String(val).replace(/"/g, '""');
  if (str.includes(';') || str.includes('\n') || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
}

// Support exporting list to CSV
export function exportToCSV(data: any[], headers: { key: string; label: string }[]): string {
  const headerLine = headers.map(h => escapeCSVCell(h.label)).join(';');
  const dataLines = data.map(row => {
    return headers.map(h => escapeCSVCell(row[h.key])).join(';');
  });
  return [headerLine, ...dataLines].join('\r\n');
}

// Specific exporters
export function exportUsersToCSV(users: DirectoryUser[]): string {
  const headers = [
    { key: 'name', label: 'Nom du poste ou utilisateur' },
    { key: 'internalNumber', label: 'Numéro Interne / Extension' },
    { key: 'email', label: 'Email Associé' },
    { key: 'sdaId', label: 'SDA Associée' },
    { key: 'stationType', label: 'Type de Poste' },
    { key: 'phoneModel', label: 'Modèle Téléphone' },
    { key: 'voicemailEnabled', label: 'Messagerie Activée (Vrai/Faux)' },
    { key: 'forwardEnabled', label: 'Renvoi Activé (Vrai/Faux)' },
    { key: 'forwardDestination', label: 'Destination du Renvoi' },
    { key: 'comment', label: 'Commentaires' }
  ];
  return exportToCSV(users, headers);
}

export function exportLinesToCSV(lines: PhoneLine[]): string {
  const headers = [
    { key: 'ndi', label: 'Numéro NDI' },
    { key: 'type', label: 'Type de Ligne' },
    { key: 'channels', label: 'Canaux Simultanés' },
    { key: 'provider', label: 'Opérateur' },
    { key: 'comment', label: 'Notes Techniques' }
  ];
  return exportToCSV(lines, headers);
}

export function exportSDAsToCSV(nodes: CallNode[]): string {
  const sdaNodes = nodes.filter(n => n.type === 'sda' || n.type === 'direct_line').map(n => ({
    name: n.name,
    number: n.properties.number || '',
    description: n.properties.description || '',
    techComment: n.properties.techComment || '',
    clientComment: n.properties.clientComment || ''
  }));

  const headers = [
    { key: 'name', label: 'Nom de la SDA' },
    { key: 'number', label: 'Numéro Téléphonique' },
    { key: 'description', label: 'Description' },
    { key: 'techComment', label: 'Note Technique' },
    { key: 'clientComment', label: 'Commentaire Client' }
  ];
  return exportToCSV(sdaNodes, headers);
}

export function exportForwardsToCSV(nodes: CallNode[]): string {
  const forwardNodes = nodes.filter(n => 
    n.type.startsWith('forward_') || n.type === 'transfer' || n.type === 'emergency_overflow'
  ).map(n => ({
    name: n.name,
    type: n.type,
    destination: n.properties.forwardDestination || '',
    delay: n.properties.delayBeforeForward || '',
    techComment: n.properties.techComment || '',
    clientComment: n.properties.clientComment || ''
  }));

  const headers = [
    { key: 'name', label: 'Nom du renvoi' },
    { key: 'type', label: 'Type exact de renvoi' },
    { key: 'destination', label: 'Destination' },
    { key: 'delay', label: 'Délai (secondes)' },
    { key: 'techComment', label: 'Note Technique' },
    { key: 'clientComment', label: 'Commentaire Client' }
  ];
  return exportToCSV(forwardNodes, headers);
}

export function exportTimeRulesToCSV(nodes: CallNode[]): string {
  const rules = nodes.filter(n => n.type === 'day_night' || n.type === 'time_range').map(n => ({
    name: n.name,
    type: n.type,
    timeSchedule: n.properties.timeSchedule || '',
    techComment: n.properties.techComment || '',
    clientComment: n.properties.clientComment || ''
  }));

  const headers = [
    { key: 'name', label: 'Nom de la règle horaire' },
    { key: 'type', label: 'Type' },
    { key: 'timeSchedule', label: 'Plage horaire' },
    { key: 'techComment', label: 'Note Technique' },
    { key: 'clientComment', label: 'Commentaire Client' }
  ];
  return exportToCSV(rules, headers);
}

// Import CSV parsers
export function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  const result: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row: string[] = [];
    let insideQuote = false;
    let entry = '';

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        if (insideQuote && line[j + 1] === '"') {
          entry += '"';
          j++; // skip next quote
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ';' && !insideQuote) {
        row.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim());
    result.push(row);
  }

  return result;
}

// Convert CSV rows back to entities
export function importLinesFromCSV(csvText: string): PhoneLine[] {
  const rows = parseCSV(csvText);
  if (rows.length <= 1) return []; // Only headers or empty

  const lines: PhoneLine[] = [];
  // Skip headers
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 1 || !row[0]) continue;
    lines.push({
      id: `l-imported-${Date.now()}-${i}`,
      ndi: row[0] || 'Inconnu',
      type: (row[1] as any) || 'SIP Trunk',
      channels: parseInt(row[2]) || 1,
      provider: row[3] || 'Autre',
      comment: row[4] || ''
    });
  }
  return lines;
}

export function importUsersFromCSV(csvText: string): DirectoryUser[] {
  const rows = parseCSV(csvText);
  if (rows.length <= 1) return [];

  const users: DirectoryUser[] = [];
  // Skip headers
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2 || !row[0]) continue;
    users.push({
      id: `u-imported-${Date.now()}-${i}`,
      name: row[0],
      internalNumber: row[1] || '100',
      email: row[2] || '',
      sdaId: row[3] || '',
      stationType: (row[4] as any) || 'IP',
      phoneModel: row[5] || 'Yealink T46U',
      voicemailEnabled: (row[6] || '').toLowerCase().startsWith('v') || (row[6] || '').toLowerCase() === 'true',
      forwardEnabled: (row[7] || '').toLowerCase().startsWith('v') || (row[7] || '').toLowerCase() === 'true',
      forwardDestination: row[8] || '',
      comment: row[9] || ''
    });
  }
  return users;
}

export function importSDAsFromCSV(csvText: string): CallNode[] {
  const rows = parseCSV(csvText);
  if (rows.length <= 1) return [];

  const nodes: CallNode[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2 || !row[0]) continue;
    nodes.push({
      id: `node-imported-sda-${Date.now()}-${i}`,
      type: 'sda',
      name: row[0],
      x: 100 + i * 40,
      y: 100 + i * 20,
      properties: {
        number: row[1] || '',
        description: row[2] || 'SDA Importée',
        techComment: row[3] || '',
        clientComment: row[4] || ''
      }
    });
  }
  return nodes;
}
