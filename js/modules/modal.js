// Gerenciador de Modais da Aplicação
import { store } from '../data/store.js';
import { toast } from './toast.js';
import { auth } from './auth.js';

export function openMatchModal(gameCode, categoryId = 'prof') {
  const games = store.getGames(categoryId);
  const game = games.find(g => g.code === gameCode);
  if (!game) return;

  const overlay = document.getElementById('match-modal-overlay');
  if (!overlay) return;

  const isProf = categoryId === 'prof';
  const formatText = isProf
    ? 'Melhor de 3 sets convencionais (até 6 games)'
    : '2 sets até 4 games (3x3 tie-break até 7 pts) • Empate 1x1: Super Tie-break até 10 pts';

  const isByeA = game.bye_slot === 'A' || (game.is_bye && !game.lado_a);
  const isByeB = game.bye_slot === 'B' || (game.is_bye && !game.lado_b);

  const teamAName = isByeA
    ? '<span style="color: #059669; font-weight: 700;">⏩ BYE</span>'
    : (game.lado_a 
      ? `<span style="display: inline-flex; align-items: center; gap: 0.5rem;"><img src="assets/federations/${game.lado_a.id}.jpg" alt="${game.lado_a.uf}" onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${game.lado_a.id}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${game.lado_a.id}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" style="width: 32px; height: 24px; border-radius: 3px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2); background: #ffffff; padding: 1px;"> <strong>${game.lado_a.nome} (${game.lado_a.uf})</strong></span>` 
      : 'Aguardando definição');
  const teamBName = isByeB
    ? '<span style="color: #059669; font-weight: 700;">⏩ BYE</span>'
    : (game.lado_b 
      ? `<span style="display: inline-flex; align-items: center; gap: 0.5rem;"><img src="assets/federations/${game.lado_b.id}.jpg" alt="${game.lado_b.uf}" onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${game.lado_b.id}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${game.lado_b.id}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" style="width: 32px; height: 24px; border-radius: 3px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2); background: #ffffff; padding: 1px;"> <strong>${game.lado_b.nome} (${game.lado_b.uf})</strong></span>` 
      : 'Aguardando definição');

  const content = `
    <div class="modal-dialog">
      <div class="modal-header">
        <div>
          <h3>🎾 Confronto ${game.code} — ${game.fase}</h3>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">Categoria: <strong>${store.getCategories().find(c=>c.id===categoryId)?.nome || categoryId}</strong></p>
          <div style="font-size: 0.75rem; color: #047857; background: #ecfdf5; padding: 0.25rem 0.6rem; border-radius: var(--radius-xs); display: inline-block; font-weight: 600; border: 1px solid #a7f3d0;">
            📋 Regra: ${formatText}
          </div>
        </div>
        <button class="modal-close-btn" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">&times;</button>
      </div>

      <div class="modal-body">
        <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 700;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="color: var(--text-muted); font-size: 0.85rem;">Equipe A:</span>
              ${teamAName}
            </div>
            <span class="badge-status ${game.status}">${game.status.toUpperCase()}</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 700; margin-top: 0.6rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="color: var(--text-muted); font-size: 0.85rem;">Equipe B:</span>
              ${teamBName}
            </div>
            <span style="background: var(--primary-light); padding: 0.2rem 0.6rem; border-radius: var(--radius-xs); font-size: 0.85rem;">Série: <strong>${game.vitorias_a || 0} x ${game.vitorias_b || 0}</strong></span>
          </div>
        </div>

        ${game.fase === '1ª Fase' ? `
          <!-- SEÇÃO DE EDIÇÃO DE EQUIPES E BYE PARA 1ª FASE -->
          <div style="margin-bottom: 1.25rem; border: 1.5px solid #bfdbfe; border-radius: var(--radius-md); background: #eff6ff; padding: 0.85rem 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <strong style="color: #1e40af; font-size: 0.9rem;">⚙️ Estados deste Confronto (${game.code}):</strong>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: #1e3a8a;">
                Defina os estados ou BYE deste jogo com a lista de seleção, estados clareados e checks.
              </p>
            </div>
            ${window.auth.isAdmin() ? `
              <button type="button" class="btn btn-primary btn-sm" onclick="window.openChangeTeamSlotModal('${game.code}', '${categoryId}')" style="background: #028090; border-color: #028090; font-weight: 700; display: inline-flex; align-items: center; gap: 0.4rem;">
                ✏️ Editar Estados do Confronto
              </button>
            ` : ''}
          </div>
        ` : ''}

        ${game.is_bye ? `
          <div style="padding: 1.25rem; text-align: center; background: #ecfdf5; border: 1px solid #10b981; border-radius: var(--radius-md); color: #065f46; font-weight: 600;">
            ⏩ <strong>Confronto com Vaga Livre (BYE):</strong> A equipe <strong>${(game.lado_a?.id === game.vencedor_id ? game.lado_a?.nome : game.lado_b?.nome) || 'classificada'}</strong> passou direto para a próxima fase (${game.proxima_fase || 'próxima fase'}) sem necessidade de disputa de placar.
          </div>
        ` : `
          ${(game.status !== 'encerrado' && window.auth.isAdmin()) ? `
            <div style="margin-bottom: 1rem; padding: 0.6rem 0.85rem; border: 1px dashed #059669; border-radius: var(--radius-md); background: #f0fdf4; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
              <span style="font-size: 0.8rem; font-weight: 700; color: #065f46;">⏩ Vaga Livre / W.O.:</span>
              <div style="display: flex; gap: 0.4rem;">
                ${game.lado_a ? `<button type="button" class="btn btn-outline btn-xs" style="color: #065f46; border-color: #10b981; font-weight: 700;" onclick="window.advanceTeamByBye('${categoryId}', '${game.code}', 'A')">Avançar ${game.lado_a.uf} direto (BYE)</button>` : ''}
                ${game.lado_b ? `<button type="button" class="btn btn-outline btn-xs" style="color: #065f46; border-color: #10b981; font-weight: 700;" onclick="window.advanceTeamByBye('${categoryId}', '${game.code}', 'B')">Avançar ${game.lado_b.uf} direto (BYE)</button>` : ''}
              </div>
            </div>
          ` : ''}
          <form id="match-score-form">
            <!-- JOGO 1: DUPLA FEMININA -->
            <div style="border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <strong style="color: #be185d;">Jogo 1: Dupla Feminina (F)</strong>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${isProf ? 'Set até 6 games' : '2 sets até 4 games (TB 3x3)'}</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div>
                  <label class="form-label">Placar do Jogo 1:</label>
                  <input type="text" id="modal-placar-j1" class="form-control" value="${game.placar_jogo1 || ''}" placeholder="${isProf ? 'Ex: 6/3 6/4' : 'Ex: 4/1 4/2'}" oninput="window.maskScore(this)" ${!window.auth.isAdmin() ? 'disabled' : ''}>
                </div>
                <div>
                  <label class="form-label">Vencedor Jogo 1:</label>
                  <select id="modal-vencedor-j1" class="form-select" ${!window.auth.isAdmin() ? 'disabled' : ''}>
                    <option value="" ${!game.resultado_jogo1 ? 'selected' : ''}>-- Em Aberto --</option>
                    <option value="a" ${game.resultado_jogo1 === 'a' ? 'selected' : ''}>Equipe A (${game.lado_a?.uf || 'A'})</option>
                    <option value="b" ${game.resultado_jogo1 === 'b' ? 'selected' : ''}>Equipe B (${game.lado_b?.uf || 'B'})</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- JOGO 2: DUPLA MASCULINA -->
            <div style="border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <strong style="color: #1d4ed8;">Jogo 2: Dupla Masculina (M)</strong>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${isProf ? 'Set até 6 games' : '2 sets até 4 games (TB 3x3)'}</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div>
                  <label class="form-label">Placar do Jogo 2:</label>
                  <input type="text" id="modal-placar-j2" class="form-control" value="${game.placar_jogo2 || ''}" placeholder="${isProf ? 'Ex: 6/4 7/5' : 'Ex: 4/2 4/1'}" oninput="window.maskScore(this)" ${!window.auth.isAdmin() ? 'disabled' : ''}>
                </div>
                <div>
                  <label class="form-label">Vencedor Jogo 2:</label>
                  <select id="modal-vencedor-j2" class="form-select" ${!window.auth.isAdmin() ? 'disabled' : ''}>
                    <option value="" ${!game.resultado_jogo2 ? 'selected' : ''}>-- Em Aberto --</option>
                    <option value="a" ${game.resultado_jogo2 === 'a' ? 'selected' : ''}>Equipe A (${game.lado_a?.uf || 'A'})</option>
                    <option value="b" ${game.resultado_jogo2 === 'b' ? 'selected' : ''}>Equipe B (${game.lado_b?.uf || 'B'})</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- JOGO 3: DUPLA MISTA (DX) -->
            <div style="border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem; background: #fffbeb;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <strong style="color: #b45309;">Jogo 3: Dupla Mista Decisiva (DX)</strong>
                <span style="font-size: 0.75rem; color: #b45309; font-weight: 600;">Disputado somente se empatar em 1x1 (${isProf ? 'Super TB 10 pts' : 'Super Tie-break até 10 pts'})</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div>
                  <label class="form-label">Placar Jogo 3 (Decisivo):</label>
                  <input type="text" id="modal-placar-j3" class="form-control" value="${game.placar_jogo3 || ''}" placeholder="Ex: 10/8 Super TB" oninput="window.maskScore(this)" ${!window.auth.isAdmin() ? 'disabled' : ''}>
                </div>
                <div>
                  <label class="form-label">Vencedor Jogo 3:</label>
                  <select id="modal-vencedor-j3" class="form-select" ${!window.auth.isAdmin() ? 'disabled' : ''}>
                    <option value="" ${!game.resultado_jogo3 ? 'selected' : ''}>-- Não disputado / Em aberto --</option>
                    <option value="a" ${game.resultado_jogo3 === 'a' ? 'selected' : ''}>Equipe A (${game.lado_a?.uf || 'A'})</option>
                    <option value="b" ${game.resultado_jogo3 === 'b' ? 'selected' : ''}>Equipe B (${game.lado_b?.uf || 'B'})</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Status e Grafo Destino Preview -->
            <div style="font-size: 0.825rem; color: var(--text-muted); background: var(--bg-subtle); padding: 0.75rem; border-radius: var(--radius-sm);">
              <div>🔄 <strong>Propagação do Vencedor:</strong> ${game.proxima_fase ? `Avança para o jogo ${game.proxima_fase} (${game.proxima_fase_slot})` : 'Final / Sem próximo jogo'}</div>
              <div>🔄 <strong>Propagação do Perdedor:</strong> ${game.proxima_fase_perdedor ? `Avança para a Chave Reversa ${game.proxima_fase_perdedor}` : 'Eliminado / Sem chave reversa'}</div>
            </div>
          </form>
        `}
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">Fechar</button>
        ${(!game.is_bye && window.auth.isAdmin()) ? `
          <button type="button" class="btn btn-primary" id="btn-save-modal-match">Salvar e Propagar Resultado</button>
        ` : ''}
      </div>
    </div>
  `;

  overlay.innerHTML = content;
  overlay.classList.add('active');

  // Event listener para salvar equipes do confronto na 1ª fase
  const btnSaveTeams = document.getElementById('btn-save-match-teams');
  if (btnSaveTeams) {
    btnSaveTeams.addEventListener('click', () => {
      if (!auth.isAdmin()) {
        toast.show({
          title: 'Acesso Restrito',
          message: 'Apenas o administrador (Baumann) pode alterar os confrontos.',
          type: 'warning'
        });
        window.showLoginPortal();
        return;
      }
      const teamAId = document.getElementById('edit-side-a').value || null;
      const teamBId = document.getElementById('edit-side-b').value || null;
      const chkBye = document.getElementById('edit-is-bye').checked;
      const isBye = Boolean(chkBye || (teamAId && !teamBId) || (!teamAId && teamBId));
      const byeSlot = (!teamBId) ? 'B' : (!teamAId ? 'A' : 'B');

      const res = store.updateFirstRoundMatch(categoryId, gameCode, teamAId, isBye ? null : teamBId, isBye, byeSlot);
      if (res.success) {
        toast.show({
          title: 'Confronto Atualizado',
          message: isBye ? `Confronto ${gameCode} definido como Vaga Livre (BYE). A outra equipe passou direto para a próxima fase!` : `Equipes do jogo ${gameCode} atualizadas com sucesso!`,
          type: 'success'
        });
        if (window.renderBracket) window.renderBracket();
        if (window.renderSchedule) window.renderSchedule();
        openMatchModal(gameCode, categoryId); // Recarrega o modal atualizado
      }
    });
  }

  const saveBtn = document.getElementById('btn-save-modal-match');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (!auth.isAdmin()) {
        toast.show({
          title: 'Acesso Restrito',
          message: 'Apenas o administrador (Baumann) pode lançar ou alterar resultados dos confrontos.',
          type: 'warning'
        });
        window.showLoginPortal();
        return;
      }
      const j1 = document.getElementById('modal-vencedor-j1').value || null;
      const p1 = document.getElementById('modal-placar-j1').value.trim();
      const j2 = document.getElementById('modal-vencedor-j2').value || null;
      const p2 = document.getElementById('modal-placar-j2').value.trim();
      const j3 = document.getElementById('modal-vencedor-j3').value || null;
      const p3 = document.getElementById('modal-placar-j3').value.trim();

      const res = store.recordMatchResult(categoryId, gameCode, {
        resultado_jogo1: j1,
        placar_jogo1: p1,
        resultado_jogo2: j2,
        placar_jogo2: p2,
        resultado_jogo3: j3,
        placar_jogo3: p3
      });

      if (res.success) {
        let msg = `Resultado do jogo ${gameCode} atualizado.`;
        if (res.winnerPropagated) {
          msg += ` Vencedor (${res.winnerPropagated.team}) propagado para ${res.winnerPropagated.code} (${res.winnerPropagated.fase})!`;
          toast.show({
            title: 'Grafo Propagado!',
            message: msg,
            type: 'graph',
            duration: 6000
          });
        } else {
          toast.show({
            title: 'Resultado Salvo',
            message: msg,
            type: 'success'
          });
        }
        overlay.classList.remove('active');
      } else {
        toast.show({
          title: 'Erro',
          message: res.message,
          type: 'error'
        });
      }
    });
  }
}

