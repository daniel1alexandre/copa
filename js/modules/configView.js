// Módulo de Configuração do Torneio, Categorias, Tabela de Pontos, Quadras e Supabase Cloud
import { store } from '../data/store.js';
import { toast } from './toast.js';
import { DEFAULT_POINTS_TABLE } from '../data/categories.js';
import { supabaseService, getSupabaseCredentials, saveSupabaseCredentials } from '../data/supabaseClient.js';
import { auth } from './auth.js';

export function initConfigView() {
  window.handleSaveTournamentMetadata = (e) => {
    e.preventDefault();
    if (!auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas o administrador (Baumann) pode alterar dados do torneio.', type: 'warning' });
      return;
    }
    const nome = document.getElementById('cfg-tourn-nome').value.trim();
    const local = document.getElementById('cfg-tourn-local').value.trim();
    const dataInicio = document.getElementById('cfg-tourn-inicio').value;
    const horaInicio = document.getElementById('cfg-tourn-hora-inicio')?.value || '08:00';
    const dataFim = document.getElementById('cfg-tourn-fim').value;
    const status = document.getElementById('cfg-tourn-status').value;
    const tempoMedio = parseInt(document.getElementById('cfg-tourn-tempo-jogo').value, 10) || 50;
    const tempoAquec = parseInt(document.getElementById('cfg-tourn-tempo-aquec').value, 10) || 10;

    store.updateTournament({
      nome,
      local,
      dataInicio,
      horaInicio,
      dataFim,
      status,
      tempoMedioJogoMin: tempoMedio,
      tempoAquecimentoMin: tempoAquec
    });

    toast.show({
      title: 'Configurações Salvas',
      message: 'Os dados do torneio foram atualizados.',
      type: 'success'
    });
  };

  window.handleToggleCategory = (catId, checked) => {
    if (!auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas o administrador (Baumann) pode ativar/desativar categorias.', type: 'warning' });
      renderConfig();
      return;
    }
    store.toggleCategory(catId, checked);
    toast.show({
      title: 'Categoria Atualizada',
      message: `Categoria ${checked ? 'ativada' : 'desativada'}.`,
      type: 'info'
    });
  };

  window.handleSavePointsTable = () => {
    if (!auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas o administrador (Baumann) pode alterar a tabela de pontos.', type: 'warning' });
      return;
    }
    const inputs = document.querySelectorAll('.points-table-input');
    const newTable = {};
    inputs.forEach(input => {
      const pos = parseInt(input.dataset.pos, 10);
      const val = parseInt(input.value, 10);
      newTable[pos] = isNaN(val) ? (DEFAULT_POINTS_TABLE[pos] || 0) : val;
    });

    store.updatePointsTable(newTable);
    toast.show({
      title: 'Tabela de Pontos Salva',
      message: 'A pontuação das colocações foi atualizada para o ranking geral.',
      type: 'success'
    });
  };

  window.handleRestoreDefaultPointsTable = () => {
    if (!auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas o administrador (Baumann) pode restaurar configurações oficiais.', type: 'warning' });
      return;
    }
    store.restoreDefaultPointsTable();
    toast.show({
      title: 'Padrão Oficial CBT Restaurado',
      message: 'A pontuação padrão oficial (1º ao 27º lugar) foi restaurada com sucesso.',
      type: 'success'
    });
    renderConfig();
  };

  // ==========================================
  // CONFIGURAÇÃO SUPABASE REALTIME
  // ==========================================
  window.handleSaveSupabaseConfig = async (e) => {
    e.preventDefault();
    const url = document.getElementById('cfg-supabase-url').value.trim();
    const anonKey = document.getElementById('cfg-supabase-key').value.trim();

    saveSupabaseCredentials(url, anonKey);

    toast.show({
      title: 'Conectando ao Supabase...',
      message: 'Iniciando sincronização em tempo real...',
      type: 'info'
    });

    const success = await supabaseService.init(store);
    if (success) {
      toast.show({
        title: 'Supabase Conectado!',
        message: 'O projeto agora está sincronizado em tempo real com todos os usuários.',
        type: 'success'
      });
    } else {
      toast.show({
        title: 'Verifique as Credenciais',
        message: 'Não foi possível conectar ao Supabase. Verifique a URL e a Anon Key informadas.',
        type: 'warning'
      });
    }
    renderConfig();
  };

  window.handleTestSupabase = async () => {
    const url = document.getElementById('cfg-supabase-url').value.trim();
    const anonKey = document.getElementById('cfg-supabase-key').value.trim();

    if (!url || !anonKey) {
      toast.show({
        title: 'Campos Vazios',
        message: 'Preencha a URL e a Chave Anon do Supabase para testar.',
        type: 'warning'
      });
      return;
    }

    toast.show({ title: 'Testando Conexão...', message: 'Consultando o servidor Supabase...', type: 'info' });
    const res = await supabaseService.testConnection(url, anonKey);

    if (res.success) {
      toast.show({
        title: 'Conexão Aprovada!',
        message: res.message,
        type: 'success'
      });
    } else if (res.tableMissing) {
      toast.show({
        title: 'Tabela Não Encontrada',
        message: res.message,
        type: 'warning'
      });
    } else {
      toast.show({
        title: 'Falha na Conexão',
        message: res.message,
        type: 'error'
      });
    }
  };

  window.handlePushStateToSupabase = async () => {
    if (!supabaseService.isConfigured()) {
      toast.show({
        title: 'Supabase Não Configurado',
        message: 'Configure a URL e a Chave Anon antes de sincronizar.',
        type: 'warning'
      });
      return;
    }
    toast.show({ title: 'Enviando Dados...', message: 'Gravando estado atual no Supabase...', type: 'info' });
    await supabaseService.pushStateImmediate(store.state);
    toast.show({ title: 'Dados Enviados!', message: 'O banco de dados na nuvem foi atualizado.', type: 'success' });
    renderConfig();
  };

  window.handleCopySupabaseSQL = () => {
    const sql = `CREATE TABLE IF NOT EXISTS public.tournament_state (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_state;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.tournament_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica de tournament_state" ON public.tournament_state;
CREATE POLICY "Permitir leitura publica de tournament_state" 
ON public.tournament_state 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir gravacao de tournament_state" ON public.tournament_state;
CREATE POLICY "Permitir gravacao de tournament_state" 
ON public.tournament_state 
FOR ALL 
USING (true) 
WITH CHECK (true);`;

    navigator.clipboard.writeText(sql).then(() => {
      toast.show({
        title: 'SQL Copiado!',
        message: 'Código copiado para a área de transferência. Cole no SQL Editor do Supabase.',
        type: 'success'
      });
    }).catch(err => {
      console.error(err);
      toast.show({ title: 'Erro ao Copiar', message: 'Copie manualmente o código exibido abaixo.', type: 'error' });
    });
  };

  window.handleExportBackup = () => {
    const jsonStr = store.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copa_federacoes_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.show({ title: 'Backup Gerado', message: 'O arquivo JSON foi baixado.', type: 'success' });
  };

  window.handleImportBackup = () => {
    if (!auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas o administrador (Baumann) pode restaurar backups.', type: 'warning' });
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = store.importJSON(event.target.result);
        if (res.success) {
          toast.show({ title: 'Dados Importados', message: 'O backup foi restaurado com sucesso!', type: 'success' });
          renderConfig();
        } else {
          toast.show({ title: 'Erro na Importação', message: res.message, type: 'error' });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  window.handleResetAllData = () => {
    if (!auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas o administrador (Baumann) pode reiniciar os dados.', type: 'warning' });
      return;
    }
    if (confirm('ATENÇÃO: Deseja redefinir todos os dados para o estado inicial da Copa Federações 2026? Todos os resultados preenchidos serão resetados.')) {
      store.resetAllData();
      toast.show({ title: 'Dados Reiniciados', message: 'As chaves e 27 federações foram restauradas.', type: 'warning' });
      renderConfig();
    }
  };
}

export function renderConfig() {
  const container = document.getElementById('view-configuracoes');
  if (!container) return;

  const tournament = store.getTournament();
  const categories = store.getCategories();
  const pointsTable = store.getPointsTable();
  const creds = getSupabaseCredentials();
  const supabaseStatus = supabaseService.getStatus();

  let statusBadgeHtml = '';
  if (supabaseStatus === 'connected') {
    statusBadgeHtml = `<span style="background: rgba(16, 185, 129, 0.15); color: #059669; border: 1px solid rgba(16, 185, 129, 0.4); padding: 0.35rem 0.75rem; border-radius: 9999px; font-weight: 700; font-size: 0.825rem; display: inline-flex; align-items: center; gap: 0.45rem;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981;"></span> Nuvem Supabase Ativa & Sincronizada</span>`;
  } else if (supabaseStatus === 'connecting' || supabaseStatus === 'syncing') {
    statusBadgeHtml = `<span style="background: rgba(245, 158, 11, 0.15); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.4); padding: 0.35rem 0.75rem; border-radius: 9999px; font-weight: 700; font-size: 0.825rem; display: inline-flex; align-items: center; gap: 0.45rem;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;"></span> Conectando ao Supabase...</span>`;
  } else {
    statusBadgeHtml = `<span style="background: rgba(100, 116, 139, 0.12); color: #64748b; border: 1px solid rgba(100, 116, 139, 0.3); padding: 0.35rem 0.75rem; border-radius: 9999px; font-weight: 700; font-size: 0.825rem; display: inline-flex; align-items: center; gap: 0.45rem;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #94a3b8;"></span> Modo Local (Desconectado da Nuvem)</span>`;
  }

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
      <div>
        <h2 style="font-family: var(--font-display); font-size: 1.6rem; font-weight: 800; color: var(--accent-dark-blue);">
          ⚙️ Painel de Configurações & Nuvem Supabase
        </h2>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          Gerencie regras oficiais CBT, sincronização em tempo real via Supabase, categorias e backups
        </p>
      </div>

      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <button class="btn btn-outline btn-sm" onclick="window.handleExportBackup()">💾 Exportar Backup</button>
        <button class="btn btn-outline btn-sm" onclick="window.handleImportBackup()">📥 Importar Backup</button>
        <button class="btn btn-danger btn-sm" onclick="window.handleResetAllData()" style="color: #ef4444; border-color: #fca5a5;">⚠️ Redefinir Dados</button>
      </div>
    </div>

    <!-- CARD PRINCIPAL: SUPABASE REALTIME & CLOUD -->
    <div class="card" style="margin-bottom: 1.75rem; border: 1.5px solid #028090; background: linear-gradient(180deg, #ffffff 0%, #f0fdfa 100%);">
      <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: #028090; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; box-shadow: 0 4px 12px rgba(2, 128, 144, 0.35);">
            ⚡
          </div>
          <div>
            <h3 class="card-title" style="color: #0b1a30; font-size: 1.25rem;">
              Integração Supabase & Transmissão em Tempo Real
            </h3>
            <p style="font-size: 0.825rem; color: var(--text-muted); margin-top: 0.15rem;">
              Permite que árbitros lancem os pontos e todos os usuários vejam os resultados, chaves e telão ao vivo instantaneamente!
            </p>
          </div>
        </div>

        <div>
          ${statusBadgeHtml}
        </div>
      </div>

      <form onsubmit="window.handleSaveSupabaseConfig(event)" style="margin-top: 1rem;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-weight: 700; color: #0f172a;">
              🌐 URL do Projeto Supabase:
            </label>
            <input 
              type="url" 
              id="cfg-supabase-url" 
              class="form-control" 
              placeholder="https://seu-projeto.supabase.co" 
              value="${creds.url}"
              required
            >
            <small style="color: var(--text-muted); font-size: 0.75rem; margin-top: 0.25rem; display: block;">
              Encontre no Supabase em: <em>Project Settings → API → Project URL</em>
            </small>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-weight: 700; color: #0f172a;">
              🔑 Chave Anon Pública (anon / public):
            </label>
            <input 
              type="password" 
              id="cfg-supabase-key" 
              class="form-control" 
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
              value="${creds.anonKey}"
              required
            >
            <small style="color: var(--text-muted); font-size: 0.75rem; margin-top: 0.25rem; display: block;">
              Encontre no Supabase em: <em>Project Settings → API → Project API keys (anon / public)</em>
            </small>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; padding-top: 0.5rem; border-top: 1px solid rgba(2, 128, 144, 0.15);">
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button type="submit" class="btn btn-primary" style="background: #028090; font-weight: 700;">
              💾 Salvar e Ativar Tempo Real
            </button>
            <button type="button" class="btn btn-outline" onclick="window.handleTestSupabase()">
              🔍 Testar Conexão
            </button>
            <button type="button" class="btn btn-outline" onclick="window.handlePushStateToSupabase()" title="Grava todos os dados locais atuais no Supabase">
              ⬆️ Enviar Dados Locais para Nuvem
            </button>
          </div>

          <button type="button" class="btn btn-outline btn-sm" onclick="window.handleCopySupabaseSQL()" style="border-color: #00a896; color: #006877; font-weight: 700;">
            📋 Copiar Script SQL para Supabase
          </button>
        </div>
      </form>

      <!-- PASSO A PASSO ILUSTRADO SUPABASE -->
      <div style="margin-top: 1.25rem; background: #ffffff; border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 1rem;">
        <strong style="color: #0b1a30; font-size: 0.875rem; display: block; margin-bottom: 0.5rem;">
          📖 Como configurar seu banco de dados Supabase em 3 passos simples:
        </strong>
        <ol style="font-size: 0.8rem; color: #475569; padding-left: 1.25rem; line-height: 1.6;">
          <li>Acesse <a href="https://supabase.com" target="_blank" style="color: #028090; font-weight: 600;">supabase.com</a>, faça login ou crie uma conta gratuita e crie um novo projeto.</li>
          <li>No menu lateral esquerdo do Supabase, clique em <strong>SQL Editor</strong>, clique em <strong>+ New Query</strong>, clique no botão <strong>"📋 Copiar Script SQL"</strong> acima, cole no editor do Supabase e clique em <strong>Run</strong>.</li>
          <li>Em <strong>Project Settings → API</strong>, copie a <strong>Project URL</strong> e a chave <strong>anon / public</strong>, cole nos dois campos acima e clique em <strong>"Salvar e Ativar Tempo Real"</strong>. Pronto!</li>
        </ol>
      </div>
    </div>

    <!-- GRADE DE CONFIGURAÇÕES DO TORNEIO -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
      <!-- FORMULÁRIO DADOS DO TORNEIO -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🏆 Dados do Torneio</h3>
        </div>
        <form onsubmit="window.handleSaveTournamentMetadata(event)">
          <div class="form-group">
            <label class="form-label">Nome Oficial do Torneio:</label>
            <input type="text" id="cfg-tourn-nome" class="form-control" value="${tournament.nome}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Local / Arena:</label>
            <input type="text" id="cfg-tourn-local" class="form-control" value="${tournament.local}" required>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label">Data Início:</label>
              <input type="date" id="cfg-tourn-inicio" class="form-control" value="${tournament.dataInicio}">
            </div>
            <div class="form-group">
              <label class="form-label">Hora Início:</label>
              <input type="time" id="cfg-tourn-hora-inicio" class="form-control" value="${tournament.horaInicio || '08:00'}">
            </div>
            <div class="form-group">
              <label class="form-label">Data Fim:</label>
              <input type="date" id="cfg-tourn-fim" class="form-control" value="${tournament.dataFim}">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Tempo Médio Jogo (min):</label>
              <input type="number" id="cfg-tourn-tempo-jogo" class="form-control" value="${tournament.tempoMedioJogoMin || 50}">
            </div>
            <div class="form-group">
              <label class="form-label">Aquecimento (min):</label>
              <input type="number" id="cfg-tourn-tempo-aquec" class="form-control" value="${tournament.tempoAquecimentoMin || 10}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Status do Torneio:</label>
            <select id="cfg-tourn-status" class="form-select">
              <option value="rascunho" ${tournament.status === 'rascunho' ? 'selected' : ''}>Rascunho</option>
              <option value="ativo" ${tournament.status === 'ativo' ? 'selected' : ''}>Ativo (Em Disputa)</option>
              <option value="encerrado" ${tournament.status === 'encerrado' ? 'selected' : ''}>Encerrado</option>
            </select>
          </div>

          <button type="submit" class="btn btn-primary mt-2">Salvar Informações</button>
        </form>
      </div>

      <!-- TABELA DE PONTUAÇÃO CBT EDITÁVEL -->
      <div class="card">
        <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h3 class="card-title">🏅 Tabela de Pontos por Colocação</h3>
            <span style="font-size: 0.75rem; color: #059669; font-weight: 700;">★ Padrão Oficial CBT (1º ao 27º)</span>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-outline btn-sm" onclick="window.handleRestoreDefaultPointsTable()" title="Restaura os valores oficiais padrão CBT (1º: 55 pts até 27º: 1 pt)">Restaurar Padrão Oficial</button>
            <button class="btn btn-primary btn-sm" onclick="window.handleSavePointsTable()">Salvar Pontos</button>
          </div>
        </div>

        <p style="font-size: 0.825rem; color: var(--text-muted); margin-bottom: 0.75rem;">
          Esta pontuação é registrada como <strong>padrão permanente do sistema</strong> (1º: 55 pts até 27º: 1 pt). O ranking geral calcula automaticamente a pontuação das federações com base nestes valores:
        </p>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; max-height: 380px; overflow-y: auto; padding-right: 0.35rem;">
          ${Array.from({ length: 27 }, (_, i) => i + 1).map(pos => `
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-subtle); padding: 0.4rem 0.6rem; border-radius: var(--radius-xs);">
              <span style="font-weight: 700; font-size: 0.8rem;">${pos}º lugar:</span>
              <input type="number" class="form-control points-table-input" style="width: 65px; padding: 0.2rem 0.4rem; font-size: 0.85rem; text-align: center;" data-pos="${pos}" value="${pointsTable[pos] || 0}">
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- SEGUNDA LINHA: CATEGORIAS OFICIAIS DO TORNEIO -->
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">🎾 Categorias Oficiais do Torneio (${categories.length})</h3>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">
            Ative ou desative as categorias participantes da Copa Federações
          </p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 0.75rem;">
        ${categories.map(cat => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border: 1px solid var(--border-light); border-radius: var(--radius-sm); background: #ffffff;">
            <div>
              <strong style="color: var(--accent-dark-blue); font-size: 0.95rem;">${cat.nome}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">${cat.formato}</div>
            </div>

            <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; cursor: pointer; font-weight: 600;">
              <input type="checkbox" ${cat.ativa ? 'checked' : ''} onchange="window.handleToggleCategory('${cat.id}', this.checked)">
              ${cat.ativa ? 'Ativa' : 'Desativada'}
            </label>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
