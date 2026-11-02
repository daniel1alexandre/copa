// Módulo Cabeça de Chave - Cálculo Oficial dos 6 Primeiros Estados por Categoria (CBT)
import { store } from '../data/store.js';

let selectedCategory = 'todas'; // 'todas' ou id da categoria ('prof', 'cat_a', etc.)

function getRankNumber(ath) {
  if (!ath || !ath.ranking) return null;
  const n = parseInt(String(ath.ranking).replace(/\D/g, ''), 10);
  return isNaN(n) ? null : n;
}

export function calculateCategorySeeds(categoryId) {
  const feds = store.getFederations();
  const allAthletes = store.getAthletes();
  const catAthletes = allAthletes.filter(a => a.categorias && a.categorias.includes(categoryId));

  const list = feds.map(fed => {
    // Atletas da federação nesta categoria
    const aths = catAthletes.filter(a => a.uf === fed.uf || a.equipe_id === fed.id);
    const fem = aths.filter(a => a.genero === 'Feminino');
    const masc = aths.filter(a => a.genero === 'Masculino');

    // Atletas ranqueados ordenados de forma crescente (1º, 2º...)
    const femRanked = fem.filter(a => getRankNumber(a) !== null).sort((a, b) => getRankNumber(a) - getRankNumber(b));
    const mascRanked = masc.filter(a => getRankNumber(a) !== null).sort((a, b) => getRankNumber(a) - getRankNumber(b));

    const femUnranked = fem.filter(a => getRankNumber(a) === null);
    const mascUnranked = masc.filter(a => getRankNumber(a) === null);

    // Critério III:
    // "Caso a equipe não possua, no mínimo, 02 (dois) atletas por gênero para composição da soma,
    // a pontuação correspondente ao gênero incompleto será considerada igual a zero,
    // impactando diretamente na classificação para fins de cabeça de chave."
    const has2Fem = femRanked.length >= 2;
    const has2Masc = mascRanked.length >= 2;
    const isComplete = has2Fem && has2Masc;

    const fem1 = femRanked[0] || femUnranked[0] || null;
    const fem2 = femRanked[1] || femUnranked[1] || null;
    const masc1 = mascRanked[0] || mascUnranked[0] || null;
    const masc2 = mascRanked[1] || mascUnranked[1] || null;

    let somaRankings = null;
    if (isComplete) {
      somaRankings = getRankNumber(femRanked[0]) + getRankNumber(femRanked[1]) + getRankNumber(mascRanked[0]) + getRankNumber(mascRanked[1]);
    }

    // Critério II: Desempate pela colocação na Copa das Federações do ano anterior
    const seedAnoAnterior = fed.seed || 999;

    return {
      id: fed.id,
      uf: fed.uf,
      nome: fed.nome,
      sigla: fed.sigla,
      imagem: fed.imagem || `assets/federations/${fed.id}.png`,
      cor: fed.cor || '#028090',
      totalAtletas: aths.length,
      femTotal: fem.length,
      mascTotal: masc.length,
      femRankedCount: femRanked.length,
      mascRankedCount: mascRanked.length,
      isComplete,
      has2Fem,
      has2Masc,
      somaRankings,
      seedAnoAnterior,
      fem1,
      fem2,
      masc1,
      masc2,
      totalRanked: femRanked.length + mascRanked.length
    };
  });

  // Ordenação oficial:
  // 1. Equipes completas (2F + 2M ranqueados) ordenadas pela MENOR soma de rankings
  // 2. Empate na soma: Critério II (Ano anterior: 1º < 2º < 3º...)
  // 3. Equipes incompletas (gênero incompleto = pontuação 0): ordenadas pelo total de ranqueados, depois ano anterior
  list.sort((a, b) => {
    if (a.isComplete && !b.isComplete) return -1;
    if (!a.isComplete && b.isComplete) return 1;
    if (a.isComplete && b.isComplete) {
      if (a.somaRankings !== b.somaRankings) {
        return a.somaRankings - b.somaRankings;
      }
      return a.seedAnoAnterior - b.seedAnoAnterior;
    }
    // Ambos incompletos:
    if (a.totalRanked !== b.totalRanked) {
      return b.totalRanked - a.totalRanked;
    }
    if (a.seedAnoAnterior !== b.seedAnoAnterior) {
      return a.seedAnoAnterior - b.seedAnoAnterior;
    }
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });

  return list;
}

