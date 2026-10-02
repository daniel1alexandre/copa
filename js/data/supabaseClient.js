// Cliente Supabase — REST API + Polling a cada 4s
// Usa fetch() nativo — compatível com chave sb_publishable_ e JWT
import { getSupabaseCredentials, saveSupabaseCredentials } from './supabaseConfig.js';

const SUPABASE_URL  = 'https://zcyfnnuvggbfutkpbjtg.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_xMMqR-d7w1vtHPLqnMqhhA_5CoIFVLN';
const TABLE         = 'tournament_state';
const RECORD_ID     = 'copa_2026';
const POLL_MS       = 4000;

// Cabeçalhos REST do Supabase
function headers(extra = {}) {
  return {
    'apikey':        SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type':  'application/json',
    ...extra
  };
}

// URL da tabela
const TABLE_URL = `${SUPABASE_URL}/rest/v1/${TABLE}`;

class SupabaseService {
  constructor() {
    this.store             = null;
    this.status            = 'disconnected';
    this.statusListeners   = [];
    this.debounceTimer     = null;
    this.pollingTimer      = null;
    this.lastUpdatedAt     = null;   // updated_at do último registro lido
    this.lastPushMs        = 0;      // Date.now() da última gravação nossa
    this.blockRemoteUpdate = false;  // impede loop ao carregar do remoto
  }

  // ─── Status ────────────────────────────────────────────────────
  onStatusChange(fn) {
    this.statusListeners.push(fn);
    fn(this.status);
    return () => { this.statusListeners = this.statusListeners.filter(l => l !== fn); };
  }
  setStatus(s) {
    this.status = s;
    this.statusListeners.forEach(fn => { try { fn(s); } catch (_) {} });
  }
  getStatus() { return this.status; }

  // ─── Inicialização ─────────────────────────────────────────────
  async init(store) {
    this.store = store;
    this.setStatus('connecting');

    // 1. Carrega estado mais recente do banco
    const remote = await this._fetch();

    if (remote === null) {
      // Tabela vazia → sobe o estado local como semente
      console.log('[Supabase] Banco vazio — enviando estado inicial...');
      await this._upsert(store.state);
    } else {
      // Existe estado no banco → decide qual é mais recente
      const localTime  = new Date(store.state.lastUpdated || 0).getTime();
      const remoteTime = new Date(remote.updated_at || 0).getTime();

      if (remoteTime > localTime) {
        // Banco é mais recente → carrega no store
        console.log('[Supabase] Estado remoto é mais recente — carregando...');
        this.blockRemoteUpdate = true;
        store.loadFromRemote(remote.data);
        this.blockRemoteUpdate = false;
      } else {
        // Local é mais recente → sincroniza o banco
        console.log('[Supabase] Estado local é mais recente — sincronizando banco...');
        await this._upsert(store.state);
      }
      this.lastUpdatedAt = remote.updated_at;
    }

    // 2. Inicia o polling
    this._startPolling();
    this.setStatus('connected');
    console.log('[Supabase] ✅ Inicializado com sucesso. Polling a cada', POLL_MS, 'ms');
  }

  // ─── Polling ───────────────────────────────────────────────────
  _startPolling() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.pollingTimer = setInterval(() => this._poll(), POLL_MS);
  }

  async _poll() {
    if (this.blockRemoteUpdate) return;

    const remote = await this._fetch();
    if (!remote) return;

    // Sem mudança
    if (remote.updated_at === this.lastUpdatedAt) return;

    // Foi uma gravação nossa (janela de 4s)
    if (Date.now() - this.lastPushMs < 4000) {
      this.lastUpdatedAt = remote.updated_at;
      return;
    }

    // ✅ Atualização de outro dispositivo detectada!
    console.log('[Supabase Polling] 🔄 Nova atualização:', remote.updated_at);
    this.lastUpdatedAt = remote.updated_at;

    this.blockRemoteUpdate = true;
    this.store.loadFromRemote(remote.data);
    this.blockRemoteUpdate = false;
  }

  // ─── Busca estado do banco ─────────────────────────────────────
  async _fetch() {
    try {
      const url  = `${TABLE_URL}?id=eq.${RECORD_ID}&select=data,updated_at&limit=1`;
      const resp = await fetch(url, { headers: headers() });
      if (!resp.ok) {
        console.error('[Supabase] Erro HTTP ao buscar:', resp.status, await resp.text());
        return null;
      }
      const rows = await resp.json();
      return (Array.isArray(rows) && rows.length > 0 && rows[0].data) ? rows[0] : null;
    } catch (e) {
      console.warn('[Supabase] Falha de rede ao buscar:', e.message);
      return null;
    }
  }

  // ─── Grava no banco (UPSERT) ───────────────────────────────────
  async _upsert(state) {
    const nowIso = new Date().toISOString();
    this.lastPushMs = Date.now();

    try {
      this.setStatus('syncing');
      const resp = await fetch(TABLE_URL, {
        method:  'POST',
        headers: headers({ 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
        body:    JSON.stringify({ id: RECORD_ID, data: state, updated_at: nowIso })
      });

      if (resp.ok || resp.status === 201 || resp.status === 204) {
        this.lastUpdatedAt = nowIso;
        this.setStatus('connected');
        console.log('[Supabase] ✅ Gravado com sucesso:', nowIso);

        // Toast de confirmação para o admin
        if (window.toast?.show) {
          window.toast.show({
            title:    '☁️ Sincronizado',
            message:  'Outros aparelhos receberão em até 4s.',
            type:     'success',
            duration: 2000
          });
        }
        return true;
      } else {
        const txt = await resp.text();
        console.error('[Supabase] ❌ Erro HTTP ao gravar:', resp.status, txt);
        this.setStatus('error');

        if (window.toast?.show) {
          window.toast.show({
            title:    '⚠️ Falha na Sincronização',
            message:  `Erro ${resp.status}. Verifique o SQL no Supabase.`,
            type:     'error',
            duration: 5000
          });
        }
        return false;
      }
    } catch (e) {
      console.error('[Supabase] ❌ Falha de rede ao gravar:', e.message);
      this.setStatus('error');
      return false;
    }
  }

  // ─── Chamado pelo store.save() ─────────────────────────────────
  pushState(state) {
    if (this.blockRemoteUpdate) return;   // não fazer loop
    if (!this.store) return;

    // Debounce: aguarda 500ms de inatividade antes de gravar
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this._upsert(state), 500);
  }

  // ─── Teste de conexão ──────────────────────────────────────────
  async testConnection(url, anonKey) {
    try {
      const resp = await fetch(`${url}/rest/v1/tournament_state?limit=1`, {
        headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
      });
      if (resp.ok) return { success: true, message: 'Conexão OK!' };
      return { success: false, message: `HTTP ${resp.status}` };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
}

export const supabaseService = new SupabaseService();
window.supabaseService = supabaseService;
export { saveSupabaseCredentials, getSupabaseCredentials };
