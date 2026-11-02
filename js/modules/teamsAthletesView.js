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
    if (!catId || categoryFilter === catId) {
      categoryFilter = '';
    } else {
      categoryFilter = catId;
    }
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
    if (confirm('Deseja importar a relação oficial completa de 2.128 atletas da Copa das Federações 2026 (CBT / Tênis Integrado) para todas as 27 federações?')) {
      store.resetAthletesToOfficialCBT();
      toast.show({
        title: 'Relação de Atletas Importada',
        message: '2.128 atletas oficiais do Tênis Integrado CBT 2026 carregados com sucesso!',
        type: 'success'
      });
      renderTeamsAthletes();
    }
  };
}

export function renderTeamsAthletes() {
  const container = document.getElementById('view-atletas') || document.getElementById('view-cadastro');
  if (!container) return;

  const wasSearching = (typeof document !== 'undefined' && document.activeElement && document.activeElement.id === 'athlete-search-input');

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
  const stateCaptains = stateAthletes.filter(a => a.funcao === 'Capitão' || a.is_capitao === true);

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
        <button class="btn btn-primary" onclick="window.restoreOfficialCBTList()" style="background: #028090; border-color: #028090; font-weight: 800; font-size: 0.85rem; padding: 0.5rem 0.95rem; display: inline-flex; align-items: center; gap: 0.45rem;" title="Importar relação oficial completa de 2.128 atletas da Copa das Federações 2026 CBT">
          📥 Importar Relação de Atletas
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
              👥 <strong>${stateAthletes.length} atletas inscritos</strong> 
              <span style="font-size: 0.78rem; color: #047857; background: #ccfbf1; padding: 0.1rem 0.5rem; border-radius: 4px; margin-left: 0.35rem; border: 1px solid #99f6e4;">
                👩 ${stateAthletes.filter(a => String(a.genero || '').toUpperCase().startsWith('F')).length} mulheres • 👨 ${stateAthletes.filter(a => !String(a.genero || '').toUpperCase().startsWith('F')).length} homens
              </span>
              representando ${currentFed.nome} na Copa das Federações 2026 CBT.
            </div>
          </div>
        </div>

        <!-- CARDS DE FILTRO POR CATEGORIA (CLICÁVEIS) COM CARD 'TODOS' -->
        <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; max-width: 580px; justify-content: flex-end; align-items: center;">
          <button type="button" 
                  onclick="window.handleAthleteCategoryFilter('')"
                  style="font-size: 0.74rem; font-weight: 800; padding: 0.35rem 0.65rem; border-radius: 6px; cursor: pointer; transition: all 0.15s ease; display: inline-flex; align-items: center; gap: 0.25rem; border: 1.5px solid ${!categoryFilter ? '#004b57' : '#99f6e4'}; background: ${!categoryFilter ? '#028090' : '#ffffff'}; color: ${!categoryFilter ? '#ffffff' : '#0f766e'}; box-shadow: ${!categoryFilter ? '0 2px 6px rgba(2, 128, 144, 0.3)' : 'none'};"
                  title="Exibir todos os atletas inscritos de ${currentFed.uf}">
            <strong>Todos:</strong> ${stateAthletes.length}
          </button>
          ${categories.map(cat => {
            const count = catCounts[cat.id] || 0;
            if (count === 0) return '';
            const isActive = categoryFilter === cat.id;
            return `
              <button type="button" 
                      onclick="window.handleAthleteCategoryFilter('${cat.id}')"
                      style="font-size: 0.74rem; font-weight: 800; padding: 0.35rem 0.65rem; border-radius: 6px; cursor: pointer; transition: all 0.15s ease; display: inline-flex; align-items: center; gap: 0.25rem; border: 1.5px solid ${isActive ? '#004b57' : '#99f6e4'}; background: ${isActive ? '#028090' : '#ffffff'}; color: ${isActive ? '#ffffff' : '#0f766e'}; box-shadow: ${isActive ? '0 2px 6px rgba(2, 128, 144, 0.3)' : 'none'};"
                      title="Filtrar apenas atletas da categoria ${cat.nome}">
                <strong>${cat.nome}:</strong> ${count}
              </button>
            `;
          }).join('')}
        </div>

      </div>
    </div>

    <!-- LISTAGEM DE ATLETAS DO ESTADO SELECIONADO -->
    <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--border-light); background: #ffffff; box-shadow: var(--shadow-sm);">
      <div style="padding: 0.75rem 1.15rem; background: var(--bg-subtle); border-bottom: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.6rem;">
        <div>
          <strong style="font-size: 0.9rem; color: var(--accent-dark-blue);">
            Atletas de ${currentFed.nome} ${categoryFilter ? `• ${categories.find(c => c.id === categoryFilter)?.nome || ''}` : ''}
          </strong>
          <span style="font-size: 0.78rem; color: var(--text-muted); margin-left: 0.4rem;">
            (${filteredAthletes.length} ${filteredAthletes.length === 1 ? 'atleta' : 'atletas'})
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <input type="text" 
                 id="athlete-search-input"
                 class="form-control" 
                 style="font-size: 0.8rem; padding: 0.35rem 0.65rem; width: 230px;"
                 placeholder="🔍 Buscar atleta por nome ou CBT..." 
                 value="${searchFilter}" 
                 oninput="window.handleAthleteSearch(this.value)">
          <span style="font-size: 0.75rem; color: #059669; font-weight: 700; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 0.2rem 0.55rem; border-radius: 4px; white-space: nowrap;">
            ✓ CBT Oficial
          </span>
        </div>
      </div>

      ${filteredAthletes.length === 0 ? `
        <div style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👥</div>
          <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--accent-dark-blue); margin-bottom: 0.35rem;">
            Nenhum atleta encontrado para ${currentFed.nome} (${currentFed.uf})
          </h4>
          <p style="font-size: 0.85rem; max-width: 500px; margin: 0 auto 1.25rem auto;">
            ${searchFilter || categoryFilter 
              ? 'Tente ajustar o termo de busca ou clicar em "Todos" para ver todas as categorias.' 
              : 'Esta federação ainda não possui atletas importados. Clique no botão abaixo para carregar a relação oficial completa.'}
          </p>
          <div style="display: flex; justify-content: center; gap: 0.5rem;">
            <button class="btn btn-primary btn-sm" onclick="window.restoreOfficialCBTList()">
              📥 Importar Relação de Atletas
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
                const isCapitao = ath.funcao === 'Capitão' || ath.is_capitao === true;
                const initials = ath.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                const rowStyle = isCapitao 
                  ? 'background: linear-gradient(90deg, #fffbeb 0%, #fef3c7 35%, #ffffff 100%); border-left: 5px solid #d97706; box-shadow: inset 0 1px 0 #fde68a, inset 0 -1px 0 #fde68a;' 
                  : 'transition: background 0.15s ease;';
                return `
                  <tr style="${rowStyle}">
                    <td style="text-align: center; color: ${isCapitao ? '#92400e' : 'var(--text-muted)'}; font-weight: ${isCapitao ? '900' : '700'}; font-size: ${isCapitao ? '0.9rem' : '0.8rem'};">
                      ${isCapitao ? `👑 ${idx + 1}` : (idx + 1)}
                    </td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.65rem;">
                        <div style="width: ${isCapitao ? '38px' : '32px'}; height: ${isCapitao ? '38px' : '32px'}; border-radius: 50%; background: ${isCapitao ? 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)' : 'linear-gradient(135deg, #028090 0%, #004b57 100%)'}; color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: ${isCapitao ? '0.82rem' : '0.75rem'}; flex-shrink: 0; box-shadow: ${isCapitao ? '0 3px 8px rgba(245, 158, 11, 0.45)' : '0 1px 3px rgba(0,0,0,0.15)'}; ${isCapitao ? 'border: 2px solid #fbbf24; position: relative;' : ''}">
                          ${initials}
                          ${isCapitao ? '<span style="position: absolute; top: -7px; right: -7px; font-size: 0.95rem; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));" title="Capitão da Equipe">👑</span>' : ''}
                        </div>
                        <div>
                          <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                            <span style="font-weight: ${isCapitao ? '900' : '800'}; font-size: ${isCapitao ? '0.98rem' : '0.92rem'}; color: ${isCapitao ? '#78350f' : 'var(--accent-dark-blue)'};">
                              ${ath.nome}
                            </span>
                            ${isCapitao ? `
                              <span style="font-size: 0.72rem; font-weight: 900; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #78350f; border: 1.5px solid #d97706; padding: 0.2rem 0.55rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.35rem; box-shadow: 0 1px 3px rgba(217, 119, 6, 0.25); text-transform: uppercase; letter-spacing: 0.04em;">
                                👑 CAPITÃO DE EQUIPE
                              </span>
                            ` : ''}
                          </div>
                          <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; margin-top: 0.2rem;">
                            ${String(ath.genero || '').toUpperCase().startsWith('F') ? `
                              <span style="font-size: 0.68rem; font-weight: 800; background: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; padding: 0.1rem 0.45rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.2rem;">
                                👩 Feminino
                              </span>
                            ` : `
                              <span style="font-size: 0.68rem; font-weight: 800; background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; padding: 0.1rem 0.45rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.2rem;">
                                👨 Masculino
                              </span>
                            `}
                            ${ath.idade ? `<span>${ath.idade} anos</span>` : ''}
                            ${ath.ranking ? `<span>• Ranking CBT: <strong>${ath.ranking}</strong></span>` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style="font-family: monospace; font-size: 0.78rem; font-weight: 700; background: ${isCapitao ? '#fef3c7' : '#f1f5f9'}; border: ${isCapitao ? '1px solid #fde68a' : 'none'}; padding: 0.2rem 0.5rem; border-radius: 4px; color: ${isCapitao ? '#78350f' : '#334155'};">
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
                      ${isCapitao ? `
                        <span style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; font-weight: 900; color: #78350f; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1.5px solid #d97706; padding: 0.25rem 0.65rem; border-radius: var(--radius-full); box-shadow: 0 1px 3px rgba(217, 119, 6, 0.2);">
                          <span style="width: 8px; height: 8px; border-radius: 50%; background: #d97706;"></span>
                          👑 Capitão Convocado
                        </span>
                      ` : `
                        <span style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; font-weight: 800; color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 0.2rem 0.55rem; border-radius: var(--radius-full);">
                          <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
                          Inscrição Confirmada
                        </span>
                      `}
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

  if (wasSearching) {
    const input = document.getElementById('athlete-search-input');
    if (input) {
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    }
  }
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
  const currentGenero = String(athlete?.genero || '').toUpperCase().startsWith('F') ? 'Feminino' : 'Masculino';

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

          <!-- CAMPO DE GÊNERO / NAIPE -->
          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label" style="font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; justify-content: space-between;">
              <span>Gênero / Naipe do Atleta:</span>
              <span style="font-size: 0.72rem; color: #028090; font-weight: 800;">Obrigatório</span>
            </label>
            <select id="ath-form-genero" class="form-select" required style="font-weight: 800; font-size: 0.88rem; padding: 0.45rem 0.65rem; border: 1.5px solid #028090;">
              <option value="Feminino" ${currentGenero === 'Feminino' ? 'selected' : ''}>👩 Feminino (Naipe Feminino e Mista)</option>
              <option value="Masculino" ${currentGenero === 'Masculino' ? 'selected' : ''}>👨 Masculino (Naipe Masculino e Mista)</option>
            </select>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">
              Ao alterar e salvar, o gênero é imediatamente assumido na lista de atletas e nas escalações de jogos.
            </div>
          </div>

          <!-- CAMPO DESIGNAR CAPITÃO -->
          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label style="display: flex; align-items: center; gap: 0.55rem; font-size: 0.85rem; font-weight: 800; color: #78350f; background: #fffbeb; padding: 0.55rem 0.8rem; border-radius: 6px; border: 1.5px solid #fcd34d; cursor: pointer;">
              <input type="checkbox" id="ath-form-capitao" ${(athlete?.funcao === 'Capitão' || athlete?.is_capitao === true) ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #d97706; cursor: pointer;">
              <span>👑 Atleta Convocado como Capitão de Equipe</span>
            </label>
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
    const genero = document.getElementById('ath-form-genero').value;
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

    const fed = feds.find(f => f.id === equipe_id);
    const uf = fed ? fed.uf : equipe_id.toUpperCase();
    const isCapitaoChecked = document.getElementById('ath-form-capitao')?.checked;
    const funcao = isCapitaoChecked ? 'Capitão' : null;
    const is_capitao = Boolean(isCapitaoChecked);

    if (isEditing) {
      store.updateAthlete(athlete.id, { nome, genero, cbt_id, equipe_id, uf, funcao, is_capitao, categorias });
      toast.show({ 
        title: 'Atleta Atualizado', 
        message: `${nome} foi atualizado com sucesso (${genero}${is_capitao ? ' • 👑 Capitão' : ''}).`, 
        type: 'success' 
      });
    } else {
      store.addAthlete({ nome, genero, cbt_id, equipe_id, uf, funcao, is_capitao, categorias });
      toast.show({ 
        title: 'Atleta Inscrito', 
        message: `${nome} cadastrado na federação ${uf} (${genero}${is_capitao ? ' • 👑 Capitão' : ''}).`, 
        type: 'success' 
      });
    }

    overlay.classList.remove('active');
    selectedStateId = equipe_id;
    renderTeamsAthletes();
    if (typeof window.renderBracket === 'function') window.renderBracket();
  });
}
