// Cliente Supabase — REST API direta + Polling a cada 4s
// Não depende do SDK window.supabase — usa fetch() nativo do browser
import { getSupabaseCredentials, saveSupabaseCredentials } from './supabaseConfig.js';

class SupabaseService {
  constructor() {
    this.status           = 'disconnected';
    this.statusListeners  = [];
    this.debounceTimer    = null;
    this.isUpdatingFromRemote = false;
    this.store            = null;
    this.lastPushTime     = null;
    this.lastUpdatedAt    = null;
    this.pollingTimer     = null;
    this.POLL_INTERVAL    = 4000;  // 4 segundos
    this.initialized      = false;
  }

  // ── Status ────────────────────────────────────────────────────
  onStatusChange(fn) {
    this.statusListeners.push(fn);
    fn(this.status);
    return () => { this.statusListeners = this.statusListeners.filter(l => l !== fn); };
  }

  setStatus(s, detail = '') {
    this.status = s;
    this.statusListeners.forEach(fn => { try { fn(s, detail); } catch(e) {} });
    if (detail) console.log(`[Supabase] ${s}: ${detail}`);
  }

  getStatus() { return this.status; }

  isConfigured() {
    const { url, anonKey } = getSupabaseCredentials();
    return Boolean(url && anonKey && url.startsWith('https'));
  }

  // ── Monta os headers da REST API ─────────────────────────────
  _headers() {
    const { anonKey } = getSupabaseCredentials();
    return {
      'apikey':        anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal'
    };
  }

  // ── URL base da tabela ────────────────────────────────────────
  _tableUrl() {
    const { url, tableName } = getSupabaseCredentials();
    return `${url}/rest/v1/${tableName}`;
  }

  // ── Inicialização ─────────────────────────────────────────────
  async init(store) {
    if (this.initialized) return true;
    this.store = store;

    if (!this.isConfigured()) {
      this.setStatus('disconnected', 'Credenciais não configuradas');
      return false;
    }

    this.setStatus('connecting', 'Conectando ao Supabase...');

    // Tenta carregar estado atual do banco
    const remoteOk = await this._loadRemoteState();

    if (!remoteOk) {
      // Nenhum dado no banco ainda — envia o estado local como seed
      console.log('[Supabase] Banco vazio, enviando estado inicial...');
      const seeded = await this._push(this.store.state);
      if (!seeded) {
        this.setStatus('error', 'Falha ao criar registro inicial. Verifique o SQL no Supabase.');
        // Tenta de novo em 10s
        setTimeout(() => this.init(store), 10000);
        return false;
      }
    }

    this.initialized = true;
    this._startPolling();
    this.setStatus('connected', 'Sincronização ativa (a cada 4s)');
    return true;
  }

  // ── Carrega estado do Supabase e aplica ao store ──────────────
  async _loadRemoteState() {
    const { recordId } = getSupabaseCredentials();
    const url = `${this._tableUrl()}?id=eq.${recordId}&select=data,updated_at&limit=1`;

    try {
      const resp = await fetch(url, { headers: this._headers() });

      if (!resp.ok) {
        const txt = await resp.text();
        console.error('[Supabase] Erro HTTP ao carregar:', resp.status, txt);
        return false;
      }

      const rows = await resp.json();

      if (!Array.isArray(rows) || rows.length === 0 || !rows[0].data) {
        return false; // tabela vazia ou sem registro
      }

      this.lastUpdatedAt = rows[0].updated_at;
      this.isUpdatingFromRemote = true;
      this.store.loadFromRemote(rows[0].data);
      this.isUpdatingFromRemote = false;
      console.log('[Supabase] Estado carregado do banco:', this.lastUpdatedAt);
      return true;

    } catch (e) {
      console.error('[Supabase] Falha de rede ao carregar:', e.message);
      return false;
    }
  }

