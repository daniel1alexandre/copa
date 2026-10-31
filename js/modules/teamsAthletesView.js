// Módulo de Atletas Inscritos por Estado (Copa das Federações 2026 - CBT / Tênis Integrado)
import { store } from '../data/store.js';
import { toast } from './toast.js';

let selectedStateId = 'sp'; // Estado inicialmente selecionado (São Paulo)
let searchFilter = '';
let categoryFilter = ''; // Filtro por categoria específica

export function initTeamsAthletesView() {
  window.selectAthleteState = (fedId) => {
    selectedStateId = fedId;
    renderTeamsAthletes();
  };

  window.handleAthleteSearch = (val) => {
    searchFilter = (val || '').toLowerCase().trim();
    renderTeamsAthletes();
  };

  window.handleAthleteCategoryFilter = (catId) => {
    categoryFilter = catId || '';
    renderTeamsAthletes();
  };

  window.openNewAthleteModal = () => {
    renderAthleteFormModal(null, selectedStateId);
  };

  window.openEditAthleteModal = (id) => {
    const ath = store.getAthletes().find(a => a.id === id);
    if (ath) renderAthleteFormModal(ath, ath.equipe_id);
  };

  window.handleDeleteAthlete = (id) => {
    const ath = store.getAthletes().find(a => a.id === id);
    if (!ath) return;
    if (confirm(`Tem certeza que deseja remover o atleta "${ath.nome}" da lista oficial?`)) {
      store.deleteAthlete(id);
      toast.show({ title: 'Atleta Removido', message: `${ath.nome} foi removido do cadastro.`, type: 'warning' });
      renderTeamsAthletes();
    }
  };

  window.openTenisIntegraModal = () => {
    renderTenisIntegraModal(selectedStateId);
  };

  window.restoreOfficialCBTList = () => {
    if (confirm('Deseja restaurar a relação oficial completa de atletas do Tênis Integrado CBT 2026 para todas as 27 federações? Todas as convocações oficiais serão recarregadas.')) {
      store.resetAthletesToOfficialCBT();
      toast.show({
        title: 'Base CBT Restaurada',
        message: 'Relação completa de atletas do Tênis Integrado CBT 2026 carregada com sucesso!',
        type: 'success'
      });
      renderTeamsAthletes();
    }
  };
}

