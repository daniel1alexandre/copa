// Módulo Cabeça de Chave - Cálculo Oficial dos 6 Primeiros Estados por Categoria (CBT)
import { store } from '../data/store.js';

let selectedCategory = 'todas'; // 'todas' ou id da categoria ('prof', 'cat_a', etc.)

function getRankNumber(ath) {
  if (!ath || !ath.ranking) return null;
  const n = parseInt(String(ath.ranking).replace(/\D/g, ''), 10);
  return isNaN(n) ? null : n;
}

export function calculateCategorySeeds(categoryId) {
  return store.calculateCategorySeeds(categoryId);
}

export function initSeedView() {
  window.selectSeedCategoryTab = (catId) => {
    selectedCategory = catId;
    if (catId && catId !== 'todas') {
      window.selectedTournamentCategory = catId;
    }
    renderSeedView();
  };

  window.handlePrintSeeds = () => {
    window.print();
  };

  window.handleSelectDrawnSeed = (catId, slotIndex, fedId) => {
    if (!window.auth || typeof window.auth.isAdmin !== 'function' || !window.auth.isAdmin()) {
      if (window.toast && typeof window.toast.show === 'function') {
        window.toast.show({
          title: 'Acesso Restrito',
          message: 'Apenas administradores podem sortear ou selecionar estados para as vagas de cabeça de chave.',
          type: 'warning'
        });
      }
      return;
    }
    if (catId && catId !== 'todas') {
      window.selectedTournamentCategory = catId;
    }
    store.setCategoryDrawnSeed(catId, slotIndex, fedId || null);
    renderSeedView();
    if (window.toast && typeof window.toast.show === 'function') {
      const fed = fedId ? store.getFederation(fedId) : null;
      window.toast.show({
        title: 'Vaga Atualizada',
        message: fed ? `${fed.nome} (${fed.uf}) selecionado para a vaga #${slotIndex} de Cabeça de Chave.` : `Vaga #${slotIndex} liberada para sorteio.`,
        type: 'success'
      });
    }
  };
}

export function renderSeedView() {
  const container = document.getElementById('view-cabeca-chave');
  if (!container) return;

  const categories = store.getActiveCategories();
  const currentCatObj = categories.find(c => c.id === selectedCategory);

  let html = `
    <div class="seeds-header-wrapper" style="margin-bottom: 24px;">
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; background: linear-gradient(135deg, #0b1a30 0%, #028090 100%); color: #fff; padding: 24px; border-radius: 16px; box-shadow: 0 10px 25px rgba(2, 128, 144, 0.2);">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <span style="font-size: 28px;">👑</span>
            <h1 style="font-size: 24px; font-weight: 800; margin: 0; color: #fff; letter-spacing: -0.5px;">
              Cabeças de Chave por Categoria
            </h1>
            <span style="background: rgba(255, 183, 3, 0.25); color: #ffb703; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(255, 183, 3, 0.5);">
              Oficial CBT
            </span>
          </div>
          <p style="margin: 0; font-size: 13.5px; opacity: 0.9; max-width: 820px; line-height: 1.5;">
            Definição e ordenação dos <strong>6 Primeiros Estados Cabeças de Chave</strong> com base no regulamento oficial da Confederação Brasileira de Tênis.
          </p>
        </div>

        <div style="display: flex; gap: 10px;">
          <button class="btn-primary" onclick="window.handlePrintSeeds()" style="background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); color: #fff; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            🖨️ Imprimir / PDF
          </button>
        </div>
      </div>

      <!-- CRITÉRIOS OFICIAIS CBT (CARD EXPLICATIVO) -->
      <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-top: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        <div style="font-weight: 700; font-size: 13px; color: #028090; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
          <span>📋</span> Critérios Oficiais de Apuração dos Cabeças de Chave
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; font-size: 12.5px; color: #475569; line-height: 1.45;">
          <div style="background: #f8fafc; padding: 10px 14px; border-radius: 8px; border-left: 3px solid #028090;">
            <strong style="color: #0f172a;">I – Soma dos Rankings:</strong> Considera-se a soma das posições de ranking dos <strong>2 melhores atletas femininos</strong> e dos <strong>2 melhores atletas masculinos</strong> de cada federação.
          </div>
          <div style="background: #f8fafc; padding: 10px 14px; border-radius: 8px; border-left: 3px solid #ffb703;">
            <strong style="color: #0f172a;">II – Critério de Desempate:</strong> Em caso de empate na soma, utiliza-se a <strong>classificação final na Copa das Federações do ano anterior</strong> (SP 1º, RJ 2º, PR 3º, SC 4º, RS 5º, MG 6º, BA 7º, DF 8º).
          </div>
          <div style="background: #f8fafc; padding: 10px 14px; border-radius: 8px; border-left: 3px solid #ef4444;">
            <strong style="color: #0f172a;">III – Composição Mínima:</strong> Caso a equipe não possua ao menos 02 atletas por gênero para compor a soma, a pontuação do gênero incompleto é <strong>igual a zero</strong>.
          </div>
        </div>
      </div>

      <!-- SELETOR DE CATEGORIAS EM ABAS / PILLS -->
      <div style="display: flex; gap: 8px; overflow-x: auto; padding: 14px 2px 4px 2px; margin-top: 8px;">
        <button 
          onclick="window.selectSeedCategoryTab('todas')" 
          style="padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 13px; cursor: pointer; white-space: nowrap; border: 1px solid ${selectedCategory === 'todas' ? '#028090' : '#cbd5e1'}; background: ${selectedCategory === 'todas' ? '#028090' : '#fff'}; color: ${selectedCategory === 'todas' ? '#fff' : '#475569'}; box-shadow: ${selectedCategory === 'todas' ? '0 4px 12px rgba(2, 128, 144, 0.3)' : 'none'}; transition: all 0.2s ease;">
          🌐 Visão Geral (Todas as Categorias)
        </button>
  `;

  categories.forEach(cat => {
    const isSelected = selectedCategory === cat.id;
    html += `
      <button 
        onclick="window.selectSeedCategoryTab('${cat.id}')" 
        style="padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 13px; cursor: pointer; white-space: nowrap; border: 1px solid ${isSelected ? '#028090' : '#cbd5e1'}; background: ${isSelected ? '#028090' : '#fff'}; color: ${isSelected ? '#fff' : '#475569'}; box-shadow: ${isSelected ? '0 4px 12px rgba(2, 128, 144, 0.3)' : 'none'}; transition: all 0.2s ease;">
        🎾 ${cat.nome}
      </button>
    `;
  });

  html += `
      </div>
    </div>
  `;

  // RENDERIZAÇÃO DO CONTEÚDO
  if (selectedCategory === 'todas') {
    html += renderOverviewAllCategories(categories);
  } else if (currentCatObj) {
    html += renderSingleCategoryDetailed(currentCatObj);
  }

  container.innerHTML = html;
}

