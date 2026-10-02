// Cliente Supabase — Sincronização via Polling (verifica atualizações a cada 5s)
import { getSupabaseCredentials, saveSupabaseCredentials } from './supabaseConfig.js';

class SupabaseService {
  constructor() {
    this.client       = null;
    this.status       = 'disconnected';
    this.statusListeners = [];
    this.debounceTimer   = null;
    this.isUpdatingFromRemote = false;
    this.store        = null;
    this.lastPushTime = null;
    this.lastUpdatedAt = null;   // timestamp do último registro lido do banco
    this.pollingTimer  = null;
    this.POLL_INTERVAL = 5000;   // 5 segundos
  }

  // ── Listeners de status ───────────────────────────────────────
  onStatusChange(fn) {
    this.statusListeners.push(fn);
    fn(this.status);
    return () => { this.statusListeners = this.statusListeners.filter(l => l !== fn); };
  }

  setStatus(s, detail = '') {
    this.status = s;
    this.statusListeners.forEach(fn => { try { fn(s, detail); } catch(e) {} });
  }

  getStatus() { return this.status; }

  isConfigured() {
    const { url, anonKey } = getSupabaseCredentials();
    return Boolean(url && anonKey && url.startsWith('http'));
  }

  // ── Inicialização ─────────────────────────────────────────────
  async init(store) {
    this.store = store;

    if (!this.isConfigured()) {
      this.setStatus('disconnected');
      return false;
    }

    // Aguarda o SDK do Supabase carregar (CDN)
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      setTimeout(() => this.init(store), 1500);
      return false;
    }

    const { url, anonKey } = getSupabaseCredentials();

    this.client = window.supabase.createClient(url, anonKey, {
      auth: { persistSession: false }
    });

    this.setStatus('connecting', 'Conectando...');

    // Tenta carregar o estado inicial do banco
    const ok = await this._loadRemoteState();

    if (!ok) {
      // Se não existia nada no banco, envia o estado local como seed
      await this.pushStateImmediate(this.store.state);
    }

    // Inicia o polling a cada 5 segundos
    this._startPolling();

    this.setStatus('connected', 'Sincronizado');
    return true;
  }

  // ── Carrega o estado do banco e aplica ao store ───────────────
  async _loadRemoteState() {
    const { tableName, recordId } = getSupabaseCredentials();

    try {
      const { data, error } = await this.client
        .from(tableName)
        .select('data, updated_at')
        .eq('id', recordId)
        .maybeSingle();

      if (error) {
        console.error('[Supabase] Erro ao carregar estado:', error.message);
        return false;
      }

      if (data && data.data) {
        this.lastUpdatedAt = data.updated_at;
        this.isUpdatingFromRemote = true;
        this.store.loadFromRemote(data.data);
        this.isUpdatingFromRemote = false;
        return true;
      }

      return false; // nenhum registro ainda
    } catch (e) {
      console.error('[Supabase] Falha ao carregar:', e.message);
      return false;
    }
  }

  // ── Polling: verifica se o banco foi atualizado ───────────────
  _startPolling() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);

    this.pollingTimer = setInterval(async () => {
      if (!this.client || this.isUpdatingFromRemote) return;

      const { tableName, recordId } = getSupabaseCredentials();

      try {
        // Consulta só o timestamp — barato, rápido
        const { data, error } = await this.client
          .from(tableName)
          .select('updated_at, data')
          .eq('id', recordId)
          .maybeSingle();

        if (error || !data) return;

        // Nenhuma novidade
        if (data.updated_at === this.lastUpdatedAt) return;

        // Ignorar se fomos nós que acabamos de gravar (±3s)
        const remoteMs = new Date(data.updated_at).getTime();
        if (this.lastPushTime && Math.abs(remoteMs - this.lastPushTime) < 3000) {
          this.lastUpdatedAt = data.updated_at;
          return;
        }

        // Há uma atualização nova de outro dispositivo!
        console.log('[Supabase Polling] Nova atualização detectada:', data.updated_at);
        this.lastUpdatedAt = data.updated_at;

        if (data.data) {
          this.isUpdatingFromRemote = true;
          this.store.loadFromRemote(data.data);
          this.isUpdatingFromRemote = false;
        }

      } catch (e) {
        console.warn('[Supabase Polling] Erro:', e.message);
      }
    }, this.POLL_INTERVAL);
  }

  // ── Envia estado com debounce (chamado pelo store ao salvar) ──
  pushState(state) {
    if (this.isUpdatingFromRemote) return;
    if (!this.client) return;

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.pushStateImmediate(state);
    }, 400);
  }

  // ── Grava imediatamente no banco ──────────────────────────────
  async pushStateImmediate(state) {
    if (!this.client) return;

    const { tableName, recordId } = getSupabaseCredentials();
    const nowIso = new Date().toISOString();
    this.lastPushTime = Date.now();

    try {
      this.setStatus('syncing', 'Salvando...');

      const { error } = await this.client
        .from(tableName)
        .upsert(
          { id: recordId, data: state, updated_at: nowIso },
          { onConflict: 'id' }
        );

      if (error) {
        console.error('[Supabase] Erro ao gravar:', error.message);
        this.setStatus('error', error.message);
      } else {
        this.lastUpdatedAt = nowIso;
        this.setStatus('connected', 'Sincronizado');
        console.log('[Supabase] Estado salvo na nuvem com sucesso.');
      }
    } catch (e) {
      console.error('[Supabase] Falha ao gravar:', e.message);
      this.setStatus('error', e.message);
    }
  }

  // ── Testa conexão (usado nas configurações) ───────────────────
  async testConnection(url, anonKey) {
    if (!window.supabase) return { success: false, message: 'Biblioteca Supabase não carregada.' };
    try {
      const c = window.supabase.createClient(url, anonKey);
      const { error } = await c.from('tournament_state').select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          return { success: false, tableMissing: true, message: 'Tabela não criada. Execute o SQL no Supabase!' };
        }
        return { success: false, message: error.message };
      }
      return { success: true, message: 'Conexão OK! Tabela encontrada.' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
}

export const supabaseService = new SupabaseService();
window.supabaseService = supabaseService;
export { saveSupabaseCredentials, getSupabaseCredentials };
