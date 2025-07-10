import { config } from './config.js';

const DROPBOX_CONFIG = 'config/dropbox.env';

async function getDropboxEnvVar(name) {
  const res = await fetch(DROPBOX_CONFIG);
  const text = await res.text();
  const match = text.match(new RegExp(`^${name}\\s*=\\s*(.+)$`, 'm'));
  if (!match) throw new Error(`❌ ${name} não encontrado em ${DROPBOX_CONFIG}`);
  return match[1].trim();
}

export async function getDropboxAccessToken() {
  const refreshToken = await getDropboxEnvVar('DROPBOX_REFRESH_TOKEN');
  const appKey = await getDropboxEnvVar('DROPBOX_APP_KEY');
  const appSecret = await getDropboxEnvVar('DROPBOX_APP_SECRET');

  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);
  params.append('client_id', appKey);
  params.append('client_secret', appSecret);

  const res = await fetch('https://api.dropbox.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  if (!res.ok) throw new Error('❌ Erro ao obter access token do Dropbox');
  
  const data = await res.json();
  return data.access_token;
}

export async function dropboxDownload(path) {
  const token = await getDropboxAccessToken();
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

export async function dropboxListFolder(path) {
  const token = await getDropboxAccessToken();
  const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      path: path,
      recursive: false
    })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`❌ Erro ao listar ficheiros da Dropbox: ${data.error_summary || response.statusText}`);
  }

  // Extract just the file names
  return data.entries
    .filter(entry => entry['.tag'] === 'file')
    .map(file => file.name);
}