// Módulo de Visualização e Interação do Chaveamento
import { store } from '../data/store.js';
import { calculateCategoryPlacements, isSlotVagaLivre } from './bracketEngine.js';
import { openMatchModal, openEditFirstRoundCardModal } from './modal.js';
import { toast } from './toast.js';

let currentCategory = 'prof';
let currentSubtab = 'principal'; // principal | reversa_5_8 | reversa_9_16 | reversa_17_27
let currentViewMode = 'tree'; // tree | table

export function initBracketView() {
  window.openEditFirstRoundCardModal = (code, catId) => openEditFirstRoundCardModal(code, catId || currentCategory);
  window.openMatchScore = (code, catId) => openMatchModal(code, catId || currentCategory);

  window.switchBracketCategory = (catId) => {
    currentCategory = catId;
    renderBracket();
  };

  window.switchBracketSubtab = (subtab) => {
    currentSubtab = subtab;
    renderBracket();
  };

  window.switchBracketViewMode = (mode) => {
    currentViewMode = mode;
    renderBracket();
  };

  window.goToCategoryManager = (catId) => {
    window.switchTab('categorias');
    if (window.selectCategoryTab) {
      window.selectCategoryTab(catId);
    }
  };

  window.clearAllResults = () => {
    if (confirm('Tem certeza que deseja apagar TODOS os resultados da categoria ' + currentCategory + '? A 1ª fase será mantida, mas os placares e o avanço nas chaves serão reiniciados.')) {
      const res = store.clearCategoryResults(currentCategory);
      if (res.success) {
        toast.show({ title: 'Resultados Limpos', message: res.message, type: 'success' });
        renderBracket();
      }
    }
  };

  window.handleOpenConfigureFirstRound = () => {
    if (window.openConfigureFirstRoundModal) {
      window.openConfigureFirstRoundModal(currentCategory);
    }
  };

  window.handleUpdateEventDateTime = (type, value) => {
    if (type === 'date') {
      store.updateTournament({ dataInicio: value });
      toast.show({
        title: 'Data de Início Salva',
        message: `Início do evento: ${value ? value.split('-').reverse().join('/') : 'não definida'}.`,
        type: 'success',
        duration: 2500
      });
    } else if (type === 'time') {
      store.updateTournament({ horaInicio: value });
      toast.show({
        title: 'Horário de Início Salvo',
        message: `Horário de início: ${value || 'não definido'}.`,
        type: 'success',
        duration: 2500
      });
    }
  };
}

