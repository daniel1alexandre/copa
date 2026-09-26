// Módulo Home / Painel Principal
import { store } from '../data/store.js';
import { getRankedData, renderRankingHTML } from './rankingView.js';

export function renderDashboard() {
  const container = document.getElementById('view-home');
  if (!container) return;

  const tournament = store.getTournament();
  const feds = store.getFederations();
  const cats = store.getActiveCategories();
  const allGames = store.getAllGames();

  // Contador de jogos realizados e a serem realizados (desconsidera BYEs)
  const finishedGames = allGames.filter(g => g.status === 'encerrado' && !g.is_bye);
  const pendingGames = allGames.filter(g => g.status !== 'encerrado' && !g.is_bye);

  // Dados do ranking geral consolidado
  const { rankedList, categories } = getRankedData('total', false);

  container.innerHTML = `
    <!-- BANNER TOPO TORNEIO -->
    <div style="background: linear-gradient(135deg, #091b2c 0%, #004b57 60%, #028090 100%); border-radius: var(--radius-lg); padding: 1.75rem; color: white; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; box-shadow: var(--shadow-md);">
      <div>
        <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255, 183, 3, 0.2); color: #ffb703; padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem;">
          <span class="live-dot"></span> Torneio Oficial em Andamento
        </div>
        <h2 style="font-family: var(--font-display); font-size: 1.85rem; font-weight: 800; letter-spacing: -0.02em;">${tournament.nome}</h2>
        <p style="color: rgba(255, 255, 255, 0.85); font-size: 0.95rem; margin-top: 0.25rem;">
          📍 ${tournament.local} &nbsp;•&nbsp; 🗓️ ${formatDate(tournament.dataInicio)} a ${formatDate(tournament.dataFim)}
        </p>
      </div>
      <div style="display: flex; gap: 0.75rem;">
        <button class="btn btn-secondary btn-lg" onclick="window.switchTab('categorias')">🎾 Categorias</button>
        <button class="btn btn-outline" style="color: white; border-color: rgba(255,255,255,0.4);" onclick="window.switchTab('chaveamento')">⚔️ Ver Confrontos</button>
      </div>
    </div>

    <!-- CARDS DE RESUMO (KPIS) COM CONTADORES DE JOGOS A REALIZAR E REALIZADOS -->
    <div class="kpi-grid" style="margin-bottom: 2rem;">
      <div class="kpi-card kpi-teal">
        <div class="kpi-icon-wrap">🇧🇷</div>
        <div>
          <div class="kpi-value">${feds.length}</div>
          <div class="kpi-label">Federações Estaduais</div>
        </div>
      </div>

      <div class="kpi-card kpi-gold">
        <div class="kpi-icon-wrap">🎾</div>
        <div>
          <div class="kpi-value">${cats.length}</div>
          <div class="kpi-label">Categorias Ativas</div>
        </div>
      </div>

      <div class="kpi-card kpi-orange">
        <div class="kpi-icon-wrap">⏳</div>
        <div>
          <div class="kpi-value">${pendingGames.length}</div>
          <div class="kpi-label">Jogos a Serem Realizados</div>
        </div>
      </div>

      <div class="kpi-card kpi-green">
        <div class="kpi-icon-wrap">✅</div>
        <div>
          <div class="kpi-value">${finishedGames.length}</div>
          <div class="kpi-label">Jogos Realizados</div>
        </div>
      </div>
    </div>

    <!-- SEÇÃO PRINCIPAL DA PÁGINA INICIAL: RANKING GERAL COMPLETO -->
    <div style="margin-top: 1rem;">
      ${renderRankingHTML(rankedList, categories, 'total', false, true)}
    </div>
  `;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