export function initSeedView() {
  window.selectSeedCategoryTab = (catId) => {
    selectedCategory = catId;
    renderSeedView();
  };

  window.handlePrintSeeds = () => {
    window.print();
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

  categories.forEach(cat => {
    const rankedList = calculateCategorySeeds(cat.id);
    const top6 = rankedList.slice(0, 6);

    html += `
      <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
        
        <!-- Header da Categoria -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 16px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px;">
              <span>🎾</span> ${cat.nome}
            </div>
            <div style="font-size: 11.5px; color: #94a3b8; margin-top: 2px;">
              Top 6 Cabeças de Chave
            </div>
          </div>
          <button 
            onclick="window.selectSeedCategoryTab('${cat.id}')"
            style="background: rgba(2, 128, 144, 0.25); border: 1px solid rgba(2, 128, 144, 0.5); color: #38bdf8; font-size: 11px; font-weight: 700; padding: 5px 10px; border-radius: 6px; cursor: pointer;">
            Ver Detalhes ➜
          </button>
        </div>

        <!-- Lista dos 6 Cabeças de Chave -->
        <div style="padding: 12px 16px; flex: 1; display: flex; flex-direction: column; gap: 8px;">
    `;

    top6.forEach((item, idx) => {
      const pos = idx + 1;
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
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: #f8fafc; border-radius: 8px; border: 1px solid #edf2f7;">
          <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
            <span style="font-size: 11px; font-weight: 800; color: ${badgeColor}; background: ${badgeBg}; padding: 3px 8px; border-radius: 12px; white-space: nowrap;">
              ${icon}
            </span>
            <img src="${item.imagem}" alt="${item.uf}" style="width: 24px; height: 18px; object-fit: cover; border-radius: 3px; border: 1px solid #cbd5e1;" onerror="this.src='assets/federations/${item.id}.jpg'">
            <div style="min-width: 0;">
              <strong style="font-size: 13px; color: #0f172a;">${item.uf}</strong>
              <span style="font-size: 11px; color: #64748b; margin-left: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; display: inline-block; vertical-align: bottom;">
                ${item.nome}
              </span>
            </div>
          </div>

          <div style="text-align: right; white-space: nowrap;">
            ${item.isComplete ? `
              <span style="font-size: 12.5px; font-weight: 800; color: #028090;">
                Soma: ${item.somaRankings}
              </span>
            ` : `
              <span style="font-size: 11px; font-weight: 700; color: #dc2626; background: #fee2e2; padding: 2px 6px; border-radius: 4px;">
                Pontuação 0
              </span>
            `}
          </div>
        </div>
      `;
    });

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
  const top6 = rankedList.slice(0, 6);

  let html = `
    <!-- DESTAQUE DOS 6 PRIMEIROS ESTADOS (CARDS PODIUM/CABECAS DE CHAVE) -->
    <div style="margin-bottom: 30px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 8px;">
          <span>🏆</span> Os 6 Primeiros Estados Cabeças de Chave • ${category.nome}
        </h2>
        <span style="font-size: 12px; color: #64748b; font-weight: 600;">
          Classificação Oficial Gerada por Algoritmo CBT
        </span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
  `;

  top6.forEach((item, idx) => {
    const pos = idx + 1;
    let rankTitle = `${pos}º Cabeça de Chave`;
    let cardBorder = '#e2e8f0';
    let headerBg = '#f8fafc';
    let badgeBg = '#f1f5f9';
    let badgeColor = '#475569';
    let crown = '🏅';

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

    const fem1Label = item.fem1 ? `${item.fem1.nome} <span style="color: #028090; font-weight: 700;">(${item.fem1.ranking || 'Sem ranking'})</span>` : '<span style="color: #94a3b8;">Não inscrita</span>';
    const fem2Label = item.fem2 ? `${item.fem2.nome} <span style="color: #028090; font-weight: 700;">(${item.fem2.ranking || 'Sem ranking'})</span>` : '<span style="color: #94a3b8;">Não inscrita</span>';
    const masc1Label = item.masc1 ? `${item.masc1.nome} <span style="color: #028090; font-weight: 700;">(${item.masc1.ranking || 'Sem ranking'})</span>` : '<span style="color: #94a3b8;">Não inscrito</span>';
    const masc2Label = item.masc2 ? `${item.masc2.nome} <span style="color: #028090; font-weight: 700;">(${item.masc2.ranking || 'Sem ranking'})</span>` : '<span style="color: #94a3b8;">Não inscrito</span>';

    html += `
      <div style="background: #fff; border: 2px solid ${cardBorder}; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); display: flex; flex-direction: column;">
        
        <!-- Top Header do Card -->
        <div style="background: ${headerBg}; padding: 14px 16px; border-bottom: 1px solid ${cardBorder}; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">${crown}</span>
            <strong style="font-size: 14px; color: #0f172a;">${rankTitle}</strong>
          </div>
          <span style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 12px;">
            #${pos}
          </span>
        </div>

        <!-- Dados do Estado -->
        <div style="padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
              <img src="${item.imagem}" alt="${item.uf}" style="width: 44px; height: 32px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.08);" onerror="this.src='assets/federations/${item.id}.jpg'">
              <div>
                <div style="font-size: 18px; font-weight: 800; color: #0f172a;">
                  ${item.uf} • ${item.sigla}
                </div>
                <div style="font-size: 12px; color: #64748b; line-height: 1.3;">
                  ${item.nome}
                </div>
              </div>
            </div>

            <!-- Box de Pontuação e Composição -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; font-weight: 600; color: #64748b;">
                  Soma dos Rankings:
                </span>
                ${item.isComplete ? `
                  <span style="font-size: 18px; font-weight: 900; color: #028090;">
                    ${item.somaRankings} pts
                  </span>
                ` : `
                  <span style="font-size: 13px; font-weight: 800; color: #dc2626; background: #fee2e2; padding: 2px 8px; border-radius: 6px;">
                    0 (Incompleto)
                  </span>
                `}
              </div>

              <div style="margin-top: 6px; font-size: 11.5px; color: #475569; display: flex; justify-content: space-between;">
                <span>Desempate (Ano Anterior):</span>
                <strong>${item.seedAnoAnterior < 999 ? `${item.seedAnoAnterior}º Lugar` : 'Sem classificação anterior'}</strong>
              </div>
            </div>

            <!-- Detalhamento dos 4 Atletas da Soma -->
            <div style="font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
              
              <!-- Feminino -->
              <div style="background: #fdf2f8; padding: 8px 10px; border-radius: 8px; border: 1px solid #fbcfe8;">
                <div style="font-size: 11px; font-weight: 700; color: #db2777; margin-bottom: 4px; display: flex; justify-content: space-between;">
                  <span>👩 2 Melhores Feminino:</span>
                  <span>${item.femRankedCount} ranqueada(s)</span>
                </div>
                <div style="font-size: 11.5px; color: #1e293b; line-height: 1.4;">
                  <div>1ª: ${fem1Label}</div>
                  <div>2ª: ${fem2Label}</div>
                </div>
              </div>

              <!-- Masculino -->
              <div style="background: #eff6ff; padding: 8px 10px; border-radius: 8px; border: 1px solid #bfdbfe;">
                <div style="font-size: 11px; font-weight: 700; color: #2563eb; margin-bottom: 4px; display: flex; justify-content: space-between;">
                  <span>👨 2 Melhores Masculino:</span>
                  <span>${item.mascRankedCount} ranqueado(s)</span>
                </div>
                <div style="font-size: 11.5px; color: #1e293b; line-height: 1.4;">
                  <div>1º: ${masc1Label}</div>
                  <div>2º: ${masc2Label}</div>
                </div>
              </div>

            </div>
          </div>

          <!-- Rodapé do Card com Status de Elegibilidade -->
          <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
            <span style="color: #64748b;">
              Total inscritos: <strong>${item.totalAtletas}</strong> (${item.femTotal}F / ${item.mascTotal}M)
            </span>
            ${item.isComplete ? `
              <span style="color: #16a34a; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                ✓ Elegível CBT
              </span>
            ` : `
              <span style="color: #dc2626; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                ⚠ Penalidade Art. III
              </span>
            `}
          </div>
        </div>

      </div>
    `;
  });

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
    const isTop6 = pos <= 6;
    const rowBg = isTop6 ? (pos % 2 === 0 ? '#fffdf7' : '#ffffff') : (pos % 2 === 0 ? '#f8fafc' : '#ffffff');

    const f1 = item.fem1 ? `${item.fem1.nome} (<strong>${item.fem1.ranking || 'S/R'}</strong>)` : '-';
    const f2 = item.fem2 ? `${item.fem2.nome} (<strong>${item.fem2.ranking || 'S/R'}</strong>)` : '-';
    const m1 = item.masc1 ? `${item.masc1.nome} (<strong>${item.masc1.ranking || 'S/R'}</strong>)` : '-';
    const m2 = item.masc2 ? `${item.masc2.nome} (<strong>${item.masc2.ranking || 'S/R'}</strong>)` : '-';

    html += `
      <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0; ${isTop6 ? 'font-weight: 500;' : ''}">
        <td style="padding: 12px 14px; text-align: center;">
          ${isTop6 ? `
            <span style="background: ${pos === 1 ? '#fef3c7' : '#f1f5f9'}; color: ${pos === 1 ? '#b45309' : '#0f172a'}; font-weight: 800; padding: 3px 8px; border-radius: 12px; font-size: 11px;">
              ${pos === 1 ? '👑 1º' : `${pos}º`}
            </span>
          ` : `
            <span style="color: #64748b;">${pos}º</span>
          `}
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
          ${item.isComplete ? `
            <strong style="font-size: 14px; color: #028090;">${item.somaRankings}</strong>
          ` : `
            <span style="color: #dc2626; font-size: 11px; background: #fee2e2; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
              0 (Incompleto)
            </span>
          `}
        </td>
        <td style="padding: 12px 14px; text-align: center; color: #475569; font-size: 12px;">
          ${item.seedAnoAnterior < 999 ? `<strong>${item.seedAnoAnterior}º</strong>` : '<span style="color: #94a3b8;">-</span>'}
        </td>
        <td style="padding: 12px 14px; text-align: center;">
          ${isTop6 ? `
            <span style="background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 12px;">
              Cabeça #${pos}
            </span>
          ` : (item.isComplete ? `
            <span style="background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 12px;">
              Elegível
            </span>
          ` : `
            <span style="background: #fef2f2; color: #991b1b; font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 12px;">
              Incompleto
            </span>
          `)}
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

