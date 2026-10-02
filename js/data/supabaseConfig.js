// Configuração oficial do Supabase para a Copa das Federações 2026

export const DEFAULT_SUPABASE_CONFIG = {
  url: 'https://zcyfnnuvggbfutkpbjtg.supabase.co',
  anonKey: 'sb_publishable_xMMqR-d7w1vtHPLqnMqhhA_5CoIFVLN',
  tableName: 'tournament_state',
  recordId: 'copa_2026'
};

export function getSupabaseCredentials() {
  const localUrl = localStorage.getItem('copa_supabase_url');
  const localKey = localStorage.getItem('copa_supabase_key');
  return {
    url: (localUrl || DEFAULT_SUPABASE_CONFIG.url || '').trim(),
    anonKey: (localKey || DEFAULT_SUPABASE_CONFIG.anonKey || '').trim(),
    tableName: DEFAULT_SUPABASE_CONFIG.tableName,
    recordId: DEFAULT_SUPABASE_CONFIG.recordId
  };
}

export function saveSupabaseCredentials(url, anonKey) {
  if (url) localStorage.setItem('copa_supabase_url', url.trim());
  else localStorage.removeItem('copa_supabase_url');

  if (anonKey) localStorage.setItem('copa_supabase_key', anonKey.trim());
  else localStorage.removeItem('copa_supabase_key');
}