  // ── Polling: detecta atualizações do admin em outros devices ──
  _startPolling() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);

    this.pollingTimer = setInterval(async () => {
      if (this.isUpdatingFromRemote) return;

      const { recordId } = getSupabaseCredentials();
      // Busca só o timestamp — muito rápido e barato
      const url = `${this._tableUrl()}?id=eq.${recordId}&select=updated_at,data&limit=1`;

      try {
        const resp = await fetch(url, { headers: this._headers() });
        if (!resp.ok) return;

        const rows = await resp.json();
        if (!Array.isArray(rows) || rows.length === 0) return;

        const remote = rows[0];

        // Nenhuma mudança
        if (remote.updated_at === this.lastUpdatedAt) return;

        // Ignorar se fomos nós que acabamos de gravar (janela de 3s)
        const remoteMs = new Date(remote.updated_at).getTime();
        if (this.lastPushTime && Math.abs(remoteMs - this.lastPushTime) < 3000) {
          this.lastUpdatedAt = remote.updated_at;
          return;
        }

        // ✅ Nova atualização de outro dispositivo detectada!
        console.log('[Supabase Polling] 🔄 Atualização detectada:', remote.updated_at);
        this.lastUpdatedAt = remote.updated_at;

        if (remote.data) {
          this.isUpdatingFromRemote = true;
          this.store.loadFromRemote(remote.data);
          this.isUpdatingFromRemote = false;
        }

      } catch (e) {
        // Silencioso — não travar o UI por falha de rede temporária
      }
    }, this.POLL_INTERVAL);
  }

  // ── Envia estado ao gravar (com debounce de 500ms) ────────────
  pushState(state) {
    if (this.isUpdatingFromRemote) return;
    if (!this.initialized) return;

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this._push(state), 500);
  }

  // ── Grava no banco via REST API ───────────────────────────────
  async _push(state) {
    if (!this.isConfigured()) return false;

    const { recordId } = getSupabaseCredentials();
    const nowIso = new Date().toISOString();
    this.lastPushTime = Date.now();

    const body = JSON.stringify({
      id: recordId,
      data: state,
      updated_at: nowIso
    });

    // Usa UPSERT via header Prefer: resolution=merge-duplicates
    const headers = {
      ...this._headers(),
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    };

    try {
      this.setStatus('syncing', 'Salvando na nuvem...');

      const resp = await fetch(this._tableUrl(), {
        method:  'POST',
        headers: headers,
        body:    body
      });

      if (resp.ok || resp.status === 201 || resp.status === 204) {
        this.lastUpdatedAt = nowIso;
        this.setStatus('connected', 'Sincronizado ✓');
        console.log('[Supabase] ✅ Dados gravados com sucesso:', nowIso);

        // Toast de confirmação para o admin
        if (window.toast && typeof window.toast.show === 'function') {
          window.toast.show({
            title: '☁️ Nuvem Atualizada',
            message: 'Outros aparelhos receberão em até 4 segundos.',
            type: 'success',
            duration: 2500
          });
        }
        return true;
      } else {
        const txt = await resp.text();
        console.error('[Supabase] ❌ Erro HTTP ao gravar:', resp.status, txt);
        this.setStatus('error', `HTTP ${resp.status}: ${txt.slice(0, 80)}`);

        // Toast de erro visível
        if (window.toast && typeof window.toast.show === 'function') {
          window.toast.show({
            title: '⚠️ Erro de Sincronização',
            message: `Código ${resp.status}. Verifique o SQL no Supabase.`,
            type: 'error',
            duration: 5000
          });
        }
        return false;
      }

    } catch (e) {
      console.error('[Supabase] ❌ Falha de rede ao gravar:', e.message);
      this.setStatus('error', e.message);
      return false;
    }
  }

  // ── Testa a conexão (para diagnóstico) ───────────────────────
  async testConnection(url, anonKey) {
    const testUrl = `${url}/rest/v1/tournament_state?limit=1`;
    const headers = {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    };

    try {
      const resp = await fetch(testUrl, { headers });
      if (resp.status === 200 || resp.status === 206) {
        return { success: true, message: 'Conexão OK! Tabela encontrada.' };
      }
      if (resp.status === 404 || resp.status === 400) {
        return { success: false, tableMissing: true, message: 'Tabela não encontrada. Execute o SQL no Supabase!' };
      }
      const txt = await resp.text();
      return { success: false, message: `HTTP ${resp.status}: ${txt.slice(0, 100)}` };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
}

export const supabaseService = new SupabaseService();
window.supabaseService = supabaseService;
export { saveSupabaseCredentials, getSupabaseCredentials };
