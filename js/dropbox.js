const DROPBOX_CONFIG = 'config/dropbox.env';
let cachedAccessToken = null;
let tokenExpiry = null;
let envVarsCache = null;

async function getDropboxEnvVar(name) {
  // Cache env vars to avoid multiple requests
  if (!envVarsCache) {
    if (typeof window !== 'undefined' && window.DROPBOX_CONFIG) {
      envVarsCache = window.DROPBOX_CONFIG;
    } else {
      const res = await fetch(DROPBOX_CONFIG);
      const text = await res.text();
      envVarsCache = {};
      text.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          envVarsCache[key.trim()] = value.trim();
        }
      });
    }
  }
  
  if (!envVarsCache[name]) {
    throw new Error(`❌ ${name} não encontrado em ${DROPBOX_CONFIG}`);
  }
  return envVarsCache[name];
}

export async function getDropboxAccessToken() {
  // Return cached token if still valid
  if (cachedAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedAccessToken;
  }

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
  
  // Cache the token (typically valid for 4 hours)
  cachedAccessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
  
  return cachedAccessToken;
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