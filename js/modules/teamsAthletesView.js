// Módulo de Cadastro (Federações Estaduais e Atletas)
import { store } from '../data/store.js';
import { toast } from './toast.js';

let activeCadastroTab = 'atletas'; // 'atletas' | 'federacoes'
let searchFilter = '';
let teamFilter = '';

export function initTeamsAthletesView() {
  window.switchCadastroTab = (tab) => {
    activeCadastroTab = tab;
    renderTeamsAthletes();
  };

  window.handleFilterCadastro = () => {
    searchFilter = document.getElementById('search-cadastro-input')?.value.toLowerCase() || '';
    teamFilter = document.getElementById('filter-team-select')?.value || '';
    renderTeamsAthletes();
  };

  window.openNewAthleteModal = () => {
    renderAthleteFormModal(null);
  };

  window.openEditAthleteModal = (id) => {
    const ath = store.getAthletes().find(a => a.id === id);
    if (ath) renderAthleteFormModal(ath);
  };

  window.handleDeleteAthlete = (id) => {
    if (confirm('Tem certeza que deseja remover este atleta?')) {
      store.deleteAthlete(id);
      toast.show({ title: 'Atleta Removido', message: 'O registro foi excluído.', type: 'warning' });
      renderTeamsAthletes();
    }
  };

  window.openBulkImportAthletesModal = () => {
    renderBulkImportModal();
  };
}