// Modal dedicado para configuração completa de todos os 16 confrontos da 1ª rodada e BYEs
export function openConfigureFirstRoundModal(categoryId = 'prof') {
  const games = store.getGames(categoryId);
  const r32Games = games.filter(g => g.fase === '1ª Fase');
  const federations = store.getCategoryParticipatingFeds(categoryId);
  const catObj = store.getCategories().find(c => c.id === categoryId);
  const totalFeds = federations.length;
  const targetByes = Math.max(0, 32 - totalFeds);

  const overlay = document.getElementById('match-modal-overlay');
  if (!overlay) return;

  // Track currently active slot to pick states into { code, slot }
  window.firstRoundActiveSlot = null;

  const content = `
    <div class="modal-dialog" style="max-width: 1240px; width: 96vw; max-height: 92vh;">
      <div class="modal-header">
        <div>
          <h3>⚙️ Configuração dos Confrontos da 1ª Rodada & BYEs</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem; margin-bottom: 0;">
            Categoria: <strong>${catObj?.nome || categoryId}</strong> • Defina quem joga contra quem e quais são os confrontos livres (BYEs).
          </p>
        </div>
        <button class="modal-close-btn" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">&times;</button>
      </div>

      <div class="modal-body" style="max-height: calc(92vh - 140px); overflow-y: auto; padding: 1.15rem;">
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 0.75rem 1.15rem; border-radius: var(--radius-md); margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <strong style="color: #1e40af;">Regras da Categoria:</strong>
            <span style="font-size: 0.85rem; color: #1e3a8a; margin-left: 0.5rem;">
              Com <strong>${totalFeds} federações participantes</strong> nesta categoria, exatamente <strong>${targetByes} vagas são BYEs</strong> (avanço direto às Oitavas).
            </span>
          </div>
          <div id="first-round-summary-badge" style="font-size: 0.82rem; font-weight: 700; color: #1e40af;">
            Carregando contagem...
          </div>
        </div>

        <div class="first-round-modal-layout">
          <!-- COLUNA 1: LISTA DE SELEÇÃO DOS ESTADOS -->
          <div class="state-selection-panel" id="first-round-state-panel">
            <div class="state-selection-header">
              <div class="state-selection-title">
                <span>📋 Lista de Seleção dos Estados</span>
                <span id="state-list-counter" style="font-size: 0.72rem; font-weight: 800; color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 0.15rem 0.5rem; border-radius: 4px;">
                  ${totalFeds} Estados
                </span>
              </div>
              <input type="text" id="state-selection-filter" class="state-selection-search" placeholder="🔍 Filtrar estado (ex: SP, RJ, Minas)..." oninput="window.filterFirstRoundStateList(this.value)">
              <div style="font-size: 0.72rem; color: #475569; line-height: 1.35; margin-top: 0.25rem;">
                💡 <strong>Estados escalados:</strong> Ficam clareados com <strong>check (✓)</strong>. Clique no <strong>check (✓)</strong> para <strong>desmarcar e reabilitar</strong> o estado!
              </div>
            </div>
            <div class="state-selection-list" id="first-round-state-items-container">
              <!-- Renderizado dinamicamente -->
            </div>
          </div>

          <!-- COLUNA 2: CONFRONTOS DA 1ª RODADA (C1 a C16) -->
          <div style="min-width: 0;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.65rem; flex-wrap: wrap; gap: 0.5rem;">
              <h4 style="font-family: var(--font-display); font-size: 1.05rem; font-weight: 800; color: #004b57; margin: 0;">
                ⚔️ 16 Confrontos da 1ª Rodada (Chave Principal)
              </h4>
              <span id="active-slot-hint" style="font-size: 0.78rem; color: #028090; font-weight: 700; background: #f0fdfa; padding: 0.2rem 0.55rem; border-radius: 4px; border: 1px solid #99f6e4;">
                Dica: Selecione pelos menus ou clique na lista de estados
              </span>
            </div>

            <fieldset style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.85rem; border: none; padding: 0; margin: 0;" id="r32-matchup-list" ${!window.auth.isAdmin() ? 'disabled' : ''}>
              ${r32Games.map((g, idx) => {
                return `
                  <div class="card" style="padding: 0.8rem; border: 1.5px solid var(--border-strong); background: #ffffff; border-radius: var(--radius-sm); box-shadow: var(--shadow-sm);" data-match-code="${g.code}">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                      <span class="state-badge" style="background: var(--primary); font-size: 0.75rem; width: 26px; height: 26px; font-weight: 800; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; color: white;">
                        ${g.code}
                      </span>
                      <span style="font-size: 0.72rem; color: var(--text-muted);">
                        Destino: <strong>${g.proxima_fase} (${g.proxima_fase_slot})</strong>
                      </span>
                      <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; font-weight: 700; color: #065f46; cursor: pointer;">
                        <input type="checkbox" class="cfg-is-bye" data-code="${g.code}" ${g.is_bye ? 'checked' : ''} onchange="window.toggleFirstRoundBye('${g.code}', this.checked)">
                        É BYE
                      </label>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 0.45rem;">
                      <div class="slot-wrap" id="slot-wrap-${g.code}-A" style="padding: 0.25rem 0.35rem; border-radius: 4px; border: 1px solid transparent; transition: all 0.15s ease;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                          <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); margin: 0;">Equipe A:</label>
                          <button type="button" class="btn-clear-slot btn-clear-${g.code}-A" style="display: ${g.lado_a?.id ? 'inline-flex' : 'none'}; width: 17px; height: 17px; font-size: 0.65rem;" title="Limpar Equipe A" onclick="window.clearMatchSlot('${g.code}', 'A')">✕</button>
                        </div>
                        <select class="form-select cfg-team-a" data-code="${g.code}" style="padding: 0.35rem 0.5rem; font-size: 0.825rem; font-weight: 600;" onfocus="window.setActiveMatchSlot('${g.code}', 'A')" onchange="window.updateFirstRoundStateSelection()">
                          <option value="">-- Selecionar Federação --</option>
                          ${federations.map(f => {
                            const byesList = store.getCategoryByes(categoryId);
                            const byeRank = byesList.indexOf(f.id) + 1;
                            const seedLabel = byeRank > 0 ? `[#${byeRank}]` : '';
                            return `
                            <option value="${f.id}" ${g.lado_a?.id === f.id ? 'selected' : ''}>${f.nome} (${f.uf}) ${seedLabel}</option>
                            `;
                          }).join('')}
                        </select>
                      </div>

                      <div class="slot-wrap" id="slot-wrap-${g.code}-B" style="padding: 0.25rem 0.35rem; border-radius: 4px; border: 1px solid transparent; transition: all 0.15s ease;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                          <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); margin: 0;">Equipe B:</label>
                          <button type="button" class="btn-clear-slot btn-clear-${g.code}-B" style="display: ${(!g.is_bye && g.lado_b?.id) ? 'inline-flex' : 'none'}; width: 17px; height: 17px; font-size: 0.65rem;" title="Limpar Equipe B" onclick="window.clearMatchSlot('${g.code}', 'B')">✕</button>
                        </div>
                        <select class="form-select cfg-team-b" data-code="${g.code}" style="padding: 0.35rem 0.5rem; font-size: 0.825rem; font-weight: 600;" ${g.is_bye ? 'disabled' : ''} onfocus="window.setActiveMatchSlot('${g.code}', 'B')" onchange="window.updateFirstRoundStateSelection()">
                          <option value="">-- VAGA LIVRE (BYE) --</option>
                          ${federations.map(f => {
                            const byesList = store.getCategoryByes(categoryId);
                            const byeRank = byesList.indexOf(f.id) + 1;
                            const seedLabel = byeRank > 0 ? `[#${byeRank}]` : '';
                            return `
                            <option value="${f.id}" ${(!g.is_bye && g.lado_b?.id === f.id) ? 'selected' : ''}>${f.nome} (${f.uf}) ${seedLabel}</option>
                            `;
                          }).join('')}
                        </select>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </fieldset>
          </div>
        </div>
      </div>

      <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1.25rem;">
        <button type="button" class="btn btn-outline btn-sm" onclick="window.handleResetDefaultSeeds('${categoryId}')">
          🎲 Restaurar Sorteio por Cabeças de Chave
        </button>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-outline" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">Cancelar</button>
          ${window.auth.isAdmin() ? `
          <button type="button" class="btn btn-primary" id="btn-save-all-first-round">
            💾 Salvar Chaveamento Completo
          </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  overlay.innerHTML = content;
  overlay.classList.add('active');

  // Controla o slot focado atualmente
  window.setActiveMatchSlot = (code, slot) => {
    window.firstRoundActiveSlot = { code, slot };
    document.querySelectorAll('.slot-wrap').forEach(el => el.classList.remove('slot-focus-active'));
    const targetWrap = document.getElementById(`slot-wrap-${code}-${slot}`);
    if (targetWrap) targetWrap.classList.add('slot-focus-active');
    const hint = document.getElementById('active-slot-hint');
    if (hint) {
      hint.innerHTML = `👉 Slot ativo: <strong>${code} (Equipe ${slot})</strong>. Clique em qualquer estado livre na lista para alocar!`;
    }
  };

  // Limpa um slot específico
  window.clearMatchSlot = (code, slot) => {
    const sel = document.querySelector(`.cfg-team-${slot.toLowerCase()}[data-code="${code}"]`);
    if (sel) {
      sel.value = '';
    }
    window.updateFirstRoundStateSelection();
  };

  // Desmarca um estado pelo check e o reabilita na lista
  window.unselectStateFromFirstRound = (fedId) => {
    document.querySelectorAll('#r32-matchup-list .card').forEach(card => {
      const selA = card.querySelector('.cfg-team-a');
      const selB = card.querySelector('.cfg-team-b');
      if (selA && selA.value === fedId) {
        selA.value = '';
      }
      if (selB && selB.value === fedId) {
        selB.value = '';
      }
    });

    const catByes = store.getCategoryByes(categoryId) || [];
    if (catByes.includes(fedId)) {
      store.setCategoryByes(categoryId, catByes.filter(id => id !== fedId));
    }

    const fed = federations.find(f => f.id === fedId);
    toast.show({
      title: 'Estado Habilitado',
      message: `${fed ? fed.nome : fedId} desmarcado e habilitado novamente para seleção!`,
      type: 'info',
      duration: 2500
    });

    window.updateFirstRoundStateSelection();
  };

  // Escala um estado livre no slot ativo ou no primeiro disponível
  window.pickStateForFirstRound = (fedId) => {
    let targetSelect = null;
    let targetCode = '';
    let targetSlot = '';

    // Se há um slot ativo selecionado pelo usuário
    if (window.firstRoundActiveSlot) {
      const { code, slot } = window.firstRoundActiveSlot;
      const sel = document.querySelector(`.cfg-team-${slot.toLowerCase()}[data-code="${code}"]`);
      if (sel && !sel.disabled) {
        targetSelect = sel;
        targetCode = code;
        targetSlot = slot;
      }
    }

    // Se não há slot ativo, encontra o primeiro slot vazio
    if (!targetSelect) {
      const cards = document.querySelectorAll('#r32-matchup-list .card');
      for (const card of cards) {
        const code = card.dataset.matchCode;
        const selA = card.querySelector('.cfg-team-a');
        const selB = card.querySelector('.cfg-team-b');
        const isBye = card.querySelector('.cfg-is-bye')?.checked;

        if (selA && !selA.value) {
          targetSelect = selA;
          targetCode = code;
          targetSlot = 'A';
          break;
        } else if (selB && !selB.disabled && !isBye && !selB.value) {
          targetSelect = selB;
          targetCode = code;
          targetSlot = 'B';
          break;
        }
      }
    }

    if (targetSelect) {
      targetSelect.value = fedId;
      const fed = federations.find(f => f.id === fedId);
      toast.show({
        title: 'Estado Escalado',
        message: `${fed?.uf || fedId} definido para ${targetCode} (Equipe ${targetSlot})!`,
        type: 'success',
        duration: 2500
      });

      // Avança foco para o próximo slot
      window.advanceActiveSlotToNext(targetCode, targetSlot);
      window.updateFirstRoundStateSelection();
    } else {
      toast.show({
        title: 'Todos os Slots Preenchidos',
        message: 'Não há mais slots livres na 1ª rodada. Desmarque um estado existente para liberar uma vaga.',
        type: 'warning'
      });
    }
  };

  window.advanceActiveSlotToNext = (currentCode, currentSlot) => {
    const cards = Array.from(document.querySelectorAll('#r32-matchup-list .card'));
    let foundCurrent = false;
    for (const card of cards) {
      const code = card.dataset.matchCode;
      const isBye = card.querySelector('.cfg-is-bye')?.checked;

      if (code === currentCode && currentSlot === 'A') {
        const selB = card.querySelector('.cfg-team-b');
        if (selB && !selB.disabled && !isBye && !selB.value) {
          window.setActiveMatchSlot(code, 'B');
          return;
        }
      }

      if (foundCurrent) {
        const selA = card.querySelector('.cfg-team-a');
        const selB = card.querySelector('.cfg-team-b');
        if (selA && !selA.value) {
          window.setActiveMatchSlot(code, 'A');
          return;
        }
        if (selB && !selB.disabled && !isBye && !selB.value) {
          window.setActiveMatchSlot(code, 'B');
          return;
        }
      }

      if (code === currentCode) {
        foundCurrent = true;
      }
    }
  };

  window.toggleFirstRoundBye = (code, isChecked) => {
    const selB = document.querySelector(`.cfg-team-b[data-code="${code}"]`);
    if (selB) {
      selB.disabled = isChecked;
      if (isChecked) selB.value = '';
    }
    window.updateFirstRoundStateSelection();
  };

  // Atualiza contadores, clareamento e checks na lista de seleção
  window.updateFirstRoundStateSelection = () => {
    const cards = document.querySelectorAll('#r32-matchup-list .card');
    const assignedMap = {}; // fedId => { code, slot, label }
    const duplicates = new Set();
    const chosenTeams = new Set();
    let byesCount = 0;

    cards.forEach(card => {
      const code = card.dataset.matchCode;
      const isBye = card.querySelector('.cfg-is-bye')?.checked || false;
      if (isBye) byesCount++;

      const selA = card.querySelector('.cfg-team-a');
      const valA = selA ? selA.value : '';
      const clearBtnA = card.querySelector(`.btn-clear-${code}-A`);
      if (clearBtnA) clearBtnA.style.display = valA ? 'inline-flex' : 'none';

      if (valA) {
        if (chosenTeams.has(valA)) duplicates.add(valA);
        chosenTeams.add(valA);
        assignedMap[valA] = { code, slot: 'A', label: 'Equipe A' };
      }

      const selB = card.querySelector('.cfg-team-b');
      const valB = (!isBye && selB) ? selB.value : '';
      const clearBtnB = card.querySelector(`.btn-clear-${code}-B`);
      if (clearBtnB) clearBtnB.style.display = (valB && !isBye) ? 'inline-flex' : 'none';

      if (valB) {
        if (chosenTeams.has(valB)) duplicates.add(valB);
        chosenTeams.add(valB);
        assignedMap[valB] = { code, slot: 'B', label: 'Equipe B' };
      }
    });

    // Rastreia estados selecionados nas categorias como BYE
    const catByesList = store.getCategoryByes(categoryId) || [];
    catByesList.forEach((byeId, idx) => {
      if (byeId && !assignedMap[byeId]) {
        assignedMap[byeId] = {
          code: 'BYE',
          slot: 'BYE',
          label: `BYE (${idx + 1}º Rank)`,
          isCategoryBye: true,
          byeIndex: idx
        };
      }
    });

    // Atualiza opções dos dropdowns de todos os 16 confrontos para impossibilitar seleção dupla
    cards.forEach(card => {
      const code = card.dataset.matchCode;
      const isBye = card.querySelector('.cfg-is-bye')?.checked || false;
      const selA = card.querySelector('.cfg-team-a');
      const selB = card.querySelector('.cfg-team-b');
      const curValA = selA ? selA.value : '';
      const curValB = (!isBye && selB) ? selB.value : '';

      if (selA) {
        Array.from(selA.options).forEach(opt => {
          if (!opt.value) return;
          const assigned = assignedMap[opt.value];
          const isSelf = opt.value === curValA;
          const isOtherSide = opt.value === curValB;
          if (assigned && !isSelf) {
            opt.disabled = true;
            opt.style.color = '#94a3b8';
            opt.style.background = '#f8fafc';
          } else if (isOtherSide && !isSelf) {
            opt.disabled = true;
            opt.style.color = '#94a3b8';
          } else {
            opt.disabled = false;
            opt.style.color = '';
            opt.style.background = '';
          }
        });
      }

      if (selB) {
        Array.from(selB.options).forEach(opt => {
          if (!opt.value) return;
          const assigned = assignedMap[opt.value];
          const isSelf = opt.value === curValB;
          const isOtherSide = opt.value === curValA;
          if (assigned && !isSelf) {
            opt.disabled = true;
            opt.style.color = '#94a3b8';
            opt.style.background = '#f8fafc';
          } else if (isOtherSide && !isSelf) {
            opt.disabled = true;
            opt.style.color = '#94a3b8';
          } else {
            opt.disabled = false;
            opt.style.color = '';
            opt.style.background = '';
          }
        });
      }
    });

    // Atualiza badge de contagem
    const badge = document.getElementById('first-round-summary-badge');
    if (badge) {
      if (duplicates.size > 0) {
        badge.innerHTML = `<span style="color: #dc2626;">⚠️ Conflito: ${duplicates.size} federação(ões) duplicada(s)!</span>`;
      } else {
        badge.innerHTML = `<span>Equipes escaladas: <strong>${chosenTeams.size} / ${totalFeds}</strong> • BYEs: <strong>${byesCount} / ${targetByes}</strong></span>`;
      }
    }

    // Renderiza a lista de estados com clareamento e checks
    window.renderFirstRoundStateList(assignedMap);
  };

  window.renderFirstRoundStateList = (assignedMapParam) => {
    const container = document.getElementById('first-round-state-items-container');
    if (!container) return;

    let assignedMap = assignedMapParam;
    if (!assignedMap) {
      assignedMap = {};
      document.querySelectorAll('#r32-matchup-list .card').forEach(card => {
        const code = card.dataset.matchCode;
        const isBye = card.querySelector('.cfg-is-bye')?.checked;
        const valA = card.querySelector('.cfg-team-a')?.value;
        const valB = !isBye ? card.querySelector('.cfg-team-b')?.value : '';
        if (valA) assignedMap[valA] = { code, slot: 'A', label: 'Equipe A' };
        if (valB) assignedMap[valB] = { code, slot: 'B', label: 'Equipe B' };
      });
    }

    const searchTerm = (document.getElementById('state-selection-filter')?.value || '').toLowerCase().trim();
    const byesList = store.getCategoryByes(categoryId);

    // Ordena federações alfabeticamente
    const sortedFeds = [...federations].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    const filteredFeds = sortedFeds.filter(f => {
      if (!searchTerm) return true;
      return f.nome.toLowerCase().includes(searchTerm) || f.uf.toLowerCase().includes(searchTerm);
    });

    const totalSelected = Object.keys(assignedMap).length;
    const counterBadge = document.getElementById('state-list-counter');
    if (counterBadge) {
      counterBadge.innerText = `${totalSelected}/${totalFeds} Escalados`;
    }

    container.innerHTML = filteredFeds.map(fed => {
      const assigned = assignedMap[fed.id];
      const byeRank = byesList.indexOf(fed.id) + 1;
      const seedLabel = byeRank > 0 ? `[#${byeRank}]` : '';

      if (assigned) {
        // ESTADO SELECIONADO: Clareado com check
        return `
          <div class="state-select-item is-selected" data-fed-id="${fed.id}" title="${fed.nome} (${fed.uf}) está escalado em ${assigned.code} (${assigned.label}). Clique no check para desmarcar!">
            <div class="state-item-left">
              <img src="assets/federations/${fed.id}.jpg" alt="${fed.uf}" onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${fed.id}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${fed.id}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" class="state-item-flag">
              <span class="state-item-name">${fed.nome} (${fed.uf})</span>
              ${seedLabel ? `<span class="state-item-seed">${seedLabel}</span>` : ''}
            </div>

            <button type="button" 
                    class="btn-state-unselect-check" 
                    title="Escalado em ${assigned.code} (${assigned.label}). Clique para desmarcar e habilitar novamente!" 
                    onclick="event.stopPropagation(); window.unselectStateFromFirstRound('${fed.id}')">
              <span class="check-symbol">✓</span>
              <span class="check-slot-tag">${assigned.code} (${assigned.slot})</span>
            </button>
          </div>
        `;
      } else {
        // ESTADO DISPONÍVEL: Ativo, cores normais
        return `
          <div class="state-select-item is-available" data-fed-id="${fed.id}" onclick="window.pickStateForFirstRound('${fed.id}')" title="Clique para escalar ${fed.nome} (${fed.uf})">
            <div class="state-item-left">
              <img src="assets/federations/${fed.id}.jpg" alt="${fed.uf}" onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${fed.id}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${fed.id}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" class="state-item-flag">
              <span class="state-item-name">${fed.nome} (${fed.uf})</span>
              ${seedLabel ? `<span class="state-item-seed">${seedLabel}</span>` : ''}
            </div>

            <button type="button" 
                    class="btn-state-assign-quick" 
                    title="Clique para escalar" 
                    onclick="event.stopPropagation(); window.pickStateForFirstRound('${fed.id}')">
              + Escalar
            </button>
          </div>
        `;
      }
    }).join('');
  };

  window.filterFirstRoundStateList = () => {
    window.renderFirstRoundStateList();
  };

  window.handleResetDefaultSeeds = (catId) => {
    if (confirm('Deseja restaurar as posições originais das 27 federações e 5 BYEs conforme o chaveamento padrão?')) {
      store.generateBracket(catId, false);
      toast.show({ title: 'Chave Restaurada', message: 'Sorteio padrão restabelecido.', type: 'info' });
      openConfigureFirstRoundModal(catId);
    }
  };

  window.updateFirstRoundStateSelection();

  document.getElementById('btn-save-all-first-round').addEventListener('click', () => {
    const cards = document.querySelectorAll('#r32-matchup-list .card');
    const matchups = [];

    cards.forEach(card => {
      const code = card.dataset.matchCode;
      const teamAId = card.querySelector('.cfg-team-a').value || null;
      const chkBye = card.querySelector('.cfg-is-bye').checked;
      const rawTeamBId = card.querySelector('.cfg-team-b').value || null;
      const isBye = Boolean(chkBye || (!rawTeamBId && teamAId) || (!teamAId && rawTeamBId));
      const teamBId = isBye ? null : rawTeamBId;
      const byeSlot = (!rawTeamBId) ? 'B' : (!teamAId ? 'A' : 'B');

      matchups.push({
        code,
        teamAId,
        teamBId,
        isBye,
        byeSlot
      });
    });

    if (!auth.isAdmin()) {
      toast.show({
        title: 'Acesso Restrito',
        message: 'Apenas o administrador (Baumann) pode salvar o chaveamento da 1ª rodada.',
        type: 'warning'
      });
      window.showLoginPortal();
      return;
    }

    const res = store.saveAllFirstRoundMatchups(categoryId, matchups);
    if (res.success) {
      toast.show({
        title: 'Chaveamento Salvo',
        message: 'Confrontos da 1ª rodada e BYEs propagados com sucesso para as Oitavas de Final!',
        type: 'success',
        duration: 5000
      });
      overlay.classList.remove('active');
    }
  });
}

