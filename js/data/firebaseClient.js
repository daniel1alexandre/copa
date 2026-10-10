// Cliente Firebase Realtime Database — Push Instantâneo via EventSource + REST API
import { getFirebaseCredentials, saveFirebaseCredentials, clearFirebaseCredentials, normalizeFirebaseUrl } from './firebaseConfig.js';

const POLL_MS = 2000;

class FirebaseService {
  constructor() {
    this.store             = null;
    this.status            = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error'
    this.statusMessage     = '';
    this.statusListeners   = [];
    this.debounceTimer     = null;
    this.pollingTimer      = null;
    this.eventSource       = null;
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

  getCredentials() {
    return getFirebaseCredentials();
  }

  _endpointUrl() {
    const { databaseURL, nodePath } = this.getCredentials();
    if (!databaseURL) return '';
    return `${databaseURL}/${nodePath}.json`;
  }

  // ─── Inicialização ─────────────────────────────────────────────
  async init(store) {
    this.store = store;
    return this.start();
  }

  async start() {
    const creds = this.getCredentials();
    if (!creds.databaseURL) {
      this.setStatus('disconnected', 'URL do Firebase não informada');
      return;
    }

    this.setStatus('connecting', 'Conectando ao Firebase...');

    try {
      // 1. Busca inicial para garantir dados atualizados
      const remote = await this._fetch();

      if (remote && remote.data && remote.data.brackets) {
        console.log('[Firebase] ✅ Dados oficiais carregados da nuvem:', remote.updated_at);
        this.blockRemoteUpdate = true;
        if (this.store) {
          this.store.loadFromRemote(remote.data, true);
        }
        this.blockRemoteUpdate = false;
        this.lastUpdatedAt = remote.updated_at;
        this.setStatus('connected', 'Conectado e sincronizado');
      } else if (remote !== null) {
        console.log('[Firebase] Banco conectado mas sem dados salvos ainda.');
        if (window.auth && typeof window.auth.isAdmin === 'function' && window.auth.isAdmin()) {
          console.log('[Firebase] Admin conectado — enviando semente local para a nuvem...');
          await this._put(this.store ? this.store.state : null);
        }
        this.setStatus('connected', 'Conectado (aguardando dados)');
      } else {
        this.setStatus('error', this.statusMessage || 'Falha de conexão com o Firebase');
      }

      // 2. Inicia escuta em tempo real via Server-Sent Events (SSE)
      this._startEventSource();

      // 3. Inicia polling suave de contingência
      this._startPolling();
    } catch (e) {
      console.warn('[Firebase] Falha ao iniciar:', e.message);
      this.setStatus('error', e.message);
      this._startPolling();
    }
  }

  async reconnect() {
    this._stopEventSource();
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    return this.start();
  }

  // ─── EventSource (Tempo Real Nativo do Firebase) ───────────────
  _startEventSource() {
    this._stopEventSource();
    const endpoint = this._endpointUrl();
    if (!endpoint || typeof EventSource === 'undefined') return;

    try {
      this.eventSource = new EventSource(endpoint);

      // Eventos de alteração no Firebase disparam busca imediata
      const triggerUpdate = () => {
        if (!this.blockRemoteUpdate) {
          this._poll();
        }
      };

      this.eventSource.addEventListener('put', triggerUpdate);
      this.eventSource.addEventListener('patch', triggerUpdate);

      this.eventSource.onerror = () => {
        // EventSource tenta reconectar sozinho automaticamente
      };
    } catch (e) {
      console.warn('[Firebase SSE] Não foi possível iniciar EventSource:', e);
    }
  }

  _stopEventSource() {
    if (this.eventSource) {
      try { this.eventSource.close(); } catch (_) {}
      this.eventSource = null;
    }
  }

  // ─── Polling de Contingência ───────────────────────────────────
  _startPolling() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.pollingTimer = setInterval(() => this._poll(), POLL_MS);
  }

  async _poll() {
    if (this.blockRemoteUpdate) return;
    const creds = this.getCredentials();
    if (!creds.databaseURL) return;

    const remote = await this._fetch(true); // silent fetch com anti-cache
    if (!remote || !remote.data) return;

    if (remote.updated_at === this.lastUpdatedAt) return;

    // Se foi gravação nossa recente (janela de 2.5s)
    if (Date.now() - this.lastPushMs < 2500) {
      this.lastUpdatedAt = remote.updated_at;
      return;
    }

    console.log('[Firebase] 🔄 Nova atualização recebida da nuvem:', remote.updated_at);
    this.lastUpdatedAt = remote.updated_at;

    if (this.store && remote.data) {
      this.blockRemoteUpdate = true;
      this.store.loadFromRemote(remote.data);
      this.blockRemoteUpdate = false;
      this.setStatus('connected', 'Sincronizado');
    }
  }

