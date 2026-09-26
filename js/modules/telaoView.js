// Módulo Telão da Arena (Modo TV / Projetor / Fundo Escuro de Alta Visibilidade)
import { store } from '../data/store.js';
import { toast } from './toast.js';

let clockInterval = null;

export function initTelaoView() {
  window.handleTelaoScore = (gameCode, catId, subgameNum, winnerSide) => {
    const games = store.getGames(catId);
    const game = games.find(g => g.code === gameCode);
    if (!game) return;

    // Obtém estado atual de resultados
    const resData = {
      resultado_jogo1: game.resultado_jogo1,
      placar_jogo1: game.placar_jogo1 || '6/4 6/3',
      resultado_jogo2: game.resultado_jogo2,
      placar_jogo2: game.placar_jogo2 || '6/4 6/3',
      resultado_jogo3: game.resultado_jogo3,
      placar_jogo3: game.placar_jogo3 || '10/8 Super Tiebreak'
    };

    if (subgameNum === 1) {
      resData.resultado_jogo1 = (resData.resultado_jogo1 === winnerSide) ? null : winnerSide;
    } else if (subgameNum === 2) {
      resData.resultado_jogo2 = (resData.resultado_jogo2 === winnerSide) ? null : winnerSide;
    } else if (subgameNum === 3) {
      resData.resultado_jogo3 = (resData.resultado_jogo3 === winnerSide) ? null : winnerSide;
    }

    const res = store.recordMatchResult(catId, gameCode, resData);

    if (res.success) {
      if (res.winnerPropagated) {
        toast.show({
          title: '🏆 Confronto Decidido & Grafo Atualizado!',
          message: `Vencedor ${res.winnerPropagated.team} propagado para ${res.winnerPropagated.code} (${res.winnerPropagated.fase})! ${res.loserPropagated ? `Perdedor ${res.loserPropagated.team} para ${res.loserPropagated.code} (${res.loserPropagated.fase}).` : ''}`,
          type: 'graph',
          duration: 7000
        });
      } else {
        toast.show({
          title: 'Placar Parcial Atualizado',
          message: `Jogo ${subgameNum} (${subgameNum === 1 ? 'Feminino' : subgameNum === 2 ? 'Masculino' : 'Dupla Mista'}) registrado!`,
          type: 'success'
        });
      }
      renderTelao();
    }
  };

  window.handleUndoTelao = () => {
    const res = store.undoLastAction();
    if (res.success) {
      toast.show({
        title: 'Desfazer Executado',
        message: res.message,
        type: 'warning'
      });
      renderTelao();
    } else {
      toast.show({
        title: 'Aviso',
        message: res.message,
        type: 'info'
      });
    }
  };

  window.handleAllocateWaitingToFreeCourt = (gameCode, catId) => {
    const courts = store.getCourts();
    const allGames = store.getAllGames();
    
    // Procura primeira quadra sem jogo em andamento no momento
    const busyCourtIds = new Set(allGames.filter(g => g.status === 'em andamento').map(g => g.quadra_id));
    const freeCourt = courts.find(c => !busyCourtIds.has(c.id));

    if (!freeCourt) {
      toast.show({
        title: 'Todas as Quadras Ocupadas',
        message: 'Nenhuma quadra está livre no momento. Finalize um jogo antes de alocar.',
        type: 'warning'
      });
      return;
    }

    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const res = store.scheduleMatch(catId, gameCode, freeCourt.id, nowTime);
    if (res.success) {
      store.setGameStatus(catId, gameCode, 'em andamento');
      toast.show({
        title: 'Jogo em Quadra!',
        message: `Confronto ${gameCode} alocado para ${freeCourt.nome} às ${nowTime} e marcado como AO VIVO!`,
        type: 'success'
      });
      renderTelao();
    }
  };
}