export function renderTeamsAthletes() {
  const container = document.getElementById('view-cadastro');
  if (!container) return;

  const feds = store.getFederations();
  const athletes = store.getAthletes();
  const categories = store.getActiveCategories();

  container.innerHTML = `
    <!-- HEADER DO CADASTRO -->
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
      <div style="display: flex; background: var(--bg-subtle); padding: 0.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-light);">
        <button class="schedule-tab-btn ${activeCadastroTab === 'atletas' ? 'active' : ''}" onclick="window.switchCadastroTab('atletas')">
          👤 Atletas Inscritos (${athletes.length})
        </button>
        <button class="schedule-tab-btn ${activeCadastroTab === 'federacoes' ? 'active' : ''}" onclick="window.switchCadastroTab('federacoes')">
          🏛️ 27 Federações Estaduais (${feds.length})
        </button>
      </div>

      <div style="display: flex; gap: 0.75rem;">
        <button class="btn btn-outline" onclick="window.openBulkImportAthletesModal()">
          📥 Importação em Massa (CSV/Texto)
        </button>
        <button class="btn btn-primary" onclick="window.openNewAthleteModal()">
          ➕ Novo Atleta
        </button>
      </div>
    </div>

    <!-- ÁREA DE FILTROS -->
    <div class="card" style="padding: 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 280px;">
        <input type="text" id="search-cadastro-input" class="form-control" placeholder="Buscar por nome de atleta ou estado..." value="${searchFilter}" oninput="window.handleFilterCadastro()">
      </div>

      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <select id="filter-team-select" class="form-select" onchange="window.handleFilterCadastro()">
          <option value="">Todas as Federações</option>
          ${feds.map(f => `<option value="${f.id}" ${f.id === teamFilter ? 'selected' : ''}>${f.nome} (${f.uf})</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- CONTEÚDO ATLETA OU FEDERAÇÕES -->
    ${activeCadastroTab === 'atletas' 
      ? renderAthletesTable(athletes, feds, categories) 
      : renderFederationsGrid(feds)}
  `;
}

function renderAthletesTable(athletes, feds, categories) {
  let list = athletes;
  if (searchFilter) {
    list = list.filter(a => a.nome.toLowerCase().includes(searchFilter));
  }
  if (teamFilter) {
    list = list.filter(a => a.equipe_id === teamFilter);
  }

  return `
    <div class="card" style="padding: 0; overflow: hidden;">
      <table class="custom-table">
        <thead>
          <tr>
            <th>Nome do Atleta</th>
            <th>Federação Representada</th>
            <th>Categorias Inscritas</th>
            <th>Status de Validação</th>
            <th style="text-align: right;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${list.length === 0 ? `
            <tr>
              <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                Nenhum atleta encontrado para os critérios de busca.
              </td>
            </tr>
          ` : list.map(ath => {
            const fed = feds.find(f => f.id === ath.equipe_id);
            
            // Validação de conflito: não pode jogar por duas equipes na mesma categoria
            let hasConflict = false;
            let conflictMsg = '';
            for (const cat of ath.categorias) {
              const check = store.checkAthleteConflict(ath.nome, ath.equipe_id, cat, ath.id);
              if (check.hasConflict) {
                hasConflict = true;
                conflictMsg = check.message;
                break;
              }
            }

            return `
              <tr>
                <td><strong>${ath.nome}</strong></td>
                <td>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    ${fed ? `<img src="assets/federations/${fed.id}.jpg" alt="${fed.uf}" style="width: 22px; height: 15px; border-radius: 2px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2);">` : ''}
                    <span>${fed ? `${fed.nome} (${fed.uf})` : '-'}</span>
                  </div>
                </td>
                <td>
                  <div style="display: flex; gap: 0.3rem; flex-wrap: wrap;">
                    ${ath.categorias.map(cId => {
                      const cName = categories.find(c => c.id === cId)?.nome || cId;
                      return `<span style="font-size: 0.75rem; background: var(--bg-subtle); padding: 0.15rem 0.45rem; border-radius: var(--radius-xs); border: 1px solid var(--border-light);">${cName}</span>`;
                    }).join('')}
                  </div>
                </td>
                <td>
                  ${hasConflict ? `
                    <span class="badge-status" style="background: #fee2e2; color: #dc2626; border-color: #fca5a5;" title="${conflictMsg}">
                      ⚠️ Conflito de Categoria
                    </span>
                  ` : `
                    <span class="badge-status encerrado">
                      ✓ Regular (OK)
                    </span>
                  `}
                </td>
                <td style="text-align: right;">
                  <button class="btn btn-outline btn-sm" onclick="window.openEditAthleteModal('${ath.id}')">✏️ Editar</button>
                  <button class="btn btn-danger btn-sm" onclick="window.handleDeleteAthlete('${ath.id}')">🗑️</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderFederationsGrid(feds) {
  let list = feds;
  if (searchFilter) {
    list = list.filter(f => f.nome.toLowerCase().includes(searchFilter) || f.sigla.toLowerCase().includes(searchFilter) || f.uf.toLowerCase().includes(searchFilter));
  }

  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem;">
      ${list.map(f => `
        <div class="card" style="display: flex; align-items: flex-start; gap: 1rem;">
          <img src="assets/federations/${f.id}.jpg" alt="${f.uf}" style="width: 52px; height: 36px; border-radius: var(--radius-xs); object-fit: contain; box-shadow: 0 2px 6px rgba(0,0,0,0.2); border: 1px solid var(--border-light); flex-shrink: 0;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <strong style="font-size: 1rem; color: var(--accent-dark-blue);">${f.nome} (${f.uf})</strong>
              ${f.seed ? `<span class="badge-status em_espera" style="background: #fef3c7; color: #b45309;">Seed #${f.seed}</span>` : ''}
            </div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">Federação Estadual • ${f.uf}</p>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.6rem; font-size: 0.75rem; color: var(--text-muted);">
              <span>Região: <strong>${f.regiao}</strong></span> • 
              <span>UF: <strong>${f.uf}</strong></span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Modal de Formulário de Atleta
function renderAthleteFormModal(athlete = null) {
  const overlay = document.getElementById('match-modal-overlay');
  if (!overlay) return;

  const feds = store.getFederations();
  const categories = store.getActiveCategories();
  const isEditing = Boolean(athlete);

  overlay.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>${isEditing ? '✏️ Editar Atleta' : '➕ Novo Atleta'}</h3>
        <button class="modal-close-btn" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">&times;</button>
      </div>
      <div class="modal-body">
        <form id="athlete-form">
          <div class="form-group">
            <label class="form-label">Nome Completo do Atleta:</label>
            <input type="text" id="ath-form-nome" class="form-control" required value="${athlete?.nome || ''}" placeholder="Ex: Lucas Guimarães">
          </div>

          <div class="form-group">
            <label class="form-label">Federação Estadual Representada:</label>
            <select id="ath-form-equipe" class="form-select" required>
              ${feds.map(f => `
                <option value="${f.id}" ${athlete?.equipe_id === f.id ? 'selected' : ''}>${f.nome} (${f.uf})</option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Categorias Inscritas:</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; max-height: 180px; overflow-y: auto; padding: 0.5rem; border: 1px solid var(--border-light); border-radius: var(--radius-sm);">
              ${categories.map(cat => `
                <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; cursor: pointer;">
                  <input type="checkbox" name="ath-cat" value="${cat.id}" ${athlete?.categorias?.includes(cat.id) ? 'checked' : ''}>
                  ${cat.nome}
                </label>
              `).join('')}
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">Cancelar</button>
        <button type="button" class="btn btn-primary" id="btn-save-athlete">Salvar Atleta</button>
      </div>
    </div>
  `;

  overlay.classList.add('active');

  document.getElementById('btn-save-athlete').addEventListener('click', () => {
    const nome = document.getElementById('ath-form-nome').value.trim();
    const equipe_id = document.getElementById('ath-form-equipe').value;
    const catCheckboxes = document.querySelectorAll('input[name="ath-cat"]:checked');
    const categorias = Array.from(catCheckboxes).map(c => c.value);

    if (!nome) {
      alert('Por favor, digite o nome do atleta.');
      return;
    }

    if (categorias.length === 0) {
      alert('Selecione pelo menos uma categoria para o atleta.');
      return;
    }

    // Validação de conflito
    for (const cat of categorias) {
      const conflict = store.checkAthleteConflict(nome, equipe_id, cat, athlete?.id);
      if (conflict.hasConflict) {
        if (!confirm(`Atenção: ${conflict.message}\nDeseja continuar mesmo assim?`)) {
          return;
        }
        break;
      }
    }

    if (isEditing) {
      store.updateAthlete(athlete.id, { nome, equipe_id, categorias });
      toast.show({ title: 'Atleta Atualizado', message: `${nome} foi atualizado com sucesso.`, type: 'success' });
    } else {
      store.addAthlete({ nome, equipe_id, categorias });
      toast.show({ title: 'Atleta Cadastrado', message: `${nome} inscrito na federação.`, type: 'success' });
    }

    overlay.classList.remove('active');
    renderTeamsAthletes();
  });
}

// Modal de Importação em Massa (CSV ou Colar Lista)
function renderBulkImportModal() {
  const overlay = document.getElementById('match-modal-overlay');
  if (!overlay) return;

  const feds = store.getFederations();

  overlay.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>📥 Importação em Massa de Atletas</h3>
        <button class="modal-close-btn" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">&times;</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
          Cole linhas com os dados dos atletas no formato:<br>
          <code>Nome do Atleta; Sigla da Federação ou UF; Categorias (opcional)</code><br>
          <em>Exemplo:<br>
          João Silva; FPT; prof, cat_a<br>
          Maria Souza; RJ; prof<br>
          Carlos Pereira; PR; cat_b</em>
        </p>

        <div class="form-group">
          <label class="form-label">Federação Padrão (caso a linha não informe):</label>
          <select id="bulk-default-fed" class="form-select">
            ${feds.map(f => `<option value="${f.id}">${f.nome} (${f.uf})</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Cole a lista aqui (uma linha por atleta):</label>
          <textarea id="bulk-athletes-text" class="form-control" rows="8" placeholder="João Silva; SP; prof&#10;Maria Santos; RJ; prof, cat_a"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">Cancelar</button>
        <button type="button" class="btn btn-primary" id="btn-process-bulk-import">Processar Importação</button>
      </div>
    </div>
  `;

  overlay.classList.add('active');

  document.getElementById('btn-process-bulk-import').addEventListener('click', () => {
    const text = document.getElementById('bulk-athletes-text').value.trim();
    const defaultFedId = document.getElementById('bulk-default-fed').value;

    if (!text) {
      alert('Cole ao menos uma linha de texto.');
      return;
    }

    const lines = text.split('\n');
    const res = store.bulkImportAthletes(lines, defaultFedId);

    toast.show({
      title: 'Importação Concluída',
      message: `${res.imported} atletas importados com sucesso!`,
      type: 'success'
    });

    overlay.classList.remove('active');
    renderTeamsAthletes();
  });
}