  // ─── Busca Estado (GET com Anti-Cache Forçado) ─────────────────
  async _fetch(silent = false) {
    const endpoint = this._endpointUrl();
    if (!endpoint) return null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      // Adiciona timestamp para nunca servir do cache do navegador
      const nocacheUrl = `${endpoint}?_t=${Date.now()}`;

      const resp = await fetch(nocacheUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        if (!silent) {
          if (resp.status === 401 || resp.status === 403) {
            this.setStatus('error', 'Permissão negada. Verifique as Regras (.read/.write: true) no Firebase Console.');
          } else {
            this.setStatus('error', `Erro HTTP ${resp.status} no Firebase`);
          }
        }
        return null;
      }

      const data = await resp.json();
      if (this.status !== 'connected' && this.status !== 'syncing') {
        this.setStatus('connected', 'Conectado ao Firebase');
      }
      return data || { empty: true };
    } catch (e) {
      if (!silent) {
        console.warn('[Firebase] Falha ao buscar dados:', e.message);
        this.setStatus('error', e.name === 'AbortError' ? 'Tempo limite esgotado' : 'Sem conexão com o Firebase');
      }
      return null;
    }
  }

  // ─── Grava no Banco (PUT) ──────────────────────────────────────
  async _put(state) {
    if (!state) return false;
    const endpoint = this._endpointUrl();
    if (!endpoint) {
      this.setStatus('error', 'URL do Firebase não informada');
      return false;
    }

    const nowIso = new Date().toISOString();
    this.lastPushMs = Date.now();

    try {
      this.setStatus('syncing', 'Enviando alterações para o Firebase...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const resp = await fetch(endpoint, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ data: state, updated_at: nowIso }),
        signal:  controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        this.lastUpdatedAt = nowIso;
        this.setStatus('connected', 'Sincronizado no Firebase');
        console.log('[Firebase] ✅ Gravado com sucesso na nuvem:', nowIso);

        if (window.toast?.show) {
          window.toast.show({
            title:    '🔥 Nuvem Atualizada',
            message:  'Placar salvo na nuvem e sincronizado com os outros aparelhos.',
            type:     'success',
            duration: 2500
          });
        }
        return true;
      } else {
        const txt = await resp.text().catch(() => '');
        console.error('[Firebase] ❌ Erro ao gravar:', resp.status, txt);
        if (resp.status === 401 || resp.status === 403) {
          this.setStatus('error', 'Permissão de gravação negada pelas Regras do Firebase');
        } else {
          this.setStatus('error', `Erro ${resp.status} no Firebase`);
        }

        if (window.toast?.show) {
          window.toast.show({
            title:    '⚠️ Falha na Sincronização',
            message:  `Erro ${resp.status} no Firebase. Verifique se as Regras (.write) estão liberadas.`,
            type:     'error',
            duration: 5000
          });
        }
        return false;
      }
    } catch (e) {
      console.error('[Firebase] ❌ Falha de rede ao gravar:', e.message);
      this.setStatus('error', 'Falha de rede ao sincronizar');
      return false;
    }
  }

  // ─── Chamado pelo store.save() ─────────────────────────────────
  pushState(state) {
    if (this.blockRemoteUpdate) return;
    if (!this.store) return;

    // Se o usuário não for administrador, emite aviso explicativo
    if (window.auth && typeof window.auth.isAdmin === 'function' && !window.auth.isAdmin()) {
      console.warn('[Firebase] Bloqueado: usuário atual não está autenticado como administrador (Baumann).');
      if (window.toast?.show) {
        window.toast.show({
          title: '⚠️ Modo Leitura (Não Sincronizado)',
          message: 'Faça login como Administrador (Baumann) para que as alterações enviem para os outros aparelhos.',
          type: 'warning',
          duration: 4000
        });
      }
      return;
    }

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this._put(state), 250);
  }

  // ─── Ações Manuais ─────────────────────────────────────────────
  async forcePush() {
    if (!this.store) return { success: false, message: 'Store não inicializado' };
    const ok = await this._put(this.store.state);
    return {
      success: ok,
      message: ok ? 'Dados locais enviados com sucesso para o Firebase!' : 'Falha ao enviar dados. Verifique a URL e as regras do Firebase.'
    };
  }

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
      return { success: true, message: 'Dados mais recentes do Firebase carregados!' };
    }
    return { success: false, message: 'Não foi possível obter dados válidos do Firebase.' };
  }

  // ─── Teste de Conexão com Diagnóstico ──────────────────────────
  async testConnection(url) {
    const cleanUrl = normalizeFirebaseUrl(url);
    if (!cleanUrl) return { success: false, message: 'URL do Firebase não informada.' };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      // Testa a raiz do banco (.json?shallow=true) que é sempre válida se o banco existir
      const testEndpoint = `${cleanUrl}/.json?shallow=true`;
      const resp = await fetch(testEndpoint, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (resp.ok) {
        return {
          success: true,
          normalizedUrl: cleanUrl,
          message: '✅ Conexão bem-sucedida! O Realtime Database está ativo e respondendo perfeitamente.'
        };
      }

      if (resp.status === 401 || resp.status === 403) {
        return {
          success: false,
          normalizedUrl: cleanUrl,
          permissionDenied: true,
          message: '⚠️ Conexão alcançada, mas as Regras do Firebase estão bloqueando o acesso (HTTP 401)! Defina ".read": true e ".write": true na aba "Rules" do Firebase Console e clique em Publish.'
        };
      }

      return {
        success: false,
        normalizedUrl: cleanUrl,
        message: `HTTP ${resp.status}: O servidor respondeu com código de erro.`
      };
    } catch (e) {
      if (e.name === 'AbortError') {
        return { success: false, normalizedUrl: cleanUrl, message: '⏱️ Tempo limite esgotado ao tentar alcançar o Firebase.' };
      }
      return {
        success: false,
        normalizedUrl: cleanUrl,
        message: `Falha de rede/DNS: ${e.message}. Certifique-se de que a URL termina em .firebaseio.com ou .firebasedatabase.app`
      };
    }
  }
}

export const firebaseService = new FirebaseService();
export const supabaseService = firebaseService; // Alias de compatibilidade

if (typeof window !== 'undefined') {
  window.firebaseService = firebaseService;
  window.supabaseService = firebaseService; // Alias global
}

export { saveFirebaseCredentials, getFirebaseCredentials, clearFirebaseCredentials };
