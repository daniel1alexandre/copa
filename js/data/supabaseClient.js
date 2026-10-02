// Cliente Supabase e Mecanismo de Sincronização em Tempo Real (WebSocket + Polling Fallback)
import { getSupabaseCredentials, saveSupabaseCredentials } from './supabaseConfig.js';

class SupabaseService {
  constructor() {
    this.client = null;
    this.channel = null;
    this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error'
    this.statusListeners = [];
    this.debounceTimer = null;
    this.isUpdatingFromRemote = false;
    this.store = null;
    this.lastPushTime = null;
    this.lastKnownUpdatedAt = null;   // Para o polling de fallback
    this.pollingInterval = null;       // ID do intervalo de polling
    this.realtimeActive = false;       // Se o WebSocket está funcionando
  }

  onStatusChange(fn) {
    this.statusListeners.push(fn);
    fn(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== fn);
    };
  }

  setStatus(newStatus, detail = '') {
    this.status = newStatus;
    console.log(`[Supabase] Status: ${newStatus}`, detail || '');
    this.statusListeners.forEach(listener => {
      try {
        listener(this.status, detail);
      } catch (e) {
        console.error('Erro em listener do Supabase status:', e);
      }
    });
  }

  getStatus() {
    return this.status;
  }

  isConfigured() {
    const { url, anonKey } = getSupabaseCredentials();
    return Boolean(url && anonKey && url.startsWith('http'));
  }

  async init(store) {
    this.store = store;

    if (!this.isConfigured()) {
      this.setStatus('disconnected', 'Credenciais não configuradas');
      return false;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      console.warn('[Supabase] SDK ainda não carregado. Tentando novamente em 2s...');
      setTimeout(() => this.init(store), 2000);
      return false;
    }

    const { url, anonKey, tableName, recordId } = getSupabaseCredentials();

    try {
      this.setStatus('connecting', 'Conectando ao Supabase...');
      this.client = window.supabase.createClient(url, anonKey, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 10 } }
      });

      // 1. Carrega estado atual do Supabase
      const { data, error } = await this.client
        .from(tableName)
        .select('*')
        .eq('id', recordId)
        .maybeSingle();

      if (error) {
        console.error('[Supabase] Erro ao buscar estado:', error);
        this.setStatus('error', error.message);
        // Mesmo com erro, inicia polling como fallback
        this.startPolling(tableName, recordId);
        return false;
      }

      if (data && data.data) {
        console.log('[Supabase] Estado carregado com sucesso da nuvem.');
        this.lastKnownUpdatedAt = data.updated_at;
        this.isUpdatingFromRemote = true;
        this.store.loadFromRemote(data.data);
        this.isUpdatingFromRemote = false;
      } else {
        console.log('[Supabase] Nenhum estado na nuvem. Criando registro inicial...');
        await this.pushStateImmediate(this.store.state);
      }

      // 2. Conecta WebSocket Realtime
      this.setupRealtimeChannel(tableName, recordId);

      // 3. Inicia polling de segurança (detecta se o Realtime falhou)
      this.startPolling(tableName, recordId);

      this.setStatus('connected', 'Sincronização em tempo real ativa');
      return true;
    } catch (err) {
      console.error('[Supabase] Erro na inicialização:', err);
      this.setStatus('error', err.message);
      this.startPolling(tableName, recordId);
      return false;
    }
  }

  setupRealtimeChannel(tableName, recordId) {
    if (this.channel) {
      try { this.client.removeChannel(this.channel); } catch (e) {}
      this.channel = null;
    }

    this.realtimeActive = false;

    this.channel = this.client
      .channel('copa_2026_realtime_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `id=eq.${recordId}`
        },
        (payload) => {
          console.log('[Supabase Realtime] Notificação recebida:', payload.eventType);
          this.realtimeActive = true;

          // Extrai o estado — pode estar em payload.new.data ou payload.record.data
          const newRecord = payload.new || payload.record;
          if (!newRecord) return;

          const newState = newRecord.data;
          const newUpdatedAt = newRecord.updated_at;

          if (!newState) {
            console.warn('[Supabase Realtime] Payload sem campo data. Verifique REPLICA IDENTITY FULL.');
            // Faz polling imediato para buscar o estado
            this.pollOnce(tableName, recordId);
            return;
          }

          // Evita reprocessar nossas próprias atualizações
          const remoteUpdated = new Date(newUpdatedAt || 0).getTime();
          if (this.lastPushTime && Math.abs(remoteUpdated - this.lastPushTime) < 1500) {
            this.lastKnownUpdatedAt = newUpdatedAt;
            return;
          }

          if (newUpdatedAt !== this.lastKnownUpdatedAt) {
            this.lastKnownUpdatedAt = newUpdatedAt;
            console.log('[Supabase Realtime] Atualizando dados em tempo real!');
            this.isUpdatingFromRemote = true;
            this.store.loadFromRemote(newState);
            this.isUpdatingFromRemote = false;
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] Inscrito com sucesso!');
          this.realtimeActive = true;
          this.setStatus('connected', 'Ao vivo');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.warn('[Supabase Realtime] Canal desconectado:', status, err);
          this.realtimeActive = false;
          this.setStatus('connecting', 'Reconectando...');
          // Tenta reconectar após 5s
          setTimeout(() => this.setupRealtimeChannel(tableName, recordId), 5000);
        }
      });
  }

  // Polling de segurança: verifica atualizações a cada 8s
  // Garante que os visitantes sempre recebam dados mesmo se o WebSocket falhar
  startPolling(tableName, recordId) {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    this.pollingInterval = setInterval(() => {
      this.pollOnce(tableName, recordId);
    }, 8000);
  }

  async pollOnce(tableName, recordId) {
    if (!this.client) return;
    try {
      const { data, error } = await this.client
        .from(tableName)
        .select('updated_at, data')
        .eq('id', recordId)
        .maybeSingle();

      if (error || !data) return;

      // Só atualiza se o servidor tem algo mais novo que o que já temos
      if (data.updated_at && data.updated_at !== this.lastKnownUpdatedAt) {
        // Verifica se não fomos nós que acabamos de enviar
        const remoteUpdated = new Date(data.updated_at).getTime();
        if (this.lastPushTime && Math.abs(remoteUpdated - this.lastPushTime) < 2000) {
          this.lastKnownUpdatedAt = data.updated_at;
          return;
        }

        console.log('[Supabase Polling] Nova atualização detectada:', data.updated_at);
        this.lastKnownUpdatedAt = data.updated_at;
        if (data.data) {
          this.isUpdatingFromRemote = true;
          this.store.loadFromRemote(data.data);
          this.isUpdatingFromRemote = false;
        }
      }
    } catch (e) {
      console.warn('[Supabase Polling] Erro ao verificar atualizações:', e.message);
    }
  }

  pushState(state) {
    if (this.isUpdatingFromRemote) return;
    if (!this.client || !this.isConfigured()) return;

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.pushStateImmediate(state);
    }, 400);
  }

  async pushStateImmediate(state) {
    if (!this.client || !this.isConfigured()) return;

    const { tableName, recordId } = getSupabaseCredentials();
    const nowIso = new Date().toISOString();
    this.lastPushTime = Date.now();

    try {
      this.setStatus('syncing', 'Enviando para nuvem...');
      const { error } = await this.client
        .from(tableName)
        .upsert(
          { id: recordId, data: state, updated_at: nowIso },
          { onConflict: 'id' }
        );

      if (error) {
        console.error('[Supabase] Erro ao sincronizar:', error);
        this.setStatus('error', error.message);
      } else {
        this.lastKnownUpdatedAt = nowIso;
        this.setStatus('connected', 'Sincronizado');
      }
    } catch (e) {
      console.error('[Supabase] Falha ao enviar:', e);
      this.setStatus('error', e.message);
    }
  }

  async testConnection(url, anonKey) {
    if (!window.supabase) {
      return { success: false, message: 'Biblioteca Supabase não carregada.' };
    }
    try {
      const testClient = window.supabase.createClient(url, anonKey);
      const { data, error } = await testClient
        .from('tournament_state')
        .select('id, updated_at')
        .limit(1);

      if (error) {
        if (error.code === '42P01' || error.message.includes('tournament_state')) {
          return {
            success: false,
            tableMissing: true,
            message: 'Conexão OK, mas a tabela "tournament_state" não foi criada. Execute o script SQL!'
          };
        }
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Conexão com o Supabase realizada com sucesso!' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}

export const supabaseService = new SupabaseService();
window.supabaseService = supabaseService;
export { saveSupabaseCredentials, getSupabaseCredentials };
