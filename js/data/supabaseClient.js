// Cliente Supabase e Mecanismo de Sincronização em Tempo Real (WebSocket)
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
    console.log(`[Supabase Realtime] Status: ${newStatus}`, detail || '');
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
      console.warn('[Supabase] SDK do Supabase ainda não carregado no window.');
      this.setStatus('error', 'Biblioteca Supabase não encontrada');
      return false;
    }

    const { url, anonKey, tableName, recordId } = getSupabaseCredentials();

    try {
      this.setStatus('connecting', 'Conectando ao Supabase...');
      this.client = window.supabase.createClient(url, anonKey, {
        auth: {
          persistSession: false
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });

      // 1. Tenta carregar o estado atual gravado no Supabase
      const { data, error } = await this.client
        .from(tableName)
        .select('*')
        .eq('id', recordId)
        .maybeSingle();

      if (error) {
        console.error('[Supabase] Erro ao buscar estado do torneio:', error);
        this.setStatus('error', error.message);
        return false;
      }

      if (data && data.data) {
        // Encontrou estado no Supabase! Verifica se é mais recente ou atualiza o store
        console.log('[Supabase] Estado do torneio carregado com sucesso da nuvem.');
        const remoteState = data.data;
        this.isUpdatingFromRemote = true;
        this.store.loadFromRemote(remoteState);
        this.isUpdatingFromRemote = false;
      } else {
        // Registro ainda não existe no Supabase. Faz o primeiro seed com o estado local!
        console.log('[Supabase] Nenhum estado encontrado na nuvem. Criando registro inicial...');
        await this.pushStateImmediate(this.store.state);
      }

      // 2. Conecta canal de Tempo Real para escutar alterações de outros clientes
      this.setupRealtimeChannel(tableName, recordId);
      this.setStatus('connected', 'Sincronização em tempo real ativa');
      return true;
    } catch (err) {
      console.error('[Supabase] Erro na inicialização:', err);
      this.setStatus('error', err.message);
      return false;
    }
  }

  setupRealtimeChannel(tableName, recordId) {
    if (this.channel) {
      this.client.removeChannel(this.channel);
      this.channel = null;
    }

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
          console.log('[Supabase Realtime] Notificação recebida da nuvem:', payload.eventType);
          if (payload.new && payload.new.data) {
            // Se fomos nós que acabamos de enviar, não precisamos recarregar
            const remoteUpdated = new Date(payload.new.updated_at || 0).getTime();
            if (this.lastPushTime && Math.abs(remoteUpdated - this.lastPushTime) < 1500) {
              return;
            }

            console.log('[Supabase Realtime] Atualizando chaves e placares em tempo real!');
            this.isUpdatingFromRemote = true;
            this.store.loadFromRemote(payload.new.data);
            this.isUpdatingFromRemote = false;

            // Mostra um pequeno alerta visual se existir toast
            if (window.toast && typeof window.toast.show === 'function') {
              window.toast.show({
                title: '⚡ Atualização em Tempo Real',
                message: 'Placares e chaves atualizados pela arbitragem.',
                type: 'info'
              });
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] Inscrito no canal em tempo real com sucesso!');
          this.setStatus('connected', 'Ao vivo');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.warn('[Supabase Realtime] Canal desconectado:', status, err);
          this.setStatus('connecting', 'Reconectando canal ao vivo...');
        }
      });
  }

  pushState(state) {
    if (this.isUpdatingFromRemote) return;
    if (!this.client || !this.isConfigured()) return;

    // Debounce para não inundar o Supabase em edições rápidas
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
      this.setStatus('syncing', 'Enviando alterações para nuvem...');
      const { error } = await this.client
        .from(tableName)
        .upsert(
          {
            id: recordId,
            data: state,
            updated_at: nowIso
          },
          { onConflict: 'id' }
        );

      if (error) {
        console.error('[Supabase] Erro ao sincronizar estado com a nuvem:', error);
        this.setStatus('error', error.message);
      } else {
        this.setStatus('connected', 'Sincronizado');
      }
    } catch (e) {
      console.error('[Supabase] Falha ao enviar para Supabase:', e);
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
        // Se a tabela não existir, avisa especificamente
        if (error.code === '42P01' || error.message.includes('tournament_state')) {
          return {
            success: false,
            tableMissing: true,
            message: 'Conexão autorizada, mas a tabela "tournament_state" não foi criada no Supabase ainda. Execute o script SQL no Supabase!'
          };
        }
        return { success: false, message: error.message };
      }

      return {
        success: true,
        message: 'Conexão com o Supabase realizada com sucesso e tabela pronta!'
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}

export const supabaseService = new SupabaseService();
window.supabaseService = supabaseService;
export { saveSupabaseCredentials, getSupabaseCredentials };
