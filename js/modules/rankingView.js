// Módulo de Classificação e Ranking Geral das Federações
import { store } from '../data/store.js';
import { calculateCategoryPlacements } from './bracketEngine.js';

let sortColumn = 'total'; // 'total', 'nome', ou id da categoria (ex: 'prof', 'cat_a')
let sortAscending = false;

export function initRankingView() {
  window.handleSortRanking = (col) => {
    if (sortColumn === col) {
      sortAscending = !sortAscending;
    } else {
      sortColumn = col;
      sortAscending = (col === 'nome');
    }
    renderRanking();
  };

  window.handlePrintRanking = () => {
    window.print();
  };
}

export function getRankedData(col = sortColumn, asc = sortAscending) {
  const feds = store.getFederations();
  const categories = store.getActiveCategories();
  const pointsTable = store.getPointsTable();

  const scoreMatrix = {};
  feds.forEach(f => {
    scoreMatrix[f.id] = {
      id: f.id,
      nome: f.nome,
      sigla: f.sigla,
      uf: f.uf,
      cor: f.cor,
      regiao: f.regiao,
      imagem: f.imagem || `assets/federations/${top2.id}.jpg`,
      total: 0
    };
    categories.forEach(cat => {
      scoreMatrix[f.id][cat.id] = 0;
      scoreMatrix[f.id][`fase_${cat.id}`] = null;
    });
  });

  // Calcula colocações e pontuações progressivas de cada categoria ativa
  categories.forEach(cat => {
    const games = store.getGames(cat.id);
    const partFeds = store.getCategoryParticipatingFeds(cat.id);
    const placements = calculateCategoryPlacements(games, pointsTable, partFeds);

    placements.forEach(p => {
      if (scoreMatrix[p.equipe_id]) {
        scoreMatrix[p.equipe_id][cat.id] = p.pontos;
        scoreMatrix[p.equipe_id].total += p.pontos;
        scoreMatrix[p.equipe_id][`fase_${cat.id}`] = p.faseAtual || `${p.colocacao}º Lugar`;
      }
    });
  });

  // Converte para lista e ordena
  let rankedList = Object.values(scoreMatrix);
  rankedList.sort((a, b) => {
    let valA = a[col];
    let valB = b[col];

    if (typeof valA === 'string') {
      return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return asc ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
  });

  rankedList.forEach((item, idx) => {
    item.posicaoGeral = idx + 1;
  });

  return { rankedList, categories };
}

export function renderRankingHTML(rankedList, categories, currentSortCol = sortColumn, currentSortAsc = sortAscending, showPrintBtn = true) {
  const top1 = rankedList[0];
  const top2 = rankedList[1];
  const top3 = rankedList[2];

  return `
    <!-- HEADER DO RANKING -->
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
      <div>
        <h2 style="font-family: var(--font-display); font-size: 1.6rem; font-weight: 800; color: #ffffff; text-shadow: 0 2px 8px rgba(0,0,0,0.6);">
          🏆 Ranking Geral das Federações — Copa Federações 2026
        </h2>
        <p style="color: #cbd5e1; font-size: 0.9rem; text-shadow: 0 1px 4px rgba(0,0,0,0.4);">
          Somatório oficial de pontos obtidos em todas as ${categories.length} categorias estaduais de Beach Tennis
        </p>
      </div>

      ${showPrintBtn ? `
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-outline" style="color: #ffffff; border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.1);" onclick="window.handlePrintRanking()">
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>
      ` : ''}
    </div>

    <!-- PÓDIO OLÍMPICO (TOP 3) -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
      <!-- 2º LUGAR (PRATA) -->
      <div class="card" style="border-top: 5px solid #94a3b8; text-align: center; position: relative; background: linear-gradient(to bottom, #f8fafc, #ffffff);">
        <div style="font-size: 2.2rem; margin-bottom: 0.25rem;">🥈</div>
        <span style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Vice-Campeão Geral</span>
        <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.5rem;">
          ${top2 ? `
            <img src="assets/federations/${top2.id}.jpg" alt="${top2.uf}" style="width: 36px; height: 24px; border-radius: 3px; object-fit: contain; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
            <span style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 800; color: var(--accent-dark-blue);">${top2.nome} (${top2.uf})</span>
          ` : '-'}
        </div>
        <div style="font-size: 1.8rem; font-weight: 800; color: var(--primary); margin-top: 0.5rem;">
          ${top2 ? top2.total : 0} <span style="font-size: 0.85rem; color: var(--text-muted);">pontos</span>
        </div>
      </div>

      <!-- 1º LUGAR (OURO - CAMPEÃO) -->
      <div class="card" style="border-top: 5px solid #ffb703; text-align: center; position: relative; transform: translateY(-8px); box-shadow: var(--shadow-lg); background: linear-gradient(to bottom, #fffdf5, #ffffff);">
        <div style="font-size: 2.7rem; margin-bottom: 0.25rem;">🥇</div>
        <span style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #d97706; letter-spacing: 0.05em;">Campeão Brasileiro Geral</span>
        <div style="display: flex; align-items: center; justify-content: center; gap: 0.6rem; margin-top: 0.5rem;">
          ${top1 ? `
            <img src="assets/federations/${top1.id}.jpg" alt="${top1.uf}" style="width: 44px; height: 30px; border-radius: 4px; object-fit: contain; box-shadow: 0 2px 6px rgba(0,0,0,0.25);">
            <span style="font-family: var(--font-display); font-size: 1.45rem; font-weight: 800; color: #0b1a30;">${top1.nome} (${top1.uf})</span>
          ` : '-'}
        </div>
        <div style="font-size: 2.2rem; font-weight: 800; color: #d97706; margin-top: 0.5rem;">
          ${top1 ? top1.total : 0} <span style="font-size: 0.9rem; color: var(--text-muted);">pontos</span>
        </div>
      </div>

      <!-- 3º LUGAR (BRONZE) -->
      <div class="card" style="border-top: 5px solid #f97316; text-align: center; position: relative; background: linear-gradient(to bottom, #f8fafc, #ffffff);">
        <div style="font-size: 2.2rem; margin-bottom: 0.25rem;">🥉</div>
        <span style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #c2410c; letter-spacing: 0.05em;">3º Colocado Geral</span>
        <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.5rem;">
          ${top3 ? `
            <img src="assets/federations/${top3.id}.jpg" alt="${top3.uf}" style="width: 36px; height: 24px; border-radius: 3px; object-fit: contain; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
            <span style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 800; color: var(--accent-dark-blue);">${top3.nome} (${top3.uf})</span>
          ` : '-'}
        </div>
        <div style="font-size: 1.8rem; font-weight: 800; color: var(--primary); margin-top: 0.5rem;">
          ${top3 ? top3.total : 0} <span style="font-size: 0.85rem; color: var(--text-muted);">pontos</span>
        </div>
      </div>
    </div>

    <!-- TABELA GERAL ORDENÁVEL COM TODAS AS 27 FEDERAÇÕES E CATEGORIAS -->
    <div class="card" style="padding: 0; overflow: hidden;">
      <div class="card-header" style="padding: 1.25rem 1.5rem; margin: 0; background: #ffffff; border-bottom: 1px solid var(--border-light);">
        <h3 class="card-title">📊 Tabela Completa de Classificação das 27 Federações</h3>
        <span style="font-size: 0.8rem; color: var(--text-muted);">Clique no cabeçalho de qualquer coluna para reordenar</span>
      </div>

      <div style="overflow-x: auto; padding: 0 0.5rem;">
        <table class="custom-table" style="width: 100%; font-size: 0.85rem;">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center; padding: 0.5rem;">Pos</th>
              <th onclick="window.handleSortRanking('nome')" style="cursor: pointer;">
                Federação Estadual ${currentSortCol === 'nome' ? (currentSortAsc ? '▲' : '▼') : '↕'}
              </th>
              ${categories.map(cat => {
                const shortName = cat.nome.replace(/Categoria/gi, 'Cat.').replace(/Profissional/gi, 'Prof.');
                return `
                <th onclick="window.handleSortRanking('${cat.id}')" style="cursor: pointer; text-align: center; padding: 0.5rem; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${cat.nome}">
                  ${shortName} ${currentSortCol === cat.id ? (currentSortAsc ? '▲' : '▼') : '↕'}
                </th>
              `}).join('')}
              <th onclick="window.handleSortRanking('total')" style="cursor: pointer; text-align: center; background: #f1f5f9; color: var(--primary); font-weight: 800;">
                TOTAL ${currentSortCol === 'total' ? (currentSortAsc ? '▲' : '▼') : '↕'}
              </th>
            </tr>
          </thead>
          <tbody>
            ${rankedList.map((item, index) => `
              <tr style="${index < 3 ? 'background: #fffdf5;' : ''}">
                <td style="text-align: center;">
                  <span class="standings-badge-pos ${item.posicaoGeral <= 3 ? 'pos-' + item.posicaoGeral : 'pos-other'}">
                    ${item.posicaoGeral}º
                  </span>
                </td>
                <td>
                  <div style="display: flex; align-items: center; gap: 0.65rem;">
                    <img src="assets/federations/${item.id}.jpg" alt="${item.uf}" style="width: 28px; height: 19px; border-radius: 3px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2);">
                    <div>
                      <strong style="color: var(--accent-dark-blue); font-size: 0.9rem; white-space: nowrap;">${item.nome}</strong>
                      <div style="font-size: 0.7rem; color: var(--text-muted);">${item.uf} • Região ${item.regiao}</div>
                    </div>
                  </div>
                </td>
                ${categories.map(cat => {
                  const pts = item[cat.id];
                  const fase = item[`fase_${cat.id}`];
                  return `
                    <td style="text-align: center; vertical-align: middle;">
                      ${pts > 0 ? `
                        <div style="font-weight: 800; color: var(--primary); font-size: 0.9rem;">
                          ${pts} <span style="font-size: 0.65rem; font-weight: 600; color: var(--text-muted);">pts</span>
                        </div>
                        <div style="font-size: 0.65rem; color: #047857; font-weight: 600; white-space: nowrap; max-width: 80px; overflow: hidden; text-overflow: ellipsis; margin: 0 auto;" title="${fase || ''}">
                          ${fase || '1ª Fase'}
                        </div>
                      ` : `
                        <span style="color: var(--text-light);">-</span>
                      `}
                    </td>
                  `;
                }).join('')}
                <td style="text-align: center; vertical-align: middle; background: rgba(2, 128, 144, 0.08); font-weight: 900; font-size: 1.25rem; color: var(--accent-dark-blue);">
                  ${item.total} <span style="font-size: 0.75rem; color: var(--primary); font-weight: 700;">pts</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function renderRanking() {
  const container = document.getElementById('view-ranking');
  if (!container) return;

  const { rankedList, categories } = getRankedData(sortColumn, sortAscending);
  container.innerHTML = renderRankingHTML(rankedList, categories, sortColumn, sortAscending, true);
}
