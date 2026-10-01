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
      ? `<span style="display: inline-flex; align-items: center; gap: 0.4rem;"><img src="assets/federations/${game.lado_a.id}.jpg" alt="${game.lado_a.uf}" style="width: 24px; height: 16px; border-radius: 2px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"> <strong>${game.lado_a.nome} (${game.lado_a.uf})</strong></span>` 
      : 'Aguardando definição');
  const teamBName = isByeB
    ? '<span style="color: #059669; font-weight: 700;">⏩ BYE</span>'
    : (game.lado_b 
      ? `<span style="display: inline-flex; align-items: center; gap: 0.4rem;"><img src="assets/federations/${game.lado_b.id}.jpg" alt="${game.lado_b.uf}" style="width: 24px; height: 16px; border-radius: 2px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"> <strong>${game.lado_b.nome} (${game.lado_b.uf})</strong></span>` 
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
          <details style="margin-bottom: 1.25rem; border: 1px solid #cbd5e1; border-radius: var(--radius-md); background: #ffffff; padding: 0.75rem;" open>
            <summary style="font-weight: 700; color: var(--primary); cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
              <span>⚙️ Editar Equipes do Confronto / Definir BYE</span>
              <span style="font-size: 0.75rem; background: var(--primary-light); padding: 0.2rem 0.5rem; border-radius: var(--radius-xs);">1ª Rodada</span>
            </summary>
            <div style="margin-top: 0.85rem; padding-top: 0.85rem; border-top: 1px dashed var(--border-light);">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div>
                  <label class="form-label">Equipe A (ou BYE):</label>
                  <select id="edit-side-a" class="form-select">
                    <option value="">-- Nenhuma / Em Aberto --</option>
                    ${store.getFederations().map(f => {
                      const byesList = store.getCategoryByes(categoryId);
                      const byeRank = byesList.indexOf(f.id) + 1;
                      const lbl = byeRank > 0 ? ` [#${byeRank}]` : '';
                      return `<option value="${f.id}" ${game.lado_a?.id === f.id ? 'selected' : ''}>${f.nome} (${f.uf})${lbl}</option>`;
                    }).join('')}
                  </select>
                </div>
                <div>
                  <label class="form-label">Equipe B (ou BYE):</label>
                  <select id="edit-side-b" class="form-select">
                    <option value="">-- Nenhuma / Em Aberto --</option>
                    ${store.getFederations().map(f => {
                      const byesList = store.getCategoryByes(categoryId);
                      const byeRank = byesList.indexOf(f.id) + 1;
                      const lbl = byeRank > 0 ? ` [#${byeRank}]` : '';
                      return `<option value="${f.id}" ${(game.lado_b?.id === f.id) ? 'selected' : ''}>${f.nome} (${f.uf})${lbl}</option>`;
                    }).join('')}
                  </select>
                </div>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.75rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 700; cursor: pointer; color: #065f46;">
                  <input type="checkbox" id="edit-is-bye" ${game.is_bye ? 'checked' : ''}>
                  BYE — Equipe A avança automaticamente
                </label>

                <button type="button" class="btn btn-secondary btn-sm" id="btn-save-match-teams">
                  Salvar Equipes
                </button>
              </div>
            </div>
          </details>
        ` : ''}

        ${game.is_bye ? `
          <div style="padding: 1.25rem; text-align: center; background: #ecfdf5; border: 1px solid #10b981; border-radius: var(--radius-md); color: #065f46; font-weight: 600;">
            ⏩ <strong>Confronto com Vaga Livre (BYE):</strong> A equipe <strong>${(game.lado_a?.id === game.vencedor_id ? game.lado_a?.nome : game.lado_b?.nome) || 'classificada'}</strong> passou direto para a próxima fase (${game.proxima_fase || 'próxima fase'}) sem necessidade de disputa de placar.
          </div>
        ` : `
          ${game.status !== 'encerrado' ? `
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
                  <input type="text" id="modal-placar-j1" class="form-control" value="${game.placar_jogo1 || ''}" placeholder="${isProf ? 'Ex: 6/3 6/4' : 'Ex: 4/1 4/2'}" oninput="window.maskScore(this)">
                </div>
                <div>
                  <label class="form-label">Vencedor Jogo 1:</label>
                  <select id="modal-vencedor-j1" class="form-select">
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
                  <input type="text" id="modal-placar-j2" class="form-control" value="${game.placar_jogo2 || ''}" placeholder="${isProf ? 'Ex: 6/4 7/5' : 'Ex: 4/2 4/1'}" oninput="window.maskScore(this)">
                </div>
                <div>
                  <label class="form-label">Vencedor Jogo 2:</label>
                  <select id="modal-vencedor-j2" class="form-select">
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
                  <input type="text" id="modal-placar-j3" class="form-control" value="${game.placar_jogo3 || ''}" placeholder="Ex: 10/8 Super TB" oninput="window.maskScore(this)">
                </div>
                <div>
                  <label class="form-label">Vencedor Jogo 3:</label>
                  <select id="modal-vencedor-j3" class="form-select">
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
        ${!game.is_bye ? `
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

  const content = `
    <div class="modal-dialog" style="max-width: 900px;">
      <div class="modal-header">
        <div>
          <h3>⚙️ Editar Confrontos da 1ª Rodada & BYEs</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted);">
            Categoria: <strong>${catObj?.nome || categoryId}</strong> • Defina quem joga contra quem e quais são os confrontos livres (BYEs).
          </p>
        </div>
        <button class="modal-close-btn" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">&times;</button>
      </div>

      <div class="modal-body" style="max-height: 75vh; overflow-y: auto;">
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 0.85rem 1.15rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <strong style="color: #1e40af;">Regras da Categoria:</strong>
            <span style="font-size: 0.85rem; color: #1e3a8a; margin-left: 0.5rem;">
              Com <strong>${totalFeds} federações participantes</strong> nesta categoria, exatamente <strong>${targetByes} vagas são BYEs</strong> (avanço direto às Oitavas).
            </span>
          </div>
          <div id="first-round-summary-badge" style="font-size: 0.8rem; font-weight: 700; color: #1e40af;">
            Carregando contagem...
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;" id="r32-matchup-list">
          ${r32Games.map((g, idx) => {
            return `
              <div class="card" style="padding: 0.85rem; border: 1px solid var(--border-strong); background: #ffffff;" data-match-code="${g.code}">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                  <span class="state-badge" style="background: var(--primary); font-size: 0.75rem; width: 26px; height: 26px;">
                    ${g.code}
                  </span>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">
                    Destino: <strong>${g.proxima_fase} (${g.proxima_fase_slot})</strong>
                  </span>
                  <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; font-weight: 700; color: #065f46; cursor: pointer;">
                    <input type="checkbox" class="cfg-is-bye" data-code="${g.code}" ${g.is_bye ? 'checked' : ''} onchange="window.toggleFirstRoundBye('${g.code}', this.checked)">
                    É BYE
                  </label>
                </div>

                <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                  <div>
                    <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted);">Equipe A:</label>
                    <select class="form-select cfg-team-a" data-code="${g.code}" style="padding: 0.35rem 0.5rem; font-size: 0.825rem;" onchange="window.updateFirstRoundCounters()">
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

                  <div>
                    <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted);">Equipe B:</label>
                    <select class="form-select cfg-team-b" data-code="${g.code}" style="padding: 0.35rem 0.5rem; font-size: 0.825rem;" ${g.is_bye ? 'disabled' : ''} onchange="window.updateFirstRoundCounters()">
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
        </div>
      </div>

      <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
        <button type="button" class="btn btn-outline btn-sm" onclick="window.handleResetDefaultSeeds('${categoryId}')">
          🎲 Restaurar Sorteio por Cabeças de Chave
        </button>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-outline" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">Cancelar</button>
          <button type="button" class="btn btn-primary" id="btn-save-all-first-round">
            💾 Salvar Chaveamento Completo
          </button>
        </div>
      </div>
    </div>
  `;

  overlay.innerHTML = content;
  overlay.classList.add('active');

  // Funções de apoio da tela
  window.toggleFirstRoundBye = (code, isChecked) => {
    const selB = document.querySelector(`.cfg-team-b[data-code="${code}"]`);
    if (selB) {
      selB.disabled = isChecked;
      if (isChecked) selB.value = '';
    }
    window.updateFirstRoundCounters();
  };

  window.updateFirstRoundCounters = () => {
    const selectAs = document.querySelectorAll('.cfg-team-a');
    const selectBs = document.querySelectorAll('.cfg-team-b');
    const byeCheckboxes = document.querySelectorAll('.cfg-is-bye');

    const chosenTeams = new Set();
    const duplicates = new Set();

    let byesCount = 0;
    byeCheckboxes.forEach(cb => { if (cb.checked) byesCount++; });

    selectAs.forEach(s => {
      if (s.value) {
        if (chosenTeams.has(s.value)) duplicates.add(s.value);
        chosenTeams.add(s.value);
      }
    });

    selectBs.forEach(s => {
      if (!s.disabled && s.value) {
        if (chosenTeams.has(s.value)) duplicates.add(s.value);
        chosenTeams.add(s.value);
      }
    });

    const badge = document.getElementById('first-round-summary-badge');
    if (badge) {
      if (duplicates.size > 0) {
        badge.innerHTML = `<span style="color: #dc2626;">⚠️ Conflito: ${duplicates.size} federação(ões) duplicada(s)!</span>`;
      } else {
        badge.innerHTML = `<span>Equipes escaladas: <strong>${chosenTeams.size} / ${totalFeds}</strong> • BYEs: <strong>${byesCount} / ${targetByes}</strong></span>`;
      }
    }
  };

  window.handleResetDefaultSeeds = (catId) => {
    if (confirm('Deseja restaurar as posições originais das 27 federações e 5 BYEs conforme o chaveamento padrão?')) {
      store.generateBracket(catId, false);
      toast.show({ title: 'Chave Restaurada', message: 'Sorteio padrão restabelecido.', type: 'info' });
      openConfigureFirstRoundModal(catId);
    }
  };

  window.updateFirstRoundCounters();

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
          <select id="modal-sched-court" class="form-select">
            <option value="">-- Sem quadra definida --</option>
            ${courts.map(c => `
              <option value="${c.id}" ${game.quadra_id === c.id ? 'selected' : ''}>${c.nome} (${c.tipo})</option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Selecione o Horário:</label>
          <select id="modal-sched-time" class="form-select">
            <option value="">-- Sem horário definido --</option>
            ${times.map(t => `
              <option value="${t}" ${game.horario === t ? 'selected' : ''}>${t}</option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Status do Jogo:</label>
          <select id="modal-sched-status" class="form-select">
            <option value="em espera" ${game.status === 'em espera' ? 'selected' : ''}>🟡 Em Espera (Aguardando chamada)</option>
            <option value="em andamento" ${game.status === 'em andamento' ? 'selected' : ''}>🔵 Em Andamento (Em quadra)</option>
            <option value="encerrado" ${game.status === 'encerrado' ? 'selected' : ''}>✅ Encerrado</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">Cancelar</button>
        <button type="button" class="btn btn-primary" id="btn-save-schedule">Confirmar Agendamento</button>
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
        </form>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('match-modal-overlay').classList.remove('active')">Cancelar</button>
        <button type="button" class="btn btn-primary" id="btn-save-card-first-round">💾 Salvar Alterações do Confronto</button>
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

  overlay.innerHTML = `
    <div class="modal-dialog" style="max-width: 600px;">
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

      <div class="modal-body" style="padding: 1.25rem;">
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.85rem; color: #166534;">
          💡 <strong>Definição do Confronto:</strong> Escolha os dois estados para este jogo. Se marcar <strong>BYE</strong>, o Estado A avança direto para a próxima fase.
        </div>

        <!-- ESTADO A -->
        <div style="margin-bottom: 1rem;">
          <label class="form-label" style="font-weight: 700; color: var(--accent-dark-blue); font-size: 0.9rem; margin-bottom: 0.35rem;">
            🇧🇷 Estado A (Superior):
          </label>
          <select id="modal-edit-team-a" class="form-select" style="font-weight: 700; font-size: 0.92rem; padding: 0.55rem 0.7rem; border: 2px solid #028090; border-radius: var(--radius-sm); width: 100%;">
            <option value="">-- Em Aberto / Vazio --</option>
            ${allFeds.map(f => {
              const sel = game.lado_a?.id === f.id ? 'selected' : '';
              const notPart = !partIds.has(f.id) ? ' (não inscrito)' : '';
              return `<option value="${f.id}" ${sel}>${f.nome} (${f.uf})${notPart}</option>`;
            }).join('')}
          </select>
        </div>

        <!-- OPÇÃO BYE -->
        <div style="background: #ffffff; border: 2px solid ${isBye ? '#10b981' : '#cbd5e1'}; border-radius: var(--radius-sm); padding: 0.7rem 0.85rem; margin-bottom: 1rem; transition: all 0.2s ease;">
          <label style="display: flex; align-items: center; gap: 0.65rem; font-weight: 700; cursor: pointer; color: #047857; font-size: 0.9rem;">
            <input type="checkbox" id="modal-edit-is-bye" ${isBye ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #10b981;"
              onchange="document.getElementById('modal-edit-team-b-wrap').style.display = this.checked ? 'none' : 'block'">
            ⏩ Confronto com Vaga Livre (BYE) — Estado A avança direto às Oitavas / Próxima fase
          </label>
        </div>

        <!-- ESTADO B -->
        <div id="modal-edit-team-b-wrap" style="${isBye ? 'display: none;' : ''}">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
            <label class="form-label" style="font-weight: 700; color: var(--accent-dark-blue); font-size: 0.9rem; margin: 0;">
              🇧🇷 Estado B (Inferior):
            </label>
            <button type="button" class="btn btn-outline btn-xs" onclick="(function(){var a=document.getElementById('modal-edit-team-a'),b=document.getElementById('modal-edit-team-b');if(a&&b){var t=a.value;a.value=b.value;b.value=t;}})()">⇄ Inverter A e B</button>
          </div>
          <select id="modal-edit-team-b" class="form-select" style="font-weight: 700; font-size: 0.92rem; padding: 0.55rem 0.7rem; border: 2px solid #028090; border-radius: var(--radius-sm); width: 100%;">
            <option value="">-- Em Aberto / Vazio --</option>
            ${allFeds.map(f => {
              const sel = (!isBye && game.lado_b?.id === f.id) ? 'selected' : '';
              const notPart = !partIds.has(f.id) ? ' (não inscrito)' : '';
              return `<option value="${f.id}" ${sel}>${f.nome} (${f.uf})${notPart}</option>`;
            }).join('')}
          </select>
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