// Visão Geral: Mostra os 6 primeiros de todas as 11 categorias
function renderOverviewAllCategories(categories) {
  let html = `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px;">
  `;

  const isAdmin = Boolean(window.auth && typeof window.auth.isAdmin === 'function' && window.auth.isAdmin());

  categories.forEach(cat => {
    const rankedList = calculateCategorySeeds(cat.id);
    const pointsList = rankedList.filter(item => item.hasPoints);
    const headCount = Math.min(6, pointsList.length);
    const topHeads = pointsList.slice(0, headCount);
    const drawnSeeds = store.getCategoryDrawnSeeds(cat.id);
    const participatingFeds = store.getCategoryParticipatingFeds(cat.id);

    // Estados que NÃO podem ser selecionados: os já definidos como cabeças de chave oficiais
    const officialSeedIds = topHeads.map(h => h.id);

    html += `
      <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
        
        <!-- Header da Categoria -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 16px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px;">
              <span>🎾</span> ${cat.nome}
            </div>
            <div style="font-size: 11.5px; color: #94a3b8; margin-top: 2px;">
              ${headCount === 6 ? '6 Cabeças Definidos por Pontuação CBT' : `${headCount} Cabeça(s) por Pontuação CBT + ${6 - headCount} Vaga(s) para Sorteio`}
            </div>
          </div>
          <button 
            onclick="window.selectSeedCategoryTab('${cat.id}')"
            style="background: rgba(2, 128, 144, 0.25); border: 1px solid rgba(2, 128, 144, 0.5); color: #38bdf8; font-size: 11px; font-weight: 700; padding: 5px 10px; border-radius: 6px; cursor: pointer;">
            Ver Detalhes ➜
          </button>
        </div>

        <!-- Lista dos Cabeças de Chave -->
        <div style="padding: 12px 16px; flex: 1; display: flex; flex-direction: column; gap: 8px;">
    `;

    const currentSeeds = store.getCategorySeeds(cat.id);

    topHeads.forEach((item, idx) => {
      const pos = idx + 1;
      const defaultCbtFed = item;
      const currentFedId = drawnSeeds[pos] || defaultCbtFed.id;
      const isAltered = Boolean(drawnSeeds[pos] && drawnSeeds[pos] !== defaultCbtFed.id);
      const displayRankedItem = rankedList.find(r => r.id === currentFedId) || defaultCbtFed;
      const displayFed = store.getFederation(currentFedId) || defaultCbtFed;

      const assignedInOtherSlots = currentSeeds.filter((id, i) => i !== (pos - 1) && id);
      const availableFeds = participatingFeds.filter(f => !assignedInOtherSlots.includes(f.id)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      let badgeColor = '#64748b';
      let badgeBg = '#f1f5f9';
      let icon = `${pos}º`;

      if (pos === 1) {
        badgeColor = '#b45309';
        badgeBg = '#fef3c7';
        icon = '👑 1º';
      } else if (pos === 2) {
        badgeColor = '#475569';
        badgeBg = '#e2e8f0';
        icon = '🥈 2º';
      } else if (pos === 3) {
        badgeColor = '#9a3412';
        badgeBg = '#ffedd5';
        icon = '🥉 3º';
      }

      html += `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: ${isAltered ? '#fffbeb' : '#f8fafc'}; border-radius: 8px; border: 1px solid ${isAltered ? '#fde68a' : '#edf2f7'}; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
            <span style="font-size: 11px; font-weight: 800; color: ${badgeColor}; background: ${badgeBg}; padding: 3px 8px; border-radius: 12px; white-space: nowrap;">
              ${icon}
            </span>
            <img src="${displayFed.imagem || `assets/federations/${displayFed.id}.png`}" alt="${displayFed.uf}" style="width: 24px; height: 18px; object-fit: cover; border-radius: 3px; border: 1px solid #cbd5e1;" onerror="this.src='assets/federations/${displayFed.id}.jpg'">
            <div style="min-width: 0;">
              <strong style="font-size: 13px; color: #0f172a;">${displayFed.uf}</strong>
              <span style="font-size: 11px; color: ${isAltered ? '#b45309' : '#64748b'}; margin-left: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 110px; display: inline-block; vertical-align: bottom;">
                ${isAltered ? `(Congresso)` : displayFed.nome}
              </span>
            </div>
          </div>

          <div style="text-align: right; white-space: nowrap;">
            ${isAdmin ? `
              <select 
                onchange="window.handleSelectDrawnSeed('${cat.id}', ${pos}, this.value)" 
                title="Alterar cabeça de chave no Congresso Técnico"
                style="font-size: 11px; font-weight: 700; padding: 3px 6px; border-radius: 6px; border: 1px solid ${isAltered ? '#f59e0b' : '#cbd5e1'}; background: ${isAltered ? '#fffbeb' : '#fff'}; color: #0f172a; max-width: 145px; cursor: pointer;">
                <option value="">👑 ${defaultCbtFed.uf} (Oficial CBT: ${defaultCbtFed.somaRankings !== null ? `${defaultCbtFed.somaRankings} pts` : 'S/R'})</option>
                ${availableFeds.map(f => `
                  <option value="${f.id}" ${currentFedId === f.id && isAltered ? 'selected' : ''}>
                    ${f.uf} - ${f.nome}
                  </option>
                `).join('')}
              </select>
            ` : `
              <span style="font-size: 12.5px; font-weight: 800; color: ${isAltered ? '#b45309' : '#028090'};">
                ${displayRankedItem.somaRankings !== null ? `${displayRankedItem.somaRankings} pts` : 'Sem ranking'}
              </span>
            `}
          </div>
        </div>
      `;
    });

    for (let i = headCount; i < 6; i++) {
      const pos = i + 1;
      const selectedFedId = drawnSeeds[pos] || null;
      const selectedFed = selectedFedId ? store.getFederation(selectedFedId) : null;

      // Estados elegíveis para sorteio: exclui qualquer estado que já esteja em outro slot
      const assignedInOtherSlots = currentSeeds.filter((id, idx) => idx !== (pos - 1) && id);
      const availableFeds = participatingFeds.filter(f => !assignedInOtherSlots.includes(f.id)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      html += `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; background: ${selectedFed ? '#f0fdf4' : '#fafafa'}; border-radius: 8px; border: 1px dashed ${selectedFed ? '#86efac' : '#cbd5e1'}; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
            <span style="font-size: 11px; font-weight: 800; color: ${selectedFed ? '#15803d' : '#94a3b8'}; background: ${selectedFed ? '#dcfce7' : '#f1f5f9'}; padding: 3px 8px; border-radius: 12px; white-space: nowrap;">
              🎲 ${pos}º
            </span>
            ${selectedFed ? `
              <img src="${selectedFed.imagem || `assets/federations/${selectedFed.id}.png`}" alt="${selectedFed.uf}" style="width: 24px; height: 18px; object-fit: cover; border-radius: 3px; border: 1px solid #cbd5e1;" onerror="this.src='assets/federations/${selectedFed.id}.jpg'">
              <div style="min-width: 0;">
                <strong style="font-size: 13px; color: #166534;">${selectedFed.uf}</strong>
                <span style="font-size: 11px; color: #15803d; margin-left: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100px; display: inline-block; vertical-align: bottom;">
                  (Sorteado)
                </span>
              </div>
            ` : `
              <span style="font-size: 12px; color: #64748b; font-style: italic;">
                Vaga aberta (Sorteio):
              </span>
            `}
          </div>

          <div style="text-align: right;">
            ${isAdmin ? `
              <select 
                onchange="window.handleSelectDrawnSeed('${cat.id}', ${pos}, this.value)" 
                style="font-size: 11.5px; font-weight: 700; padding: 4px 6px; border-radius: 6px; border: 1px solid ${selectedFed ? '#22c55e' : '#cbd5e1'}; background: #fff; color: #0f172a; max-width: 140px; cursor: pointer;">
                <option value="">-- Sortear Estado --</option>
                ${availableFeds.map(f => `
                  <option value="${f.id}" ${selectedFedId === f.id ? 'selected' : ''}>
                    ${f.uf} - ${f.nome}
                  </option>
                `).join('')}
              </select>
            ` : `
              <span style="font-size: 11px; font-weight: 700; color: ${selectedFed ? '#166534' : '#64748b'};">
                ${selectedFed ? `${selectedFed.uf} (Sorteado)` : 'Aguardando sorteio'}
              </span>
            `}
          </div>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
  });

  html += `</div>`;
  return html;
}

// Visão Detalhada de uma Categoria
function renderSingleCategoryDetailed(category) {
  const rankedList = calculateCategorySeeds(category.id);
  const pointsList = rankedList.filter(item => item.hasPoints);
  const headCount = Math.min(6, pointsList.length);
  const topHeads = pointsList.slice(0, headCount);
  const drawnSeeds = store.getCategoryDrawnSeeds(category.id);
  const participatingFeds = store.getCategoryParticipatingFeds(category.id);
  const officialSeedIds = topHeads.map(h => h.id);
  const isAdmin = Boolean(window.auth && typeof window.auth.isAdmin === 'function' && window.auth.isAdmin());

  let html = `
    <!-- DESTAQUE DOS 6 PRIMEIROS ESTADOS (CARDS PODIUM/CABECAS DE CHAVE) -->
    <div style="margin-bottom: 30px;">
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px;">
        <div>
          <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 8px;">
            <span>🏆</span> Os 6 Primeiros Estados Cabeças de Chave • ${category.nome}
          </h2>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            ${headCount === 6 ? '6 Cabeças de Chave definidos por pontuação oficial CBT (alterações permitidas no Congresso Técnico)' : `${headCount} definido(s) por pontuação CBT + ${6 - headCount} vaga(s) em aberto para sorteio no Congresso Técnico`}
          </div>
        </div>
        ${headCount < 6 && isAdmin ? `
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; font-size: 11.5px; font-weight: 700; padding: 6px 12px; border-radius: 8px; display: flex; align-items: center; gap: 6px;">
            <span>ℹ️</span> Selecione os estados sorteados nos cards abaixo (apenas estados que não são cabeças oficiais estão disponíveis).
          </div>
        ` : ''}
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
  `;

  const currentSeeds = store.getCategorySeeds(category.id);

  // 1. CARDS DOS CABEÇAS DE CHAVE OFICIAIS (Equipes completas ranqueadas por pontuação)
  topHeads.forEach((item, idx) => {
    const pos = idx + 1;
    const defaultCbtFed = item;
    const currentFedId = drawnSeeds[pos] || defaultCbtFed.id;
    const isAltered = Boolean(drawnSeeds[pos] && drawnSeeds[pos] !== defaultCbtFed.id);
    const displayRankedItem = rankedList.find(r => r.id === currentFedId) || defaultCbtFed;
    const displayFed = store.getFederation(currentFedId) || defaultCbtFed;

    const assignedInOtherSlots = currentSeeds.filter((id, i) => i !== (pos - 1) && id);
    const availableFeds = participatingFeds.filter(f => !assignedInOtherSlots.includes(f.id)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    let rankTitle = `${pos}º Cabeça de Chave`;
    let cardBorder = isAltered ? '#f59e0b' : '#e2e8f0';
    let headerBg = isAltered ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : '#f8fafc';
    let badgeBg = isAltered ? '#d97706' : '#f1f5f9';
    let badgeColor = isAltered ? '#fff' : '#475569';
    let crown = isAltered ? '🔄' : '🏅';

    if (!isAltered) {
      if (pos === 1) {
        rankTitle = '👑 1º Cabeça de Chave';
        cardBorder = '#fbbf24';
        headerBg = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
        badgeBg = '#f59e0b';
        badgeColor = '#fff';
        crown = '👑';
      } else if (pos === 2) {
        rankTitle = '🥈 2º Cabeça de Chave';
        cardBorder = '#cbd5e1';
        headerBg = 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';
        badgeBg = '#64748b';
        badgeColor = '#fff';
        crown = '🥈';
      } else if (pos === 3) {
        rankTitle = '🥉 3º Cabeça de Chave';
        cardBorder = '#fdba74';
        headerBg = 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)';
        badgeBg = '#ea580c';
        badgeColor = '#fff';
        crown = '🥉';
      }
    } else {
      rankTitle = `${pos}º Cabeça de Chave (Congresso Técnico)`;
    }

    const fem1Label = displayRankedItem.fem1 ? `${displayRankedItem.fem1.nome} <span style="color: #028090; font-weight: 700;">(${displayRankedItem.fem1.ranking || 'Sem ranking'})</span>` : '<span style="color: #94a3b8;">Não inscrita</span>';
    const fem2Label = displayRankedItem.fem2 ? `${displayRankedItem.fem2.nome} <span style="color: #028090; font-weight: 700;">(${displayRankedItem.fem2.ranking || 'Sem ranking'})</span>` : '<span style="color: #94a3b8;">Não inscrita</span>';
    const masc1Label = displayRankedItem.masc1 ? `${displayRankedItem.masc1.nome} <span style="color: #028090; font-weight: 700;">(${displayRankedItem.masc1.ranking || 'Sem ranking'})</span>` : '<span style="color: #94a3b8;">Não inscrito</span>';
    const masc2Label = displayRankedItem.masc2 ? `${displayRankedItem.masc2.nome} <span style="color: #028090; font-weight: 700;">(${displayRankedItem.masc2.ranking || 'Sem ranking'})</span>` : '<span style="color: #94a3b8;">Não inscrito</span>';

    html += `
      <div style="background: #fff; border: 2px solid ${cardBorder}; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); display: flex; flex-direction: column;">
        
        <!-- Top Header do Card -->
        <div style="background: ${headerBg}; padding: 14px 16px; border-bottom: 1px solid ${cardBorder}; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">${crown}</span>
            <strong style="font-size: 14px; color: #0f172a;">${rankTitle}</strong>
          </div>
          <span style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 12px;">
            #${pos} ${isAltered ? '• Congresso' : '• Oficial CBT'}
          </span>
        </div>

        <!-- Dados do Estado -->
        <div style="padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
              <img src="${displayFed.imagem || `assets/federations/${displayFed.id}.png`}" alt="${displayFed.uf}" style="width: 44px; height: 32px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.08);" onerror="this.src='assets/federations/${displayFed.id}.jpg'">
              <div>
                <div style="font-size: 18px; font-weight: 800; color: #0f172a;">
                  ${displayFed.uf} • ${displayFed.sigla || displayFed.uf}
                </div>
                <div style="font-size: 12px; color: #64748b; line-height: 1.3;">
                  ${displayFed.nome}
                </div>
              </div>
            </div>

            ${isAltered ? `
              <!-- Alerta de alteração no Congresso Técnico -->
              <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; font-size: 11.5px; color: #92400e;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-weight: 800;">⚖️ Critério Oficial CBT (Original):</span>
                  ${isAdmin ? `
                    <button onclick="window.handleSelectDrawnSeed('${category.id}', ${pos}, '')" 
                            title="Restaurar padrão CBT por pontuação"
                            style="background: #fef3c7; border: 1px solid #f59e0b; color: #b45309; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; cursor: pointer;">
                      ↩️ Restaurar (${defaultCbtFed.uf})
                    </button>
                  ` : ''}
                </div>
                <div>
                  Estado apurado por pontos: <strong>${defaultCbtFed.nome} (${defaultCbtFed.uf})</strong> • Soma: <strong>${defaultCbtFed.somaRankings !== null ? `${defaultCbtFed.somaRankings} pts` : 'Sem ranking'}</strong>
                </div>
              </div>
            ` : ''}

            <!-- Box de Pontuação e Composição Oficial CBT do Estado Apresentado -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; font-weight: 600; color: #64748b;">
                  ${displayRankedItem.isComplete ? 'Soma dos Rankings (Equipe Completa):' : (displayRankedItem.hasPoints ? `Pontuação CBT (${displayRankedItem.totalRanked} atleta${displayRankedItem.totalRanked > 1 ? 's' : ''} ranqueado${displayRankedItem.totalRanked > 1 ? 's' : ''}):` : 'Pontuação CBT:')}
                </span>
                <span style="font-size: 18px; font-weight: 900; color: #028090;">
                  ${displayRankedItem.somaRankings !== null ? `${displayRankedItem.somaRankings} pts` : 'Sem ranking'}
                </span>
              </div>

              <div style="margin-top: 6px; font-size: 11.5px; color: #475569; display: flex; justify-content: space-between;">
                <span>Desempate (Ano Anterior):</span>
                <strong>${displayRankedItem.seedAnoAnterior < 999 ? `${displayRankedItem.seedAnoAnterior}º Lugar` : 'Sem classificação anterior'}</strong>
              </div>
            </div>

            <!-- Detalhamento dos Atletas da Composição -->
            <div style="font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
              <!-- Feminino -->
              <div style="background: #fdf2f8; padding: 8px 10px; border-radius: 8px; border: 1px solid #fbcfe8;">
                <div style="font-size: 11px; font-weight: 700; color: #db2777; margin-bottom: 4px; display: flex; justify-content: space-between;">
                  <span>👩 Melhores Feminino:</span>
                  <span>${displayRankedItem.femRankedCount} ranqueada(s)</span>
                </div>
                <div style="font-size: 11.5px; color: #1e293b; line-height: 1.4;">
                  <div>1ª: ${fem1Label}</div>
                  <div>2ª: ${fem2Label}</div>
                </div>
              </div>

              <!-- Masculino -->
              <div style="background: #eff6ff; padding: 8px 10px; border-radius: 8px; border: 1px solid #bfdbfe;">
                <div style="font-size: 11px; font-weight: 700; color: #2563eb; margin-bottom: 4px; display: flex; justify-content: space-between;">
                  <span>👨 Melhores Masculino:</span>
                  <span>${displayRankedItem.mascRankedCount} ranqueado(s)</span>
                </div>
                <div style="font-size: 11.5px; color: #1e293b; line-height: 1.4;">
                  <div>1º: ${masc1Label}</div>
                  <div>2º: ${masc2Label}</div>
                </div>
              </div>
            </div>

            ${isAdmin ? `
              <!-- Seletor para alteração no Congresso Técnico -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-top: 14px;">
                <label style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px;">
                  <span>🔄 Alterar Cabeça no Congresso Técnico:</span>
                  ${isAltered ? `<span style="color: #b45309; font-weight: 800; background: #fef3c7; padding: 1px 6px; border-radius: 4px;">Alterado</span>` : `<span style="color: #028090; font-weight: 700;">Oficial CBT ativo</span>`}
                </label>
                <div style="display: flex; gap: 6px;">
                  <select 
                    onchange="window.handleSelectDrawnSeed('${category.id}', ${pos}, this.value)"
                    style="flex: 1; font-size: 12px; font-weight: 700; padding: 6px 8px; border-radius: 6px; border: 1px solid ${isAltered ? '#f59e0b' : '#cbd5e1'}; background: #fff; cursor: pointer;">
                    <option value="">👑 Padrão Oficial CBT: ${defaultCbtFed.uf} - ${defaultCbtFed.nome}</option>
                    ${availableFeds.map(f => `
                      <option value="${f.id}" ${currentFedId === f.id && isAltered ? 'selected' : ''}>
                        ${f.uf} - ${f.nome}
                      </option>
                    `).join('')}
                  </select>
                  ${isAltered ? `
                    <button 
                      onclick="window.handleSelectDrawnSeed('${category.id}', ${pos}, '')" 
                      title="Restaurar padrão oficial CBT"
                      style="background: #fef3c7; border: 1px solid #fcd34d; color: #b45309; font-size: 11px; font-weight: 700; padding: 6px 10px; border-radius: 6px; cursor: pointer;">
                      ↩️
                    </button>
                  ` : ''}
                </div>
                <div style="font-size: 10.5px; color: #64748b; margin-top: 5px;">
                  * Mantém a pontuação por padrão; use apenas se houver alteração no Congresso Técnico.
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Rodapé do Card com Status de Elegibilidade -->
          <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
            <span style="color: #64748b;">
              Total inscritos: <strong>${displayRankedItem.totalAtletas || defaultCbtFed.totalAtletas}</strong>
            </span>
            <span style="color: ${isAltered ? '#b45309' : '#16a34a'}; font-weight: 700; display: flex; align-items: center; gap: 4px;">
              ${isAltered ? '🔄 Alterado no Congresso' : (displayRankedItem.isComplete ? '✓ Elegível CBT (Completo)' : `✓ Pontuação Oficial CBT (${displayRankedItem.totalRanked} ranq.)`)}
            </span>
          </div>
        </div>

      </div>
    `;
  });

  // 2. CARDS DAS VAGAS EM ABERTO / SORTEIO (posições de headCount + 1 até 6)
  for (let pos = headCount + 1; pos <= 6; pos++) {
    const selectedFedId = drawnSeeds[pos] || null;
    const selectedFed = selectedFedId ? store.getFederation(selectedFedId) : null;
    const fedItem = selectedFed ? rankedList.find(r => r.id === selectedFed.id) : null;

    const assignedInOtherSlots = currentSeeds.filter((id, i) => i !== (pos - 1) && id);
    const availableFeds = participatingFeds.filter(f => !assignedInOtherSlots.includes(f.id)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    if (selectedFed) {
      html += `
        <div style="background: #fff; border: 2px solid #22c55e; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 14px rgba(34,197,94,0.12); display: flex; flex-direction: column;">
          
          <!-- Top Header do Card Sorteado -->
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 14px 16px; border-bottom: 1px solid #bbf7d0; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">🎲</span>
              <strong style="font-size: 14px; color: #166534;">${pos}º Cabeça de Chave (Sorteio)</strong>
            </div>
            <span style="background: #15803d; color: #fff; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 12px;">
              #${pos} • Sorteado
            </span>
          </div>

          <!-- Dados do Estado Sorteado -->
          <div style="padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                <img src="${selectedFed.imagem || `assets/federations/${selectedFed.id}.png`}" alt="${selectedFed.uf}" style="width: 44px; height: 32px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.08);" onerror="this.src='assets/federations/${selectedFed.id}.jpg'">
                <div>
                  <div style="font-size: 18px; font-weight: 800; color: #0f172a;">
                    ${selectedFed.uf} • ${selectedFed.sigla || selectedFed.uf}
                  </div>
                  <div style="font-size: 12px; color: #64748b; line-height: 1.3;">
                    ${selectedFed.nome}
                  </div>
                </div>
              </div>

              <!-- Box Explicativo do Sorteio -->
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px; margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-size: 12px; font-weight: 600; color: #166534;">Origem da Vaga:</span>
                  <span style="font-size: 11px; font-weight: 800; color: #15803d; background: #dcfce7; padding: 2px 8px; border-radius: 6px;">
                    Definido por Sorteio
                  </span>
                </div>
                <div style="font-size: 11.5px; color: #166534; line-height: 1.4;">
                  Vaga preenchida por sorteio entre as federações participantes não cabeças de chave oficiais.
                </div>
                ${fedItem ? `
                  <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #86efac; font-size: 11px; color: #374151; display: flex; justify-content: space-between;">
                    <span>Total Inscritos: <strong>${fedItem.totalAtletas}</strong> (${fedItem.femTotal}F / ${fedItem.mascTotal}M)</span>
                    <span>Ranqueados: <strong>${fedItem.totalRanked}</strong></span>
                  </div>
                ` : ''}
              </div>

              ${isAdmin ? `
                <!-- Seletor de alteração para Admin -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 10px;">
                  <label style="display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px;">
                    🔄 Alterar Estado ou Liberar Vaga:
                  </label>
                  <div style="display: flex; gap: 6px;">
                    <select 
                      onchange="window.handleSelectDrawnSeed('${category.id}', ${pos}, this.value)"
                      style="flex: 1; font-size: 12px; font-weight: 700; padding: 6px 8px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">
                      <option value="">-- Liberar Vaga (Voltar para Sorteio) --</option>
                      ${availableFeds.map(f => `
                        <option value="${f.id}" ${selectedFedId === f.id ? 'selected' : ''}>
                          ${f.uf} - ${f.nome}
                        </option>
                      `).join('')}
                    </select>
                    <button 
                      onclick="window.handleSelectDrawnSeed('${category.id}', ${pos}, '')" 
                      title="Liberar vaga"
                      style="background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; font-size: 11px; font-weight: 700; padding: 6px 10px; border-radius: 6px; cursor: pointer;">
                      ✕
                    </button>
                  </div>
                </div>
              ` : ''}
            </div>

            <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
              <span style="color: #15803d; font-weight: 700;">
                ✓ Cabeça de Chave por Sorteio
              </span>
              <span style="color: #64748b;">
                Posição #${pos}
              </span>
            </div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div style="background: #fafafa; border: 2px dashed #cbd5e1; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column;">
          
          <!-- Top Header do Card em Aberto -->
          <div style="background: #f1f5f9; padding: 14px 16px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">🎲</span>
              <strong style="font-size: 14px; color: #475569;">${pos}º Cabeça de Chave (Vaga em Aberto)</strong>
            </div>
            <span style="background: #94a3b8; color: #fff; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 12px;">
              #${pos} • Em Aberto
            </span>
          </div>

          <!-- Dados da Vaga em Aberto -->
          <div style="padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="text-align: center; padding: 14px 8px; color: #64748b;">
                <div style="font-size: 32px; margin-bottom: 6px;">🎲</div>
                <div style="font-size: 14px; font-weight: 800; color: #334155; margin-bottom: 4px;">
                  Vaga em Aberto para Sorteio
                </div>
                <p style="font-size: 11.5px; color: #64748b; margin: 0 auto; max-width: 290px; line-height: 1.4;">
                  Por haver menos de 6 equipes completas ranqueadas (Art. III), esta vaga #${pos} deve ser definida por sorteio da organização.
                </p>
              </div>

              ${isAdmin ? `
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px; margin-top: 8px;">
                  <label style="display: block; font-size: 12px; font-weight: 800; color: #1e40af; margin-bottom: 6px;">
                    🎯 Selecionar Federação Sorteada:
                  </label>
                  <select 
                    onchange="window.handleSelectDrawnSeed('${category.id}', ${pos}, this.value)" 
                    style="width: 100%; font-size: 12.5px; font-weight: 700; padding: 8px 10px; border-radius: 6px; border: 1px solid #3b82f6; background: #fff; color: #0f172a; cursor: pointer;">
                    <option value="">-- Escolher Estado Sorteado --</option>
                    ${availableFeds.map(f => `
                      <option value="${f.id}">
                        ${f.uf} - ${f.nome}
                      </option>
                    `).join('')}
                  </select>
                  <div style="font-size: 10.5px; color: #2563eb; margin-top: 6px;">
                    * Estados que já são cabeças de chave oficiais ou sorteados não aparecem nesta lista.
                  </div>
                </div>
              ` : `
                <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; color: #64748b; font-size: 12px; margin-top: 8px;">
                  ⏳ Aguardando realização do sorteio oficial pela organização.
                </div>
              `}
            </div>

            <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
              <span style="color: #94a3b8;">
                Aguardando sorteio
              </span>
              <span style="color: #64748b; font-weight: 700;">
                Vaga #${pos}
              </span>
            </div>
          </div>
        </div>
      `;
    }
  }

  html += `
      </div>
    </div>

    <!-- TABELA COMPLETA COM TODAS AS FEDERAÇÕES NA CATEGORIA -->
    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.05); margin-top: 24px;">
      <div style="background: #f8fafc; padding: 14px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">
            📊 Classificação Completa para Cabeça de Chave (${rankedList.length} Federações)
          </h3>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">
            Ordenação oficial conforme os critérios I, II e III da CBT para a categoria ${category.nome}
          </p>
        </div>
      </div>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; text-align: left;">
          <thead>
            <tr style="background: #f1f5f9; color: #475569; font-weight: 700; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 12px 14px; width: 60px; text-align: center;">Pos</th>
              <th style="padding: 12px 14px;">Federação</th>
              <th style="padding: 12px 14px;">2 Melhores Feminino</th>
              <th style="padding: 12px 14px;">2 Melhores Masculino</th>
              <th style="padding: 12px 14px; text-align: center;">Soma Rankings</th>
              <th style="padding: 12px 14px; text-align: center;">Ano Anterior</th>
              <th style="padding: 12px 14px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
  `;

  rankedList.forEach((item, idx) => {
    const pos = idx + 1;
    const isOfficialSeed = topHeads.some(h => h.id === item.id);
    const officialSeedPos = isOfficialSeed ? (topHeads.findIndex(h => h.id === item.id) + 1) : null;
    const drawnEntry = Object.entries(drawnSeeds).find(([k, v]) => v === item.id);
    const drawnSlotPos = drawnEntry ? Number(drawnEntry[0]) : null;

    let rowBg = pos % 2 === 0 ? '#f8fafc' : '#ffffff';
    if (isOfficialSeed) {
      rowBg = pos % 2 === 0 ? '#fffdf7' : '#ffffff';
    } else if (drawnSlotPos) {
      rowBg = '#f0fdf4';
    }

    const f1 = item.fem1 ? `${item.fem1.nome} (<strong>${item.fem1.ranking || 'S/R'}</strong>)` : '-';
    const f2 = item.fem2 ? `${item.fem2.nome} (<strong>${item.fem2.ranking || 'S/R'}</strong>)` : '-';
    const m1 = item.masc1 ? `${item.masc1.nome} (<strong>${item.masc1.ranking || 'S/R'}</strong>)` : '-';
    const m2 = item.masc2 ? `${item.masc2.nome} (<strong>${item.masc2.ranking || 'S/R'}</strong>)` : '-';

    html += `
      <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0; ${isOfficialSeed || drawnSlotPos ? 'font-weight: 500;' : ''}">
        <td style="padding: 12px 14px; text-align: center;">
          ${isOfficialSeed ? `
            <span style="background: ${officialSeedPos === 1 ? '#fef3c7' : '#f1f5f9'}; color: ${officialSeedPos === 1 ? '#b45309' : '#0f172a'}; font-weight: 800; padding: 3px 8px; border-radius: 12px; font-size: 11px;">
              ${officialSeedPos === 1 ? '👑 1º' : `${officialSeedPos}º`}
            </span>
          ` : (drawnSlotPos ? `
            <span style="background: #dcfce7; color: #15803d; font-weight: 800; padding: 3px 8px; border-radius: 12px; font-size: 11px;">
              🎲 #${drawnSlotPos}
            </span>
          ` : `
            <span style="color: #64748b;">${pos}º</span>
          `)}
        </td>
        <td style="padding: 12px 14px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="${item.imagem}" alt="${item.uf}" style="width: 24px; height: 18px; object-fit: cover; border-radius: 3px; border: 1px solid #cbd5e1;" onerror="this.src='assets/federations/${item.id}.jpg'">
            <div>
              <strong style="color: #0f172a;">${item.uf}</strong>
              <span style="color: #64748b; font-size: 11.5px; margin-left: 4px;">${item.nome}</span>
            </div>
          </div>
        </td>
        <td style="padding: 12px 14px; font-size: 11.5px; color: #334155;">
          <div>1ª: ${f1}</div>
          <div>2ª: ${f2}</div>
        </td>
        <td style="padding: 12px 14px; font-size: 11.5px; color: #334155;">
          <div>1º: ${m1}</div>
          <div>2º: ${m2}</div>
        </td>
        <td style="padding: 12px 14px; text-align: center;">
          ${item.hasPoints && item.somaRankings !== null ? `
            <strong style="font-size: 14px; color: #028090;">${item.somaRankings} pts</strong>
            <div style="font-size: 10px; color: #64748b;">${item.totalRanked} ranqueado(s)</div>
          ` : `
            <span style="color: #94a3b8; font-size: 11px; font-style: italic;">
              Sem ranking CBT
            </span>
          `}
        </td>
        <td style="padding: 12px 14px; text-align: center; color: #475569; font-size: 12px;">
          ${item.seedAnoAnterior < 999 ? `<strong>${item.seedAnoAnterior}º</strong>` : '<span style="color: #94a3b8;">-</span>'}
        </td>
        <td style="padding: 12px 14px; text-align: center;">
          ${isOfficialSeed ? `
            <span style="background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 12px;">
              Cabeça #${officialSeedPos} (${item.isComplete ? 'Completo' : `${item.totalRanked} ranq.`})
            </span>
          ` : (drawnSlotPos ? `
            <span style="background: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 12px;">
              🎲 Cabeça #${drawnSlotPos} (Sorteio)
            </span>
          ` : (item.hasPoints ? `
            <span style="background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 12px;">
              ${item.totalRanked} Ranqueado(s)
            </span>
          ` : `
            <span style="background: #f8fafc; color: #94a3b8; font-size: 11px; font-weight: 500; padding: 4px 8px; border-radius: 12px;">
              Sem Ranking
            </span>
          `))}
        </td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  return html;
}