export function openScheduleModal(gameCode, categoryId = 'prof') {
  const games = store.getGames(categoryId);
  const game = games.find(g => g.code === gameCode);
  if (!game) return;

  if (!game.lado_a || !game.lado_b) {
    toast.show({
      title: 'Não permitido',
      message: 'Apenas confrontos com ambas as equipes já definidas podem ser agendados.',
      type: 'warning'
    });
    return;
  }

  const courts = store.getCourts();
  const times = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'];

  const overlay = document.getElementById('match-modal-overlay');
  if (!overlay) return;

  const content = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>📅 Agendar Confronto ${game.code}</h3>
        <button class="modal-close-btn" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">&times;</button>
      </div>
      <div class="modal-body">
        <p style="margin-bottom: 1rem; font-weight: 600;">
          ${game.lado_a.sigla} (${game.lado_a.uf}) vs ${game.lado_b.sigla} (${game.lado_b.uf})
        </p>

        <div class="form-group">
          <label class="form-label">Selecione a Quadra:</label>
          <select id="modal-sched-court" class="form-select" ${!window.auth.isAdmin() ? 'disabled' : ''}>
            <option value="">-- Sem quadra definida --</option>
            ${courts.map(c => `
              <option value="${c.id}" ${game.quadra_id === c.id ? 'selected' : ''}>${c.nome} (${c.tipo})</option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Selecione o Horário:</label>
          <select id="modal-sched-time" class="form-select" ${!window.auth.isAdmin() ? 'disabled' : ''}>
            <option value="">-- Sem horário definido --</option>
            ${times.map(t => `
              <option value="${t}" ${game.horario === t ? 'selected' : ''}>${t}</option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Status do Jogo:</label>
          <select id="modal-sched-status" class="form-select" ${!window.auth.isAdmin() ? 'disabled' : ''}>
            <option value="em espera" ${game.status === 'em espera' ? 'selected' : ''}>🟡 Em Espera (Aguardando chamada)</option>
            <option value="em andamento" ${game.status === 'em andamento' ? 'selected' : ''}>🔵 Em Andamento (Em quadra)</option>
            <option value="encerrado" ${game.status === 'encerrado' ? 'selected' : ''}>✅ Encerrado</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">Cancelar</button>
        ${window.auth.isAdmin() ? `
        <button type="button" class="btn btn-primary" id="btn-save-schedule">Confirmar Agendamento</button>
        ` : ''}
      </div>
    </div>
  `;

  overlay.innerHTML = content;
  overlay.classList.add('active');

  document.getElementById('btn-save-schedule').addEventListener('click', () => {
    if (!auth.isAdmin()) {
      toast.show({
        title: 'Acesso Restrito',
        message: 'Apenas o administrador (Baumann) pode agendar quadras e horários.',
        type: 'warning'
      });
      window.showLoginPortal();
      return;
    }
    const courtId = document.getElementById('modal-sched-court').value;
    const timeStr = document.getElementById('modal-sched-time').value;
    const statusVal = document.getElementById('modal-sched-status').value;

    const res = store.scheduleMatch(categoryId, gameCode, courtId, timeStr);
    if (res.success) {
      if (statusVal) {
        store.setGameStatus(categoryId, gameCode, statusVal);
      }
      toast.show({
        title: 'Agendamento Salvo',
        message: `Confronto ${gameCode} agendado para ${timeStr || 'horário livre'} na ${store.getCourtName(courtId)}.`,
        type: 'success'
      });
      overlay.classList.remove('active');
    } else {
      toast.show({
        title: 'Falha no Agendamento',
        message: res.message,
        type: 'error'
      });
    }
  });
}

// Modal focado e direto para edição de confronto da 1ª rodada a partir do card na árvore
export function openEditFirstRoundCardModal(gameCode, categoryId = 'prof') {
  const games = store.getGames(categoryId);
  const game = games.find(g => g.code === gameCode);
  if (!game) return;

  const overlay = document.getElementById('match-modal-overlay');
  if (!overlay) return;

  const catObj = store.getCategories().find(c => c.id === categoryId);
  const allFeds = store.getFederations();
  const participatingFeds = store.getCategoryParticipatingFeds(categoryId);
  const participatingIds = new Set(participatingFeds.map(f => f.id));
  const isBye = Boolean(game.is_bye);

  // Ordena federações em ordem alfabética
  const sortedFeds = [...allFeds].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const isProf = categoryId === 'prof';
  const formatText = isProf
    ? 'Melhor de 3 sets convencionais (até 6 games)'
    : '2 sets até 4 games (3x3 tie-break até 7 pts) • Empate 1x1: Super Tie-break até 10 pts';

  const content = `
    <div class="modal-dialog" style="max-width: 620px;">
      <div class="modal-header">
        <div>
          <h3>🎾 Editar Confronto ${game.code} — 1ª Rodada</h3>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">
            Categoria: <strong>${catObj?.nome || categoryId}</strong> • Vencedor avança para: <strong>${game.proxima_fase || 'Oitavas de Final'}</strong>
          </p>
          <div style="font-size: 0.75rem; color: #047857; background: #ecfdf5; padding: 0.25rem 0.6rem; border-radius: var(--radius-xs); display: inline-block; font-weight: 600; border: 1px solid #a7f3d0;">
            📋 Regra: ${formatText}
          </div>
        </div>
        <button class="modal-close-btn" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">&times;</button>
      </div>

      <div class="modal-body">
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.25rem; font-size: 0.85rem; color: #166534;">
          💡 <strong>Edição de Confronto:</strong> Escolha os estados para este jogo ou marque a opção BYE. Quando o estado passa de BYE, o placar não recebe nenhum resultado e o estado avança automaticamente como vencedor.
        </div>

        <form id="edit-first-round-card-form" onsubmit="event.preventDefault();">
          <fieldset style="border: none; padding: 0; margin: 0;" ${!window.auth.isAdmin() ? 'disabled' : ''}>
          <!-- SELEÇÃO DE EQUIPES -->
          <div style="border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.1rem; margin-bottom: 1rem; background: var(--bg-subtle);">
            
            <!-- ESTADO A -->
            <div style="margin-bottom: 0.85rem;">
              <label class="form-label" style="font-weight: 700; color: var(--accent-dark-blue);">🇧🇷 Estado / Federação A:</label>
              <select id="card-edit-side-a" class="form-select" style="font-weight: 600;">
                <option value="">-- Nenhuma Selecionada --</option>
                ${sortedFeds.map(f => {
                  const isPart = participatingIds.has(f.id);
                  const byesList = store.getCategoryByes(categoryId);
                  const byeRank = byesList.indexOf(f.id) + 1;
                  const seedLabel = byeRank > 0 ? `[#${byeRank}]` : '';
                  return `
                    <option value="${f.id}" ${game.lado_a?.id === f.id ? 'selected' : ''}>
                      ${f.nome} (${f.uf}) ${seedLabel} ${!isPart ? '(não inscrito)' : ''}
                    </option>
                  `;
                }).join('')}
              </select>
            </div>

            <!-- OPÇÃO DE BYE -->
            <div style="background: #ffffff; border: 2px solid ${isBye ? '#10b981' : '#cbd5e1'}; border-radius: var(--radius-sm); padding: 0.75rem 0.85rem; margin-bottom: 0.85rem; transition: all 0.2s ease;">
              <label style="display: flex; align-items: center; gap: 0.65rem; font-weight: 700; cursor: pointer; color: #047857; font-size: 0.9rem;">
                <input type="checkbox" id="card-edit-is-bye" ${isBye ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #10b981;" onchange="window.handleCardModalByeToggle(this.checked)">
                ⏩ Definir este confronto como BYE (Estado A avança como vencedor sem resultado no placar)
              </label>
            </div>

            <!-- ESTADO B -->
            <div id="card-edit-side-b-container" style="${isBye ? 'display: none;' : ''}">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
                <label class="form-label" style="font-weight: 700; color: var(--accent-dark-blue); margin: 0;">🇧🇷 Estado / Federação B:</label>
                <button type="button" class="btn btn-outline btn-xs" onclick="window.handleSwapCardTeams()">⇄ Inverter A e B</button>
              </div>
              <select id="card-edit-side-b" class="form-select" style="font-weight: 600;" ${isBye ? 'disabled' : ''}>
                <option value="">-- Nenhuma Selecionada --</option>
                ${sortedFeds.map(f => {
                  const isPart = participatingIds.has(f.id);
                  const byesList = store.getCategoryByes(categoryId);
                  const byeRank = byesList.indexOf(f.id) + 1;
                  const seedLabel = byeRank > 0 ? `[#${byeRank}]` : '';
                  return `
                    <option value="${f.id}" ${game.lado_b?.id === f.id ? 'selected' : ''}>
                      ${f.nome} (${f.uf}) ${seedLabel} ${!isPart ? '(não inscrito)' : ''}
                    </option>
                  `;
                }).join('')}
              </select>
            </div>
          </div>

          <!-- PLACARES DA PARTIDA (APENAS SE NÃO FOR BYE) -->
          <div id="card-edit-scores-container" style="${isBye ? 'display: none;' : ''}; border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <h4 style="font-size: 0.9rem; font-weight: 800; color: var(--accent-dark-blue); margin: 0;">
                🎾 Resultados dos Jogos (Melhor de 3):
              </h4>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${formatText}</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
              <div>
                <label class="form-label" style="color: #be185d; font-weight: 700;">Jogo 1: Dupla Feminina (F)</label>
                <input type="text" id="card-edit-p1" class="form-control" value="${game.placar_jogo1 || ''}" placeholder="${isProf ? 'Ex: 6/3 6/4' : 'Ex: 4/1 4/2'}" oninput="window.maskScore(this)">
              </div>
              <div>
                <label class="form-label">Vencedor Jogo 1:</label>
                <select id="card-edit-j1" class="form-select">
                  <option value="" ${!game.resultado_jogo1 ? 'selected' : ''}>-- Em aberto --</option>
                  <option value="a" ${game.resultado_jogo1 === 'a' ? 'selected' : ''}>Estado A (${game.lado_a?.uf || 'A'})</option>
                  <option value="b" ${game.resultado_jogo1 === 'b' ? 'selected' : ''}>Estado B (${game.lado_b?.uf || 'B'})</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
              <div>
                <label class="form-label" style="color: #1d4ed8; font-weight: 700;">Jogo 2: Dupla Masculina (M)</label>
                <input type="text" id="card-edit-p2" class="form-control" value="${game.placar_jogo2 || ''}" placeholder="${isProf ? 'Ex: 6/4 7/5' : 'Ex: 4/2 4/1'}" oninput="window.maskScore(this)">
              </div>
              <div>
                <label class="form-label">Vencedor Jogo 2:</label>
                <select id="card-edit-j2" class="form-select">
                  <option value="" ${!game.resultado_jogo2 ? 'selected' : ''}>-- Em aberto --</option>
                  <option value="a" ${game.resultado_jogo2 === 'a' ? 'selected' : ''}>Estado A (${game.lado_a?.uf || 'A'})</option>
                  <option value="b" ${game.resultado_jogo2 === 'b' ? 'selected' : ''}>Estado B (${game.lado_b?.uf || 'B'})</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div>
                <label class="form-label" style="color: #b45309; font-weight: 700;">Jogo 3: Dupla Mista (DX - Decisivo)</label>
                <input type="text" id="card-edit-p3" class="form-control" value="${game.placar_jogo3 || ''}" placeholder="Ex: 10/7 Super TB" oninput="window.maskScore(this)">
              </div>
              <div>
                <label class="form-label">Vencedor Jogo 3:</label>
                <select id="card-edit-j3" class="form-select">
                  <option value="" ${!game.resultado_jogo3 ? 'selected' : ''}>-- Em aberto / Não disputado --</option>
                  <option value="a" ${game.resultado_jogo3 === 'a' ? 'selected' : ''}>Estado A (${game.lado_a?.uf || 'A'})</option>
                  <option value="b" ${game.resultado_jogo3 === 'b' ? 'selected' : ''}>Estado B (${game.lado_b?.uf || 'B'})</option>
                </select>
              </div>
            </div>
          </div>
          </fieldset>
        </form>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">Cancelar</button>
        ${window.auth.isAdmin() ? `
        <button type="button" class="btn btn-primary" id="btn-save-card-first-round">💾 Salvar Alterações do Confronto</button>
        ` : ''}
      </div>
    </div>
  `;

  overlay.innerHTML = content;
  overlay.classList.add('active');

  window.handleCardModalByeToggle = (checked) => {
    const sideBContainer = document.getElementById('card-edit-side-b-container');
    const sideB = document.getElementById('card-edit-side-b');
    const scoresContainer = document.getElementById('card-edit-scores-container');
    if (sideBContainer) sideBContainer.style.display = checked ? 'none' : 'block';
    if (sideB) sideB.disabled = checked;
    if (scoresContainer) scoresContainer.style.display = checked ? 'none' : 'block';
  };

  window.handleSwapCardTeams = () => {
    const selA = document.getElementById('card-edit-side-a');
    const selB = document.getElementById('card-edit-side-b');
    if (selA && selB) {
      const temp = selA.value;
      selA.value = selB.value;
      selB.value = temp;
    }
  };

  const btnSave = document.getElementById('btn-save-card-first-round');
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      if (!auth.isAdmin()) {
        toast.show({
          title: 'Acesso Restrito',
          message: 'Apenas o administrador (Baumann) pode alterar confrontos e resultados.',
          type: 'warning'
        });
        window.showLoginPortal();
        return;
      }
      const selA = document.getElementById('card-edit-side-a');
      const selB = document.getElementById('card-edit-side-b');
      const chkBye = document.getElementById('card-edit-is-bye');

      const teamAId = selA ? selA.value : null;
      const chkByeChecked = chkBye ? chkBye.checked : false;
      const rawTeamBId = selB ? selB.value : null;
      const isByeVal = Boolean(chkByeChecked || (!rawTeamBId && teamAId) || (!teamAId && rawTeamBId));
      const teamBId = isByeVal ? null : rawTeamBId;
      const byeSlot = (!rawTeamBId) ? 'B' : (!teamAId ? 'A' : 'B');

      if (!teamAId && !teamBId && isByeVal) {
        alert('Selecione uma Federação para avançar de BYE.');
        return;
      }

      // 1. Atualiza equipes e status de BYE
      store.updateFirstRoundMatch(categoryId, gameCode, teamAId, teamBId, isByeVal, byeSlot);

      // 2. Se não for BYE e tiver resultados, salva os jogos
      if (!isByeVal) {
        const j1 = document.getElementById('card-edit-j1')?.value || null;
        const p1 = document.getElementById('card-edit-p1')?.value.trim() || '';
        const j2 = document.getElementById('card-edit-j2')?.value || null;
        const p2 = document.getElementById('card-edit-p2')?.value.trim() || '';
        const j3 = document.getElementById('card-edit-j3')?.value || null;
        const p3 = document.getElementById('card-edit-p3')?.value.trim() || '';

        if (j1 || j2 || j3 || p1 || p2 || p3) {
          store.recordMatchResult(categoryId, gameCode, {
            resultado_jogo1: j1,
            placar_jogo1: p1,
            resultado_jogo2: j2,
            placar_jogo2: p2,
            resultado_jogo3: j3,
            placar_jogo3: p3
          });
        }
      }

      overlay.classList.remove('active');
      toast.show({
        title: 'Confronto Atualizado',
        message: `Confronto ${gameCode} atualizado com sucesso no chaveamento!`,
        type: 'success'
      });
      if (window.renderBracket) window.renderBracket();
      if (window.renderSchedule) window.renderSchedule();
    });
  }
}

export function advanceTeamByBye(categoryId, gameCode, winningSide = 'A') {
  const res = store.setMatchAsBye(categoryId, gameCode, winningSide);
  if (res.success) {
    toast.show({
      title: 'Avanço por BYE',
      message: `${res.winTeam.nome} (${res.winTeam.uf}) avançou direto para a próxima fase!`,
      type: 'success',
      duration: 5000
    });
    if (window.renderBracket) window.renderBracket();
    if (window.renderSchedule) window.renderSchedule();
    openMatchModal(gameCode, categoryId);
  } else {
    alert(res.message);
  }
}

export function openChangeTeamSlotModal(gameCode, categoryId = 'prof') {
  const games = store.getGames(categoryId);
  const game = games.find(g => g.code === gameCode);
  if (!game) return;

  const overlay = document.getElementById('match-modal-overlay');
  if (!overlay) return;

  const catObj = store.getCategories().find(c => c.id === categoryId);
  const allFeds = store.getFederations(); // Sempre em ordem alfabética A-Z
  const participatingFeds = store.getCategoryParticipatingFeds(categoryId);
  const partIds = new Set(participatingFeds.map(f => f.id));
  const isBye = Boolean(game.is_bye);
  const isFirstRound = game.fase === '1ª Fase';

  // Coleta estados já escalados em outros confrontos da 1ª Fase (C1..C16, exceto este)
  const otherMatchAssignments = {}; // fedId => { gameCode, slot, label, isCategoryBye }
  if (isFirstRound) {
    const r32Games = games.filter(g => g.fase === '1ª Fase' && g.code !== gameCode);
    r32Games.forEach(otherG => {
      if (otherG.lado_a?.id) {
        otherMatchAssignments[otherG.lado_a.id] = {
          gameCode: otherG.code,
          slot: 'A',
          label: otherG.is_bye ? `${otherG.code} (BYE)` : `${otherG.code} (A)`
        };
      }
      if (otherG.lado_b?.id) {
        otherMatchAssignments[otherG.lado_b.id] = {
          gameCode: otherG.code,
          slot: 'B',
          label: otherG.is_bye ? `${otherG.code} (BYE)` : `${otherG.code} (B)`
        };
      }
    });

    // Rastreia também estados selecionados nas categorias como BYE
    const catByesList = store.getCategoryByes(categoryId) || [];
    catByesList.forEach((byeId, idx) => {
      if (byeId && !otherMatchAssignments[byeId]) {
        const isCurrentMatch = (game.lado_a?.id === byeId || game.lado_b?.id === byeId);
        if (!isCurrentMatch) {
          otherMatchAssignments[byeId] = {
            gameCode: 'BYE',
            slot: 'BYE',
            label: `BYE (${idx + 1}º Rank)`,
            isCategoryBye: true,
            byeIndex: idx
          };
        }
      }
    });
  }

  overlay.innerHTML = `
    <div class="modal-dialog" style="max-width: 960px; width: 95vw; max-height: 92vh;">
      <div class="modal-header" style="background: linear-gradient(135deg, #091b2c 0%, #004b57 100%); color: white; border-top-left-radius: var(--radius-lg); border-top-right-radius: var(--radius-lg); padding: 1.1rem 1.25rem;">
        <div>
          <h3 style="color: white; font-size: 1.2rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem; margin: 0;">
            ⚔️ Editar Confronto ${game.code}
          </h3>
          <p style="font-size: 0.8rem; color: rgba(255,255,255,0.85); margin-top: 0.25rem; margin-bottom: 0;">
            Categoria: <strong>${catObj?.nome || categoryId}</strong> • Fase: <strong>${game.fase}</strong> ${game.descricao ? `(${game.descricao})` : ''}
          </p>
        </div>
        <button class="modal-close-btn" style="color: white;" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">&times;</button>
      </div>

      <div class="modal-body" style="padding: 1.25rem; max-height: calc(92vh - 140px); overflow-y: auto;">
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 1.15rem; font-size: 0.85rem; color: #166534;">
          💡 <strong>Definição do Confronto:</strong> Escolha os estados para este jogo. Estados já escalados anteriormente em outros confrontos ficam <strong>clareados com um check (✓)</strong> e <strong>impossibilitados de seleção dupla</strong>. Clique no check de qualquer estado para <strong>desmarcar e reabilitá-lo</strong>!
        </div>

        <div class="first-round-modal-layout" style="grid-template-columns: 1fr 350px;">
          <!-- COLUNA 1: DEFINIÇÃO DOS DOIS ESTADOS DO CONFRONTO -->
          <div>
            <!-- ESTADO A -->
            <div style="margin-bottom: 1rem; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: var(--radius-sm); padding: 0.85rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <label class="form-label" style="font-weight: 700; color: var(--accent-dark-blue); font-size: 0.9rem; margin: 0;">
                  🇧🇷 Estado A (Superior):
                </label>
                <button type="button" class="btn-clear-slot" id="btn-clear-slot-a" style="display: ${game.lado_a?.id ? 'inline-flex' : 'none'}; width: 22px; height: 22px; font-size: 0.72rem;" title="Limpar Estado A" onclick="window.clearSingleMatchSide('A')">✕</button>
              </div>
              <select id="modal-edit-team-a" class="form-select" style="font-weight: 700; font-size: 0.92rem; padding: 0.55rem 0.7rem; border: 2px solid #028090; border-radius: var(--radius-sm); width: 100%;" onchange="window.updateSingleMatchStateList()">
                <!-- Preenchido dinamicamente com opções desabilitadas para quem já foi escalado -->
              </select>
            </div>

            <!-- OPÇÃO BYE -->
            <div style="background: #ffffff; border: 2px solid ${isBye ? '#10b981' : '#cbd5e1'}; border-radius: var(--radius-sm); padding: 0.75rem 0.85rem; margin-bottom: 1rem; transition: all 0.2s ease;">
              <label style="display: flex; align-items: center; gap: 0.65rem; font-weight: 700; cursor: pointer; color: #047857; font-size: 0.9rem;">
                <input type="checkbox" id="modal-edit-is-bye" ${isBye ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #10b981;"
                  onchange="document.getElementById('modal-edit-team-b-wrap').style.display = this.checked ? 'none' : 'block'; window.updateSingleMatchStateList();">
                ⏩ Confronto com Vaga Livre (BYE) — Estado A avança direto às Oitavas / Próxima fase
              </label>
            </div>

            <!-- ESTADO B -->
            <div id="modal-edit-team-b-wrap" style="${isBye ? 'display: none;' : ''}; margin-bottom: 1rem; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: var(--radius-sm); padding: 0.85rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
                <label class="form-label" style="font-weight: 700; color: var(--accent-dark-blue); font-size: 0.9rem; margin: 0;">
                  🇧🇷 Estado B (Inferior):
                </label>
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  <button type="button" class="btn btn-outline btn-xs" onclick="window.swapSingleMatchSides()">⇄ Inverter A e B</button>
                  <button type="button" class="btn-clear-slot" id="btn-clear-slot-b" style="display: ${(!isBye && game.lado_b?.id) ? 'inline-flex' : 'none'}; width: 22px; height: 22px; font-size: 0.72rem;" title="Limpar Estado B" onclick="window.clearSingleMatchSide('B')">✕</button>
                </div>
              </div>
              <select id="modal-edit-team-b" class="form-select" style="font-weight: 700; font-size: 0.92rem; padding: 0.55rem 0.7rem; border: 2px solid #028090; border-radius: var(--radius-sm); width: 100%;" onchange="window.updateSingleMatchStateList()">
                <!-- Preenchido dinamicamente com opções desabilitadas para quem já foi escalado -->
              </select>
            </div>
          </div>

          <!-- COLUNA 2: LISTA DE SELEÇÃO DOS ESTADOS -->
          <div class="state-selection-panel" style="max-height: 480px;">
            <div class="state-selection-header">
              <div class="state-selection-title">
                <span>📋 Lista de Seleção</span>
                <span id="single-state-list-counter" style="font-size: 0.72rem; font-weight: 800; color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 0.15rem 0.45rem; border-radius: 4px;"></span>
              </div>
              <input type="text" id="single-state-filter" class="state-selection-search" placeholder="🔍 Filtrar estado (ex: SP, RJ)..." oninput="window.renderSingleMatchStateList()">
              <div style="font-size: 0.7rem; color: #64748b; line-height: 1.35; margin-top: 0.25rem;">
                Estados escalados ficam clareados com <strong>check (✓)</strong>. Clique no check para <strong>desmarcar e reabilitar</strong>!
              </div>
            </div>
            <div class="state-selection-list" id="single-state-items-container">
              <!-- Renderizado dinamicamente -->
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer" style="padding: 1rem 1.25rem; background: var(--bg-subtle); border-top: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">
          Cancelar
        </button>
        <button type="button" class="btn btn-primary" id="btn-save-both-teams" style="background: #166534; border-color: #166534; font-weight: 800; padding: 0.55rem 1.25rem;">
          💾 Salvar Confronto
        </button>
      </div>
    </div>
  `;

  overlay.classList.add('active');

  const initialValA = game.lado_a?.id || '';
  const initialValB = (!isBye && game.lado_b?.id) ? game.lado_b.id : '';

  window.updateSingleMatchDropdownOptions = () => {
    const selA = document.getElementById('modal-edit-team-a');
    const selB = document.getElementById('modal-edit-team-b');
    const chkBye = document.getElementById('modal-edit-is-bye');
    const isByeChecked = chkBye?.checked || false;

    const valA = selA ? selA.value : initialValA;
    const valB = (!isByeChecked && selB) ? selB.value : initialValB;

    const sortedFeds = [...allFeds].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    if (selA) {
      selA.innerHTML = `
        <option value="">-- Em Aberto / Vazio --</option>
        ${sortedFeds.map(f => {
          const assignedOther = otherMatchAssignments[f.id];
          const isOtherSide = (!isByeChecked && f.id === valB);
          const isSelf = f.id === valA;
          const notPart = !partIds.has(f.id) ? ' (não inscrito)' : '';

          if (assignedOther && !isSelf) {
            return `<option value="${f.id}" disabled style="color: #94a3b8; background: #f8fafc;">${f.nome} (${f.uf}) — 🔒 Já escalado em ${assignedOther.gameCode}</option>`;
          } else if (isOtherSide && !isSelf) {
            return `<option value="${f.id}" disabled style="color: #94a3b8; background: #f8fafc;">${f.nome} (${f.uf}) — 🔒 Já como Estado B</option>`;
          } else {
            return `<option value="${f.id}" ${isSelf ? 'selected' : ''}>${f.nome} (${f.uf})${notPart}</option>`;
          }
        }).join('')}
      `;
    }

    if (selB) {
      selB.innerHTML = `
        <option value="">-- Em Aberto / Vazio --</option>
        ${sortedFeds.map(f => {
          const assignedOther = otherMatchAssignments[f.id];
          const isOtherSide = (f.id === valA);
          const isSelf = f.id === valB;
          const notPart = !partIds.has(f.id) ? ' (não inscrito)' : '';

          if (assignedOther && !isSelf) {
            return `<option value="${f.id}" disabled style="color: #94a3b8; background: #f8fafc;">${f.nome} (${f.uf}) — 🔒 Já escalado em ${assignedOther.gameCode}</option>`;
          } else if (isOtherSide && !isSelf) {
            return `<option value="${f.id}" disabled style="color: #94a3b8; background: #f8fafc;">${f.nome} (${f.uf}) — 🔒 Já como Estado A</option>`;
          } else {
            return `<option value="${f.id}" ${isSelf ? 'selected' : ''}>${f.nome} (${f.uf})${notPart}</option>`;
          }
        }).join('')}
      `;
    }
  };

  window.clearSingleMatchSide = (side) => {
    const sel = document.getElementById(side === 'A' ? 'modal-edit-team-a' : 'modal-edit-team-b');
    if (sel) sel.value = '';
    window.updateSingleMatchStateList();
  };

  window.swapSingleMatchSides = () => {
    const a = document.getElementById('modal-edit-team-a');
    const b = document.getElementById('modal-edit-team-b');
    if (a && b) {
      const temp = a.value;
      a.value = b.value;
      b.value = temp;
      window.updateSingleMatchStateList();
    }
  };

  window.unselectStateFromSingleMatch = (fedId) => {
    const selA = document.getElementById('modal-edit-team-a');
    const selB = document.getElementById('modal-edit-team-b');

    if (selA && selA.value === fedId) selA.value = '';
    if (selB && selB.value === fedId) selB.value = '';

    // Se estava escalado em outro confronto da 1ª fase ou como BYE da categoria, limpa de lá no store
    if (otherMatchAssignments[fedId]) {
      const other = otherMatchAssignments[fedId];
      if (other.isCategoryBye) {
        const currentByes = (store.getCategoryByes(categoryId) || []).filter(id => id !== fedId);
        store.setCategoryByes(categoryId, currentByes);
      } else if (other.slot === 'A') {
        store.updateMatchTeamSlot(categoryId, other.gameCode, 'A', '');
      } else if (other.slot === 'B') {
        store.updateMatchTeamSlot(categoryId, other.gameCode, 'B', '');
      }
      delete otherMatchAssignments[fedId];
      if (window.renderBracket) window.renderBracket();
    }

    const fed = allFeds.find(f => f.id === fedId);
    toast.show({
      title: 'Estado Habilitado',
      message: `${fed?.nome || fedId} desmarcado e habilitado novamente para seleção!`,
      type: 'info',
      duration: 2500
    });

    window.updateSingleMatchStateList();
  };

  window.pickStateForSingleMatch = (fedId) => {
    if (otherMatchAssignments[fedId]) {
      toast.show({
        title: 'Estado Já Escalado',
        message: `Este estado já está no confronto ${otherMatchAssignments[fedId].gameCode}. Clique no check (✓) dele para desmarcar e poder usá-lo aqui.`,
        type: 'warning',
        duration: 3500
      });
      return;
    }

    const selA = document.getElementById('modal-edit-team-a');
    const selB = document.getElementById('modal-edit-team-b');
    const chkBye = document.getElementById('modal-edit-is-bye');
    const isByeChecked = chkBye?.checked;

    if (selA && selA.value === fedId) return;
    if (selB && selB.value === fedId) return;

    if (selA && !selA.value) {
      selA.value = fedId;
    } else if (selB && !isByeChecked && !selB.value) {
      selB.value = fedId;
    } else if (selA) {
      selA.value = fedId;
    }

    const fed = allFeds.find(f => f.id === fedId);
    toast.show({
      title: 'Estado Selecionado',
      message: `${fed?.uf || fedId} definido para o confronto ${gameCode}!`,
      type: 'success',
      duration: 2000
    });

    window.updateSingleMatchStateList();
  };

  window.renderSingleMatchStateList = () => {
    const container = document.getElementById('single-state-items-container');
    if (!container) return;

    const selA = document.getElementById('modal-edit-team-a');
    const selB = document.getElementById('modal-edit-team-b');
    const chkBye = document.getElementById('modal-edit-is-bye');
    const isByeChecked = chkBye?.checked;

    const valA = selA ? selA.value : '';
    const valB = (!isByeChecked && selB) ? selB.value : '';

    const btnClearA = document.getElementById('btn-clear-slot-a');
    const btnClearB = document.getElementById('btn-clear-slot-b');
    if (btnClearA) btnClearA.style.display = valA ? 'inline-flex' : 'none';
    if (btnClearB) btnClearB.style.display = valB ? 'inline-flex' : 'none';

    // Atualiza opções dos dropdowns para bloquear quem já está escalado
    window.updateSingleMatchDropdownOptions();

    const currentMap = {};
    if (valA) currentMap[valA] = 'Estado A';
    if (valB) currentMap[valB] = 'Estado B';

    const searchTerm = (document.getElementById('single-state-filter')?.value || '').toLowerCase().trim();
    const sortedFeds = [...allFeds].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    const filteredFeds = sortedFeds.filter(f => {
      if (!searchTerm) return true;
      return f.nome.toLowerCase().includes(searchTerm) || f.uf.toLowerCase().includes(searchTerm);
    });

    const totalAssigned = Object.keys(currentMap).length + Object.keys(otherMatchAssignments).length;
    const counterBadge = document.getElementById('single-state-list-counter');
    if (counterBadge) {
      counterBadge.innerText = `${totalAssigned}/${partIds.size || allFeds.length} Escalados`;
    }

    container.innerHTML = filteredFeds.map(fed => {
      const isSelectedInThisGame = currentMap[fed.id];
      const isSelectedInOther = otherMatchAssignments[fed.id];

      if (isSelectedInThisGame) {
        // ESTADO SELECIONADO NESTE CONFRONTO: Clareado com check
        return `
          <div class="state-select-item is-selected" data-fed-id="${fed.id}" title="${fed.nome} (${fed.uf}) está selecionado como ${isSelectedInThisGame}. Clique no check para desmarcar!">
            <div class="state-item-left">
              <img src="assets/federations/${fed.id}.jpg" alt="${fed.uf}" onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${fed.id}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${fed.id}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" class="state-item-flag">
              <span class="state-item-name">${fed.nome} (${fed.uf})</span>
            </div>

            <button type="button" 
                    class="btn-state-unselect-check" 
                    title="Selecionado como ${isSelectedInThisGame}. Clique para desmarcar e habilitar novamente!" 
                    onclick="event.stopPropagation(); window.unselectStateFromSingleMatch('${fed.id}')">
              <span class="check-symbol">✓</span>
              <span class="check-slot-tag">${isSelectedInThisGame}</span>
            </button>
          </div>
        `;
      } else if (isSelectedInOther) {
        // ESTADO JÁ SELECIONADO ANTERIORMENTE EM OUTRO CONFRONTO: Clareado, com check e IMPOSSIBILITADO DE SELEÇÃO
        return `
          <div class="state-select-item is-selected" data-fed-id="${fed.id}" style="cursor: not-allowed;" title="${fed.nome} (${fed.uf}) já está escalado no confronto ${isSelectedInOther.gameCode} (${isSelectedInOther.slot}). Clique no check para desmarcar de lá e habilitar para este confronto!">
            <div class="state-item-left">
              <img src="assets/federations/${fed.id}.jpg" alt="${fed.uf}" onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${fed.id}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${fed.id}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" class="state-item-flag">
              <span class="state-item-name">${fed.nome} (${fed.uf})</span>
            </div>

            <button type="button" 
                    class="btn-state-unselect-check" 
                    title="Escalado em ${isSelectedInOther.gameCode} (${isSelectedInOther.slot}). Clique para desmarcar de lá e habilitar novamente!" 
                    onclick="event.stopPropagation(); window.unselectStateFromSingleMatch('${fed.id}')">
              <span class="check-symbol">✓</span>
              <span class="check-slot-tag">${isSelectedInOther.label}</span>
            </button>
          </div>
        `;
      } else {
        // ESTADO DISPONÍVEL: Ativo, cores normais
        return `
          <div class="state-select-item is-available" data-fed-id="${fed.id}" onclick="window.pickStateForSingleMatch('${fed.id}')" title="Clique para selecionar ${fed.nome} (${fed.uf})">
            <div class="state-item-left">
              <img src="assets/federations/${fed.id}.jpg" alt="${fed.uf}" onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${fed.id}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${fed.id}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" class="state-item-flag">
              <span class="state-item-name">${fed.nome} (${fed.uf})</span>
            </div>

            <button type="button" 
                    class="btn-state-assign-quick" 
                    title="Clique para selecionar" 
                    onclick="event.stopPropagation(); window.pickStateForSingleMatch('${fed.id}')">
              + Selecionar
            </button>
          </div>
        `;
      }
    }).join('');
  };

  window.updateSingleMatchStateList = () => {
    window.renderSingleMatchStateList();
  };

  // Primeira renderização
  window.updateSingleMatchStateList();

  const btnSave = document.getElementById('btn-save-both-teams');
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      const teamAId = document.getElementById('modal-edit-team-a')?.value || '';
      const teamBId = document.getElementById('modal-edit-team-b')?.value || '';
      const isByeChecked = document.getElementById('modal-edit-is-bye')?.checked || false;

      if (isFirstRound) {
        store.updateFirstRoundMatch(categoryId, gameCode, teamAId, isByeChecked ? null : teamBId, isByeChecked, 'B');
      } else {
        // Para fases além da 1ª: atualiza ambos os lados
        store.updateMatchTeamSlot(categoryId, gameCode, 'A', teamAId || '');
        store.updateMatchTeamSlot(categoryId, gameCode, 'B', isByeChecked ? 'BYE' : (teamBId || ''));
      }

      overlay.classList.remove('active');
      toast.show({
        title: 'Confronto Salvo!',
        message: `Confronto ${gameCode} atualizado com sucesso!`,
        type: 'success'
      });
      if (window.renderBracket) window.renderBracket();
      if (window.renderSchedule) window.renderSchedule();
    });
  }
}

window.openChangeTeamSlotModal = openChangeTeamSlotModal;
window.openEditFirstRoundCardModal = openChangeTeamSlotModal;
window.advanceTeamByBye = advanceTeamByBye;
window.openConfigureFirstRoundModal = openConfigureFirstRoundModal;

// ============================================================
// MODAL DE ESCALAÇÃO DE ATLETAS POR CONFRONTO
// ============================================================
export function openMatchLineupModal(gameCode, categoryId = 'prof', targetSlot = null, forceUnlock = false) {
  const games = store.getGames(categoryId);
  const game = games.find(g => g.code === gameCode);
  if (!game) return;

  const overlay = document.getElementById('match-modal-overlay');
  if (!overlay) return;

  const catObj = store.getCategories().find(c => c.id === categoryId);
  const catName = catObj ? catObj.nome : categoryId;
  const allAthletes = store.getAthletes();
  const isAdmin = Boolean(window.auth && typeof window.auth.isAdmin === 'function' && window.auth.isAdmin());

  const isBye = Boolean(game.is_bye);
  const teamA = game.lado_a;
  const teamB = game.lado_b;

  // CASO 1: CONFRONTO COM BYE (VAGA LIVRE)
  if (isBye || (game.bye_slot && (!teamA || !teamB))) {
    const classifiedTeam = teamA || teamB;
    const classifiedUf = classifiedTeam ? classifiedTeam.uf : '';
    const classifiedId = classifiedTeam ? (classifiedTeam.id || '').toLowerCase() : '';

    overlay.innerHTML = `
      <div class="modal-dialog" style="max-width: 580px;">
        <div class="modal-header" style="background: linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%); border-bottom: 2px solid #99f6e4;">
          <div>
            <div style="font-size: 0.72rem; font-weight: 800; color: #028090; text-transform: uppercase; letter-spacing: 0.04em;">
              📋 Escalação • ${catName}
            </div>
            <h3 style="margin: 0.2rem 0; font-family: var(--font-display); font-weight: 900; color: #004b57;">
              Confronto ${game.code} — ${game.fase}
            </h3>
          </div>
          <button class="modal-close-btn" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">&times;</button>
        </div>

        <div class="modal-body" style="padding: 1.5rem; text-align: center;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%; background: #ecfdf5; border: 2px solid #86efac; margin-bottom: 1rem; font-size: 2rem;">
            ⏩
          </div>
          <h4 style="color: #047857; font-size: 1.2rem; font-weight: 900; margin-bottom: 0.5rem;">
            Confronto com Vaga Livre (BYE)
          </h4>
          <p style="color: #475569; font-size: 0.9rem; line-height: 1.5; max-width: 440px; margin: 0 auto 1.25rem auto;">
            A equipe <strong>${classifiedTeam?.nome || 'Classificada'} (${classifiedUf})</strong> avançou diretamente para ${game.proxima_fase || 'a próxima fase'}. Não há necessidade de escalação para este jogo.
          </p>

          ${classifiedTeam ? `
            <div style="display: inline-flex; align-items: center; gap: 0.75rem; background: #ffffff; padding: 0.5rem 1rem; border-radius: var(--radius-md); border: 1.5px solid #a7f3d0; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
              <img src="assets/federations/${classifiedId}.jpg" alt="${classifiedUf}" 
                   onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${classifiedId}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${classifiedId}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }"
                   style="width: 42px; height: 30px; object-fit: contain; border-radius: 3px; background: #fff;">
              <div style="text-align: left;">
                <div style="font-weight: 900; color: #166534; font-size: 0.95rem;">${classifiedTeam.nome}</div>
                <div style="font-size: 0.72rem; color: #059669; font-weight: 700;">Classificado de BYE para ${game.proxima_fase || 'Próxima Fase'}</div>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="modal-footer" style="background: #f8fafc; border-top: 1px solid var(--border-light); justify-content: flex-end;">
          <button class="btn btn-outline" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">
            Fechar
          </button>
        </div>
      </div>
    `;
    overlay.classList.add('active');
    return;
  }

  // CASO 2: CONFRONTO COM EQUIPES AINDA NÃO DEFINIDAS
  if (!teamA || !teamB) {
    overlay.innerHTML = `
      <div class="modal-dialog" style="max-width: 580px;">
        <div class="modal-header">
          <div>
            <div style="font-size: 0.72rem; font-weight: 800; color: #028090; text-transform: uppercase;">
              📋 Escalação • ${catName}
            </div>
            <h3 style="margin: 0.2rem 0; font-family: var(--font-display); font-weight: 900; color: var(--accent-dark-blue);">
              Confronto ${game.code} — ${game.fase}
            </h3>
          </div>
          <button class="modal-close-btn" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">&times;</button>
        </div>

        <div class="modal-body" style="padding: 1.5rem; text-align: center;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⏳</div>
          <h4 style="color: #0369a1; font-size: 1.15rem; font-weight: 800; margin-bottom: 0.5rem;">
            Aguardando Definição dos Estados
          </h4>
          <p style="color: #64748b; font-size: 0.88rem; max-width: 420px; margin: 0 auto;">
            Este confronto aguarda a definição dos vencedores das fases anteriores para que a escalação oficial dos atletas possa ser realizada.
          </p>
        </div>

        <div class="modal-footer" style="justify-content: flex-end;">
          <button class="btn btn-outline" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">
            Fechar
          </button>
        </div>
      </div>
    `;
    overlay.classList.add('active');
    return;
  }

  // CASO 3: CONFRONTO COM OS DOIS ESTADOS DEFINIDOS (PRONTO PARA ESCALAÇÃO)
  const idA = (teamA.id || '').toLowerCase();
  const idB = (teamB.id || '').toLowerCase();

  // Helper para inferência de gênero caso o atleta não tenha a propriedade explícita
  function getAthleteGenderSafe(ath) {
    if (ath.genero === 'F' || ath.genero === 'M') return ath.genero;
    const fn = (ath.nome || '').trim().split(/\s+/)[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (['ANA','MARIA','JULIA','BRUNA','CAMILA','BEATRIZ','CAROLINA','LARISSA','AMANDA','LETICIA','FERNANDA','GABRIELA','MARIANA','LUISA','LUIZA','LAURA','ISABELA','ISABELLA','SOFIA','ALICE','MANUELA','VALENTINA','LIVIA','GIOVANNA','RAFAELA','NATHALIA','NATALIA','PAULA','PATRICIA','RENATA','VANESSA','PRISCILA','BIANCA','TATIANA','DANIELA','FLAVIA','ALINE','JAQUELINE','JESSICA','MARINA','LILIAN','THAIS','RAQUEL','DEBORA','SABRINA','TALITA','SIMONE','ANDRESSA','ADRIANA','CLAUDIA','CRISTINA','MONICA','CARLA','INGRID','NICOLE','MILENA','MIRELA','REBECA','SAMARA','VITORIA','YASMIN','SARAH','BARBARA','CLARA','LARA','LORENA','CECILIA','ELISA'].includes(fn)) return 'F';
    if (fn.endsWith('A') && !['LUCA','SASHA','JOSHUA'].includes(fn)) return 'F';
    if (fn.endsWith('E') && ['ANE','INE','ELE','ELLE','ETE','ISE','ICE'].some(sfx => fn.endsWith(sfx))) return 'F';
    return 'M';
  }

  // Filtra atletas correspondentes ao Estado A e categoria informada
  let athletesA = allAthletes.filter(a => a.equipe_id === idA && Array.isArray(a.categorias) && a.categorias.includes(categoryId));
  if (athletesA.length === 0) {
    athletesA = allAthletes.filter(a => a.equipe_id === idA);
  }
  athletesA.forEach(a => { if (!a.genero) a.genero = getAthleteGenderSafe(a); });
  athletesA.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  // Filtra atletas correspondentes ao Estado B e categoria informada
  let athletesB = allAthletes.filter(a => a.equipe_id === idB && Array.isArray(a.categorias) && a.categorias.includes(categoryId));
  if (athletesB.length === 0) {
    athletesB = allAthletes.filter(a => a.equipe_id === idB);
  }
  athletesB.forEach(a => { if (!a.genero) a.genero = getAthleteGenderSafe(a); });
  athletesB.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  // Filtros por Gênero estritos conforme solicitação do usuário:
  // - Feminina: apenas mulheres (F)
  // - Masculina: apenas homens (M)
  // - Mista: todos os atletas
  const athletesA_fem = athletesA.filter(a => a.genero === 'F');
  const athletesA_masc = athletesA.filter(a => a.genero === 'M');
  const athletesA_todos = athletesA;

  const athletesB_fem = athletesB.filter(a => a.genero === 'F');
  const athletesB_masc = athletesB.filter(a => a.genero === 'M');
  const athletesB_todos = athletesB;

  // Escalação atual gravada no jogo
  const esc = game.escalacao || {};
  const femA = (esc.feminino?.lado_a) || [];
  const femB = (esc.feminino?.lado_b) || [];
  const mascA = (esc.masculino?.lado_a) || [];
  const mascB = (esc.masculino?.lado_b) || [];
  const mistaA = (esc.mista?.lado_a) || [];
  const mistaB = (esc.mista?.lado_b) || [];

  // Regra de status de confirmação e empate em 1 x 1
  const isFemReady = (femA.length >= 2 && femB.length >= 2);
  const isMascReady = (mascA.length >= 2 && mascB.length >= 2);
  const isBothMainReady = (isFemReady && isMascReady);

  // Empate em 1 x 1 na série:
  const isEmpate1x1 = (game.vitorias_a === 1 && game.vitorias_b === 1) || 
    (game.resultado_jogo1 && game.resultado_jogo2 && String(game.resultado_jogo1).toLowerCase() !== String(game.resultado_jogo2).toLowerCase());

  // Se ambos estiverem escalados e NÃO estiver empatado em 1x1, as disputas Fem e Masc ficam travadas e a Mista bloqueada
  // Só permite destravar caso seja admin solicitando explicitamente (forceUnlock)
  const isLocked = isBothMainReady && !isEmpate1x1 && !forceUnlock;
  const isMistaAllowed = isEmpate1x1;

  function buildOptions(list, selectedVal, disabled = false) {
    let out = '<option value="">-- Selecione o atleta --</option>';
    for (const ath of list) {
      const isSel = (ath.id === selectedVal || ath.nome === selectedVal || ath.cbt_id === selectedVal);
      const badges = [];
      if (ath.genero) badges.push(ath.genero === 'F' ? 'Fem' : 'Masc');
      if (ath.idade) badges.push(`${ath.idade} anos`);
      if (ath.ranking) badges.push(`Rk: ${ath.ranking}`);
      if (ath.funcao === 'Capitão') badges.push('👑 Capitão');
      const extra = badges.length ? ` (${badges.join(' • ')})` : '';
      out += `<option value="${ath.id}" ${isSel ? 'selected' : ''}>${ath.nome}${extra}</option>`;
    }
    return out;
  }

  overlay.innerHTML = `
    <div class="modal-dialog" style="max-width: 840px; width: 95vw;">
      
      <!-- CABEÇALHO DO MODAL DE ESCALAÇÃO -->
      <div class="modal-header" style="background: linear-gradient(135deg, #f0fdfa 0%, #ffffff 80%); border-bottom: 2px solid #99f6e4; padding: 1.15rem 1.4rem;">
        <div>
          <div style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; font-weight: 800; color: #028090; text-transform: uppercase; letter-spacing: 0.05em; background: #ccfbf1; padding: 0.15rem 0.55rem; border-radius: 4px; border: 1px solid #99f6e4;">
            📋 ESCALAÇÃO OFICIAL CBT
          </div>
          <h2 style="font-family: var(--font-display); font-size: 1.35rem; font-weight: 900; color: #004b57; margin: 0.35rem 0 0.15rem 0;">
            Escalação de Atletas • Confronto ${game.code}
          </h2>
          <div style="font-size: 0.84rem; color: #0f766e; font-weight: 700;">
            Fase: <strong>${game.fase}</strong> • Categoria: <strong>${catName}</strong>
          </div>
        </div>
        <button class="modal-close-btn" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">&times;</button>
      </div>

      <!-- CORPO DO MODAL -->
      <div class="modal-body" style="padding: 1.25rem 1.4rem; max-height: calc(85vh - 140px); overflow-y: auto;">
        
        <!-- BANNERS DE STATUS E REGRA DE ESCALAÇÃO -->
        ${isEmpate1x1 ? `
          <div style="background: linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%); border: 2px solid #c084fc; border-radius: var(--radius-md); padding: 0.85rem 1.15rem; margin-bottom: 1.15rem; box-shadow: 0 2px 8px rgba(192, 132, 252, 0.2); display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.6rem; line-height: 1;">🔥</span>
            <div>
              <div style="font-weight: 900; font-size: 0.95rem; color: #6b21a8;">
                CONFRONTO EMPATADO EM 1 x 1! ESCALAÇÃO DA DUPLA MISTA LIBERADA!
              </div>
              <div style="font-size: 0.82rem; color: #7e22ce; font-weight: 600; line-height: 1.35; margin-top: 0.15rem;">
                Com o placar empatado em 1 vitória para cada lado, a <strong>Disputa Mista (Jogo 3)</strong> está oficialmente aberta para escalação dos atletas para definir a equipe vencedora!
              </div>
            </div>
          </div>
        ` : isLocked ? `
          <div style="background: #ecfdf5; border: 1.5px solid #10b981; border-radius: var(--radius-md); padding: 0.85rem 1.15rem; margin-bottom: 1.15rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-size: 1.5rem; line-height: 1;">✓</span>
              <div>
                <div style="font-weight: 900; font-size: 0.92rem; color: #065f46;">
                  Escalação Feminina e Masculina Confirmada!
                </div>
                <div style="font-size: 0.8rem; color: #047857; font-weight: 600; line-height: 1.35; margin-top: 0.1rem;">
                  As escalações oficiais estão fechadas. Conforme o regulamento, a escalação da <strong>Dupla Mista</strong> só será liberada se o confronto empatar em 1 x 1.
                </div>
              </div>
            </div>
            ${isAdmin ? `
              <button type="button" class="btn btn-outline btn-xs" onclick="window.openMatchLineupModal('${game.code}', '${categoryId}', null, true)" style="border-color: #10b981; color: #047857; font-weight: 800; font-size: 0.72rem; white-space: nowrap;">
                🔓 Destravar Edição (Admin)
              </button>
            ` : ''}
          </div>
        ` : `
          <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 1.15rem; display: flex; align-items: flex-start; gap: 0.65rem;">
            <span style="font-size: 1.25rem; line-height: 1;">ℹ️</span>
            <div style="font-size: 0.82rem; color: #1e3a8a; line-height: 1.45;">
              <strong>Regra de Escalação Oficial:</strong> Escale as duplas <strong>Feminina</strong> (apenas mulheres) e <strong>Masculina</strong> (apenas homens). A <strong>Dupla Mista</strong> permanece bloqueada e só será liberada caso o confronto fique empatado em 1 x 1 após os dois primeiros jogos.
            </div>
          </div>
        `}

        <!-- PLACAR DE EQUIPES DO CONFRONTO -->
        <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1rem; background: #f8fafc; border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 0.85rem 1.15rem; margin-bottom: 1.15rem;">
          
          <!-- LADO A -->
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="assets/federations/${idA}.jpg" alt="${teamA.uf}" 
                 onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${idA}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${idA}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }"
                 style="width: 48px; height: 34px; object-fit: contain; border-radius: 4px; background: #fff; padding: 2px; border: 1.5px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.08); flex-shrink: 0;">
            <div>
              <div style="font-size: 0.72rem; font-weight: 800; color: #028090; text-transform: uppercase;">Equipe A</div>
              <div style="font-weight: 900; font-size: 1.05rem; color: #004b57; line-height: 1.2;">${teamA.nome}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">
                UF: ${teamA.uf} • 👩 ${athletesA_fem.length} mulheres • 👨 ${athletesA_masc.length} homens
              </div>
            </div>
          </div>

          <!-- VS E PLACAR -->
          <div style="text-align: center;">
            <div style="font-weight: 900; font-size: 0.9rem; color: #64748b; background: #ffffff; padding: 0.3rem 0.65rem; border-radius: 50%; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.08); display: inline-block;">
              VS
            </div>
            ${(game.vitorias_a || game.vitorias_b) ? `
              <div style="font-size: 0.78rem; font-weight: 900; color: #0f172a; margin-top: 0.2rem;">
                ${game.vitorias_a || 0} x ${game.vitorias_b || 0}
              </div>
            ` : ''}
          </div>

          <!-- LADO B -->
          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; text-align: right;">
            <div>
              <div style="font-size: 0.72rem; font-weight: 800; color: #028090; text-transform: uppercase;">Equipe B</div>
              <div style="font-weight: 900; font-size: 1.05rem; color: #004b57; line-height: 1.2;">${teamB.nome}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">
                UF: ${teamB.uf} • 👩 ${athletesB_fem.length} mulheres • 👨 ${athletesB_masc.length} homens
              </div>
            </div>
            <img src="assets/federations/${idB}.jpg" alt="${teamB.uf}" 
                 onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${idB}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${idB}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }"
                 style="width: 48px; height: 34px; object-fit: contain; border-radius: 4px; background: #fff; padding: 2px; border: 1.5px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.08); flex-shrink: 0;">
          </div>

        </div>

        <!-- 1. DISPUTA FEMININA (MOSTRA APENAS ATLETAS MULHERES) -->
        <div class="card" style="margin-bottom: 1.15rem; border: 1.5px solid #fbcfe8; background: #ffffff; padding: 1rem; box-shadow: var(--shadow-sm); ${isLocked ? 'background: #fffdfd; border-color: #f9a8d4;' : ''}">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; border-bottom: 1px solid #fce7f3; padding-bottom: 0.45rem;">
            <div style="display: flex; align-items: center; gap: 0.45rem;">
              <span style="font-size: 1.2rem;">👩</span>
              <div>
                <strong style="color: #9d174d; font-size: 0.95rem; font-weight: 900;">
                  1. Disputa Feminina (Dupla Feminina)
                </strong>
                <span style="font-size: 0.72rem; color: #be185d; font-weight: 700; margin-left: 0.4rem;">
                  • Somente atletas mulheres
                </span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              ${isLocked ? `
                <span style="font-size: 0.68rem; font-weight: 800; color: #047857; background: #ecfdf5; border: 1px solid #86efac; padding: 0.15rem 0.45rem; border-radius: 4px;">
                  ✓ Confirmada
                </span>
              ` : ''}
              <span style="font-size: 0.72rem; font-weight: 700; color: #be185d; background: #fdf2f8; padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid #fbcfe8;">
                Jogo 1 da Série
              </span>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            
            <!-- DUPLA FEMININA A -->
            <div style="background: #fff5f7; padding: 0.75rem; border-radius: 6px; border: 1px solid #fce7f3;">
              <div style="font-size: 0.78rem; font-weight: 800; color: #9d174d; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
                <span>${teamA.uf} • Atletas Mulheres:</span>
                <span style="font-size: 0.68rem; font-weight: 700; color: #be185d;">${athletesA_fem.length} inscritas</span>
              </div>
              <div style="margin-bottom: 0.5rem;">
                <label style="font-size: 0.72rem; color: #64748b; font-weight: 700; display: block; margin-bottom: 0.2rem;">Atleta 1 (Feminino):</label>
                <select id="lineup_fem_a_0" class="form-select" style="font-size: 0.82rem; padding: 0.35rem 0.6rem;" ${isLocked ? 'disabled' : ''}>
                  ${buildOptions(athletesA_fem, femA[0])}
                </select>
              </div>
              <div>
                <label style="font-size: 0.72rem; color: #64748b; font-weight: 700; display: block; margin-bottom: 0.2rem;">Atleta 2 (Feminino):</label>
                <select id="lineup_fem_a_1" class="form-select" style="font-size: 0.82rem; padding: 0.35rem 0.6rem;" ${isLocked ? 'disabled' : ''}>
                  ${buildOptions(athletesA_fem, femA[1])}
                </select>
              </div>
            </div>

            <!-- DUPLA FEMININA B -->
            <div style="background: #fff5f7; padding: 0.75rem; border-radius: 6px; border: 1px solid #fce7f3;">
              <div style="font-size: 0.78rem; font-weight: 800; color: #9d174d; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
                <span>${teamB.uf} • Atletas Mulheres:</span>
                <span style="font-size: 0.68rem; font-weight: 700; color: #be185d;">${athletesB_fem.length} inscritas</span>
              </div>
              <div style="margin-bottom: 0.5rem;">
                <label style="font-size: 0.72rem; color: #64748b; font-weight: 700; display: block; margin-bottom: 0.2rem;">Atleta 1 (Feminino):</label>
                <select id="lineup_fem_b_0" class="form-select" style="font-size: 0.82rem; padding: 0.35rem 0.6rem;" ${isLocked ? 'disabled' : ''}>
                  ${buildOptions(athletesB_fem, femB[0])}
                </select>
              </div>
              <div>
                <label style="font-size: 0.72rem; color: #64748b; font-weight: 700; display: block; margin-bottom: 0.2rem;">Atleta 2 (Feminino):</label>
                <select id="lineup_fem_b_1" class="form-select" style="font-size: 0.82rem; padding: 0.35rem 0.6rem;" ${isLocked ? 'disabled' : ''}>
                  ${buildOptions(athletesB_fem, femB[1])}
                </select>
              </div>
            </div>

          </div>
        </div>

        <!-- 2. DISPUTA MASCULINA (MOSTRA APENAS ATLETAS HOMENS) -->
        <div class="card" style="margin-bottom: 1.15rem; border: 1.5px solid #bae6fd; background: #ffffff; padding: 1rem; box-shadow: var(--shadow-sm); ${isLocked ? 'background: #f8fbff; border-color: #93c5fd;' : ''}">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; border-bottom: 1px solid #e0f2fe; padding-bottom: 0.45rem;">
            <div style="display: flex; align-items: center; gap: 0.45rem;">
              <span style="font-size: 1.2rem;">👨</span>
              <div>
                <strong style="color: #0369a1; font-size: 0.95rem; font-weight: 900;">
                  2. Disputa Masculina (Dupla Masculina)
                </strong>
                <span style="font-size: 0.72rem; color: #0284c7; font-weight: 700; margin-left: 0.4rem;">
                  • Somente atletas homens
                </span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              ${isLocked ? `
                <span style="font-size: 0.68rem; font-weight: 800; color: #047857; background: #ecfdf5; border: 1px solid #86efac; padding: 0.15rem 0.45rem; border-radius: 4px;">
                  ✓ Confirmada
                </span>
              ` : ''}
              <span style="font-size: 0.72rem; font-weight: 700; color: #0284c7; background: #f0f9ff; padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid #bae6fd;">
                Jogo 2 da Série
              </span>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            
            <!-- DUPLA MASCULINA A -->
            <div style="background: #f0f9ff; padding: 0.75rem; border-radius: 6px; border: 1px solid #e0f2fe;">
              <div style="font-size: 0.78rem; font-weight: 800; color: #0369a1; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
                <span>${teamA.uf} • Atletas Homens:</span>
                <span style="font-size: 0.68rem; font-weight: 700; color: #0284c7;">${athletesA_masc.length} inscritos</span>
              </div>
              <div style="margin-bottom: 0.5rem;">
                <label style="font-size: 0.72rem; color: #64748b; font-weight: 700; display: block; margin-bottom: 0.2rem;">Atleta 1 (Masculino):</label>
                <select id="lineup_masc_a_0" class="form-select" style="font-size: 0.82rem; padding: 0.35rem 0.6rem;" ${isLocked ? 'disabled' : ''}>
                  ${buildOptions(athletesA_masc, mascA[0])}
                </select>
              </div>
              <div>
                <label style="font-size: 0.72rem; color: #64748b; font-weight: 700; display: block; margin-bottom: 0.2rem;">Atleta 2 (Masculino):</label>
                <select id="lineup_masc_a_1" class="form-select" style="font-size: 0.82rem; padding: 0.35rem 0.6rem;" ${isLocked ? 'disabled' : ''}>
                  ${buildOptions(athletesA_masc, mascA[1])}
                </select>
              </div>
            </div>

            <!-- DUPLA MASCULINA B -->
            <div style="background: #f0f9ff; padding: 0.75rem; border-radius: 6px; border: 1px solid #e0f2fe;">
              <div style="font-size: 0.78rem; font-weight: 800; color: #0369a1; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
                <span>${teamB.uf} • Atletas Homens:</span>
                <span style="font-size: 0.68rem; font-weight: 700; color: #0284c7;">${athletesB_masc.length} inscritos</span>
              </div>
              <div style="margin-bottom: 0.5rem;">
                <label style="font-size: 0.72rem; color: #64748b; font-weight: 700; display: block; margin-bottom: 0.2rem;">Atleta 1 (Masculino):</label>
                <select id="lineup_masc_b_0" class="form-select" style="font-size: 0.82rem; padding: 0.35rem 0.6rem;" ${isLocked ? 'disabled' : ''}>
                  ${buildOptions(athletesB_masc, mascB[0])}
                </select>
              </div>
              <div>
                <label style="font-size: 0.72rem; color: #64748b; font-weight: 700; display: block; margin-bottom: 0.2rem;">Atleta 2 (Masculino):</label>
                <select id="lineup_masc_b_1" class="form-select" style="font-size: 0.82rem; padding: 0.35rem 0.6rem;" ${isLocked ? 'disabled' : ''}>
                  ${buildOptions(athletesB_masc, mascB[1])}
                </select>
              </div>
            </div>

          </div>
        </div>

        <!-- 3. DISPUTA MISTA (MOSTRA TODOS OS ATLETAS - LIBERADA APENAS NO EMPATE 1x1) -->
        <div class="card" style="margin-bottom: 0.5rem; border: 1.5px solid ${isMistaAllowed ? '#c084fc' : '#cbd5e1'}; background: ${isMistaAllowed ? '#ffffff' : '#f8fafc'}; padding: 1rem; box-shadow: ${isMistaAllowed ? '0 4px 12px rgba(192, 132, 252, 0.15)' : 'none'}; opacity: ${isMistaAllowed ? '1' : '0.85'};">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; border-bottom: 1px solid ${isMistaAllowed ? '#ede9fe' : '#e2e8f0'}; padding-bottom: 0.45rem;">
            <div style="display: flex; align-items: center; gap: 0.45rem;">
              <span style="font-size: 1.2rem;">👫</span>
              <div>
                <strong style="color: ${isMistaAllowed ? '#6d28d9' : '#64748b'}; font-size: 0.95rem; font-weight: 900;">
                  3. Disputa Mista (Dupla Mista / DX)
                </strong>
                <span style="font-size: 0.72rem; color: ${isMistaAllowed ? '#7c3aed' : '#64748b'}; font-weight: 700; margin-left: 0.4rem;">
                  • Mostra todos os atletas (${isMistaAllowed ? '🔓 Aberta' : '🔒 Bloqueada'})
                </span>
              </div>
            </div>
            <span style="font-size: 0.72rem; font-weight: 700; color: ${isMistaAllowed ? '#7c3aed' : '#64748b'}; background: ${isMistaAllowed ? '#f5f3ff' : '#f1f5f9'}; padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid ${isMistaAllowed ? '#ddd6fe' : '#cbd5e1'};">
              ${isMistaAllowed ? '🔥 Jogo 3 Decisivo (1x1)' : '🔒 Só abre em caso de 1 x 1'}
            </span>
          </div>

          ${!isMistaAllowed ? `
            <div style="background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 0.75rem 1rem; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.6rem; color: #475569; font-size: 0.82rem;">
              <span style="font-size: 1.25rem;">🔒</span>
              <div>
                <strong>Escalação da Dupla Mista Bloqueada:</strong> Conforme o regulamento oficial CBT, a Dupla Mista só é disputada e escalada caso os confrontos Feminino e Masculino fiquem <strong>empatados em 1 x 1</strong>. Se uma equipe vencer os dois primeiros jogos (2 x 0), o confronto encerra sem necessidade da partida mista.
              </div>
            </div>
          ` : ''}

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            
            <!-- DUPLA MISTA A -->
            <div style="background: ${isMistaAllowed ? '#faf5ff' : '#f8fafc'}; padding: 0.75rem; border-radius: 6px; border: 1px solid ${isMistaAllowed ? '#ede9fe' : '#e2e8f0'};">
              <div style="font-size: 0.78rem; font-weight: 800; color: ${isMistaAllowed ? '#6d28d9' : '#64748b'}; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
                <span>${teamA.uf} • Todos os Atletas:</span>
                <span style="font-size: 0.68rem; font-weight: 700; color: ${isMistaAllowed ? '#7c3aed' : '#64748b'};">${athletesA_todos.length} aptos</span>
              </div>
              <div style="margin-bottom: 0.5rem;">
                <label style="font-size: 0.72rem; color: #64748b; font-weight: 700; display: block; margin-bottom: 0.2rem;">Atleta 1 (Mista):</label>
                <select id="lineup_mista_a_0" class="form-select" style="font-size: 0.82rem; padding: 0.35rem 0.6rem;" ${!isMistaAllowed ? 'disabled' : ''}>
                  ${buildOptions(athletesA_todos, mistaA[0])}
                </select>
              </div>
              <div>
                <label style="font-size: 0.72rem; color: #64748b; font-weight: 700; display: block; margin-bottom: 0.2rem;">Atleta 2 (Mista):</label>
                <select id="lineup_mista_a_1" class="form-select" style="font-size: 0.82rem; padding: 0.35rem 0.6rem;" ${!isMistaAllowed ? 'disabled' : ''}>
                  ${buildOptions(athletesA_todos, mistaA[1])}
                </select>
              </div>
            </div>

            <!-- DUPLA MISTA B -->
            <div style="background: ${isMistaAllowed ? '#faf5ff' : '#f8fafc'}; padding: 0.75rem; border-radius: 6px; border: 1px solid ${isMistaAllowed ? '#ede9fe' : '#e2e8f0'};">
              <div style="font-size: 0.78rem; font-weight: 800; color: ${isMistaAllowed ? '#6d28d9' : '#64748b'}; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
                <span>${teamB.uf} • Todos os Atletas:</span>
                <span style="font-size: 0.68rem; font-weight: 700; color: ${isMistaAllowed ? '#7c3aed' : '#64748b'};">${athletesB_todos.length} aptos</span>
              </div>
              <div style="margin-bottom: 0.5rem;">
                <label style="font-size: 0.72rem; color: #64748b; font-weight: 700; display: block; margin-bottom: 0.2rem;">Atleta 1 (Mista):</label>
                <select id="lineup_mista_b_0" class="form-select" style="font-size: 0.82rem; padding: 0.35rem 0.6rem;" ${!isMistaAllowed ? 'disabled' : ''}>
                  ${buildOptions(athletesB_todos, mistaB[0])}
                </select>
              </div>
              <div>
                <label style="font-size: 0.72rem; color: #64748b; font-weight: 700; display: block; margin-bottom: 0.2rem;">Atleta 2 (Mista):</label>
                <select id="lineup_mista_b_1" class="form-select" style="font-size: 0.82rem; padding: 0.35rem 0.6rem;" ${!isMistaAllowed ? 'disabled' : ''}>
                  ${buildOptions(athletesB_todos, mistaB[1])}
                </select>
              </div>
            </div>

          </div>
        </div>

      </div>

      <!-- RODAPÉ DE AÇÕES -->
      <div class="modal-footer" style="background: #f8fafc; border-top: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; padding: 1rem 1.4rem;">
        <div>
          ${isAdmin ? `
            <button type="button" class="btn btn-outline btn-sm" onclick="window.clearMatchLineup('${game.code}', '${categoryId}')" style="color: #dc2626; border-color: #fca5a5;">
              🗑️ Limpar Escalação
            </button>
          ` : '<span></span>'}
        </div>

        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <button type="button" class="btn btn-outline" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">
            Fechar
          </button>
          ${(!isLocked || isMistaAllowed || forceUnlock) ? `
            <button type="button" class="btn btn-primary" onclick="window.saveMatchLineup('${game.code}', '${categoryId}')" style="background: ${isMistaAllowed ? '#7c3aed' : '#028090'}; border-color: ${isMistaAllowed ? '#7c3aed' : '#028090'}; font-weight: 800; padding: 0.5rem 1.25rem; display: inline-flex; align-items: center; gap: 0.45rem;">
              💾 ${isMistaAllowed ? 'Salvar Escalação da Dupla Mista' : 'Salvar Escalação'}
            </button>
          ` : `
            <button type="button" class="btn btn-primary" disabled style="background: #10b981; border-color: #10b981; opacity: 0.9; cursor: not-allowed; font-weight: 800; padding: 0.5rem 1.25rem;">
              ✓ Escalação Confirmada
            </button>
          `}
        </div>
      </div>

    </div>
  `;

  overlay.classList.add('active');
}

// Manipuladores globais para salvar e limpar a escalação
window.openMatchLineupModal = openMatchLineupModal;

window.saveMatchLineup = (gameCode, categoryId) => {
  const getVal = id => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };
  const getName = id => {
    const el = document.getElementById(id);
    if (!el || !el.value) return '';
    return el.options[el.selectedIndex]?.text?.split(' (')[0] || '';
  };

  const game = store.getGames(categoryId).find(g => g.code === gameCode);
  const prevEsc = game?.escalacao || {};

  let femA = [getVal('lineup_fem_a_0'), getVal('lineup_fem_a_1')].filter(Boolean);
  let femB = [getVal('lineup_fem_b_0'), getVal('lineup_fem_b_1')].filter(Boolean);
  let femANomes = [getName('lineup_fem_a_0'), getName('lineup_fem_a_1')].filter(Boolean);
  let femBNomes = [getName('lineup_fem_b_0'), getName('lineup_fem_b_1')].filter(Boolean);

  if (femA.length === 0 && prevEsc.feminino?.lado_a?.length) {
    femA = prevEsc.feminino.lado_a;
    femANomes = prevEsc.feminino.lado_a_nomes || [];
  }
  if (femB.length === 0 && prevEsc.feminino?.lado_b?.length) {
    femB = prevEsc.feminino.lado_b;
    femBNomes = prevEsc.feminino.lado_b_nomes || [];
  }

  let mascA = [getVal('lineup_masc_a_0'), getVal('lineup_masc_a_1')].filter(Boolean);
  let mascB = [getVal('lineup_masc_b_0'), getVal('lineup_masc_b_1')].filter(Boolean);
  let mascANomes = [getName('lineup_masc_a_0'), getName('lineup_masc_a_1')].filter(Boolean);
  let mascBNomes = [getName('lineup_masc_b_0'), getName('lineup_masc_b_1')].filter(Boolean);

  if (mascA.length === 0 && prevEsc.masculino?.lado_a?.length) {
    mascA = prevEsc.masculino.lado_a;
    mascANomes = prevEsc.masculino.lado_a_nomes || [];
  }
  if (mascB.length === 0 && prevEsc.masculino?.lado_b?.length) {
    mascB = prevEsc.masculino.lado_b;
    mascBNomes = prevEsc.masculino.lado_b_nomes || [];
  }

  let mistaA = [getVal('lineup_mista_a_0'), getVal('lineup_mista_a_1')].filter(Boolean);
  let mistaB = [getVal('lineup_mista_b_0'), getVal('lineup_mista_b_1')].filter(Boolean);
  let mistaANomes = [getName('lineup_mista_a_0'), getName('lineup_mista_a_1')].filter(Boolean);
  let mistaBNomes = [getName('lineup_mista_b_0'), getName('lineup_mista_b_1')].filter(Boolean);

  if (mistaA.length === 0 && prevEsc.mista?.lado_a?.length) {
    mistaA = prevEsc.mista.lado_a;
    mistaANomes = prevEsc.mista.lado_a_nomes || [];
  }
  if (mistaB.length === 0 && prevEsc.mista?.lado_b?.length) {
    mistaB = prevEsc.mista.lado_b;
    mistaBNomes = prevEsc.mista.lado_b_nomes || [];
  }

  const lineup = {
    feminino: {
      lado_a: femA,
      lado_b: femB,
      lado_a_nomes: femANomes,
      lado_b_nomes: femBNomes
    },
    masculino: {
      lado_a: mascA,
      lado_b: mascB,
      lado_a_nomes: mascANomes,
      lado_b_nomes: mascBNomes
    },
    mista: {
      lado_a: mistaA,
      lado_b: mistaB,
      lado_a_nomes: mistaANomes,
      lado_b_nomes: mistaBNomes
    },
    data_atualizacao: new Date().toISOString()
  };

  const res = store.saveGameLineup(categoryId, gameCode, lineup);
  if (res.success) {
    toast.show({
      title: 'Escalação Salva',
      message: `Escalação oficial do confronto ${gameCode} gravada com sucesso!`,
      type: 'success'
    });
    const overlay = document.getElementById('match-modal-overlay');
    if (overlay) overlay.classList.remove('active');
    if (window.renderBracket) window.renderBracket();
    if (window.renderSchedule) window.renderSchedule();
  } else {
    alert(res.message || 'Erro ao salvar escalação.');
  }
};

window.clearMatchLineup = (gameCode, categoryId) => {
  if (confirm(`Tem certeza que deseja limpar toda a escalação do confronto ${gameCode}?`)) {
    store.clearGameLineup(categoryId, gameCode);
    toast.show({
      title: 'Escalação Limpa',
      message: `A escalação do confronto ${gameCode} foi resetada.`,
      type: 'warning'
    });
    const overlay = document.getElementById('match-modal-overlay');
    if (overlay) overlay.classList.remove('active');
    if (window.renderBracket) window.renderBracket();
    if (window.renderSchedule) window.renderSchedule();
  }
};


