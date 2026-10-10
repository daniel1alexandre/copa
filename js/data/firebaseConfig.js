// Configuração oficial do Firebase Realtime Database para a Copa das Federações 2026
export const DEFAULT_FIREBASE_CONFIG = {
  databaseURL: 'https://copa-federacoes-default-rtdb.firebaseio.com',
  nodePath: 'tournament_state/copa_2026'
};

export function normalizeFirebaseUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return '';
  let url = inputUrl.trim();

  // Se o usuário colou a URL do console do navegador (ex: https://console.firebase.google.com/project/NOME/database/DB_ID/...)
  const consoleMatch = url.match(/console\.firebase\.google\.com\/project\/([^/]+)\/database\/([^/]+)/i);
  if (consoleMatch) {
    const dbName = consoleMatch[2];
    url = `https://${dbName}.firebaseio.com`;
  }

  // Se não começa com http
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // Remove barras e .json no final se houver
  url = url.replace(/\/+$/, '').replace(/\.json$/i, '');

  return url;
}

export function getFirebaseCredentials() {
  const localUrl = localStorage.getItem('copa_firebase_url');
  const rawUrl = (localUrl !== null ? localUrl : DEFAULT_FIREBASE_CONFIG.databaseURL) || '';
  const cleanUrl = normalizeFirebaseUrl(rawUrl);

  return {
    databaseURL: cleanUrl,
    nodePath: DEFAULT_FIREBASE_CONFIG.nodePath,
    isCustom: Boolean(localUrl)
  };
}

export function saveFirebaseCredentials(url) {
  const normalized = normalizeFirebaseUrl(url);
  if (normalized) {
    localStorage.setItem('copa_firebase_url', normalized);
  } else {
    localStorage.removeItem('copa_firebase_url');
  }
}

export function clearFirebaseCredentials() {
  localStorage.removeItem('copa_firebase_url');
}
