// Aplicação Principal Copa Federações 2026
import { store } from './data/store.js';
import { supabaseService } from './data/supabaseClient.js';
import { initAuthUI, showLoginPortal, hideLoginPortal, auth } from './modules/auth.js';
import { renderDashboard } from './modules/dashboard.js';
import { initCategoryView, renderCategoryView } from './modules/categoryView.js';
import { initBracketView, renderBracket } from './modules/bracketView.js';
import { initRankingView, renderRanking } from './modules/rankingView.js';
import { initTeamsAthletesView, renderTeamsAthletes } from './modules/teamsAthletesView.js';
import { initConfigView, renderConfig } from './modules/configView.js';
import { openMatchModal, openScheduleModal, openConfigureFirstRoundModal, openEditFirstRoundCardModal } from './modules/modal.js';

let activeTab = 'home';

function switchTab(tabId) {
  activeTab = tabId;

  // Atualiza botões da barra de navegação
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    if (tab.dataset.tab === tabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Atualiza views visíveis
  const views = document.querySelectorAll('.app-view');
  views.forEach(v => {
    if (v.id === `view-${tabId}`) {
      v.classList.add('active');
    } else {
      v.classList.remove('active');
    }
  });

  // Renderiza a view correspondente
  renderCurrentView();
}

function renderCurrentView() {
  try {
    if (activeTab === 'home') renderDashboard();
    else if (activeTab === 'categorias') renderCategoryView();
    else if (activeTab === 'chaveamento') renderBracket();
    else if (activeTab === 'ranking') renderRanking();
    else if (activeTab === 'cadastro') renderTeamsAthletes();
    else if (activeTab === 'configuracoes') renderConfig();
  } catch (err) {
    console.error(`Erro ao renderizar view ${activeTab}:`, err);
  }

  updateBadges();
}

function updateBadges() {
  const allGames = store.getAllGames();
  const liveCount = allGames.filter(g => g.status === 'em andamento').length;

  const topLiveBadge = document.getElementById('topbar-live-count');
  if (topLiveBadge) {
    topLiveBadge.textContent = liveCount > 0 ? `${liveCount} AO VIVO` : 'SEM JOGOS AO VIVO';
  }
}

// Inicialização da Aplicação
document.addEventListener('DOMContentLoaded', () => {
  // Exposição global de funções para eventos HTML inline
  window.switchTab = switchTab;
  window.openMatchScore = (code, catId = 'prof') => openMatchModal(code, catId);
  window.openScheduleDetails = (code, catId = 'prof') => openScheduleModal(code, catId);
  window.openConfigureFirstRoundModal = (catId = 'prof') => openConfigureFirstRoundModal(catId);
  window.openEditFirstRoundCardModal = (code, catId = 'prof') => openEditFirstRoundCardModal(code, catId);

  // Exposição global de autenticação
  window.showLoginPortal = showLoginPortal;
  window.hideLoginPortal = hideLoginPortal;
  window.auth = auth;

  // Inicializa submódulos de eventos
  initCategoryView();
  initBracketView();
  initRankingView();
  initTeamsAthletesView();
  initConfigView();
  initAuthUI();

  // Configura cliques nos botões de tabs
  const tabButtons = document.querySelectorAll('.nav-tab');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Reatividade: quando os dados mudam no Store, re-renderiza a view atual
  store.subscribe(() => {
    renderCurrentView();
  });

  // Notificação global de atualização em tempo real para todos os usuários
  window.showLiveUpdateToast = (summary) => {
    if (window.toast && typeof window.toast.show === 'function') {
      window.toast.show({
        title: '⚡ Arbitragem CBT (Baumann)',
        message: summary || 'Placar e chaveamento atualizados em tempo real.',
        type: 'info',
        duration: 5000
      });
    }
  };


  // Inicializa o serviço do Supabase
  supabaseService.init(store);

  // Inicializa o controle de zoom da aplicação (Padrão 85%)
  initZoomController();

  // Render inicial
  switchTab('home');

  // Fechar modal ao pressionar ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('match-modal-overlay');
      if (overlay) overlay.classList.remove('active');
    }
  });
});

function initZoomController() {
  const DEFAULT_ZOOM = 85;
  const MIN_ZOOM = 70;
  const MAX_ZOOM = 110;
  const STEP = 5;

  let currentZoom = parseInt(localStorage.getItem('copa_zoom_level'), 10);
  if (isNaN(currentZoom) || currentZoom < MIN_ZOOM || currentZoom > MAX_ZOOM) {
    currentZoom = DEFAULT_ZOOM;
  }

  const zoomText = document.getElementById('zoom-level-display');
  const btnOut = document.getElementById('btn-zoom-out');
  const btnIn = document.getElementById('btn-zoom-in');
  const btnReset = document.getElementById('btn-zoom-reset');

  function applyZoom(zoom) {
    currentZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    document.documentElement.style.zoom = (currentZoom / 100).toString();
    if (zoomText) zoomText.textContent = `${currentZoom}%`;
    localStorage.setItem('copa_zoom_level', currentZoom.toString());
  }

  if (btnOut) {
    btnOut.addEventListener('click', () => applyZoom(currentZoom - STEP));
  }
  if (btnIn) {
    btnIn.addEventListener('click', () => applyZoom(currentZoom + STEP));
  }
  if (btnReset) {
    btnReset.addEventListener('click', () => applyZoom(DEFAULT_ZOOM));
  }

  // Aplica imediatamente
  applyZoom(currentZoom);

  window.setAppZoom = applyZoom;
}