export function renderTeamsAthletes() {
  const container = document.getElementById('view-atletas') || document.getElementById('view-cadastro');
  if (!container) return;

  const feds = store.getFederations();
  const allAthletes = store.getAthletes();
  const categories = store.getActiveCategories();
  const isAdmin = window.auth && typeof window.auth.isAdmin === 'function' && window.auth.isAdmin();

  // Garante que o estado selecionado seja válido
  const currentFed = feds.find(f => f.id === selectedStateId) || feds[0];
  if (currentFed && selectedStateId !== currentFed.id) {
    selectedStateId = currentFed.id;
  }

  // Atletas do estado selecionado
  const stateAthletes = allAthletes.filter(a => a.equipe_id === selectedStateId);

  // Aplica filtros de busca e categoria sobre os atletas do estado selecionado
  let filteredAthletes = stateAthletes;
  if (searchFilter) {
    filteredAthletes = filteredAthletes.filter(a => 
      a.nome.toLowerCase().includes(searchFilter) ||
      (a.cbt_id && a.cbt_id.toLowerCase().includes(searchFilter))
    );
  }
  if (categoryFilter) {
    filteredAthletes = filteredAthletes.filter(a => 
      Array.isArray(a.categorias) && a.categorias.includes(categoryFilter)
    );
  }

  // Contagem por categoria no estado selecionado
  const catCounts = {};
  categories.forEach(cat => { catCounts[cat.id] = 0; });
  stateAthletes.forEach(ath => {
    if (Array.isArray(ath.categorias)) {
      ath.categorias.forEach(cId => {
        catCounts[cId] = (catCounts[cId] || 0) + 1;
      });
    }
  });

  container.innerHTML = `
    <!-- CABEÇALHO DO MENU ATLETAS -->
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
      <div>
        <div style="display: inline-flex; align-items: center; gap: 0.4rem; background: #028090; color: white; padding: 0.2rem 0.65rem; border-radius: var(--radius-full); font-size: 0.72rem; font-weight: 800; text-transform: uppercase;">
          🎾 CBT • Tênis Integrado
        </div>
        <h2 style="font-family: var(--font-display); font-size: 1.55rem; font-weight: 900; color: var(--accent-dark-blue); margin: 0.35rem 0 0.15rem 0;">
          👤 Relação de Atletas Inscritos por Estado
        </h2>
        <p style="color: var(--text-muted); font-size: 0.875rem; margin: 0;">
          Copa das Federações de Beach Tennis 2026 • Lista oficial de atletas convocados e inscritos pela CBT via <strong>Tênis Integrado</strong>.
        </p>
      </div>

      <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="window.openTenisIntegraModal()" style="background: #028090; border-color: #028090; font-weight: 800; font-size: 0.85rem; padding: 0.5rem 0.95rem; display: inline-flex; align-items: center; gap: 0.45rem;">
          📥 Importar do Tênis Integrado (CBT)
        </button>

        <button class="btn btn-outline" onclick="window.restoreOfficialCBTList()" style="font-weight: 700; font-size: 0.85rem; padding: 0.5rem 0.9rem;" title="Recarregar relação completa oficial de atletas de todos os estados">
          ⚡ Restaurar Base CBT 2026
        </button>

        ${isAdmin ? `
          <button class="btn btn-outline" onclick="window.openNewAthleteModal()" style="font-weight: 700; font-size: 0.85rem; padding: 0.5rem 0.9rem; background: #ffffff;">
            ➕ Novo Atleta
          </button>
        ` : ''}
      </div>
    </div>

    <!-- SELETOR VISUAL DOS 27 ESTADOS (GRADE COMPACTA) -->
    <div class="card" style="padding: 1rem 1.15rem; margin-bottom: 1.25rem; border: 1.5px solid var(--border-light); background: #ffffff;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <span style="font-size: 0.85rem; font-weight: 800; color: var(--accent-dark-blue); text-transform: uppercase; letter-spacing: 0.04em;">
          🇧🇷 Escolha o Estado para visualizar os atletas inscritos:
        </span>
        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">
          Total no Torneio: <strong>${allAthletes.length} atletas</strong> em <strong>27 Federações</strong>
        </span>
      </div>

      <div class="athlete-state-selector-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(105px, 1fr)); gap: 0.5rem; max-height: 180px; overflow-y: auto; padding-right: 0.25rem;">
        ${feds.map(f => {
          const isSelected = f.id === selectedStateId;
          const count = allAthletes.filter(a => a.equipe_id === f.id).length;
          return `
            <button type="button" 
                    onclick="window.selectAthleteState('${f.id}')"
                    class="athlete-state-pill ${isSelected ? 'active' : ''}"
                    style="display: flex; align-items: center; gap: 0.45rem; padding: 0.45rem 0.55rem; border-radius: var(--radius-sm); border: 2px solid ${isSelected ? '#028090' : '#e2e8f0'}; background: ${isSelected ? '#f0fdfa' : '#ffffff'}; cursor: pointer; text-align: left; transition: all 0.15s ease; box-shadow: ${isSelected ? '0 2px 6px rgba(2, 128, 144, 0.22)' : 'none'};">
              <img src="assets/federations/${f.id}.jpg" alt="${f.uf}" 
                   onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${f.id}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${f.id}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" 
                   style="width: 24px; height: 18px; border-radius: 2px; object-fit: contain; background: #ffffff; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.12);">
              <div style="min-width: 0; overflow: hidden; line-height: 1.15;">
                <div style="font-weight: 900; font-size: 0.85rem; color: ${isSelected ? '#004b57' : 'var(--text-main)'};">${f.uf}</div>
                <div style="font-size: 0.68rem; font-weight: 700; color: ${isSelected ? '#028090' : 'var(--text-muted)'}; white-space: nowrap;">${count} atletas</div>
              </div>
            </button>
          `;
        }).join('')}
      </div>
    </div>

    <!-- BANNER DE DESTAQUE DO ESTADO SELECIONADO -->
    <div class="card" style="margin-bottom: 1.25rem; border: 2px solid #028090; background: linear-gradient(135deg, #f0fdfa 0%, #ffffff 70%); padding: 1.25rem; box-shadow: var(--shadow-sm);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        
        <div style="display: flex; align-items: center; gap: 1.15rem;">
          <img src="assets/federations/${currentFed.id}.jpg" alt="${currentFed.uf}" 
               onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${currentFed.id}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${currentFed.id}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" 
               style="width: 64px; height: 46px; border-radius: 6px; object-fit: contain; background: #ffffff; padding: 3px; border: 1.5px solid #99f6e4; box-shadow: 0 3px 8px rgba(0,0,0,0.12); flex-shrink: 0;">
          <div>
            <div style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; font-weight: 800; color: #028090; text-transform: uppercase;">
              <span>Região ${currentFed.regiao || 'Brasil'}</span> • <span>UF: ${currentFed.uf}</span>
              ${currentFed.seed ? `• <span style="background: #fef3c7; color: #b45309; padding: 0.1rem 0.4rem; border-radius: 4px;">Seed #${currentFed.seed}</span>` : ''}
            </div>
            <h3 style="font-family: var(--font-display); font-size: 1.35rem; font-weight: 900; color: #004b57; margin: 0.2rem 0;">
              ${currentFed.nome} (${currentFed.uf})
            </h3>
            <div style="font-size: 0.85rem; color: #0f766e; font-weight: 700;">
              👥 <strong>${stateAthletes.length} atletas inscritos</strong> representando ${currentFed.nome} na Copa das Federações 2026 CBT.
            </div>
          </div>
        </div>

        <!-- RESUMO POR CATEGORIA DO ESTADO SELECIONADO -->
        <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; max-width: 520px; justify-content: flex-end;">
          ${categories.map(cat => {
            const count = catCounts[cat.id] || 0;
            if (count === 0) return '';
            return `
              <span style="font-size: 0.72rem; font-weight: 800; background: #ccfbf1; color: #0f766e; border: 1px solid #99f6e4; padding: 0.25rem 0.55rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.25rem;">
                <strong>${cat.nome}:</strong> ${count}
              </span>
            `;
          }).join('')}
        </div>

      </div>
    </div>

    <!-- BARRA DE FILTROS DO ESTADO (BUSCA & CATEGORIA) -->
    <div class="card" style="padding: 0.85rem 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; background: #ffffff;">
      <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 260px;">
        <input type="text" 
               id="athlete-search-input" 
               class="form-control" 
               style="font-size: 0.88rem; padding: 0.45rem 0.75rem;"
               placeholder="🔍 Buscar atleta por nome ou número CBT em ${currentFed.uf}..." 
               value="${searchFilter}" 
               oninput="window.handleAthleteSearch(this.value)">
      </div>

      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin: 0;">Filtrar Categoria:</label>
        <select class="form-select" style="font-size: 0.85rem; font-weight: 700; padding: 0.45rem 0.75rem; width: auto;" onchange="window.handleAthleteCategoryFilter(this.value)">
          <option value="">Todas as Categorias (${stateAthletes.length})</option>
          ${categories.map(cat => {
            const cCount = catCounts[cat.id] || 0;
            return `<option value="${cat.id}" ${cat.id === categoryFilter ? 'selected' : ''}>${cat.nome} (${cCount})</option>`;
          }).join('')}
        </select>
      </div>
    </div>

    <!-- LISTAGEM DE ATLETAS DO ESTADO SELECIONADO -->
    <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--border-light); background: #ffffff; box-shadow: var(--shadow-sm);">
      <div style="padding: 0.85rem 1.15rem; background: var(--bg-subtle); border-bottom: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between;">
        <strong style="font-size: 0.9rem; color: var(--accent-dark-blue);">
          Atletas de ${currentFed.nome} (${filteredAthletes.length} exibidos)
        </strong>
        <span style="font-size: 0.75rem; color: #059669; font-weight: 700; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 0.15rem 0.5rem; border-radius: 4px;">
          ✓ Sincronizado com Tênis Integrado CBT
        </span>
      </div>

      ${filteredAthletes.length === 0 ? `
        <div style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👥</div>
          <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--accent-dark-blue); margin-bottom: 0.35rem;">
            Nenhum atleta encontrado para ${currentFed.nome} (${currentFed.uf})
          </h4>
          <p style="font-size: 0.85rem; max-width: 500px; margin: 0 auto 1.25rem auto;">
            ${searchFilter || categoryFilter 
              ? 'Tente ajustar os filtros de busca ou selecionar outra categoria.' 
              : 'Esta federação ainda não possui atletas importados. Clique no botão abaixo para colar a lista do Tênis Integrado ou carregar a base oficial CBT.'}
          </p>
          <div style="display: flex; justify-content: center; gap: 0.5rem;">
            <button class="btn btn-primary btn-sm" onclick="window.openTenisIntegraModal()">
              📥 Importar do Tênis Integrado
            </button>
            <button class="btn btn-outline btn-sm" onclick="window.restoreOfficialCBTList()">
              ⚡ Restaurar Base Oficial CBT
            </button>
          </div>
        </div>
      ` : `
        <div style="overflow-x: auto;">
          <table class="custom-table" style="margin: 0; width: 100%;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="width: 50px; text-align: center;">#</th>
                <th>Nome do Atleta</th>
                <th>Registro / CBT</th>
                <th>Categorias Convocadas / Inscritas</th>
                <th>Federação / Estado</th>
                <th>Status no Tênis Integrado</th>
                ${isAdmin ? '<th style="text-align: right;">Ações</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${filteredAthletes.map((ath, idx) => {
                const initials = ath.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                return `
                  <tr style="transition: background 0.15s ease;">
                    <td style="text-align: center; color: var(--text-muted); font-weight: 700; font-size: 0.8rem;">
                      ${idx + 1}
                    </td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.65rem;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #028090 0%, #004b57 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.75rem; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">
                          ${initials}
                        </div>
                        <div>
                          <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                            <span style="font-weight: 800; font-size: 0.92rem; color: var(--accent-dark-blue);">
                              ${ath.nome}
                            </span>
                            ${ath.funcao === 'Capitão' ? `
                              <span style="font-size: 0.68rem; font-weight: 800; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 0.1rem 0.4rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.2rem;">
                                👑 Capitão
                              </span>
                            ` : ''}
                          </div>
                          <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.4rem;">
                            ${ath.idade ? `<span>${ath.idade} anos</span>` : ''}
                            ${ath.ranking ? `<span>• Ranking CBT: <strong>${ath.ranking}</strong></span>` : ''}
                            ${ath.genero ? `<span>• ${ath.genero === 'F' ? 'Feminino' : 'Masculino'}</span>` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style="font-family: monospace; font-size: 0.78rem; font-weight: 700; background: #f1f5f9; padding: 0.2rem 0.5rem; border-radius: 4px; color: #334155;">
                        ${ath.cbt_id || `CBT-${ath.id.replace(/\D/g, '').slice(-5) || 'OFICIAL'}`}
                      </span>
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                        ${(ath.categorias || []).map(cId => {
                          const catObj = categories.find(c => c.id === cId);
                          const cName = catObj?.nome || cId;
                          let badgeBg = '#e0f2fe';
                          let badgeColor = '#0369a1';
                          let badgeBorder = '#bae6fd';
                          if (cId === 'prof') {
                            badgeBg = '#fef3c7'; badgeColor = '#b45309'; badgeBorder = '#fde68a';
                          } else if (cId.startsWith('sub')) {
                            badgeBg = '#dcfce7'; badgeColor = '#15803d'; badgeBorder = '#bbf7d0';
                          } else if (cId.startsWith('master')) {
                            badgeBg = '#f3e8ff'; badgeColor = '#7e22ce'; badgeBorder = '#e9d5ff';
                          }
                          return `
                            <span style="font-size: 0.75rem; font-weight: 800; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; padding: 0.15rem 0.5rem; border-radius: 4px;">
                              ${cName}
                            </span>
                          `;
                        }).join('')}
                      </div>
                    </td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.4rem;">
                        <img src="assets/federations/${currentFed.id}.jpg" alt="${currentFed.uf}" 
                             onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${currentFed.id}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${currentFed.id}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" 
                             style="width: 20px; height: 15px; border-radius: 2px; object-fit: contain; background: #ffffff;">
                        <span style="font-size: 0.85rem; font-weight: 700; color: #1e293b;">${currentFed.uf}</span>
                      </div>
                    </td>
                    <td>
                      <span style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; font-weight: 800; color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 0.2rem 0.55rem; border-radius: var(--radius-full);">
                        <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
                        Inscrição Confirmada
                      </span>
                    </td>
                    ${isAdmin ? `
                      <td style="text-align: right; white-space: nowrap;">
                        <button class="btn btn-outline btn-xs" onclick="window.openEditAthleteModal('${ath.id}')" title="Editar Atleta">✏️</button>
                        <button class="btn btn-danger btn-xs" onclick="window.handleDeleteAthlete('${ath.id}')" title="Excluir Atleta">🗑️</button>
                      </td>
                    ` : ''}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// Modal Especial de Importação e Extração do Tênis Integrado CBT
function renderTenisIntegraModal(defaultFedId = 'sp') {
  const overlay = document.getElementById('match-modal-overlay');
  if (!overlay) return;

  const feds = store.getFederations();

  overlay.innerHTML = `
    <div class="modal-dialog" style="max-width: 720px; width: 95vw;">
      <div class="modal-header" style="background: linear-gradient(135deg, #091b2c 0%, #004b57 100%); color: white; border-top-left-radius: var(--radius-lg); border-top-right-radius: var(--radius-lg);">
        <div>
          <h3 style="color: white; font-size: 1.15rem; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            📥 Importador Tênis Integrado CBT 2026
          </h3>
          <p style="font-size: 0.8rem; color: rgba(255,255,255,0.85); margin-top: 0.2rem; margin-bottom: 0;">
            Extraia ou cole a relação de atletas inscritos diretamente do portal oficial CBT (tenisintegrado.com.br).
          </p>
        </div>
        <button class="modal-close-btn" style="color: white;" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">&times;</button>
      </div>

      <div class="modal-body" style="padding: 1.25rem;">
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.82rem; color: #166534; line-height: 1.45;">
          💡 <strong>Como funciona a importação:</strong><br>
          • Você pode copiar a tabela de inscritos do <strong>Tênis Integrado</strong> e colar diretamente abaixo.<br>
          • Formatos aceitos: <code>Nome \t Federação \t Categoria</code> ou <code>Nome; UF; Categoria</code>.<br>
          • Se colar apenas uma lista de nomes, eles serão atribuídos automaticamente ao estado selecionado abaixo!
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.85rem;">
          <div>
            <label class="form-label" style="font-weight: 700; font-size: 0.82rem;">Estado Padrão de Destino:</label>
            <select id="tenis-import-fed" class="form-select" style="font-weight: 700; font-size: 0.88rem;">
              ${feds.map(f => `<option value="${f.id}" ${f.id === defaultFedId ? 'selected' : ''}>${f.nome} (${f.uf})</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="form-label" style="font-weight: 700; font-size: 0.82rem;">Categoria Padrão (se não especificada):</label>
            <select id="tenis-import-cat" class="form-select" style="font-weight: 700; font-size: 0.88rem;">
              <option value="prof">Profissional</option>
              <option value="cat_a">Categoria A</option>
              <option value="cat_b">Categoria B</option>
              <option value="cat_c">Categoria C</option>
              <option value="sub14">Sub 14</option>
              <option value="sub18">Sub 18</option>
              <option value="master40">+40 Master</option>
              <option value="master50">+50 Master</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 0.75rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
            <label class="form-label" style="font-weight: 700; font-size: 0.82rem; margin: 0;">Cole o texto do Tênis Integrado CBT aqui:</label>
            <button type="button" class="btn btn-outline btn-xs" onclick="window.fillSampleTenisIntegradoText()" style="font-size: 0.72rem;">
              📋 Inserir Exemplo
            </button>
          </div>
          <textarea id="tenis-import-textarea" class="form-control" rows="8" style="font-family: monospace; font-size: 0.8rem; line-height: 1.4;" placeholder="Cole aqui a lista de atletas copiados do Tênis Integrado...&#10;Exemplo:&#10;Daniel Mola; SP; prof&#10;Leonardo Branco; SP; prof&#10;Sophia Chow; SP; prof"></textarea>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted);">
          <span>💡 Linhas de cabeçalho com 'Nome' ou '#' são ignoradas automaticamente.</span>
          <span id="tenis-import-preview-count" style="font-weight: 800; color: #028090;">0 linhas</span>
        </div>
      </div>

      <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
        <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">
          Cancelar
        </button>

        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-primary btn-sm" id="btn-run-tenis-import" style="background: #028090; border-color: #028090; font-weight: 800;">
            📥 Processar e Salvar Atletas
          </button>
        </div>
      </div>
    </div>
  `;

  overlay.classList.add('active');

  const textarea = document.getElementById('tenis-import-textarea');
  const countBadge = document.getElementById('tenis-import-preview-count');
  textarea.addEventListener('input', () => {
    const lines = textarea.value.split('\n').filter(l => l.trim().length > 0);
    countBadge.textContent = `${lines.length} linha(s)`;
  });

  window.fillSampleTenisIntegradoText = () => {
    textarea.value = [
      `# Lista Oficial Tênis Integrado CBT 2026 - Praia da Costa ES`,
      `Daniel Mola\tSP\tProfissional`,
      `Leonardo Branco\tSP\tProfissional`,
      `Hugo Russo\tSP\tProfissional`,
      `Sophia Chow\tSP\tProfissional`,
      `Vitória Marchezini\tSP\tProfissional`,
      `Lucas Fontes\tSP\tCategoria A`,
      `Thiago Pires\tSP\tCategoria B`
    ].join('\n');
    countBadge.textContent = `7 atleta(s) no exemplo`;
  };

  document.getElementById('btn-run-tenis-import').addEventListener('click', () => {
    const text = textarea.value.trim();
    const fedId = document.getElementById('tenis-import-fed').value;

    if (!text) {
      alert('Por favor, cole ao menos um atleta no campo de texto.');
      return;
    }

    const lines = text.split('\n');
    const res = store.bulkImportAthletes(lines, fedId);

    toast.show({
      title: 'Importação Tênis Integrado',
      message: `${res.imported} atletas foram processados e salvos com sucesso no sistema!`,
      type: 'success'
    });

    overlay.classList.remove('active');
    selectedStateId = fedId;
    renderTeamsAthletes();
  });
}

