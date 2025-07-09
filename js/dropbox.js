import { config } from './config.js';

const DROPBOX_CONFIG = 'config/dropbox.env';

export async function loadDropboxToken() {
  const res = await fetch(DROPBOX_CONFIG);
  const text = await res.text();
  const match = text.match(/^DROPBOX_ACCESS_TOKEN\s*=\s*(.+)$/m);
  if (!match) throw new Error(`❌ DROPBOX_ACCESS_TOKEN não encontrado em ${DROPBOX_CONFIG}`);
  return match[1].trim();
}

export async function dropboxDownload(path) {
  const token = await loadDropboxToken();
  const res = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({ path })
    }
  });
  if (!res.ok) throw new Error(`❌ Erro ao baixar ${path} do Dropbox`);
  return res.text();
}

export async function dropboxDownloadJSON(path) {
  const text = await dropboxDownload(path);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`❌ Erro ao processar JSON de ${path}`);
  }
}