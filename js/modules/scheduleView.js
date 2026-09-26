// Módulo de Programação / Grade Horária e Quadras
import { store } from '../data/store.js';
import { openScheduleModal, openMatchModal } from './modal.js';
import { toast } from './toast.js';

let currentScheduleViewTab = 'grid'; // 'grid' | 'individual'
let filterTeamId = '';
let filterCatId = '';

const TIME_SLOTS = [
  '08:00', '08:45', '09:30', '10:15', '11:00', '11:45', 
  '12:30', '13:15', '14:00', '14:45', '15:30', '16:15', 
  '17:00', '17:45', '18:30', '19:15'
];

export function initScheduleView() {
  window.switchScheduleTab = (tab) => {
    currentScheduleViewTab = tab;
    renderSchedule();
  };

  window.handleFilterSchedule = () => {
    filterTeamId = document.getElementById('sched-filter-team')?.value || '';
    filterCatId = document.getElementById('sched-filter-cat')?.value || '';
    renderSchedule();
  };
}

export function renderSchedule() {
  const container = document.getElementById('view-programacao');
  if (!container) return;

  const courts = store.getCourts().filter(c => c.disponivel);
  const federations = store.getFederations();
  const categories = store.getActiveCategories();
  const allGames = store.getAllGames().filter(g => !g.is_bye && g.lado_a && g.lado_b);

  container.innerHTML = `
    <!-- BARRA SUPERIOR DE FILTRO E ABAS -->
    <div class="schedule-header-bar">
      <div class="schedule-tabs">
        <button class="schedule-tab-btn ${currentScheduleViewTab === 'grid' ? 'active' : ''}" onclick="window.switchScheduleTab('grid')">
          🏟️ Grade por Quadras
        </button>
        <button class="schedule-tab-btn ${currentScheduleViewTab === 'individual' ? 'active' : ''}" onclick="window.switchScheduleTab('individual')">
          📋 Programação Individual
        </button>
      </div>

      <div class="schedule-filters">
        <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted);">Filtrar:</label>
        <select id="sched-filter-cat" class="form-select" style="width: auto;" onchange="window.handleFilterSchedule()">
          <option value="">Todas as Categorias</option>
          ${categories.map(c => `<option value="${c.id}" ${c.id === filterCatId ? 'selected' : ''}>${c.nome}</option>`).join('')}
        </select>

        <select id="sched-filter-team" class="form-select" style="width: auto;" onchange="window.handleFilterSchedule()">
          <option value="">Todas as Federações</option>
          ${federations.map(f => `<option value="${f.id}" ${f.id === filterTeamId ? 'selected' : ''}>${f.sigla} (${f.uf})</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- CONTEÚDO DA PROGRAMAÇÃO -->
    ${currentScheduleViewTab === 'grid' 
      ? renderScheduleGrid(courts, allGames) 
      : renderIndividualSchedule(allGames, filterTeamId, filterCatId)}
  `;

  setupDragAndDrop();
}

// Renderizador da Grade Horária (Quadras x Horários)
function renderScheduleGrid(courts, games) {
  return `
    <div class="schedule-matrix-wrapper">
      <table class="schedule-grid-table">
        <thead>
          <tr>
            <th class="time-col-header">Horário</th>
            ${courts.map(court => `
              <th>
                <div style="color: var(--primary); font-family: var(--font-display); font-size: 0.95rem;">${court.nome}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">${court.tipo}</div>
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${TIME_SLOTS.map(time => `
            <tr>
              <td class="time-cell">${time}</td>
              ${courts.map(court => {
                // Encontra jogo agendado nesta quadra e horário
                const match = games.find(g => g.quadra_id === court.id && g.horario === time);
                return `
                  <td>
                    <div class="court-drop-slot" data-court-id="${court.id}" data-time="${time}">
                      ${match ? renderDraggableMatch(match) : `
                        <div class="court-empty-slot" onclick="window.promptScheduleModal('${court.id}', '${time}')">
                          <span>+ Agendar</span>
                        </div>
                      `}
                    </div>
                  </td>
                `;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Card de jogo arrastável na grade
function renderDraggableMatch(game) {
  return `
    <div class="scheduled-game-card status-${game.status}" 
         draggable="true" 
         data-game-code="${game.code}" 
         data-cat-id="${game.categoria_id}"
         onclick="window.openMatchScore('${game.code}', '${game.categoria_id}')">
      
      <div class="card-sched-header">
        <span style="font-weight: 800; color: var(--accent-dark-blue);">${game.code}</span>
        <span class="badge-status ${game.status}" style="font-size: 0.65rem; padding: 0.1rem 0.35rem;">
          ${game.status === 'em_andamento' ? 'AO VIVO' : game.status}
        </span>
      </div>

      <div class="card-sched-teams">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span>${game.lado_a?.sigla} (${game.lado_a?.uf})</span>
          <strong style="color: var(--primary);">${game.vitorias_a || 0}</strong>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span>${game.lado_b?.sigla} (${game.lado_b?.uf})</span>
          <strong style="color: var(--primary);">${game.vitorias_b || 0}</strong>
        </div>
      </div>

      <div class="card-sched-score">
        <span>Fase: ${game.fase}</span>
      </div>
    </div>
  `;
}

// Renderizador da Programação Individual (Filtros por Equipe / Categoria)
function renderIndividualSchedule(games, teamId, catId) {
  let filtered = games;
  if (teamId) {
    filtered = filtered.filter(g => g.lado_a?.id === teamId || g.lado_b?.id === teamId);
  }
  if (catId) {
    filtered = filtered.filter(g => g.categoria_id === catId);
  }

  // Ordena por horário
  filtered.sort((a, b) => (a.horario || '99:99').localeCompare(b.horario || '99:99'));

  return `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">📋 Lista de Jogos Filtrados (${filtered.length})</h3>
      </div>

      ${filtered.length === 0 ? `
        <p style="text-align: center; color: var(--text-muted); padding: 2rem;">
          Nenhum confronto localizado com os filtros selecionados.
        </p>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${filtered.map(game => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: #ffffff;">
              <div style="display: flex; align-items: center; gap: 1rem;">
                <span class="state-badge" style="background: var(--primary); font-size: 0.85rem;">${game.code}</span>
                <div>
                  <div style="font-weight: 700; font-size: 0.95rem; color: var(--accent-dark-blue);">
                    ${game.lado_a?.nome} (${game.lado_a?.uf}) vs ${game.lado_b?.nome} (${game.lado_b?.uf})
                  </div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                    Categoria: <strong>${store.getCategories().find(c=>c.id===game.categoria_id)?.nome}</strong> • Fase: ${game.fase}
                  </div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="text-align: right;">
                  <div style="font-weight: 700; color: var(--accent-dark-blue);">
                    ${store.getCourtName(game.quadra_id)}
                  </div>
                  <div style="font-size: 0.8rem; color: var(--text-muted);">
                    🕒 ${game.horario || 'A definir'}
                  </div>
                </div>

                <span class="badge-status ${game.status}">${game.status}</span>

                <button class="btn btn-outline btn-sm" onclick="window.openScheduleDetails('${game.code}', '${game.categoria_id}')">
                  📅 Reagendar
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

// Configura Drag and Drop nativo em HTML5
function setupDragAndDrop() {
  const cards = document.querySelectorAll('.scheduled-game-card');
  const slots = document.querySelectorAll('.court-drop-slot');

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', JSON.stringify({
        gameCode: card.dataset.gameCode,
        catId: card.dataset.catId
      }));
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
  });

  slots.forEach(slot => {
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      slot.classList.add('drag-over');
    });

    slot.addEventListener('dragleave', () => {
      slot.classList.remove('drag-over');
    });

    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('drag-over');

      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        const targetCourtId = slot.dataset.courtId;
        const targetTime = slot.dataset.time;

        const res = store.scheduleMatch(data.catId, data.gameCode, targetCourtId, targetTime);
        if (res.success) {
          toast.show({
            title: 'Jogo Realocado',
            message: `Confronto ${data.gameCode} movido para ${targetTime} na ${store.getCourtName(targetCourtId)}!`,
            type: 'success'
          });
          renderSchedule();
        } else {
          toast.show({
            title: 'Conflito de Agendamento',
            message: res.message,
            type: 'error'
          });
        }
      } catch (err) {
        console.error('Erro no drag-and-drop:', err);
      }
    });
  });

  window.promptScheduleModal = (courtId, time) => {
    // Lista jogos que precisam ser agendados (lados definidos e sem quadra/horário)
    const availableToSchedule = store.getAllGames().filter(g => !g.is_bye && g.lado_a && g.lado_b && (!g.quadra_id || !g.horario));
    if (availableToSchedule.length === 0) {
      toast.show({
        title: 'Nenhum jogo pendente',
        message: 'Todos os confrontos com equipes definidas já possuem quadra e horário agendados.',
        type: 'info'
      });
      return;
    }

    const first = availableToSchedule[0];
    openScheduleModal(first.code, first.categoria_id);
  };
}