// Modal de Formulário Manual de Atleta
function renderAthleteFormModal(athlete = null, defaultFedId = 'sp') {
  const overlay = document.getElementById('match-modal-overlay');
  if (!overlay) return;

  const feds = store.getFederations();
  const categories = store.getActiveCategories();
  const isEditing = Boolean(athlete);

  overlay.innerHTML = `
    <div class="modal-dialog" style="max-width: 520px;">
      <div class="modal-header">
        <h3>${isEditing ? '✏️ Editar Atleta' : '➕ Novo Atleta (Tênis Integrado)'}</h3>
        <button class="modal-close-btn" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">&times;</button>
      </div>
      <div class="modal-body">
        <form id="athlete-form">
          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label" style="font-weight: 700; font-size: 0.85rem;">Nome Completo do Atleta:</label>
            <input type="text" id="ath-form-nome" class="form-control" required value="${athlete?.nome || ''}" placeholder="Ex: Daniel Mola">
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label" style="font-weight: 700; font-size: 0.85rem;">Registro / Código CBT (Tênis Integrado):</label>
            <input type="text" id="ath-form-cbt" class="form-control" value="${athlete?.cbt_id || ''}" placeholder="Ex: CBT-14820">
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label" style="font-weight: 700; font-size: 0.85rem;">Federação Estadual Representada:</label>
            <select id="ath-form-equipe" class="form-select" required style="font-weight: 700;">
              ${feds.map(f => `
                <option value="${f.id}" ${(athlete?.equipe_id || defaultFedId) === f.id ? 'selected' : ''}>${f.nome} (${f.uf})</option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-weight: 700; font-size: 0.85rem;">Categorias Inscritas / Convocadas:</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; max-height: 180px; overflow-y: auto; padding: 0.6rem; border: 1.5px solid var(--border-light); border-radius: var(--radius-sm); background: #f8fafc;">
              ${categories.map(cat => `
                <label style="display: flex; align-items: center; gap: 0.45rem; font-size: 0.82rem; font-weight: 600; cursor: pointer;">
                  <input type="checkbox" name="ath-cat" value="${cat.id}" ${athlete?.categorias?.includes(cat.id) ? 'checked' : (cat.id === 'prof' && !athlete ? 'checked' : '')}>
                  ${cat.nome}
                </label>
              `).join('')}
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">Cancelar</button>
        <button type="button" class="btn btn-primary btn-sm" id="btn-save-athlete" style="background: #028090; border-color: #028090; font-weight: 800;">Salvar Atleta</button>
      </div>
    </div>
  `;

  overlay.classList.add('active');

  document.getElementById('btn-save-athlete').addEventListener('click', () => {
    const nome = document.getElementById('ath-form-nome').value.trim();
    const cbt_id = document.getElementById('ath-form-cbt').value.trim();
    const equipe_id = document.getElementById('ath-form-equipe').value;
    const catCheckboxes = document.querySelectorAll('input[name="ath-cat"]:checked');
    const categorias = Array.from(catCheckboxes).map(c => c.value);

    if (!nome) {
      alert('Por favor, informe o nome do atleta.');
      return;
    }

    if (categorias.length === 0) {
      alert('Selecione ao menos uma categoria.');
      return;
    }

    if (isEditing) {
      store.updateAthlete(athlete.id, { nome, cbt_id, equipe_id, categorias });
      toast.show({ title: 'Atleta Atualizado', message: `${nome} foi atualizado com sucesso.`, type: 'success' });
    } else {
      store.addAthlete({ nome, cbt_id, equipe_id, categorias });
      toast.show({ title: 'Atleta Inscrito', message: `${nome} cadastrado na federação ${equipe_id.toUpperCase()}.`, type: 'success' });
    }

    overlay.classList.remove('active');
    selectedStateId = equipe_id;
    renderTeamsAthletes();
  });
}
