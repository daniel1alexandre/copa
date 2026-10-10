// Configuração do Supabase para a Copa das Federações 2026
// As credenciais podem vir do localStorage (configurado pelo painel) ou do padrão abaixo.

export const DEFAULT_SUPABASE_CONFIG = {
  url: 'https://zcyfnnuvggbfutkpbjtg.supabase.co',
  anonKey: 'sb_publishable_xMMqR-d7w1vtHPLqnMqhhA_5CoIFVLN',
  tableName: 'tournament_state',
  recordId: 'copa_2026'
};

export function getSupabaseCredentials() {
  const localUrl = localStorage.getItem('copa_supabase_url');
  const localKey = localStorage.getItem('copa_supabase_key');
  
  const rawUrl = (localUrl !== null ? localUrl : DEFAULT_SUPABASE_CONFIG.url) || '';
  const cleanUrl = rawUrl.trim().replace(/\/+$/, '');
  const cleanKey = ((localKey !== null ? localKey : DEFAULT_SUPABASE_CONFIG.anonKey) || '').trim();

  return {
    url: cleanUrl,
    anonKey: cleanKey,
    tableName: DEFAULT_SUPABASE_CONFIG.tableName,
    recordId: DEFAULT_SUPABASE_CONFIG.recordId,
    isCustom: Boolean(localUrl || localKey)
  };
}

export function saveSupabaseCredentials(url, anonKey) {
  if (typeof url === 'string' && url.trim()) {
    localStorage.setItem('copa_supabase_url', url.trim().replace(/\/+$/, ''));
  } else {
    localStorage.removeItem('copa_supabase_url');
  }

  if (typeof anonKey === 'string' && anonKey.trim()) {
    localStorage.setItem('copa_supabase_key', anonKey.trim());
  } else {
    localStorage.removeItem('copa_supabase_key');
  }
}

export function clearSupabaseCredentials() {
  localStorage.removeItem('copa_supabase_url');
  localStorage.removeItem('copa_supabase_key');
}
