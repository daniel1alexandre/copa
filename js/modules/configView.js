// Módulo de Configuração do Torneio, Categorias, Tabela de Pontos e Quadras
import { store } from '../data/store.js';
import { toast } from './toast.js';
import { DEFAULT_POINTS_TABLE } from '../data/categories.js';

export function initConfigView() {
  window.handleSaveTournamentMetadata = (e) => {
    e.preventDefault();
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
    store.toggleCategory(catId, checked);
    toast.show({
      title: 'Categoria Atualizada',
      message: `Categoria ${checked ? 'ativada' : 'desativada'}.`,
      type: 'info'
    });
  };

  window.handleSavePointsTable = () => {
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
    store.restoreDefaultPointsTable();
    toast.show({
      title: 'Padrão Oficial CBT Restaurado',
      message: 'A pontuação padrão oficial (1º ao 27º lugar) foi restaurada com sucesso.',
      type: 'success'
    });
    renderConfig();
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

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
      <div>
        <h2 style="font-family: var(--font-display); font-size: 1.6rem; font-weight: 800; color: var(--accent-dark-blue);">
          ⚙️ Configuração do Torneio
        </h2>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          Gerencie regras, dados oficiais do evento, categorias ativas e tabela de pontuação CBT
        </p>
      </div>


    </div>

    <!-- GRADE DE CONFIGURAÇÕES -->
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
            <span style="font-size: 0.75rem; color: var(--accent-emerald); font-weight: 700;">★ Padrão Oficial CBT (1º ao 27º)</span>
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
