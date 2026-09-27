// Gerenciador de Modais da Aplicação
import { store } from '../data/store.js';
import { toast } from './toast.js';

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

  const teamAName = game.lado_a 
    ? `<span style="display: inline-flex; align-items: center; gap: 0.4rem;"><img src="assets/federations/${game.lado_a.id}.jpg" alt="${game.lado_a.uf}" style="width: 24px; height: 16px; border-radius: 2px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"> <strong>${game.lado_a.nome} (${game.lado_a.uf})</strong></span>` 
    : 'Aguardando definição';
  const teamBName = game.lado_b 
    ? `<span style="display: inline-flex; align-items: center; gap: 0.4rem;"><img src="assets/federations/${game.lado_b.id}.jpg" alt="${game.lado_b.uf}" style="width: 24px; height: 16px; border-radius: 2px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"> <strong>${game.lado_b.nome} (${game.lado_b.uf})</strong></span>` 
    : (game.is_bye ? '<span style="color: #059669; font-weight: 700;">⏩ BYE (Avança Direto)</span>' : 'Aguardando definição');

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
          <details style="margin-bottom: 1.25rem; border: 1px solid #cbd5e1; border-radius: var(--radius-md); background: #ffffff; padding: 0.75rem;" ${game.is_bye ? 'open' : ''}>
            <summary style="font-weight: 700; color: var(--primary); cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
              <span>⚙️ Editar Equipes do Confronto / Definir BYE</span>
              <span style="font-size: 0.75rem; background: var(--primary-light); padding: 0.2rem 0.5rem; border-radius: var(--radius-xs);">1ª Rodada</span>
            </summary>
            <div style="margin-top: 0.85rem; padding-top: 0.85rem; border-top: 1px dashed var(--border-light);">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div>
                  <label class="form-label">Equipe A:</label>
                  <select id="edit-side-a" class="form-select">
                    <option value="">-- Nenhuma / Em Aberto --</option>
                    ${store.getFederations().map(f => `
                      <option value="${f.id}" ${game.lado_a?.id === f.id ? 'selected' : ''}>${f.nome} (${f.uf})</option>
                    `).join('')}
                  </select>
                </div>
                <div>
                  <label class="form-label">Equipe B:</label>
                  <select id="edit-side-b" class="form-select" ${game.is_bye ? 'disabled' : ''}>
                    <option value="">-- Nenhuma / Em Aberto --</option>
                    ${store.getFederations().map(f => `
                      <option value="${f.id}" ${game.lado_b?.id === f.id ? 'selected' : ''}>${f.nome} (${f.uf})</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.75rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 700; cursor: pointer; color: #065f46;">
                  <input type="checkbox" id="edit-is-bye" ${game.is_bye ? 'checked' : ''} onchange="document.getElementById('edit-side-b').disabled = this.checked">
                  Definir este confronto como BYE (Equipe A avança automaticamente sem placar)
                </label>

                <button type="button" class="btn btn-secondary btn-sm" id="btn-save-match-teams">
                  Salvar Equipes
                </button>
              </div>
            </div>
          </details>
        ` : ''}

        ${game.is_bye ? `
          <div style="padding: 1.25rem; text-align: center; background: #ecfdf5; border-radius: var(--radius-md); color: #065f46; font-weight: 600;">
            ⏩ Este confronto é um BYE. A equipe classificada avança automaticamente como vencedora para o jogo destino no chaveamento (${game.proxima_fase || 'Oitavas'}) sem resultado no placar.
          </div>
        ` : `
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
                  <input type="text" id="modal-placar-j1" class="form-control" value="${game.placar_jogo1 || ''}" placeholder="${isProf ? 'Ex: 6/3 6/4' : 'Ex: 4/1 4/2'}">
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
                  <input type="text" id="modal-placar-j2" class="form-control" value="${game.placar_jogo2 || ''}" placeholder="${isProf ? 'Ex: 6/4 7/5' : 'Ex: 4/2 4/1'}">
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
                  <input type="text" id="modal-placar-j3" class="form-control" value="${game.placar_jogo3 || ''}" placeholder="Ex: 10/8 Super TB">
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
      const teamAId = document.getElementById('edit-side-a').value || null;
      const isBye = document.getElementById('edit-is-bye').checked;
      const teamBId = isBye ? null : (document.getElementById('edit-side-b').value || null);

      const res = store.updateFirstRoundMatch(categoryId, gameCode, teamAId, teamBId, isBye, 'B');
      if (res.success) {
        toast.show({
          title: 'Confronto Atualizado',
          message: `Equipes do jogo ${gameCode} e propagação de BYE atualizadas com sucesso!`,
          type: 'success'
        });
        openMatchModal(gameCode, categoryId); // Recarrega o modal atualizado
      }
    });
  }

  const saveBtn = document.getElementById('btn-save-modal-match');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
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
                        const seedLabel = byeRank > 0 ? `[#${byeRank}]` : (f.seed ? `[#${f.seed}]` : '');
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
                        const seedLabel = byeRank > 0 ? `[#${byeRank}]` : (f.seed ? `[#${f.seed}]` : '');
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
      const isBye = card.querySelector('.cfg-is-bye').checked;
      const teamBId = isBye ? null : (card.querySelector('.cfg-team-b').value || null);

      matchups.push({
        code,
        teamAId,
        teamBId,
        isBye,
        byeSlot: 'B'
      });
    });

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

  // Ordena federações colocando as participantes da categoria primeiro
  const sortedFeds = [...allFeds].sort((a, b) => {
    const aPart = participatingIds.has(a.id) ? 1 : 0;
    const bPart = participatingIds.has(b.id) ? 1 : 0;
    if (bPart !== aPart) return bPart - aPart;
    return a.nome.localeCompare(b.nome);
  });

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
                  const seedLabel = byeRank > 0 ? `[#${byeRank}]` : (f.seed ? `[#${f.seed}]` : '');
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
                  const seedLabel = byeRank > 0 ? `[#${byeRank}]` : (f.seed ? `[#${f.seed}]` : '');
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
                <input type="text" id="card-edit-p1" class="form-control" value="${game.placar_jogo1 || ''}" placeholder="${isProf ? 'Ex: 6/3 6/4' : 'Ex: 4/1 4/2'}">
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
                <input type="text" id="card-edit-p2" class="form-control" value="${game.placar_jogo2 || ''}" placeholder="${isProf ? 'Ex: 6/4 7/5' : 'Ex: 4/2 4/1'}">
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
                <input type="text" id="card-edit-p3" class="form-control" value="${game.placar_jogo3 || ''}" placeholder="Ex: 10/7 Super TB">
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
      const selA = document.getElementById('card-edit-side-a');
      const selB = document.getElementById('card-edit-side-b');
      const chkBye = document.getElementById('card-edit-is-bye');

      const teamAId = selA ? selA.value : null;
      const isByeVal = chkBye ? chkBye.checked : false;
      const teamBId = isByeVal ? null : (selB ? selB.value : null);

      if (!teamAId && isByeVal) {
        alert('Selecione uma Federação no Estado A para avançar de BYE.');
        return;
      }

      // 1. Atualiza equipes e status de BYE
      store.updateFirstRoundMatch(categoryId, gameCode, teamAId, teamBId, isByeVal, 'B');

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
    });
  }
}
window.openEditFirstRoundCardModal = openEditFirstRoundCardModal;
window.openConfigureFirstRoundModal = openConfigureFirstRoundModal;