export function renderBracket() {
  const container = document.getElementById('view-chaveamento');
  if (!container) return;

  const categories = store.getActiveCategories();
  const allCategoryGames = store.getGames(currentCategory);
  const currentCatObj = categories.find(c => c.id === currentCategory) || categories[0];
  const participatingFeds = store.getCategoryParticipatingFeds(currentCategory);
  const pointsTable = store.getPointsTable();
  const placements = calculateCategoryPlacements(allCategoryGames, pointsTable, participatingFeds);

  const totalPart = participatingFeds.length;
  const numByes = Math.max(0, 32 - totalPart);
  const realMatches = Math.max(0, totalPart - 16);

  // Filtra jogos de acordo com a sub-aba selecionada
  let filteredGames = [];
  if (currentSubtab === 'principal') {
    filteredGames = allCategoryGames.filter(g => g.bracket === 'principal');
  } else if (currentSubtab === 'reversa_5_8') {
    filteredGames = allCategoryGames.filter(g => g.bracket === 'reversa_5_8');
  } else if (currentSubtab === 'reversa_9_16') {
    filteredGames = allCategoryGames.filter(g => ['reversa_9_16', 'reversa_9_12', 'reversa_13_16'].includes(g.bracket));
  } else if (currentSubtab === 'reversa_17_27') {
    filteredGames = allCategoryGames.filter(g => ['reversa_17_27', 'reversa_17_20', 'reversa_21_24', 'reversa_25_27'].includes(g.bracket));
  }

  container.innerHTML = `
    <!-- BARRA DE CONTROLE SUPERIOR -->
    <div class="bracket-controls-bar">
      <div class="bracket-controls-left">
        <label style="font-weight: 700; font-size: 0.9rem; color: var(--accent-dark-blue);">Categoria:</label>
        <select class="form-select" style="width: auto; font-weight: 700;" onchange="window.switchBracketCategory(this.value)">
          ${categories.map(cat => `
            <option value="${cat.id}" ${cat.id === currentCategory ? 'selected' : ''}>${cat.nome}</option>
          `).join('')}
        </select>
        <span class="bracket-category-badge">
          🎾 ${currentCatObj?.formato || 'Melhor de 3 (F, M, DX)'}
        </span>
      </div>

      <div class="bracket-controls-right" style="display: flex; align-items: center; gap: 0.5rem;">
        <button class="btn btn-outline btn-sm" style="color: #dc2626; border-color: #fca5a5; background: #fef2f2; font-weight: 700; height: 32px;" onclick="window.clearAllResults()">
          🗑️ Limpar Resultados
        </button>
        <!-- SELETOR DE MODO (ÁRVORE / TABELA) -->
        <div class="view-mode-toggle">
          <button class="view-mode-btn ${currentViewMode === 'tree' ? 'active' : ''}" onclick="window.switchBracketViewMode('tree')">
            🌳 Árvore
          </button>
          <button class="view-mode-btn ${currentViewMode === 'table' ? 'active' : ''}" onclick="window.switchBracketViewMode('table')">
            📋 Tabela
          </button>
        </div>
      </div>
    </div>

    <!-- BANNER INFORMATIVO: IMPACTO DA QUANTIDADE DE ESTADOS PARTICIPANTES E BYES -->
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-md); padding: 0.85rem 1.25rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <span style="font-weight: 800; color: #166534; font-size: 0.95rem;">
          📊 Categoria ${currentCatObj?.nome}:
        </span>
        <span style="background: #ffffff; padding: 0.25rem 0.65rem; border-radius: var(--radius-xs); border: 1px solid #bbf7d0; font-size: 0.85rem; font-weight: 700; color: #15803d;">
          🏛️ ${totalPart} estados participantes
        </span>
        <span style="background: #ffffff; padding: 0.25rem 0.65rem; border-radius: var(--radius-xs); border: 1px solid #bbf7d0; font-size: 0.85rem; font-weight: 700; color: #047857;">
          ⏩ ${numByes} vagas livres (BYEs para Oitavas)
        </span>
        <span style="background: #ffffff; padding: 0.25rem 0.65rem; border-radius: var(--radius-xs); border: 1px solid #bbf7d0; font-size: 0.85rem; font-weight: 700; color: #1e40af;">
          ⚔️ ${realMatches} confrontos na 1ª fase
        </span>
      </div>

      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <button class="btn btn-outline btn-sm" onclick="window.handleOpenConfigureFirstRound()">
          ✏️ Editar 1ª Rodada em Lote
        </button>
        <button class="btn btn-outline btn-sm" onclick="window.goToCategoryManager('${currentCategory}')">
          🏷️ Gerenciar Estados Participantes
        </button>
      </div>
    </div>

    <!-- SUB-ABAS DE CHAVES REVERSAS -->
    <div class="bracket-subtabs">
      <button class="bracket-subtab-btn ${currentSubtab === 'principal' ? 'active' : ''}" onclick="window.switchBracketSubtab('principal')">
        🏆 Chave Principal (1º ao 4º)
      </button>
      <button class="bracket-subtab-btn ${currentSubtab === 'reversa_5_8' ? 'active' : ''}" onclick="window.switchBracketSubtab('reversa_5_8')">
        🔄 Chave Reversa 5º–8º Lugar
      </button>
      <button class="bracket-subtab-btn ${currentSubtab === 'reversa_9_16' ? 'active' : ''}" onclick="window.switchBracketSubtab('reversa_9_16')">
        🔄 Chave Reversa 9º–16º (9º-12º e 13º-16º)
      </button>
      <button class="bracket-subtab-btn ${currentSubtab === 'reversa_17_27' ? 'active' : ''}" onclick="window.switchBracketSubtab('reversa_17_27')">
        🔄 Chave Reversa 17º–27º (17º-20º, 21º-24º, 25º-27º)
      </button>
    </div>

    <!-- VISUALIZAÇÃO PRINCIPAL -->
    ${currentViewMode === 'tree' ? renderTreeBracket(filteredGames, currentSubtab) : renderTableBracket(filteredGames)}

    <!-- RODAPÉ: CLASSIFICAÇÃO E PONTUAÇÃO PROGRESSIVA DA CATEGORIA -->
    <div class="category-standings-card">
      <div class="card-header">
        <div>
          <h3 class="card-title">
            🎖️ Pontuação Progressiva da Categoria — ${currentCatObj?.nome}
          </h3>
          <p class="card-subtitle">
            Conforme os estados avançam de fase, acumulam pontos imediatos para o ranking da categoria e para o Ranking Geral
          </p>
        </div>
      </div>

      ${placements.length === 0 ? `
        <p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 1.5rem 0;">
          Nenhum estado registrado nesta categoria.
        </p>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
          ${placements.map(p => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-light); background: var(--bg-subtle);">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span class="standings-badge-pos ${p.colocacao <= 3 ? 'pos-' + p.colocacao : 'pos-other'}">
                  ${p.colocacao}º
                </span>
                <img src="assets/federations/${p.id}.jpg" alt="${p.uf}" style="width: 26px; height: 18px; border-radius: 2px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2);">
                <div>
                  <strong style="color: var(--accent-dark-blue); font-size: 0.95rem;">${p.nome} (${p.uf})</strong>
                  <div style="font-size: 0.72rem; color: #047857; font-weight: 600;">${p.faseAtual || p.nome}</div>
                </div>
              </div>
              <div style="text-align: right;">
                <strong style="font-size: 1.2rem; color: var(--primary);">${p.pontos}</strong>
                <span style="font-size: 0.75rem; color: var(--text-muted);">pts</span>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

// Renderizador da Árvore de Jogos
function renderTreeBracket(games, subtab) {
  const tournament = store.getTournament() || {};

  // Agrupa jogos por fase
  const phasesMap = new Map();
  games.forEach(g => {
    // Normaliza fase para que a Disputa de 3º e 4º (C32) fique sempre na mesma coluna da Final (abaixo da final C31)
    let faseKey = g.fase;
    if (['Grande Final (1º e 2º)', 'Disputa 3º Lugar', 'Finais'].includes(g.fase) || g.code === 'C31' || g.code === 'C32') {
      faseKey = 'Finais';
    }
    if (!phasesMap.has(faseKey)) {
      phasesMap.set(faseKey, []);
    }
    phasesMap.get(faseKey).push(g);
  });

  // Garante que dentro de 'Finais', a Grande Final (C31) venha primeiro (topo) e a Disputa de 3º e 4º (C32) venha logo abaixo
  if (phasesMap.has('Finais')) {
    phasesMap.get('Finais').sort((a, b) => {
      if (a.code === 'C31') return -1;
      if (b.code === 'C31') return 1;
      if (a.code === 'C32') return 1;
      if (b.code === 'C32') return -1;
      return 0;
    });
  }

  return `
    <div class="bracket-tree-container">
      <div class="bracket-rounds-wrapper">
        ${Array.from(phasesMap.entries()).map(([faseName, phaseGames]) => {
          const isFirstRound = faseName === '1ª Fase';
          return `
          <div class="bracket-round-column">
            <div class="round-header" style="${isFirstRound ? 'padding-bottom: 0.5rem;' : ''}">
              <div style="display: flex; align-items: center; justify-content: center; gap: 0.45rem; flex-wrap: wrap;">
                <div class="round-title">${faseName}</div>
                ${isFirstRound ? `
                  <div class="first-round-datetime-badge" style="display: inline-flex; align-items: center; gap: 0.25rem; background: var(--bg-subtle, #f8fafc); padding: 0.15rem 0.4rem; border-radius: 6px; border: 1px solid var(--border-light, #cbd5e1); box-shadow: 0 1px 2px rgba(0,0,0,0.04);" title="Data e hora de início do evento">
                    <span style="font-size: 0.8rem; line-height: 1;" title="Data de início do evento">📅</span>
                    <input 
                      type="date" 
                      id="bracket-start-date"
                      value="${tournament.dataInicio || '2026-10-15'}" 
                      style="width: 122px; padding: 0.15rem 0.25rem; font-size: 0.76rem; height: 26px; font-weight: 700; color: #1e293b; background: #ffffff; border: 1px solid #94a3b8; border-radius: 4px; cursor: pointer;"
                      title="Editar data de início do evento"
                      onchange="window.handleUpdateEventDateTime('date', this.value)"
                    />
                    <span style="font-size: 0.8rem; line-height: 1; margin-left: 0.15rem;" title="Horário de início">⏰</span>
                    <input 
                      type="time" 
                      id="bracket-start-time"
                      value="${tournament.horaInicio || '08:00'}" 
                      style="width: 78px; padding: 0.15rem 0.25rem; font-size: 0.76rem; height: 26px; font-weight: 700; color: #1e293b; background: #ffffff; border: 1px solid #94a3b8; border-radius: 4px; cursor: pointer;"
                      title="Editar horário de início do evento"
                      onchange="window.handleUpdateEventDateTime('time', this.value)"
                    />
                  </div>
                ` : ''}
              </div>
              <div class="round-subtitle" style="margin-top: 0.2rem;">${phaseGames.length} ${phaseGames.length === 1 ? 'confronto' : 'confrontos'}</div>
            </div>

            <div class="round-matches-list">
              ${phaseGames.map(game => renderMatchCard(game)).join('')}
            </div>
          </div>
        `;
        }).join('')}
      </div>
    </div>
  `;
}

// Card de Jogo individual na Árvore
function renderMatchCard(game) {
  const isWinnerA = game.vencedor_id && game.lado_a?.id === game.vencedor_id;
  const isWinnerB = game.vencedor_id && game.lado_b?.id === game.vencedor_id;
  const isBye = Boolean(game.is_bye);
  const isFirstRound = game.fase === '1ª Fase';

  const s = typeof store !== 'undefined' ? store : (window.store ? window.store : null);
  const feds = s ? s.getFederations() : [];
  const allGames = s ? s.getGames(game.categoria_id) : [];

  const slotAIsBye = game.bye_slot === 'A' || isSlotVagaLivre(allGames, game, 'A') || (isBye && !game.lado_a);
  const slotBIsBye = game.bye_slot === 'B' || isSlotVagaLivre(allGames, game, 'B') || (isBye && !game.lado_b);

  const getFedsOptions = (selectedId) => {
    let opts = '<option value="">-- Em Aberto --</option>';
    opts += '<option value="BYE" ' + (selectedId === 'BYE' ? 'selected' : '') + '>⏩ BYE</option>';
    feds.forEach(f => {
      opts += `<option value="${f.id}" ${selectedId === f.id ? 'selected' : ''}>${f.nome} (${f.uf})</option>`;
    });
    return opts;
  };

  const getTeamName = (team, isTeamBye, slot) => {
    if (isTeamBye || (game.bye_slot === slot && !team)) return '<span style="color: #059669; font-weight: 800; font-size: 0.75rem;">⏩ BYE</span>';
    if (!team) {
      if (isFirstRound) {
        return `<span style="color: #94a3b8; font-style: italic; font-size: 0.8rem; font-weight: 600;">-- Em Aberto (Clique para definir) --</span>`;
      }
      let sourceStr = 'Aguardando...';
      
      // Encontrar jogos cuja proxima_fase ou proxima_fase_perdedor apontem para este game.code
      const sourcesForWinner = allGames.filter(g => g.proxima_fase === game.code);
      const sourcesForLoser = allGames.filter(g => g.proxima_fase_perdedor === game.code);
      
      // Combinar e determinar a origem
      let matchGame = null;
      let isFromLoser = false;
      
      if (sourcesForWinner.length > 0) {
        matchGame = sourcesForWinner.find(g => g.proxima_fase_slot === slot);
        if (!matchGame && !sourcesForWinner.some(g => g.proxima_fase_slot)) {
          const idx = slot === 'A' ? 0 : 1;
          matchGame = sourcesForWinner[idx];
        }
      } 
      
      if (!matchGame && sourcesForLoser.length > 0) {
        matchGame = sourcesForLoser.find(g => g.proxima_fase_perdedor_slot === slot);
        if (!matchGame && !sourcesForLoser.some(g => g.proxima_fase_perdedor_slot)) {
          const idx = slot === 'A' ? 0 : 1;
          matchGame = sourcesForLoser[idx];
        }
        if (matchGame) isFromLoser = true;
      }

      if (matchGame) {
        if (matchGame.is_bye && (isFromLoser || (!matchGame.vencedor_id && !matchGame.lado_a && !matchGame.lado_b))) {
          return '<span style="color: #059669; font-weight: 800; font-size: 0.8rem;">⏩ BYE</span>';
        }
        sourceStr = `Aguardando ${isFromLoser ? 'Perd.' : 'Venc.'} ${matchGame.code}`;
      }
      
      return `<span style="color: #94a3b8; font-style: italic; font-size: 0.75rem; font-weight: 600;">${sourceStr}</span>`;
    }
    
    const byesList = s ? s.getCategoryByes(game.categoria_id) : [];
    const byeRank = byesList.indexOf(team.id) + 1;
    const seedText = byeRank > 0 ? `#${byeRank} BYE` : '';

    return `
      <div style="display: flex; align-items: center; gap: 0.5rem; width: 100%; min-width: 0;">
        <img src="assets/federations/${team.id}.jpg" alt="${team.uf}" style="width: 24px; height: 16px; border-radius: 2px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2); flex-shrink: 0;">
        <span style="font-weight: 700; font-size: 0.86rem; color: #1e293b; white-space: normal; word-break: break-word; line-height: 1.25;" title="${team.nome}">${team.uf} - ${team.nome}</span>
        ${seedText ? `<span style="font-size: 0.68rem; color: #b45309; font-weight: 800; background: #fef3c7; padding: 0.15rem 0.35rem; border-radius: 3px; flex-shrink: 0; margin-left: auto;">${seedText}</span>` : ''}
      </div>
    `;
  };

  // Cores de Vencedor (Verde) e Perdedor (Vermelho)
  const bgA = isWinnerA ? '#dcfce7' : (isWinnerB ? '#fee2e2' : '#ffffff');
  const borderA = isWinnerA ? '#166534' : (isWinnerB ? '#991b1b' : '#e2e8f0');
  
  const bgB = isWinnerB ? '#dcfce7' : (isWinnerA ? '#fee2e2' : '#ffffff');
  const borderB = isWinnerB ? '#166534' : (isWinnerA ? '#991b1b' : '#e2e8f0');

  return `
    <div class="bracket-match-card ${game.status === 'em andamento' ? 'is-live' : ''} ${game.status === 'encerrado' ? 'is-finished' : ''} ${isBye ? 'is-bye' : ''} ${isFirstRound ? 'is-first-round' : ''}" style="height: auto; width: 100%; box-sizing: border-box; padding: 0.6rem 0.75rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; background: #ffffff; cursor: default; display: flex; flex-direction: column;">
      
      <div class="match-card-header" style="margin-bottom: 0.5rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.35rem; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 0.35rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <span class="match-code-tag" style="background: #334155; color: white; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.75rem; font-weight: 800;">${game.code}</span>
          ${(game.descricao || (game.code === 'C31' ? 'Grande Final (1º e 2º)' : (game.code === 'C32' ? 'Disputa 3º e 4º' : ''))) ? `<span style="font-size: 0.7rem; color: #64748b; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;" title="${game.descricao || (game.code === 'C31' ? 'Grande Final' : 'Disputa 3º e 4º')}">${game.descricao || (game.code === 'C31' ? 'Grande Final' : 'Disputa 3º e 4º')}</span>` : ''}
        </div>
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          <span class="badge-status ${isBye ? 'encerrado' : game.status}" style="font-size: 0.62rem; padding: 0.15rem 0.45rem; border-radius: 12px; text-transform: uppercase; font-weight: 800; flex-shrink: 0;">${isBye ? 'BYE' : game.status}</span>
          <button style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; font-size: 0.75rem; padding: 0.15rem 0.35rem;" onclick="window.openChangeTeamSlotModal('${game.code}', '${game.categoria_id}')" title="Editar Confronto (Selecionar Estados)">✏️</button>
        </div>
      </div>

      <!-- TIME A -->
      <div class="match-team-row ${isWinnerA ? 'is-winner' : (isWinnerB ? 'is-loser' : '')}"
           onclick="window.openChangeTeamSlotModal('${game.code}', '${game.categoria_id}')"
           title="💡 Clique para selecionar os dois estados deste confronto"
           style="display: flex; justify-content: space-between; align-items: center; padding: 0.35rem 0.5rem; background: ${bgA}; border-radius: 4px; margin-bottom: 0.3rem; border: 1px solid ${borderA}; min-height: 36px; cursor: pointer; transition: all 0.15s ease;"
           onmouseover="this.style.boxShadow='0 0 0 2px #028090'"
           onmouseout="this.style.boxShadow='none'">
        <div class="match-team-info" style="flex: 1; min-width: 0; display: flex; align-items: center;">
          ${getTeamName(game.lado_a, slotAIsBye, 'A')}
        </div>
        ${!isBye && (game.vitorias_a || game.vitorias_b || game.status === 'encerrado') ? `
          <div class="match-team-score-badge" style="font-weight: 800; font-size: 0.85rem; color: ${isWinnerA ? '#166534' : (isWinnerB ? '#991b1b' : '#64748b')}; margin-left: 0.4rem; background: ${isWinnerA ? '#bbf7d0' : (isWinnerB ? '#fecaca' : '#f1f5f9')}; padding: 0.1rem 0.3rem; border-radius: 3px; min-width: 24px; text-align: center;">
            ${game.vitorias_a || 0}
          </div>
        ` : ''}
      </div>

      <!-- TIME B -->
      <div class="match-team-row ${isWinnerB ? 'is-winner' : (isWinnerA ? 'is-loser' : '')}"
           onclick="window.openChangeTeamSlotModal('${game.code}', '${game.categoria_id}')"
           title="💡 Clique para selecionar os dois estados deste confronto"
           style="display: flex; justify-content: space-between; align-items: center; padding: 0.35rem 0.5rem; background: ${bgB}; border-radius: 4px; border: 1px solid ${borderB}; min-height: 36px; cursor: pointer; transition: all 0.15s ease;"
           onmouseover="this.style.boxShadow='0 0 0 2px #028090'"
           onmouseout="this.style.boxShadow='none'">
        <div class="match-team-info" style="flex: 1; min-width: 0; display: flex; align-items: center;">
          ${getTeamName(game.lado_b, slotBIsBye, 'B')}
        </div>
        ${!isBye && (game.vitorias_a || game.vitorias_b || game.status === 'encerrado') ? `
          <div class="match-team-score-badge" style="font-weight: 800; font-size: 0.85rem; color: ${isWinnerB ? '#166534' : (isWinnerA ? '#991b1b' : '#64748b')}; margin-left: 0.4rem; background: ${isWinnerB ? '#bbf7d0' : (isWinnerA ? '#fecaca' : '#f1f5f9')}; padding: 0.1rem 0.3rem; border-radius: 3px; min-width: 24px; text-align: center;">
            ${game.vitorias_b || 0}
          </div>
        ` : ''}
      </div>

      <!-- DETALHES DE SUBJOGOS (PLACAR) -->
      <div class="match-footer-details" style="margin-top: 0.4rem; padding-top: 0.4rem; border-top: 1px dashed #cbd5e1;">
        ${isBye ? `
          <div style="text-align: center; font-size: 0.7rem; color: #047857; font-weight: 700; background: #ecfdf5; padding: 0.2rem; border-radius: 3px;">
            ✅ Vencedor avança direto para ${game.proxima_fase || 'próxima'}
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
             <!-- F -->
             <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.1rem 0;">
               <strong style="color:#64748b; font-size: 0.7rem; width: 14px;">F</strong>
               <input type="text" placeholder="_/_ _/_ _/_" value="${game.placar_jogo1 || ''}" style="width: 90px; font-size:0.65rem; padding:0.15rem; border:1px solid #cbd5e1; border-radius:2px; outline:none; text-align:center; color: #334155;" oninput="window.maskScore(this)" onchange="window.inlineUpdateScore('${game.code}', '${game.categoria_id}', '1', 'placar', this.value)">
               <select style="width: 70px; font-size:0.65rem; padding:0.15rem; border:1px solid #cbd5e1; border-radius:2px; outline:none; font-weight: 700; color: #334155;" onchange="window.inlineUpdateScore('${game.code}', '${game.categoria_id}', '1', 'vencedor', this.value)">
                  <option value="" ${!game.resultado_jogo1 ? 'selected' : ''}>-Venc-</option>
                  <option value="a" ${game.resultado_jogo1 === 'a' ? 'selected' : ''}>Eq. A</option>
                  <option value="b" ${game.resultado_jogo1 === 'b' ? 'selected' : ''}>Eq. B</option>
               </select>
             </div>
             
             <!-- M -->
             <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.1rem 0;">
               <strong style="color:#64748b; font-size: 0.7rem; width: 14px;">M</strong>
               <input type="text" placeholder="_/_ _/_ _/_" value="${game.placar_jogo2 || ''}" style="width: 90px; font-size:0.65rem; padding:0.15rem; border:1px solid #cbd5e1; border-radius:2px; outline:none; text-align:center; color: #334155;" oninput="window.maskScore(this)" onchange="window.inlineUpdateScore('${game.code}', '${game.categoria_id}', '2', 'placar', this.value)">
               <select style="width: 70px; font-size:0.65rem; padding:0.15rem; border:1px solid #cbd5e1; border-radius:2px; outline:none; font-weight: 700; color: #334155;" onchange="window.inlineUpdateScore('${game.code}', '${game.categoria_id}', '2', 'vencedor', this.value)">
                  <option value="" ${!game.resultado_jogo2 ? 'selected' : ''}>-Venc-</option>
                  <option value="a" ${game.resultado_jogo2 === 'a' ? 'selected' : ''}>Eq. A</option>
                  <option value="b" ${game.resultado_jogo2 === 'b' ? 'selected' : ''}>Eq. B</option>
               </select>
             </div>
             
             <!-- DX -->
             <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.1rem 0;">
               <strong style="color:#64748b; font-size: 0.7rem; width: 14px;">DX</strong>
               <input type="text" placeholder="_/_ _/_ _/_" value="${game.placar_jogo3 || ''}" style="width: 90px; font-size:0.65rem; padding:0.15rem; border:1px solid #cbd5e1; border-radius:2px; outline:none; text-align:center; color: #334155;" oninput="window.maskScore(this)" onchange="window.inlineUpdateScore('${game.code}', '${game.categoria_id}', '3', 'placar', this.value)">
               <select style="width: 70px; font-size:0.65rem; padding:0.15rem; border:1px solid #cbd5e1; border-radius:2px; outline:none; font-weight: 700; color: #334155;" onchange="window.inlineUpdateScore('${game.code}', '${game.categoria_id}', '3', 'vencedor', this.value)">
                  <option value="" ${!game.resultado_jogo3 ? 'selected' : ''}>-Venc-</option>
                  <option value="a" ${game.resultado_jogo3 === 'a' ? 'selected' : ''}>Eq. A</option>
                  <option value="b" ${game.resultado_jogo3 === 'b' ? 'selected' : ''}>Eq. B</option>
               </select>
             </div>
          </div>
        `}
      </div>
    </div>
  `;
}

// Renderizador em Tabela de Lista Completa
function renderTableBracket(games) {
  return `
    <div class="bracket-table-wrapper">
      <table class="custom-table">
        <thead>
          <tr>
            <th>Nº / Cód</th>
            <th>Fase</th>
            <th>Estado A</th>
            <th>Estado B</th>
            <th>Jogo 1 (F)</th>
            <th>Jogo 2 (M)</th>
            <th>Jogo 3 (DX)</th>
            <th>Placar Geral</th>
            <th>Vencedor</th>
            <th>Perdedor</th>
            <th>Próxima Fase</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${games.map(g => {
            const isBye = Boolean(g.is_bye);
            const isByeA = g.bye_slot === 'A' || (isBye && !g.lado_a) || isSlotVagaLivre(games, g, 'A');
            const isByeB = g.bye_slot === 'B' || (isBye && !g.lado_b) || isSlotVagaLivre(games, g, 'B');

            const teamA = isByeA
              ? '<span style="color: #059669; font-weight: 800;">⏩ BYE</span>'
              : (g.lado_a 
                  ? `<div style="display: inline-flex; align-items: center; gap: 0.4rem;"><img src="assets/federations/${g.lado_a.id}.jpg" alt="${g.lado_a.uf}" style="width: 22px; height: 15px; border-radius: 2px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2); vertical-align: middle;"> <strong>${g.lado_a.nome} (${g.lado_a.uf})</strong></div>` 
                  : '<span style="color: var(--text-muted); font-style: italic;">Aguardando</span>');

            const teamB = isByeB 
              ? '<span style="color: #059669; font-weight: 800;">⏩ BYE</span>' 
              : (g.lado_b 
                  ? `<div style="display: inline-flex; align-items: center; gap: 0.4rem;"><img src="assets/federations/${g.lado_b.id}.jpg" alt="${g.lado_b.uf}" style="width: 22px; height: 15px; border-radius: 2px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2); vertical-align: middle;"> <strong>${g.lado_b.nome} (${g.lado_b.uf})</strong></div>` 
                  : '<span style="color: var(--text-muted); font-style: italic;">Aguardando</span>');
            
            // Regra explícita: "quando um estado passa de bye o placar não recebe nenhum resultado e o estado passa como vencedor."
            let j1Display = '-';
            let j2Display = '-';
            let j3Display = '-';
            let placarGeral = '-';
            let winner = '-';
            let loser = '-';

            if (isBye) {
              j1Display = '-';
              j2Display = '-';
              j3Display = '-';
              placarGeral = '-';
              // Estado passa como vencedor direto
              const winningTeamObj = g.vencedor_id ? (g.lado_a?.id === g.vencedor_id ? g.lado_a : g.lado_b) : (g.lado_a || g.lado_b);
              winner = winningTeamObj
                ? `<div style="display: inline-flex; align-items: center; gap: 0.4rem;"><img src="assets/federations/${winningTeamObj.id}.jpg" alt="${winningTeamObj.uf}" style="width: 22px; height: 15px; border-radius: 2px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2); vertical-align: middle;"> <strong>${winningTeamObj.nome} (${winningTeamObj.uf})</strong> <span style="font-size: 0.65rem; color: #059669; background: #ecfdf5; padding: 0.1rem 0.3rem; border-radius: 2px; border: 1px solid #a7f3d0;">BYE</span></div>`
                : '-';
              loser = '-';
            } else {
              j1Display = g.resultado_jogo1 ? `<span class="badge-status ${g.resultado_jogo1 === 'a' ? 'em_andamento' : 'em_espera'}">${g.resultado_jogo1.toUpperCase()} (${g.placar_jogo1 || 'OK'})</span>` : '-';
              j2Display = g.resultado_jogo2 ? `<span class="badge-status ${g.resultado_jogo2 === 'a' ? 'em_andamento' : 'em_espera'}">${g.resultado_jogo2.toUpperCase()} (${g.placar_jogo2 || 'OK'})</span>` : '-';
              j3Display = g.resultado_jogo3 ? `<span class="badge-status ${g.resultado_jogo3 === 'a' ? 'em_andamento' : 'em_espera'}">${g.resultado_jogo3.toUpperCase()} (${g.placar_jogo3 || 'OK'})</span>` : '-';
              placarGeral = `<strong>${g.vitorias_a || 0} x ${g.vitorias_b || 0}</strong>`;
              winner = g.vencedor_id ? (g.lado_a?.id === g.vencedor_id ? teamA : teamB) : '-';
              loser = g.perdedor_id ? (g.lado_a?.id === g.perdedor_id ? teamA : teamB) : '-';
            }

            const isFirstRound = g.fase === '1ª Fase';
            const editAction = isFirstRound
              ? `window.openEditFirstRoundCardModal('${g.code}', '${g.categoria_id}')`
              : `window.openMatchScore('${g.code}', '${g.categoria_id}')`;

            return `
              <tr>
                <td><strong>${g.code}</strong></td>
                <td><span style="font-size: 0.8rem; font-weight: 600;">${g.fase}</span></td>
                <td>${teamA}</td>
                <td>${teamB}</td>
                <td style="text-align: center;">${j1Display}</td>
                <td style="text-align: center;">${j2Display}</td>
                <td style="text-align: center;">${j3Display}</td>
                <td style="text-align: center;">${placarGeral}</td>
                <td style="color: #15803d; font-weight: 700;">${winner}</td>
                <td style="color: var(--text-muted);">${loser}</td>
                <td>
                  <span style="font-size: 0.8rem; background: var(--bg-subtle); padding: 0.2rem 0.5rem; border-radius: var(--radius-xs);">
                    ${g.proxima_fase || 'Término'}
                  </span>
                </td>
                <td>
                  <button class="btn btn-primary btn-sm" onclick="${editAction}">
                    ✏️ Editar
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}




// --- INLINE EDIT HANDLERS ---
window.saveInlineCard = function(code, catId) {
  const selA = document.getElementById(`inline-edit-a-${code}`);
  const selB = document.getElementById(`inline-edit-b-${code}`);
  if (!selA || !selB) return;

  const valA = selA.value;
  const valB = selB.value;

  if (valA === 'BYE' && valB === 'BYE') {
    alert("Um confronto não pode ter dois BYEs.");
    return;
  }

  const isBye = Boolean(valA === 'BYE' || valB === 'BYE' || (valA && !valB) || (!valA && valB));
  const byeSlot = (valA === 'BYE' || !valA) ? 'A' : 'B';
  const teamAId = (valA === 'BYE' || !valA) ? null : valA;
  const teamBId = (valB === 'BYE' || !valB) ? null : valB;

  const res = window.store.updateFirstRoundMatch(catId, code, teamAId, teamBId, isBye, byeSlot);
  if (!res.success) alert(res.message);
  else {
    if (window.renderBracket) window.renderBracket();
    if (window.renderSchedule) window.renderSchedule();
  }
};

window.inlineUpdateScore = function(code, catId, jogoNum, field, value) {
  const game = window.store.getGames(catId).find(g => g.code === code);
  if(!game) return;
  
  if (field === 'placar') {
    game['placar_jogo' + jogoNum] = value;
  } else if (field === 'vencedor') {
    game['resultado_jogo' + jogoNum] = value || null;
  }
  
  // Coletar estado atual de todos os placares do jogo
  const scoresObj = {
    resultado_jogo1: game.resultado_jogo1 || null,
    placar_jogo1: game.placar_jogo1 || '',
    resultado_jogo2: game.resultado_jogo2 || null,
    placar_jogo2: game.placar_jogo2 || '',
    resultado_jogo3: game.resultado_jogo3 || null,
    placar_jogo3: game.placar_jogo3 || ''
  };
  
  // Usar a função oficial do store para calcular vitorias, propagar vencedor e perdedor
  const res = window.store.recordMatchResult(catId, code, scoresObj);
  
  if (res && res.success) {
    if (window.renderBracket) window.renderBracket();
  } else if (res && !res.success) {
    alert("Erro ao salvar resultado: " + res.message);
  }
};

// --- MASK SCORE ---
window.maskScore = function(input) {
  let start = input.selectionStart;
  let lenBefore = input.value.length;

  let v = input.value.replace(/\D/g, ''); // Apenas números
  let out = '';
  
  if (v.length > 0) out += v[0];
  if (v.length > 1) out += '/' + v[1];
  if (v.length > 2) out += ' ' + v[2];
  if (v.length > 3) out += '/' + v[3];
  if (v.length > 4) out += ' ' + v[4];
  if (v.length > 5) out += v[5];
  if (v.length > 6) out += '/' + v[6];
  if (v.length > 7) out += v[7];

  input.value = out;
  
  let diff = out.length - lenBefore;
  let newPos = start + diff;
  if (newPos < 0) newPos = 0;
  input.setSelectionRange(newPos, newPos);
};
