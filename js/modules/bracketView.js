// Módulo de Visualização e Interação do Chaveamento
import { store } from '../data/store.js';
import { calculateCategoryPlacements, isSlotVagaLivre } from './bracketEngine.js';
import { openMatchModal, openEditFirstRoundCardModal } from './modal.js';
import { toast } from './toast.js';

let currentCategory = 'prof';
let currentSubtab = 'principal'; // principal | reversa_5_8 | reversa_9_16 | reversa_17_24 | reversa_25_27
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
    // Garante que os confrontos da Chave Principal estejam na ordem correta de fases:
    // 1ª Fase (C1-C16) -> Oitavas (C17-C24) -> Quartas (C25-C28) -> Semifinais (C29-C30) -> Finais (C31 Grande Final, C32 3º Lugar)
    filteredGames.sort((a, b) => {
      const numA = parseInt((a.code || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt((b.code || '').replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  } else if (currentSubtab === 'reversa_5_8') {
    filteredGames = allCategoryGames.filter(g => g.bracket === 'reversa_5_8');
  } else if (currentSubtab === 'reversa_9_16') {
    filteredGames = allCategoryGames.filter(g => ['reversa_9_16', 'reversa_9_12', 'reversa_13_16'].includes(g.bracket));
  } else if (currentSubtab === 'reversa_17_24' || currentSubtab === 'reversa_17_27') {
    filteredGames = allCategoryGames.filter(g => 
      ['reversa_17_24', 'reversa_17_27', 'reversa_17_20', 'reversa_21_24'].includes(g.bracket) &&
      !(g.code && g.code.startsWith('R25_'))
    );
  } else if (currentSubtab === 'reversa_25_27') {
    filteredGames = allCategoryGames.filter(g => 
      g.bracket === 'reversa_25_27' || (g.code && g.code.startsWith('R25_'))
    );
  }

  const isAdmin = Boolean(window.auth && typeof window.auth.isAdmin === 'function' && window.auth.isAdmin());

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
        ${isAdmin ? `
          <button class="btn btn-outline btn-sm" style="color: #dc2626; border-color: #fca5a5; background: #fef2f2; font-weight: 700; height: 32px;" onclick="window.clearAllResults()">
            🗑️ Limpar Resultados
          </button>
        ` : ''}
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
    <div style="background: rgba(15, 28, 48, 0.92); border: 1px solid rgba(16, 185, 129, 0.45); backdrop-filter: blur(10px); border-radius: var(--radius-md); padding: 0.85rem 1.25rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; box-shadow: 0 4px 16px rgba(0,0,0,0.3);">
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <span style="font-weight: 800; color: #ffb703; font-size: 0.95rem;">
          📊 Categoria ${currentCatObj?.nome}:
        </span>
        <span style="background: rgba(255, 255, 255, 0.12); padding: 0.25rem 0.65rem; border-radius: var(--radius-xs); border: 1px solid rgba(255, 255, 255, 0.2); font-size: 0.85rem; font-weight: 700; color: #ffffff;">
          🏛️ ${totalPart} estados participantes
        </span>
        <span style="background: rgba(16, 185, 129, 0.2); padding: 0.25rem 0.65rem; border-radius: var(--radius-xs); border: 1px solid rgba(16, 185, 129, 0.4); font-size: 0.85rem; font-weight: 700; color: #34d399;">
          ⏩ ${numByes} vagas livres (BYEs para Oitavas)
        </span>
        <span style="background: rgba(56, 189, 248, 0.2); padding: 0.25rem 0.65rem; border-radius: var(--radius-xs); border: 1px solid rgba(56, 189, 248, 0.4); font-size: 0.85rem; font-weight: 700; color: #38bdf8;">
          ⚔️ ${realMatches} confrontos na 1ª fase
        </span>
      </div>

      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        ${isAdmin ? `
          <button class="btn btn-sm" style="background: #028090; color: #ffffff; border: none; font-weight: 700; padding: 0.4rem 0.8rem;" onclick="window.handleOpenConfigureFirstRound()">
            ✏️ Editar 1ª Rodada em Lote
          </button>
        ` : ''}
        <button class="btn btn-outline btn-sm" style="color: #ffffff; border-color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.08);" onclick="window.goToCategoryManager('${currentCategory}')">
          ${isAdmin ? '🏷️ Gerenciar Estados Participantes' : '🏷️ Ver Estados Participantes'}
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
      <button class="bracket-subtab-btn ${(currentSubtab === 'reversa_17_24' || currentSubtab === 'reversa_17_27') ? 'active' : ''}" onclick="window.switchBracketSubtab('reversa_17_24')">
        🔄 Chave Reversa 17º–24º (17º-20º e 21º-24º)
      </button>
      <button class="bracket-subtab-btn ${currentSubtab === 'reversa_25_27' ? 'active' : ''}" onclick="window.switchBracketSubtab('reversa_25_27')">
        🔄 Chave Reversa 25º–27º Lugar
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
          ${placements.map(p => {
            const fedId = (p.id || p.equipe_id || p.uf || '').toLowerCase();
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-light); background: var(--bg-subtle);">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span class="standings-badge-pos ${(p.posicao || p.colocacao) <= 3 ? 'pos-' + (p.posicao || p.colocacao) : 'pos-other'}">
                    ${p.posicao || p.colocacao}º
                  </span>
                  <img src="assets/federations/${fedId}.jpg" alt="${p.uf || ''}" onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${fedId}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${fedId}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" style="width: 36px; height: 30px; border-radius: 3px; object-fit: contain; box-shadow: 0 1px 3px rgba(0,0,0,0.2); border: 1px solid rgba(0,0,0,0.1); background: #ffffff; padding: 1px;">
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
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

// Mapeamento de posições em disputa para os cabeçalhos das colunas
function getColumnDisputeBadge(faseName) {
  if (!faseName) return null;
  // 1ª Fase, Oitavas e Quartas não possuem badge de disputa de posições no topo da coluna
  if (/1[ªa]\s*fase/i.test(faseName) || /oitavas/i.test(faseName) || /quartas/i.test(faseName)) {
    return null;
  }
  if (faseName === 'Semifinais' || faseName === 'Semifinal') {
    return '⚔️ Valendo 1º ao 4º Lugar';
  }
  if (faseName === 'Finais') {
    return '🏆 Disputa de 1º a 4º (Ouro, Prata e Bronze)';
  }
  if (faseName.includes('5º-8º')) {
    if (/semi/i.test(faseName)) return '⚔️ Valendo 5º ao 8º Lugar';
    if (/final/i.test(faseName)) return '🎯 Disputas de 5º/6º e 7º/8º Lugar';
  }
  if (faseName.includes('9º-16º')) {
    if (/semi/i.test(faseName)) return '⚔️ Valendo 9º ao 16º Lugar (9º-12º e 13º-16º)';
    if (/final/i.test(faseName)) return '🎯 Disputas de 9º ao 16º Lugar';
  }
  if (faseName.includes('17º') || faseName.includes('24º')) {
    if (/semi/i.test(faseName)) return '⚔️ Valendo 17º ao 24º Lugar (17º-20º e 21º-24º)';
    if (/final/i.test(faseName)) return '🎯 Disputas de 17º ao 24º Lugar';
  }
  if (faseName.includes('25º') || faseName.includes('27º')) {
    if (/semi/i.test(faseName)) return '⚔️ Valendo 25º ao 27º Lugar';
    if (/final/i.test(faseName)) return '🎯 Disputa de 25º e 26º Lugar';
  }
  return null;
}

// Mapeamento detalhado das posições em disputa para cada confronto de Semifinal e Final
export function getMatchDisputeInfo(game) {
  if (!game) return null;
  const code = game.code || '';
  const fase = game.fase || '';
  const desc = game.descricao || '';

  // 1ª Fase, Oitavas de Final e Quartas de Final NUNCA recebem destaque de semifinal ou final (devem voltar às cores e estilo padrão da 1ª fase)
  const isExcludedPhase = 
    /1[ªa]\s*fase/i.test(fase) ||
    /oitavas/i.test(fase) || /oitavas/i.test(desc) ||
    /quartas/i.test(fase) || /quartas/i.test(desc) ||
    /^C(1[0-6]|[1-9])$/.test(code) || // C1 a C16 (1ª Fase)
    /^C(1[7-9]|2[0-4])$/.test(code) || // C17 a C24 (Oitavas de Final)
    /^C(2[5-8])$/.test(code) || // C25 a C28 (Quartas de Final)
    /^R9_[1-4]$/.test(code) || // R9_1 a R9_4 (Quartas 9º-16º)
    /^R17_Q[1-4]$/.test(code) || // R17_Q1 a R17_Q4 (Quartas 17º-24º)
    /^R25_Q[1-4]$/.test(code); // R25_Q1 a R25_Q4 (Quartas 25º-27º)

  if (isExcludedPhase) {
    return null;
  }

  // 1. CHAVE PRINCIPAL (1º ao 4º Lugar)
  if (code === 'C31' || /grande final/i.test(fase) || /grande final/i.test(desc)) {
    return {
      type: 'final-gold',
      bannerClass: 'banner-final-gold',
      badge: '🏆 GRANDE FINAL',
      posDisputa: 'Disputa de 1º e 2º Lugar',
      posSubtitle: 'Decisão do Título Brasileiro CBT',
      posLabel: '🥇 Venc: Campeão Brasileiro CBT | 🥈 Perd: Vice-Campeão',
      isSemi: false,
      isFinal: true
    };
  }

  if (code === 'C32' || /disputa 3[º°]/i.test(fase) || /disputa 3[º°]/i.test(desc)) {
    return {
      type: 'final-bronze',
      bannerClass: 'banner-final-bronze',
      badge: '🥉 MEDALHA DE BRONZE',
      posDisputa: 'Disputa de 3º e 4º Lugar',
      posSubtitle: 'Pódio do Torneio',
      posLabel: '🥉 Venc: 3º Lugar (Bronze) | Perd: 4º Lugar',
      isSemi: false,
      isFinal: true
    };
  }

  if (code === 'C29' || code === 'C30' || (fase === 'Semifinais' && game.bracket === 'principal') || (fase === 'Semifinal' && game.bracket === 'principal')) {
    return {
      type: 'semi',
      bannerClass: 'banner-semi',
      badge: '⚔️ SEMIFINAL',
      posDisputa: 'Valendo 1º ao 4º Lugar',
      posSubtitle: 'Vaga na Grande Final e Pódio',
      posLabel: 'Venc: Avança para Grande Final (1º/2º) | Perd: Disputa 3º/4º',
      isSemi: true,
      isFinal: false
    };
  }

  // 2. CHAVE REVERSA 5º–8º LUGAR
  if (code === 'R5_FINAL' || (/disputa 5[º°]/i.test(desc))) {
    return {
      type: 'final-placement',
      bannerClass: 'banner-placement-final',
      badge: '🏅 FINAL 5º LUGAR',
      posDisputa: 'Disputa de 5º e 6º Lugar',
      posSubtitle: 'Classificação Geral CBT',
      posLabel: 'Venc: 5º Lugar CBT | Perd: 6º Lugar CBT',
      isSemi: false,
      isFinal: true
    };
  }

  if (code === 'R5_7LUGAR' || (/disputa 7[º°]/i.test(desc))) {
    return {
      type: 'final-placement',
      bannerClass: 'banner-placement-final',
      badge: '🏅 FINAL 7º LUGAR',
      posDisputa: 'Disputa de 7º e 8º Lugar',
      posSubtitle: 'Classificação Geral CBT',
      posLabel: 'Venc: 7º Lugar CBT | Perd: 8º Lugar CBT',
      isSemi: false,
      isFinal: true
    };
  }

  if (code === 'R5_1' || code === 'R5_2' || (fase.includes('5º-8º') && /semi/i.test(fase))) {
    return {
      type: 'semi',
      bannerClass: 'banner-semi',
      badge: '⚔️ SEMIFINAL (5º-8º)',
      posDisputa: 'Valendo 5º ao 8º Lugar',
      posSubtitle: 'Definição de Vaga 5º/6º ou 7º/8º',
      posLabel: 'Venc: Avança para Final 5º/6º | Perd: Disputa 7º/8º',
      isSemi: true,
      isFinal: false
    };
  }

  // 3. CHAVE REVERSA 9º–16º LUGAR
  if (code === 'R9_FINAL' || (/disputa 9[º°]/i.test(desc))) {
    return {
      type: 'final-placement',
      bannerClass: 'banner-placement-final',
      badge: '🏅 FINAL 9º LUGAR',
      posDisputa: 'Disputa de 9º e 10º Lugar',
      posSubtitle: 'Classificação Geral CBT',
      posLabel: 'Venc: 9º Lugar CBT | Perd: 10º Lugar CBT',
      isSemi: false,
      isFinal: true
    };
  }

  if (code === 'R9_11LUGAR' || (/disputa 11[º°]/i.test(desc))) {
    return {
      type: 'final-placement',
      bannerClass: 'banner-placement-final',
      badge: '🏅 FINAL 11º LUGAR',
      posDisputa: 'Disputa de 11º e 12º Lugar',
      posSubtitle: 'Classificação Geral CBT',
      posLabel: 'Venc: 11º Lugar CBT | Perd: 12º Lugar CBT',
      isSemi: false,
      isFinal: true
    };
  }

  if (code === 'R13_FINAL' || (/disputa 13[º°]/i.test(desc))) {
    return {
      type: 'final-placement',
      bannerClass: 'banner-placement-final',
      badge: '🏅 FINAL 13º LUGAR',
      posDisputa: 'Disputa de 13º e 14º Lugar',
      posSubtitle: 'Classificação Geral CBT',
      posLabel: 'Venc: 13º Lugar CBT | Perd: 14º Lugar CBT',
      isSemi: false,
      isFinal: true
    };
  }

  if (code === 'R13_15LUGAR' || (/disputa 15[º°]/i.test(desc))) {
    return {
      type: 'final-placement',
      bannerClass: 'banner-placement-final',
      badge: '🏅 FINAL 15º LUGAR',
      posDisputa: 'Disputa de 15º e 16º Lugar',
      posSubtitle: 'Classificação Geral CBT',
      posLabel: 'Venc: 15º Lugar CBT | Perd: 16º Lugar CBT',
      isSemi: false,
      isFinal: true
    };
  }

  if (code === 'R9_SEMI_1' || code === 'R9_SEMI_2' || (/9[º°].*12[º°]/i.test(desc) && /semi/i.test(desc))) {
    return {
      type: 'semi',
      bannerClass: 'banner-semi',
      badge: '⚔️ SEMIFINAL (9º-12º)',
      posDisputa: 'Valendo 9º ao 12º Lugar',
      posSubtitle: 'Definição de Vaga 9º/10º ou 11º/12º',
      posLabel: 'Venc: Avança para Final 9º/10º | Perd: Disputa 11º/12º',
      isSemi: true,
      isFinal: false
    };
  }

  if (code === 'R13_SEMI_1' || code === 'R13_SEMI_2' || (/13[º°].*16[º°]/i.test(desc) && /semi/i.test(desc))) {
    return {
      type: 'semi',
      bannerClass: 'banner-semi',
      badge: '⚔️ SEMIFINAL (13º-16º)',
      posDisputa: 'Valendo 13º ao 16º Lugar',
      posSubtitle: 'Definição de Vaga 13º/14º ou 15º/16º',
      posLabel: 'Venc: Avança para Final 13º/14º | Perd: Disputa 15º/16º',
      isSemi: true,
      isFinal: false
    };
  }

  // 4. CHAVE REVERSA 17º–24º LUGAR
  if (code === 'R17_FINAL' || (/disputa 17[º°]/i.test(desc))) {
    return {
      type: 'final-placement',
      bannerClass: 'banner-placement-final',
      badge: '🏅 FINAL 17º LUGAR',
      posDisputa: 'Disputa de 17º e 18º Lugar',
      posSubtitle: 'Classificação Geral CBT',
      posLabel: 'Venc: 17º Lugar CBT | Perd: 18º Lugar CBT',
      isSemi: false,
      isFinal: true
    };
  }

  if (code === 'R17_19LUGAR' || (/disputa 19[º°]/i.test(desc))) {
    return {
      type: 'final-placement',
      bannerClass: 'banner-placement-final',
      badge: '🏅 FINAL 19º LUGAR',
      posDisputa: 'Disputa de 19º e 20º Lugar',
      posSubtitle: 'Classificação Geral CBT',
      posLabel: 'Venc: 19º Lugar CBT | Perd: 20º Lugar CBT',
      isSemi: false,
      isFinal: true
    };
  }

  if (code === 'R21_FINAL' || (/disputa 21[º°]/i.test(desc))) {
    return {
      type: 'final-placement',
      bannerClass: 'banner-placement-final',
      badge: '🏅 FINAL 21º LUGAR',
      posDisputa: 'Disputa de 21º e 22º Lugar',
      posSubtitle: 'Classificação Geral CBT',
      posLabel: 'Venc: 21º Lugar CBT | Perd: 22º Lugar CBT',
      isSemi: false,
      isFinal: true
    };
  }

  if (code === 'R21_23LUGAR' || (/disputa 23[º°]/i.test(desc))) {
    return {
      type: 'final-placement',
      bannerClass: 'banner-placement-final',
      badge: '🏅 FINAL 23º LUGAR',
      posDisputa: 'Disputa de 23º e 24º Lugar',
      posSubtitle: 'Classificação Geral CBT',
      posLabel: 'Venc: 23º Lugar CBT | Perd: 24º Lugar CBT',
      isSemi: false,
      isFinal: true
    };
  }

  if (code === 'R17_SEMI_1' || code === 'R17_SEMI_2' || (/17[º°].*20[º°]/i.test(desc) && /semi/i.test(desc))) {
    return {
      type: 'semi',
      bannerClass: 'banner-semi',
      badge: '⚔️ SEMIFINAL (17º-20º)',
      posDisputa: 'Valendo 17º ao 20º Lugar',
      posSubtitle: 'Definição de Vaga 17º/18º ou 19º/20º',
      posLabel: 'Venc: Avança para Final 17º/18º | Perd: Disputa 19º/20º',
      isSemi: true,
      isFinal: false
    };
  }

  if (code === 'R21_SEMI_1' || code === 'R21_SEMI_2' || (/21[º°].*24[º°]/i.test(desc) && /semi/i.test(desc))) {
    return {
      type: 'semi',
      bannerClass: 'banner-semi',
      badge: '⚔️ SEMIFINAL (21º-24º)',
      posDisputa: 'Valendo 21º ao 24º Lugar',
      posSubtitle: 'Definição de Vaga 21º/22º ou 23º/24º',
      posLabel: 'Venc: Avança para Final 21º/22º | Perd: Disputa 23º/24º',
      isSemi: true,
      isFinal: false
    };
  }

  // 5. CHAVE REVERSA 25º–27º LUGAR
  if (code === 'R25_FINAL' || (/disputa 25[º°]/i.test(desc))) {
    return {
      type: 'final-placement',
      bannerClass: 'banner-placement-final',
      badge: '🏅 FINAL 25º LUGAR',
      posDisputa: 'Disputa de 25º e 26º Lugar',
      posSubtitle: 'Classificação Geral CBT',
      posLabel: 'Venc: 25º Lugar CBT | Perd: 26º Lugar CBT',
      isSemi: false,
      isFinal: true
    };
  }

  if (code === 'R25_SEMI_1' || code === 'R25_SEMI_2' || (/25[º°].*27[º°]/i.test(desc) && /semi/i.test(desc))) {
    return {
      type: 'semi',
      bannerClass: 'banner-semi',
      badge: '⚔️ SEMIFINAL (25º-27º)',
      posDisputa: 'Valendo 25º ao 27º Lugar',
      posSubtitle: 'Definição de Vaga 25º/26º ou 27º Lugar',
      posLabel: 'Venc: Avança para Final 25º/26º | Perd: Define 27º Lugar',
      isSemi: true,
      isFinal: false
    };
  }

  // Fallbacks genéricos para semifinais e finais
  if (/semifina/i.test(fase) || /semifina/i.test(desc) || code.includes('_SEMI')) {
    return {
      type: 'semi',
      bannerClass: 'banner-semi',
      badge: '⚔️ SEMIFINAL',
      posDisputa: 'Fase Semifinal',
      posSubtitle: 'Valendo Vaga na Decisão',
      posLabel: 'Vencedor avança para a Final da fase',
      isSemi: true,
      isFinal: false
    };
  }

  if ((/final/i.test(fase) && !/oitavas|quartas/i.test(fase)) || (/final/i.test(desc) && !/oitavas|quartas/i.test(desc)) || code.includes('FINAL') || code.includes('LUGAR')) {
    return {
      type: 'final-placement',
      bannerClass: 'banner-placement-final',
      badge: '🏅 FINAL',
      posDisputa: 'Fase Final',
      posSubtitle: 'Decisão de Colocação',
      posLabel: 'Definição das posições finais do torneio',
      isSemi: false,
      isFinal: true
    };
  }

  return null;
}

// Renderizador da Árvore de Jogos
function renderTreeBracket(games, subtab) {
  const tournament = store.getTournament() || {};

  // Agrupa jogos por fase
  const phasesMap = new Map();
  games.forEach(g => {
    let faseKey = g.fase;
    // Normaliza fase para que a Disputa de 3º e 4º (C32) fique sempre na mesma coluna da Final (abaixo da final C31)
    if (['Grande Final (1º e 2º)', 'Disputa 3º Lugar', 'Finais'].includes(g.fase) || g.code === 'C31' || g.code === 'C32') {
      faseKey = 'Finais';
    } else if (['Semifinal', 'Semifinais'].includes(g.fase) || g.code === 'C29' || g.code === 'C30') {
      faseKey = 'Semifinais';
    } else if (subtab === 'reversa_25_27' || (g.code && g.code.startsWith('R25_'))) {
      if (g.code.startsWith('R25_Q')) faseKey = 'Quartas de Final (25º-27º)';
      else if (g.code.startsWith('R25_SEMI')) faseKey = 'Semifinais (25º-27º)';
      else if (g.code === 'R25_FINAL') faseKey = 'Final (25º e 26º Lugar)';
    } else if (subtab === 'reversa_17_24' || subtab === 'reversa_17_27') {
      if (g.code.startsWith('R17_') && !g.code.includes('_Q') && !g.code.includes('_SEMI') && !g.code.includes('_FINAL') && !g.code.includes('_19')) {
        faseKey = '1ª Rodada (17º-24º)';
      } else if (g.code.startsWith('R17_Q')) {
        faseKey = 'Quartas de Final (17º-24º)';
      } else if (g.code.includes('_SEMI')) {
        faseKey = 'Semifinais (17º-24º)';
      } else if (g.code.includes('_FINAL') || g.code.includes('_19LUGAR') || g.code.includes('_23LUGAR')) {
        faseKey = 'Finais (17º ao 24º)';
      }
    }

    if (!phasesMap.has(faseKey)) {
      phasesMap.set(faseKey, []);
    }
    phasesMap.get(faseKey).push(g);
  });

  // Garante ordenação das Semifinais na Chave Principal: Semifinal A (C29) no topo e Semifinal B (C30) abaixo
  if (phasesMap.has('Semifinais')) {
    phasesMap.get('Semifinais').sort((a, b) => {
      if (a.code === 'C29') return -1;
      if (b.code === 'C29') return 1;
      if (a.code === 'C30') return 1;
      if (b.code === 'C30') return -1;
      return (a.code || '').localeCompare(b.code || '');
    });
  }
  if (phasesMap.has('Semifinal')) {
    phasesMap.get('Semifinal').sort((a, b) => {
      if (a.code === 'C29') return -1;
      if (b.code === 'C29') return 1;
      if (a.code === 'C30') return 1;
      if (b.code === 'C30') return -1;
      return (a.code || '').localeCompare(b.code || '');
    });
  }

  // Garante ordenação das Finais na Chave Principal: Grande Final (C31) no topo e Disputa de 3º e 4º (C32) abaixo
  if (phasesMap.has('Finais')) {
    phasesMap.get('Finais').sort((a, b) => {
      if (a.code === 'C31') return -1;
      if (b.code === 'C31') return 1;
      if (a.code === 'C32') return 1;
      if (b.code === 'C32') return -1;
      return 0;
    });
  }

  // Garante ordenação das Finais de 5º ao 8º: R5_FINAL (5º) no topo e R5_7LUGAR (7º) abaixo
  if (phasesMap.has('Finais (5º-8º)')) {
    phasesMap.get('Finais (5º-8º)').sort((a, b) => {
      if (a.code === 'R5_FINAL') return -1;
      if (b.code === 'R5_FINAL') return 1;
      return 0;
    });
  }

  // Garante ordenação das Semifinais e Finais de 9º ao 16º
  if (phasesMap.has('Semifinais (9º-16º)')) {
    const orderSemi = ['R9_SEMI_1', 'R9_SEMI_2', 'R13_SEMI_1', 'R13_SEMI_2'];
    phasesMap.get('Semifinais (9º-16º)').sort((a, b) => {
      return orderSemi.indexOf(a.code) - orderSemi.indexOf(b.code);
    });
  }

  if (phasesMap.has('Finais (9º-16º)')) {
    const orderFinals = ['R9_FINAL', 'R9_11LUGAR', 'R13_FINAL', 'R13_15LUGAR'];
    phasesMap.get('Finais (9º-16º)').sort((a, b) => {
      return orderFinals.indexOf(a.code) - orderFinals.indexOf(b.code);
    });
  }

  // Garante ordenação das Semifinais e Finais de 17º ao 24º
  if (phasesMap.has('Semifinais (17º-24º)')) {
    const orderSemi = ['R17_SEMI_1', 'R17_SEMI_2', 'R21_SEMI_1', 'R21_SEMI_2'];
    phasesMap.get('Semifinais (17º-24º)').sort((a, b) => {
      return orderSemi.indexOf(a.code) - orderSemi.indexOf(b.code);
    });
  }

  if (phasesMap.has('Finais (17º ao 24º)')) {
    const orderFinals = ['R17_FINAL', 'R17_19LUGAR', 'R21_FINAL', 'R21_23LUGAR'];
    phasesMap.get('Finais (17º ao 24º)').sort((a, b) => {
      return orderFinals.indexOf(a.code) - orderFinals.indexOf(b.code);
    });
  }

  // Ordena as colunas de fases na sequência cronológica do torneio
  const PHASE_ORDER = [
    '1ª Fase',
    'Oitavas de Final',
    '1ª Rodada (17º-24º)',
    '1ª Rodada (17º-27º)',
    'Quartas de Final',
    'Quartas de Final (9º-16º)',
    'Quartas de Final (17º-24º)',
    'Quartas de Final (17º-27º)',
    'Quartas de Final (25º-27º)',
    'Semifinais',
    'Semifinal',
    'Semifinais (5º-8º)',
    'Semifinais (9º-16º)',
    'Semifinais (17º-24º)',
    'Semifinais (17º-27º)',
    'Semifinais (25º-27º)',
    'Finais',
    'Finais (5º-8º)',
    'Finais (9º-16º)',
    'Finais (17º ao 24º)',
    'Finais (17º-27º)',
    'Final (25º e 26º Lugar)'
  ];

  const sortedEntries = Array.from(phasesMap.entries()).sort(([a], [b]) => {
    const idxA = PHASE_ORDER.indexOf(a);
    const idxB = PHASE_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  return `
    <div class="bracket-tree-container">
      <div class="bracket-rounds-wrapper">
        ${sortedEntries.map(([faseName, phaseGames]) => {
          const colDispute = getColumnDisputeBadge(faseName);
          return `
          <div class="bracket-round-column">
            <div class="round-header">
              <div class="round-title">${faseName}</div>
              ${colDispute ? `<div class="round-dispute-pill">${colDispute}</div>` : ''}
              <div class="round-subtitle">${phaseGames.length} ${phaseGames.length === 1 ? 'confronto' : 'confrontos'}</div>
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
  const isAdmin = Boolean(window.auth && typeof window.auth.isAdmin === 'function' && window.auth.isAdmin());
  const isBye = Boolean(game.is_bye);
  const isFirstRound = game.fase === '1ª Fase';

  const s = typeof store !== 'undefined' ? store : (window.store ? window.store : null);
  const feds = s ? s.getFederations() : [];
  const allGames = s ? s.getGames(game.categoria_id) : [];

  // Identificação robusta do vencedor da partida
  let winnerId = game.vencedor_id;
  if (!winnerId) {
    if (game.status === 'encerrado' || (game.vitorias_a || 0) >= 2 || (game.vitorias_b || 0) >= 2) {
      if ((game.vitorias_a || 0) > (game.vitorias_b || 0)) {
        winnerId = game.lado_a?.id || game.lado_a;
      } else if ((game.vitorias_b || 0) > (game.vitorias_a || 0)) {
        winnerId = game.lado_b?.id || game.lado_b;
      }
    }
  }
  if (winnerId && typeof winnerId === 'object' && winnerId.id) {
    winnerId = winnerId.id;
  }

  const isWinnerA = Boolean(winnerId && (game.lado_a?.id === winnerId || game.lado_a === winnerId));
  const isWinnerB = Boolean(winnerId && (game.lado_b?.id === winnerId || game.lado_b === winnerId));

  const winnerFedId = (typeof winnerId === 'string' ? winnerId : '').toLowerCase();
  const winnerTeam = isWinnerA ? game.lado_a : (isWinnerB ? game.lado_b : feds.find(f => f.id === winnerFedId));
  const winnerImg = (winnerFedId && winnerFedId !== 'bye') ? `assets/federations/${winnerFedId}.jpg` : '';

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
    if (isTeamBye || (game.bye_slot === slot && !team)) {
      const advancing = slot === 'A' ? (game.lado_b || game.lado_a) : (game.lado_a || game.lado_b);
      const advFedId = (advancing?.id || '').toLowerCase();
      const advImg = (advFedId && advFedId !== 'bye') ? `assets/federations/${advFedId}.jpg` : '';

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; min-width: 0;">
          <span style="color: #047857; font-weight: 800; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px;">
            ⏩ BYE
          </span>
          ${advImg ? `
            <div style="display: inline-flex; align-items: center; gap: 5px; background: #ecfdf5; border: 1.5px solid #86efac; padding: 2px 7px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" title="Avança de BYE: ${advancing.nome} (${advancing.uf})">
              <span style="font-size: 0.65rem; font-weight: 800; color: #047857;">Avança:</span>
              <img src="${advImg}" alt="${advancing.uf}" onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${advFedId}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${advFedId}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" style="width: 32px; height: 24px; border-radius: 3px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2); background: #ffffff; padding: 1px;">
              <strong style="font-size: 0.82rem; color: #166534;">${advancing.uf}</strong>
            </div>
          ` : ''}
        </div>
      `;
    }
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
    const fedId = (team.id || '').toLowerCase();
    const fedImg = `assets/federations/${fedId}.jpg`;

    return `
      <div style="display: flex; align-items: center; gap: 0.55rem; width: 100%; min-width: 0;">
        <img src="${fedImg}" alt="${team.uf}" onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${fedId}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${fedId}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" style="width: 32px; height: 26px; border-radius: 3px; object-fit: contain; box-shadow: 0 1px 3px rgba(0,0,0,0.18); border: 1px solid rgba(0,0,0,0.1); flex-shrink: 0; background: #ffffff; padding: 1px;">
        <span style="font-weight: 700; font-size: 0.88rem; color: #0f172a; white-space: normal; word-break: break-word; line-height: 1.25;" title="${team.nome}">${team.uf} - ${team.nome}</span>
        ${seedText ? `<span style="font-size: 0.68rem; color: #047857; font-weight: 800; background: #dcfce7; border: 1px solid #86efac; padding: 0.15rem 0.35rem; border-radius: 3px; flex-shrink: 0; margin-left: auto;">${seedText}</span>` : ''}
      </div>
    `;
  };

  // Cores de Vencedor (Verde) e Perdedor (Vermelho) limpas
  const bgA = isWinnerA ? '#dcfce7' : (isWinnerB ? '#fee2e2' : '#ffffff');
  const borderA = isWinnerA ? '#166534' : (isWinnerB ? '#991b1b' : '#e2e8f0');
  
  const bgB = isWinnerB ? '#dcfce7' : (isWinnerA ? '#fee2e2' : '#ffffff');
  const borderB = isWinnerB ? '#166534' : (isWinnerA ? '#991b1b' : '#e2e8f0');

  const byeClassifiedTeam = (isBye || slotAIsBye || slotBIsBye) ? (game.lado_a || game.lado_b) : null;
  const byeClassifiedFedId = (byeClassifiedTeam?.id || '').toLowerCase();
  const byeClassifiedImg = (byeClassifiedFedId && byeClassifiedFedId !== 'bye') ? `assets/federations/${byeClassifiedFedId}.jpg` : '';

  // Determina se o confronto é Semifinal ou Final para destaque visual premium e posições em disputa
  // 1ª Fase, Oitavas de Final e Quartas de Final NUNCA recebem destaque visual (devem ter o card branco padrão da 1ª fase)
  const isExcludedCard = 
    isFirstRound ||
    /oitavas/i.test(game.fase || '') || /oitavas/i.test(game.descricao || '') ||
    /quartas/i.test(game.fase || '') || /quartas/i.test(game.descricao || '') ||
    /^C(1[0-6]|[1-9])$/.test(game.code || '') ||
    /^C(1[7-9]|2[0-4])$/.test(game.code || '') ||
    /^C(2[5-8])$/.test(game.code || '') ||
    /^R9_[1-4]$/.test(game.code || '') ||
    /^R17_Q[1-4]$/.test(game.code || '') ||
    /^R25_Q[1-4]$/.test(game.code || '');

  const disputeInfo = isExcludedCard ? null : getMatchDisputeInfo(game);
  const isFinalGold = disputeInfo?.type === 'final-gold';
  const isFinalBronze = disputeInfo?.type === 'final-bronze';
  const isPlacementFinal = disputeInfo?.type === 'final-placement';
  const isSemi = disputeInfo?.type === 'semi';

  let phaseCardClass = '';
  let cardBg = '#ffffff';
  let cardBorder = '1px solid #e2e8f0';
  let cardShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
  let headerBorderColor = '#f1f5f9';
  let footerBorderColor = '#cbd5e1';
  let codeTagBg = '#334155';
  let phasePill = '';

  if (!isExcludedCard && disputeInfo) {
    if (isFinalGold) {
      phaseCardClass = 'is-final-gold';
      cardBg = 'linear-gradient(145deg, #fffdf0 0%, #fef3c7 45%, #fef9c3 100%)';
      cardBorder = '2px solid #f59e0b';
      cardShadow = '0 6px 20px rgba(245, 158, 11, 0.35)';
      headerBorderColor = 'rgba(245, 158, 11, 0.35)';
      footerBorderColor = 'rgba(245, 158, 11, 0.35)';
      codeTagBg = 'linear-gradient(135deg, #d97706, #92400e)';
      phasePill = `<span style="background: #fef08a; color: #854d0e; font-weight: 800; font-size: 0.68rem; padding: 0.12rem 0.45rem; border-radius: 4px; border: 1px solid #eab308; box-shadow: 0 1px 3px rgba(0,0,0,0.08); display: inline-flex; align-items: center; gap: 3px;">${disputeInfo.badge}</span>`;
    } else if (isFinalBronze) {
      phaseCardClass = 'is-final-bronze';
      cardBg = 'linear-gradient(145deg, #fffaf5 0%, #fed7aa 45%, #ffedd5 100%)';
      cardBorder = '1.5px solid #f97316';
      cardShadow = '0 5px 16px rgba(249, 115, 22, 0.25)';
      headerBorderColor = 'rgba(249, 115, 22, 0.3)';
      footerBorderColor = 'rgba(249, 115, 22, 0.3)';
      codeTagBg = 'linear-gradient(135deg, #c2410c, #7c2d12)';
      phasePill = `<span style="background: #ffedd5; color: #9a3412; font-weight: 800; font-size: 0.68rem; padding: 0.12rem 0.45rem; border-radius: 4px; border: 1px solid #fdba74; display: inline-flex; align-items: center; gap: 3px;">${disputeInfo.badge}</span>`;
    } else if (isPlacementFinal) {
      phaseCardClass = 'is-final-placement';
      cardBg = 'linear-gradient(145deg, #fefce8 0%, #fef08a 45%, #ffffff 100%)';
      cardBorder = '1.5px solid #eab308';
      cardShadow = '0 4px 14px rgba(234, 179, 8, 0.22)';
      headerBorderColor = 'rgba(234, 179, 8, 0.3)';
      footerBorderColor = 'rgba(234, 179, 8, 0.3)';
      codeTagBg = 'linear-gradient(135deg, #ca8a04, #854d0e)';
      phasePill = `<span style="background: #fef9c3; color: #713f12; font-weight: 800; font-size: 0.68rem; padding: 0.12rem 0.45rem; border-radius: 4px; border: 1px solid #facc15; display: inline-flex; align-items: center; gap: 3px;">${disputeInfo.badge}</span>`;
    } else if (isSemi) {
      phaseCardClass = 'is-semifinal';
      cardBg = 'linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 55%, #f8fafc 100%)';
      cardBorder = '1.5px solid #38bdf8';
      cardShadow = '0 4px 14px rgba(14, 165, 233, 0.22)';
      headerBorderColor = 'rgba(56, 189, 248, 0.35)';
      footerBorderColor = 'rgba(56, 189, 248, 0.35)';
      codeTagBg = 'linear-gradient(135deg, #0284c7, #0369a1)';
      phasePill = `<span style="background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 0.68rem; padding: 0.12rem 0.45rem; border-radius: 4px; border: 1px solid #7dd3fc; display: inline-flex; align-items: center; gap: 3px;">${disputeInfo.badge}</span>`;
    }
  }

  const fullMatchDesc = game.descricao || (
    game.code === 'C31' ? 'Grande Final (1º e 2º Lugar)' :
    game.code === 'C32' ? 'Disputa de 3º e 4º Lugar' :
    game.fase || 'Confronto'
  );

  const courtName = game.quadra_id ? (s && typeof s.getCourtName === 'function' ? s.getCourtName(game.quadra_id) : game.quadra_id) : '';
  const hasCourtOrTime = Boolean(courtName || game.horario);

  const statusBadgeHtml = isBye ? `
    <span class="badge-status encerrado" style="font-size: 0.65rem; padding: 0.18rem 0.5rem; border-radius: 12px; font-weight: 800; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; white-space: nowrap;">
      ⏩ BYE
    </span>
  ` : game.status === 'encerrado' ? `
    <span class="badge-status encerrado" style="font-size: 0.65rem; padding: 0.18rem 0.5rem; border-radius: 12px; font-weight: 800; background: #dcfce7; color: #15803d; border: 1px solid #86efac; white-space: nowrap; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
      ✓ ENCERRADO
    </span>
  ` : game.status === 'em andamento' ? `
    <span class="badge-status em_andamento" style="font-size: 0.65rem; padding: 0.18rem 0.5rem; border-radius: 12px; font-weight: 800; background: #e0f2fe; color: #0284c7; border: 1px solid #7dd3fc; white-space: nowrap;">
      🔵 AO VIVO
    </span>
  ` : `
    <span class="badge-status aguardando" style="font-size: 0.65rem; padding: 0.18rem 0.5rem; border-radius: 12px; font-weight: 800; background: #f8fafc; color: #64748b; border: 1px solid #cbd5e1; white-space: nowrap;">
      AGUARDANDO
    </span>
  `;

  return `
    <div class="bracket-match-card ${phaseCardClass} ${game.status === 'em andamento' ? 'is-live' : ''} ${game.status === 'encerrado' ? 'is-finished' : ''} ${isBye ? 'is-bye' : ''} ${isFirstRound ? 'is-first-round' : ''}" style="height: auto; width: 100%; box-sizing: border-box; padding: 0.6rem 0.75rem; border-radius: 8px; box-shadow: ${cardShadow}; border: ${cardBorder}; background: ${cardBg}; cursor: default; display: flex; flex-direction: column; position: relative; overflow: hidden;">

      <!-- CABEÇALHO DO CARD COM TODAS AS INFORMAÇÕES VISÍVEIS -->
      <div class="match-card-header" style="margin-bottom: 0.45rem; border-bottom: 1px solid ${headerBorderColor}; padding-bottom: 0.4rem; display: flex; flex-direction: column; gap: 0.25rem;">
        
        <!-- Linha 1: Código, Título Completo e Badge de Status -->
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.45rem; width: 100%;">
          <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; flex: 1; min-width: 0;">
            <span class="match-code-tag" style="background: ${codeTagBg}; color: white; padding: 0.18rem 0.5rem; border-radius: 4px; font-size: 0.78rem; font-weight: 800; letter-spacing: 0.02em; flex-shrink: 0;">
              ${game.code}
            </span>
            <span style="font-size: 0.78rem; color: #1e293b; font-weight: 800; line-height: 1.25; word-break: break-word;" title="${fullMatchDesc}">
              ${fullMatchDesc}
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0;">
            ${statusBadgeHtml}
            ${isAdmin ? `
              <button style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; font-size: 0.75rem; padding: 0.15rem 0.35rem; box-shadow: 0 1px 2px rgba(0,0,0,0.06);" onclick="window.openChangeTeamSlotModal('${game.code}', '${game.categoria_id}')" title="Editar Confronto (Selecionar Estados)">✏️</button>
            ` : ''}
          </div>
        </div>

        <!-- Linha 2: Local/Horário e/ou Destino e Avanço -->
        ${(hasCourtOrTime || game.proxima_fase || (game.status === 'encerrado' && winnerFedId)) ? `
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.2rem 0.5rem; font-size: 0.68rem; padding-top: 0.1rem; color: #64748b;">
            ${hasCourtOrTime ? `
              <span style="font-weight: 700; color: #0284c7; display: inline-flex; align-items: center; gap: 3px;" title="Local e Horário da Partida">
                🏟️ ${courtName || 'Quadra'} ${game.horario ? `• ⏰ ${game.horario}` : ''}
              </span>
            ` : ''}

            ${game.status === 'encerrado' ? `
              <span style="font-weight: 700; color: #166534; display: inline-flex; align-items: center; gap: 3px; margin-left: auto;">
                🏆 Avançou: <strong>${winnerTeam?.uf || (typeof winnerId === 'string' ? winnerId.toUpperCase() : '')}</strong>
                ${game.proxima_fase ? `<span style="color: #64748b; font-weight: 600;">(p/ ${game.proxima_fase})</span>` : ''}
              </span>
            ` : (game.proxima_fase ? `
              <span style="color: #64748b; font-weight: 600; margin-left: auto;" title="Próxima Fase do Vencedor">
                Avança p/: <strong style="color: #0f172a;">${game.proxima_fase}</strong>
                ${game.proxima_fase_perdedor ? `• Perd: <strong>${game.proxima_fase_perdedor}</strong>` : ''}
              </span>
            ` : '')}
          </div>
        ` : ''}
      </div>

      <!-- BANNER DE POSIÇÃO EM DISPUTA (SEMIFINAIS E FINAIS) -->
      ${disputeInfo ? `
        <div class="match-dispute-banner ${disputeInfo.bannerClass}">
          <div class="dispute-main">
            <span class="dispute-target-badge">${disputeInfo.posDisputa}</span>
            <span class="dispute-badge-pill">${disputeInfo.badge}</span>
          </div>
          <div class="dispute-rules">
            <span>${disputeInfo.posLabel}</span>
          </div>
        </div>
      ` : ''}

      <!-- TIME A -->
      <div class="match-team-row ${isWinnerA ? 'is-winner' : (isWinnerB ? 'is-loser' : '')}"
           ${isAdmin ? `onclick="window.openChangeTeamSlotModal('${game.code}', '${game.categoria_id}')" title="💡 Clique para selecionar os dois estados deste confronto"` : `title="Confronto oficial"`}
           style="display: flex; justify-content: space-between; align-items: center; padding: 0.35rem 0.5rem; background: ${bgA}; border-radius: 4px; margin-bottom: 0.3rem; border: 1px solid ${borderA}; min-height: 36px; cursor: ${isAdmin ? 'pointer' : 'default'}; transition: all 0.15s ease;"
           ${isAdmin ? `onmouseover="this.style.boxShadow='0 0 0 2px #028090'" onmouseout="this.style.boxShadow='none'"` : ''}>
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
           ${isAdmin ? `onclick="window.openChangeTeamSlotModal('${game.code}', '${game.categoria_id}')" title="💡 Clique para selecionar os dois estados deste confronto"` : `title="Confronto oficial"`}
           style="display: flex; justify-content: space-between; align-items: center; padding: 0.35rem 0.5rem; background: ${bgB}; border-radius: 4px; border: 1px solid ${borderB}; min-height: 36px; cursor: ${isAdmin ? 'pointer' : 'default'}; transition: all 0.15s ease;"
           ${isAdmin ? `onmouseover="this.style.boxShadow='0 0 0 2px #028090'" onmouseout="this.style.boxShadow='none'"` : ''}>
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
      <div class="match-footer-details" style="margin-top: 0.4rem; padding-top: 0.4rem; border-top: 1px dashed ${footerBorderColor};">
        ${isBye ? `
          <div style="display: flex; align-items: center; justify-content: space-between; background: #ecfdf5; border: 1.5px solid #a7f3d0; padding: 0.4rem 0.65rem; border-radius: 6px;">
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 0.72rem; color: #047857; font-weight: 800;">⏩ CLASSIFICADO DE BYE</span>
              <span style="font-size: 0.65rem; color: #065f46; font-weight: 600;">Avança direto para ${game.proxima_fase || 'próxima fase'}</span>
            </div>
            ${byeClassifiedImg ? `
              <div style="display: flex; align-items: center; gap: 6px; background: #ffffff; padding: 2px 8px; border-radius: 4px; border: 1px solid #86efac; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" title="Classificado: ${byeClassifiedTeam?.nome || ''}">
                <img src="${byeClassifiedImg}" alt="${byeClassifiedTeam?.uf || ''}" onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${byeClassifiedFedId}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${byeClassifiedFedId}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" style="width: 44px; height: 34px; border-radius: 3px; object-fit: contain; box-shadow: 0 2px 4px rgba(0,0,0,0.2); background: #ffffff; padding: 2px;">
                <strong style="font-size: 0.82rem; color: #166534;">${byeClassifiedTeam?.uf || ''}</strong>
              </div>
            ` : ''}
          </div>
        ` : `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <!-- SUBJOGOS (F, M, DX) -->
            <div style="display: flex; flex-direction: column; gap: 0.25rem; flex: 1; min-width: 0;">
               <!-- F -->
               <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.1rem 0; gap: 4px;">
                 <strong style="color:#64748b; font-size: 0.72rem; width: 18px; flex-shrink: 0;" title="Feminino">F</strong>
                 <input type="text" placeholder="_/_ _/_ _/_" value="${game.placar_jogo1 || ''}" style="width: 86px; font-size:0.65rem; padding:0.18rem 0.2rem; border:1px solid #cbd5e1; border-radius:3px; outline:none; text-align:center; color: #334155; ${!isAdmin ? 'background: #f1f5f9; cursor: not-allowed; opacity: 0.8;' : ''}" oninput="window.maskScore(this)" onchange="window.inlineUpdateScore('${game.code}', '${game.categoria_id}', '1', 'placar', this.value)" ${!isAdmin ? 'disabled' : ''}>
                 <select style="width: 72px; font-size:0.65rem; padding:0.18rem 0.2rem; border:1px solid #cbd5e1; border-radius:3px; outline:none; font-weight: 700; color: #334155; ${!isAdmin ? 'background: #f1f5f9; cursor: not-allowed; opacity: 0.8;' : ''}" onchange="window.inlineUpdateScore('${game.code}', '${game.categoria_id}', '1', 'vencedor', this.value)" ${!isAdmin ? 'disabled' : ''}>
                    <option value="" ${!game.resultado_jogo1 ? 'selected' : ''}>-Venc-</option>
                    <option value="a" ${String(game.resultado_jogo1).toLowerCase() === 'a' ? 'selected' : ''}>Eq. A</option>
                    <option value="b" ${String(game.resultado_jogo1).toLowerCase() === 'b' ? 'selected' : ''}>Eq. B</option>
                 </select>
               </div>
               
               <!-- M -->
               <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.1rem 0; gap: 4px;">
                 <strong style="color:#64748b; font-size: 0.72rem; width: 18px; flex-shrink: 0;" title="Masculino">M</strong>
                 <input type="text" placeholder="_/_ _/_ _/_" value="${game.placar_jogo2 || ''}" style="width: 86px; font-size:0.65rem; padding:0.18rem 0.2rem; border:1px solid #cbd5e1; border-radius:3px; outline:none; text-align:center; color: #334155; ${!isAdmin ? 'background: #f1f5f9; cursor: not-allowed; opacity: 0.8;' : ''}" oninput="window.maskScore(this)" onchange="window.inlineUpdateScore('${game.code}', '${game.categoria_id}', '2', 'placar', this.value)" ${!isAdmin ? 'disabled' : ''}>
                 <select style="width: 72px; font-size:0.65rem; padding:0.18rem 0.2rem; border:1px solid #cbd5e1; border-radius:3px; outline:none; font-weight: 700; color: #334155; ${!isAdmin ? 'background: #f1f5f9; cursor: not-allowed; opacity: 0.8;' : ''}" onchange="window.inlineUpdateScore('${game.code}', '${game.categoria_id}', '2', 'vencedor', this.value)" ${!isAdmin ? 'disabled' : ''}>
                    <option value="" ${!game.resultado_jogo2 ? 'selected' : ''}>-Venc-</option>
                    <option value="a" ${String(game.resultado_jogo2).toLowerCase() === 'a' ? 'selected' : ''}>Eq. A</option>
                    <option value="b" ${String(game.resultado_jogo2).toLowerCase() === 'b' ? 'selected' : ''}>Eq. B</option>
                 </select>
               </div>
               
               <!-- DX -->
               <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.1rem 0; gap: 4px;">
                 <strong style="color:#64748b; font-size: 0.72rem; width: 18px; flex-shrink: 0;" title="Dupla Mista">DX</strong>
                 <input type="text" placeholder="_/_ _/_ _/_" value="${game.placar_jogo3 || ''}" style="width: 86px; font-size:0.65rem; padding:0.18rem 0.2rem; border:1px solid #cbd5e1; border-radius:3px; outline:none; text-align:center; color: #334155; ${!isAdmin ? 'background: #f1f5f9; cursor: not-allowed; opacity: 0.8;' : ''}" oninput="window.maskScore(this)" onchange="window.inlineUpdateScore('${game.code}', '${game.categoria_id}', '3', 'placar', this.value)" ${!isAdmin ? 'disabled' : ''}>
                 <select style="width: 72px; font-size:0.65rem; padding:0.18rem 0.2rem; border:1px solid #cbd5e1; border-radius:3px; outline:none; font-weight: 700; color: #334155; ${!isAdmin ? 'background: #f1f5f9; cursor: not-allowed; opacity: 0.8;' : ''}" onchange="window.inlineUpdateScore('${game.code}', '${game.categoria_id}', '3', 'vencedor', this.value)" ${!isAdmin ? 'disabled' : ''}>
                    <option value="" ${!game.resultado_jogo3 ? 'selected' : ''}>-Venc-</option>
                    <option value="a" ${String(game.resultado_jogo3).toLowerCase() === 'a' ? 'selected' : ''}>Eq. A</option>
                    <option value="b" ${String(game.resultado_jogo3).toLowerCase() === 'b' ? 'selected' : ''}>Eq. B</option>
                 </select>
               </div>
            </div>

            <!-- BRASÃO MAIOR DA EQUIPE QUE VENCEU A PARTIDA (CONFRONTO) -->
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 62px; padding: 0.2rem 0.25rem 0.2rem 0.45rem; border-left: 1px dashed #cbd5e1; flex-shrink: 0; text-align: center;">
              ${winnerImg ? `
                <span style="font-size: 0.58rem; font-weight: 800; color: #15803d; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.02em;">VENCEDOR</span>
                <img src="${winnerImg}" alt="${winnerTeam?.uf || ''}" title="Equipe Vencedora do Confronto: ${winnerTeam?.nome || winnerFedId.toUpperCase()}" onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${winnerFedId}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${winnerFedId}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" style="width: 48px; height: 38px; border-radius: 4px; object-fit: contain; box-shadow: 0 2px 6px rgba(0,0,0,0.2); border: 1px solid rgba(0,0,0,0.14); background: #ffffff; padding: 2px;">
                <span style="font-size: 0.68rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${winnerTeam?.uf || winnerFedId.toUpperCase()}</span>
              ` : `
                <span style="font-size: 0.56rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px;">VENCEDOR</span>
                <div style="width: 48px; height: 38px; border-radius: 4px; border: 1.5px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; color: #94a3b8; background: #f8fafc;" title="Aguardando vencedor da partida">
                  🏆
                </div>
                <span style="font-size: 0.62rem; font-weight: 600; color: #94a3b8; margin-top: 2px;">Aguardando</span>
              `}
            </div>
          </div>
        `}
      </div>
    </div>
  `;
}

// Renderizador em Tabela de Lista Completa
function renderTableBracket(games) {
  const isAdmin = Boolean(window.auth && typeof window.auth.isAdmin === 'function' && window.auth.isAdmin());
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
                  ? `<div style="display: inline-flex; align-items: center; gap: 0.5rem;"><img src="assets/federations/${(g.lado_a.id || '').toLowerCase()}.jpg" alt="${g.lado_a.uf}" onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${(g.lado_a.id || '').toLowerCase()}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${(g.lado_a.id || '').toLowerCase()}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" style="width: 30px; height: 22px; border-radius: 2px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2); vertical-align: middle; background: #ffffff; padding: 1px;"> <strong>${g.lado_a.nome} (${g.lado_a.uf})</strong></div>` 
                  : '<span style="color: var(--text-muted); font-style: italic;">Aguardando</span>');

            const teamB = isByeB 
              ? '<span style="color: #059669; font-weight: 800;">⏩ BYE</span>' 
              : (g.lado_b 
                  ? `<div style="display: inline-flex; align-items: center; gap: 0.5rem;"><img src="assets/federations/${(g.lado_b.id || '').toLowerCase()}.jpg" alt="${g.lado_b.uf}" onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${(g.lado_b.id || '').toLowerCase()}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${(g.lado_b.id || '').toLowerCase()}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" style="width: 30px; height: 22px; border-radius: 2px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2); vertical-align: middle; background: #ffffff; padding: 1px;"> <strong>${g.lado_b.nome} (${g.lado_b.uf})</strong></div>` 
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
              const winFedId = (winningTeamObj?.id || '').toLowerCase();
              winner = winningTeamObj
                ? `<div style="display: inline-flex; align-items: center; gap: 0.5rem;"><img src="assets/federations/${winFedId}.jpg" alt="${winningTeamObj.uf}" onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${winFedId}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${winFedId}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" style="width: 30px; height: 22px; border-radius: 2px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2); vertical-align: middle; background: #ffffff; padding: 1px;"> <strong>${winningTeamObj.nome} (${winningTeamObj.uf})</strong> <span style="font-size: 0.65rem; color: #059669; background: #ecfdf5; padding: 0.1rem 0.3rem; border-radius: 2px; border: 1px solid #a7f3d0;">BYE</span></div>`
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

            const disputeInfo = getMatchDisputeInfo(g);

            return `
              <tr>
                <td><strong>${g.code}</strong></td>
                <td>
                  <span style="font-size: 0.8rem; font-weight: 700;">${g.fase}</span>
                  ${disputeInfo ? `<div style="font-size: 0.68rem; font-weight: 700; color: #b45309; margin-top: 2px;">${disputeInfo.posDisputa}</div>` : ''}
                </td>
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
                  <button class="btn btn-sm ${isAdmin ? 'btn-primary' : 'btn-outline'}" onclick="${editAction}">
                    ${isAdmin ? '✏️ Editar' : '👁️ Ver'}
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
