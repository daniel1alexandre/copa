// Cliente Supabase — REST API + Polling Contínuo
// Suporta credenciais dinâmicas do localStorage ou do supabaseConfig.js
import { getSupabaseCredentials, saveSupabaseCredentials, clearSupabaseCredentials } from './supabaseConfig.js';

const POLL_MS = 3000;

class SupabaseService {
  constructor() {
    this.store             = null;
    this.status            = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error'
    this.statusMessage     = '';
    this.statusListeners   = [];
    this.debounceTimer     = null;
    this.pollingTimer      = null;
    this.lastUpdatedAt     = null;
    this.lastPushMs        = 0;
    this.blockRemoteUpdate = false;
  }

  // ─── Status & Ouvintes ─────────────────────────────────────────
  onStatusChange(fn) {
    this.statusListeners.push(fn);
    fn(this.status, this.statusMessage);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== fn);
    };
  }

  setStatus(s, message = '') {
    this.status = s;
    this.statusMessage = message;
    this.statusListeners.forEach(fn => {
      try { fn(s, message); } catch (_) {}
    });
  }

  getStatus() {
    return { status: this.status, message: this.statusMessage };
  }

  // ─── Helpers de Conexão ────────────────────────────────────────
  getCredentials() {
    return getSupabaseCredentials();
  }

  _headers(extra = {}) {
    const { anonKey } = this.getCredentials();
    return {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      ...extra
    };
  }

  _tableUrl() {
    const { url, tableName } = this.getCredentials();
    return `${url}/rest/v1/${tableName}`;
  }

  // ─── Inicialização ─────────────────────────────────────────────
  async init(store) {
    this.store = store;
    return this.start();
  }

  async start() {
    const creds = this.getCredentials();
    if (!creds.url || !creds.anonKey) {
      this.setStatus('disconnected', 'Credenciais não configuradas');
      return;
    }

    this.setStatus('connecting', 'Conectando ao Supabase...');

    try {
      const remote = await this._fetch();

      if (remote && remote.data && remote.data.brackets) {
        console.log('[Supabase] ✅ Dados oficiais carregados da nuvem:', remote.updated_at);
        this.blockRemoteUpdate = true;
        if (this.store) {
          this.store.loadFromRemote(remote.data, true);
        }
        this.blockRemoteUpdate = false;
        this.lastUpdatedAt = remote.updated_at;
        this.setStatus('connected', 'Conectado e sincronizado');
      } else if (remote !== null) {
        // Tabela existe mas está vazia
        console.log('[Supabase] Banco conectado mas sem dados salvos ainda.');
        if (window.auth && typeof window.auth.isAdmin === 'function' && window.auth.isAdmin()) {
          console.log('[Supabase] Admin conectado — enviando semente local para a nuvem...');
          await this._upsert(this.store ? this.store.state : null);
        }
        this.setStatus('connected', 'Conectado (aguardando dados)');
      } else {
        // Erro ao buscar (ex: host inválido ou erro HTTP)
        this.setStatus('error', this.statusMessage || 'Falha de conexão com a nuvem');
      }

      this._startPolling();
    } catch (e) {
      console.warn('[Supabase] Falha ao iniciar:', e.message);
      this.setStatus('error', e.message);
      this._startPolling(); // Mantém polling caso a rede retorne
    }
  }

  async reconnect() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    return this.start();
  }

  // ─── Polling ───────────────────────────────────────────────────
  _startPolling() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.pollingTimer = setInterval(() => this._poll(), POLL_MS);
  }

  async _poll() {
    if (this.blockRemoteUpdate) return;
    const creds = this.getCredentials();
    if (!creds.url || !creds.anonKey) return;

    const remote = await this._fetch(true); // silent fetch
    if (!remote) return;

    // Sem alteração
    if (remote.updated_at === this.lastUpdatedAt) return;

    // Evita loop se foi uma gravação nossa recente (janela de 4s)
    if (Date.now() - this.lastPushMs < 4000) {
      this.lastUpdatedAt = remote.updated_at;
      return;
    }

    // Nova atualização detectada vinda de outro aparelho
    console.log('[Supabase Polling] 🔄 Atualização recebida da nuvem:', remote.updated_at);
    this.lastUpdatedAt = remote.updated_at;

    if (this.store && remote.data) {
      this.blockRemoteUpdate = true;
      this.store.loadFromRemote(remote.data);
      this.blockRemoteUpdate = false;
      this.setStatus('connected', 'Atualizado da nuvem agora');
    }
  }

  // ─── Busca Estado da Nuvem ─────────────────────────────────────
  async _fetch(silent = false) {
    const creds = this.getCredentials();
    if (!creds.url || !creds.anonKey) return null;

    try {
      const url = `${this._tableUrl()}?id=eq.${creds.recordId}&select=data,updated_at&limit=1`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(url, {
        headers: this._headers(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => '');
        if (!silent) {
          console.error('[Supabase] Erro HTTP ao buscar:', resp.status, errorText);
          this.setStatus('error', `Erro ${resp.status}: Verifique se a tabela foi criada no Supabase`);
        }
        return null;
      }

      const rows = await resp.json();
      if (this.status !== 'connected' && this.status !== 'syncing') {
        this.setStatus('connected', 'Conectado à nuvem');
      }
      return (Array.isArray(rows) && rows.length > 0 && rows[0].data) ? rows[0] : { empty: true };
    } catch (e) {
      if (!silent) {
        console.warn('[Supabase] Falha de rede ao buscar:', e.message);
        this.setStatus('error', e.name === 'AbortError' ? 'Tempo limite esgotado' : 'Sem conexão com o servidor');
      }
      return null;
    }
  }

  // ─── Grava no Banco (UPSERT) ───────────────────────────────────
  async _upsert(state) {
    if (!state) return false;
    const creds = this.getCredentials();
    if (!creds.url || !creds.anonKey) {
      this.setStatus('error', 'Credenciais não configuradas');
      return false;
    }

    const nowIso = new Date().toISOString();
    this.lastPushMs = Date.now();

    try {
      this.setStatus('syncing', 'Enviando alterações para a nuvem...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const resp = await fetch(this._tableUrl(), {
        method:  'POST',
        headers: this._headers({ 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
        body:    JSON.stringify({ id: creds.recordId, data: state, updated_at: nowIso }),
        signal:  controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok || resp.status === 201 || resp.status === 204) {
        this.lastUpdatedAt = nowIso;
        this.setStatus('connected', 'Sincronizado na nuvem');
        console.log('[Supabase] ✅ Gravado com sucesso na nuvem:', nowIso);

        if (window.toast?.show) {
          window.toast.show({
            title:    '☁️ Nuvem Atualizada',
            message:  'Dados salvos no Supabase. Outros aparelhos receberão em até 3s.',
            type:     'success',
            duration: 2500
          });
        }
        return true;
      } else {
        const txt = await resp.text().catch(() => '');
        console.error('[Supabase] ❌ Erro ao gravar:', resp.status, txt);
        this.setStatus('error', `Erro ${resp.status} ao gravar`);

        if (window.toast?.show) {
          window.toast.show({
            title:    '⚠️ Falha na Sincronização',
            message:  `Erro ${resp.status} no Supabase. Verifique se o SQL foi executado.`,
            type:     'error',
            duration: 5000
          });
        }
        return false;
      }
    } catch (e) {
      console.error('[Supabase] ❌ Falha de rede ao gravar:', e.message);
      this.setStatus('error', 'Falha de rede ao sincronizar');
      return false;
    }
  }

  // ─── Chamado pelo store.save() ─────────────────────────────────
  pushState(state) {
    if (this.blockRemoteUpdate) return;
    if (!this.store) return;

    // Apenas administrador autenticado pode gravar no Supabase
    if (window.auth && typeof window.auth.isAdmin === 'function' && !window.auth.isAdmin()) {
      return;
    }

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this._upsert(state), 300);
  }

  // ─── Forçar envio manual ───────────────────────────────────────
  async forcePush() {
    if (!this.store) return { success: false, message: 'Store não inicializado' };
    const ok = await this._upsert(this.store.state);
    return {
      success: ok,
      message: ok ? 'Dados locais enviados com sucesso para o Supabase!' : 'Falha ao enviar dados. Verifique a conexão e as credenciais.'
    };
  }

  // ─── Forçar download manual ────────────────────────────────────
  async forcePull() {
    const remote = await this._fetch();
    if (remote && remote.data && remote.data.brackets) {
      this.blockRemoteUpdate = true;
      if (this.store) {
        this.store.loadFromRemote(remote.data, true);
      }
      this.blockRemoteUpdate = false;
      this.lastUpdatedAt = remote.updated_at;
      this.setStatus('connected', 'Dados baixados com sucesso');
      return { success: true, message: 'Dados mais recentes da nuvem carregados!' };
    }
    return { success: false, message: 'Não foi possível obter dados válidos da nuvem.' };
  }

  // ─── Teste de Conexão com Diagnóstico ──────────────────────────
  async testConnection(url, anonKey) {
    const cleanUrl = (url || '').trim().replace(/\/+$/, '');
    const cleanKey = (anonKey || '').trim();

    if (!cleanUrl) return { success: false, message: 'URL do Supabase não informada.' };
    if (!cleanKey) return { success: false, message: 'Chave Anon/Pública não informada.' };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const resp = await fetch(`${cleanUrl}/rest/v1/tournament_state?limit=1`, {
        headers: {
          'apikey': cleanKey,
          'Authorization': `Bearer ${cleanKey}`
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        return {
          success: true,
          message: '✅ Conexão bem-sucedida! Tabela tournament_state acessível com sucesso.'
        };
      }

      if (resp.status === 404) {
        return {
          success: false,
          tableMissing: true,
          message: '⚠️ Projeto encontrado, mas a tabela "tournament_state" NÃO existe! Execute o script SQL no SQL Editor do Supabase.'
        };
      }

      if (resp.status === 401 || resp.status === 403) {
        return {
          success: false,
          message: '❌ Chave de API inválida ou política RLS bloqueando o acesso (HTTP ' + resp.status + ').'
        };
      }

      const txt = await resp.text().catch(() => '');
      return {
        success: false,
        message: `HTTP ${resp.status}: ${txt.slice(0, 120)}`
      };
    } catch (e) {
      if (e.name === 'AbortError') {
        return { success: false, message: '⏱️ Tempo limite esgotado ao tentar alcançar o Supabase.' };
      }
      return {
        success: false,
        message: `Falha de rede/DNS: ${e.message}. Verifique se a URL foi digitada corretamente.`
      };
    }
  }
}

export const supabaseService = new SupabaseService();
if (typeof window !== 'undefined') {
  window.supabaseService = supabaseService;
}
export { saveSupabaseCredentials, getSupabaseCredentials, clearSupabaseCredentials };