export function renderTelao() {
  const container = document.getElementById('view-telao');
  if (!container) return;

  const allGames = store.getAllGames();
  const liveGames = allGames.filter(g => g.status === 'em andamento');
  const waitingGames = allGames.filter(g => g.status === 'em espera' && g.lado_a && g.lado_b);

  container.innerHTML = `
    <div class="telao-container">
      <!-- HEADER DO TELÃO -->
      <div class="telao-header">
        <div class="telao-brand">
          <div class="brand-logo-icon" style="width: 50px; height: 50px; font-size: 1.8rem;">🎾</div>
          <div>
            <h2>COPA FEDERAÇÕES 2026</h2>
            <p style="color: #94a3b8; font-size: 0.95rem;">Telão da Arena • Placar Ao Vivo & Operação de Quadras</p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 1.5rem;">
          <div class="telao-clock" id="telao-live-clock">
            ${new Date().toLocaleTimeString('pt-BR')}
          </div>

          <div class="telao-toolbar">
            <button class="btn btn-outline" style="border-color: rgba(255,255,255,0.25); color: #ffffff;" onclick="window.handleUndoTelao()">
              ↩️ Desfazer Último Resultado (Undo)
            </button>
            <button class="btn btn-primary" onclick="toggleFullScreen()">
              ⛶ Tela Cheia
            </button>
          </div>
        </div>
      </div>

      <!-- SEÇÃO DE JOGOS AO VIVO -->
      <div>
        <div class="telao-section-title">
          <span class="live-dot" style="width: 12px; height: 12px;"></span>
          Partidas em Andamento nas Quadras (${liveGames.length})
        </div>

        ${liveGames.length === 0 ? `
          <div style="background: rgba(255,255,255,0.04); border: 2px dashed rgba(255,255,255,0.15); border-radius: var(--radius-lg); padding: 3rem 1.5rem; text-align: center;">
            <p style="font-size: 1.3rem; font-weight: 700; color: #cbd5e1;">Nenhuma partida em andamento no momento</p>
            <p style="color: #64748b; font-size: 0.95rem; margin-top: 0.5rem;">
              Escolha uma partida da lista de espera abaixo e clique em <strong>"Chamar para Quadra Livre"</strong>.
            </p>
          </div>
        ` : `
          <div class="telao-live-grid">
            ${liveGames.map(game => renderLiveCard(game)).join('')}
          </div>
        `}
      </div>

      <!-- FILA DE ESPERA / PRÓXIMAS PARTIDAS -->
      <div class="telao-waiting-queue">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h3 style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 800; color: #ffffff;">
            ⏳ Próximos Jogos em Espera (${waitingGames.length})
          </h3>
          <span style="font-size: 0.85rem; color: #94a3b8;">Prontos para entrar em quadra</span>
        </div>

        ${waitingGames.length === 0 ? `
          <p style="color: #64748b; font-size: 0.9rem; margin-top: 1rem;">Nenhum jogo em espera.</p>
        ` : `
          <div class="telao-waiting-cards">
            ${waitingGames.slice(0, 6).map(g => `
              <div class="telao-waiting-card">
                <div>
                  <div style="font-weight: 800; color: #38bdf8; font-size: 0.85rem; margin-bottom: 0.2rem;">
                    ${g.code} • ${g.fase}
                  </div>
                  <div style="font-weight: 700; color: #ffffff; font-size: 0.95rem;">
                    ${g.lado_a?.sigla} vs ${g.lado_b?.sigla}
                  </div>
                  <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.2rem;">
                    ${store.getCourtName(g.quadra_id)} • ${g.horario || 'Horário livre'}
                  </div>
                </div>

                <button class="btn btn-secondary btn-sm" onclick="window.handleAllocateWaitingToFreeCourt('${g.code}', '${g.categoria_id}')">
                  🚀 Chamar Quadra Livre
                </button>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  // Atualiza relógio
  if (!clockInterval) {
    clockInterval = setInterval(() => {
      const clockEl = document.getElementById('telao-live-clock');
      if (clockEl) {
        clockEl.textContent = new Date().toLocaleTimeString('pt-BR');
      }
    }, 1000);
  }
}

function renderLiveCard(game) {
  const courtName = store.getCourtName(game.quadra_id);
  const catName = store.getCategories().find(c => c.id === game.categoria_id)?.nome || '';

  const isWinA1 = game.resultado_jogo1 === 'a';
  const isWinB1 = game.resultado_jogo1 === 'b';
  const isWinA2 = game.resultado_jogo2 === 'a';
  const isWinB2 = game.resultado_jogo2 === 'b';
  const isWinA3 = game.resultado_jogo3 === 'a';
  const isWinB3 = game.resultado_jogo3 === 'b';

  return `
    <div class="telao-live-card">
      <div class="telao-card-top">
        <div class="telao-court-tag">
          📍 ${courtName}
        </div>
        <div class="telao-phase-tag">
          ${game.code} • ${game.fase} (${catName})
        </div>
      </div>

      <!-- PLACAR PRINCIPAL -->
      <div class="telao-matchup">
        <!-- EQUIPE A -->
        <div class="telao-team-box">
          <div class="telao-state-badge">${game.lado_a?.uf}</div>
          <div class="telao-team-name">${game.lado_a?.nome}</div>
        </div>

        <!-- PLACAR DA SÉRIE -->
        <div class="telao-series-score">
          <div class="telao-score-num">${game.vitorias_a || 0}</div>
          <div class="telao-score-divider">:</div>
          <div class="telao-score-num">${game.vitorias_b || 0}</div>
        </div>

        <!-- EQUIPE B -->
        <div class="telao-team-box">
          <div class="telao-state-badge">${game.lado_b?.uf}</div>
          <div class="telao-team-name">${game.lado_b?.nome}</div>
        </div>
      </div>

      <!-- BOTÕES DE REGISTRO DIRETO DOS 3 JOGOS (F, M, DX) -->
      <div class="telao-subgames-panel">
        <!-- JOGO 1: FEMININO -->
        <div class="telao-subgame-row">
          <span class="telao-subgame-label">
            👩 Jogo 1: Dupla Feminina (F)
          </span>
          <div class="telao-subgame-buttons">
            <button class="btn-score-winner ${isWinA1 ? 'active-win' : ''}" 
                    onclick="window.handleTelaoScore('${game.code}', '${game.categoria_id}', 1, 'a')">
              ${game.lado_a?.sigla} ${isWinA1 ? '✓ Venceu' : ''}
            </button>
            <span style="font-size: 0.8rem; color: #64748b;">vs</span>
            <button class="btn-score-winner ${isWinB1 ? 'active-win' : ''}" 
                    onclick="window.handleTelaoScore('${game.code}', '${game.categoria_id}', 1, 'b')">
              ${game.lado_b?.sigla} ${isWinB1 ? '✓ Venceu' : ''}
            </button>
          </div>
        </div>

        <!-- JOGO 2: MASCULINO -->
        <div class="telao-subgame-row">
          <span class="telao-subgame-label">
            👨 Jogo 2: Dupla Masculina (M)
          </span>
          <div class="telao-subgame-buttons">
            <button class="btn-score-winner ${isWinA2 ? 'active-win' : ''}" 
                    onclick="window.handleTelaoScore('${game.code}', '${game.categoria_id}', 2, 'a')">
              ${game.lado_a?.sigla} ${isWinA2 ? '✓ Venceu' : ''}
            </button>
            <span style="font-size: 0.8rem; color: #64748b;">vs</span>
            <button class="btn-score-winner ${isWinB2 ? 'active-win' : ''}" 
                    onclick="window.handleTelaoScore('${game.code}', '${game.categoria_id}', 2, 'b')">
              ${game.lado_b?.sigla} ${isWinB2 ? '✓ Venceu' : ''}
            </button>
          </div>
        </div>

        <!-- JOGO 3: DUPLA MISTA (DX) -->
        <div class="telao-subgame-row" style="background: rgba(255, 183, 3, 0.1); border-color: rgba(255, 183, 3, 0.2);">
          <span class="telao-subgame-label" style="color: #ffb703;">
            🌟 Jogo 3: Dupla Mista Decisiva (DX)
          </span>
          <div class="telao-subgame-buttons">
            <button class="btn-score-winner ${isWinA3 ? 'active-win' : ''}" 
                    onclick="window.handleTelaoScore('${game.code}', '${game.categoria_id}', 3, 'a')">
              ${game.lado_a?.sigla} ${isWinA3 ? '✓ Venceu' : ''}
            </button>
            <span style="font-size: 0.8rem; color: #ffb703;">vs</span>
            <button class="btn-score-winner ${isWinB3 ? 'active-win' : ''}" 
                    onclick="window.handleTelaoScore('${game.code}', '${game.categoria_id}', 3, 'b')">
              ${game.lado_b?.sigla} ${isWinB3 ? '✓ Venceu' : ''}
            </button>
          </div>
        </div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.75rem;">
        <span>Destino Vencedor: <strong>${game.proxima_fase || 'Término'}</strong></span>
        <button class="btn btn-outline btn-sm" style="color: #cbd5e1; border-color: rgba(255,255,255,0.2);" onclick="window.openMatchScore('${game.code}', '${game.categoria_id}')">
          ⚙️ Detalhes & Placares dos Sets
        </button>
      </div>
    </div>
  `;
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn('Erro ao entrar em fullscreen:', err);
    });
  } else {
    document.exitFullscreen().catch(err => {
      console.warn('Erro ao sair de fullscreen:', err);
    });
  }
}
