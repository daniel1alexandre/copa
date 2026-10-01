// Configuração do Supabase para a Copa das Federações 2026
// As credenciais podem ser definidas aqui ou diretamente pela tela de Configurações no navegador.

export const DEFAULT_SUPABASE_CONFIG = {
  // Substitua pela URL do seu projeto Supabase, ou configure na aba 'Configurações' do sistema:
  url: localStorage.getItem('copa_supabase_url') || '',
  // Substitua pela Chave Anon Pública do seu projeto Supabase:
  anonKey: localStorage.getItem('copa_supabase_key') || '',
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
