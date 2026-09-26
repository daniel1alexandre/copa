const fs = require('fs');
const file = 'js/modules/bracketView.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Remover handlers antigos caso existam para não duplicar
content = content.replace(/\/\/ --- INLINE EDIT HANDLERS ---[\s\S]*/, '');

// 2. Atualizar o renderMatchCard
const regex = /function renderMatchCard\(game\) \{[\s\S]*?^\}/m;
const replaceWith = `function renderMatchCard(game) {
  const isWinnerA = game.vencedor_id && game.lado_a?.id === game.vencedor_id;
  const isWinnerB = game.vencedor_id && game.lado_b?.id === game.vencedor_id;
  const isBye = Boolean(game.is_bye);
  const isFirstRound = game.fase === '1ª Fase';

  const feds = typeof store !== 'undefined' ? store.getFederations() : (window.store ? window.store.getFederations() : []);
  const getFedsOptions = (selectedId) => {
    let opts = '<option value="">-- Em Aberto --</option>';
    opts += '<option value="BYE" ' + (selectedId === 'BYE' ? 'selected' : '') + '>⏩ BYE</option>';
    feds.forEach(f => {
      opts += \`<option value="\${f.id}" \${selectedId === f.id ? 'selected' : ''}>\${f.nome} (\${f.uf})</option>\`;
    });
    return opts;
  };

  const getTeamName = (team, isTeamBye) => {
    if (isTeamBye) return '<span style="color: #059669; font-weight: 800; font-size: 0.75rem;">⏩ BYE</span>';
    if (!team) return '<span style="color: var(--text-muted); font-style: italic; font-size: 0.75rem;">Aguardando...</span>';
    return \`
      <div style="display: flex; align-items: center; gap: 0.4rem;">
        <img src="assets/federations/\${team.id}.jpg" alt="\${team.uf}" style="width: 22px; height: 15px; border-radius: 2px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2);">
        <span style="font-weight: 700; font-size: 0.85rem; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;" title="\${team.nome}">\${team.uf} - \${team.nome}</span>
        \${team.seed ? \`<span style="font-size: 0.65rem; color: var(--accent-gold); font-weight: 800; background: #fef3c7; padding: 0.1rem 0.2rem; border-radius: 2px;">#\${team.seed}</span>\` : ''}
      </div>
    \`;
  };

  // Cores de Vencedor (Verde) e Perdedor (Vermelho)
  const bgA = isWinnerA ? '#dcfce7' : (isWinnerB ? '#fee2e2' : '#ffffff');
  const borderA = isWinnerA ? '#166534' : (isWinnerB ? '#991b1b' : '#e2e8f0');
  
  const bgB = isWinnerB ? '#dcfce7' : (isWinnerA ? '#fee2e2' : '#ffffff');
  const borderB = isWinnerB ? '#166534' : (isWinnerA ? '#991b1b' : '#e2e8f0');

  return \`
    <div class="bracket-match-card \${game.status === 'em andamento' ? 'is-live' : ''} \${game.status === 'encerrado' ? 'is-finished' : ''} \${isBye ? 'is-bye' : ''} \${isFirstRound ? 'is-first-round' : ''}" style="height: auto; width: 280px; padding: 0.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; background: #ffffff; cursor: default; display: flex; flex-direction: column;">
      
      <div class="match-card-header" style="margin-bottom: 0.5rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.3rem; display: flex; justify-content: space-between; align-items: center;">
        <span class="match-code-tag" style="background: #334155; color: white; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: 800;">\${game.code}</span>
        <span class="badge-status \${isBye ? 'encerrado' : game.status}" style="font-size: 0.6rem; padding: 0.15rem 0.4rem; border-radius: 12px; text-transform: uppercase; font-weight: 800;">\${isBye ? 'BYE' : game.status}</span>
      </div>

      <!-- TIME A -->
      <div class="match-team-row \${isWinnerA ? 'is-winner' : (isWinnerB ? 'is-loser' : '')}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0.3rem; background: \${bgA}; border-radius: 4px; margin-bottom: 0.25rem; border: 1px solid \${borderA}; min-height: 32px;">
        <div class="match-team-info" style="flex: 1; min-width: 0; display: flex; align-items: center;">
          \${isFirstRound && game.status === 'aguardando' ? \`
            <select class="inline-team-select" style="max-width: 170px; font-size: 0.7rem; padding: 0.2rem; border-radius: 3px; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; font-weight: 600; outline: none; cursor: pointer; text-overflow: ellipsis;" onchange="window.inlineUpdateTeam('\${game.code}', '\${game.categoria_id}', 'A', this.value)">
              \${getFedsOptions(game.is_bye && !game.lado_a ? 'BYE' : game.lado_a?.id)}
            </select>
          \` : getTeamName(game.lado_a, isBye && !game.lado_a)}
        </div>
        \${!isFirstRound || game.status !== 'aguardando' ? \`
          <div class="match-team-score-badge" style="font-weight: 800; font-size: 0.85rem; color: \${isWinnerA ? '#166534' : (isWinnerB ? '#991b1b' : '#64748b')}; margin-left: 0.4rem; background: \${isWinnerA ? '#bbf7d0' : (isWinnerB ? '#fecaca' : '#f1f5f9')}; padding: 0.1rem 0.3rem; border-radius: 3px; min-width: 24px; text-align: center;">
            \${isBye ? '-' : (game.vitorias_a || 0)}
          </div>
        \` : ''}
      </div>

      <!-- TIME B -->
      <div class="match-team-row \${isWinnerB ? 'is-winner' : (isWinnerA ? 'is-loser' : '')}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0.3rem; background: \${bgB}; border-radius: 4px; border: 1px solid \${borderB}; min-height: 32px;">
        <div class="match-team-info" style="flex: 1; min-width: 0; display: flex; align-items: center;">
          \${isFirstRound && game.status === 'aguardando' ? \`
             <select class="inline-team-select" style="max-width: 170px; font-size: 0.7rem; padding: 0.2rem; border-radius: 3px; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; font-weight: 600; outline: none; cursor: pointer; text-overflow: ellipsis;" onchange="window.inlineUpdateTeam('\${game.code}', '\${game.categoria_id}', 'B', this.value)">
              \${getFedsOptions(game.is_bye && !game.lado_b ? 'BYE' : game.lado_b?.id)}
            </select>
          \` : getTeamName(game.lado_b, isBye && !game.lado_b)}
        </div>
        \${!isFirstRound || game.status !== 'aguardando' ? \`
          <div class="match-team-score-badge" style="font-weight: 800; font-size: 0.85rem; color: \${isWinnerB ? '#166534' : (isWinnerA ? '#991b1b' : '#64748b')}; margin-left: 0.4rem; background: \${isWinnerB ? '#bbf7d0' : (isWinnerA ? '#fecaca' : '#f1f5f9')}; padding: 0.1rem 0.3rem; border-radius: 3px; min-width: 24px; text-align: center;">
            \${isBye ? '-' : (game.vitorias_b || 0)}
          </div>
        \` : ''}
      </div>

      <!-- DETALHES DE SUBJOGOS (PLACAR) -->
      <div class="match-footer-details" style="margin-top: 0.4rem; padding-top: 0.4rem; border-top: 1px dashed #cbd5e1;">
        \${isBye ? \`
          <div style="text-align: center; font-size: 0.7rem; color: #047857; font-weight: 700; background: #ecfdf5; padding: 0.2rem; border-radius: 3px;">
            ✅ Vencedor avança direto para \${game.proxima_fase || 'próxima'}
          </div>
        \` : \`
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
             <!-- F -->
             <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.1rem 0;">
               <strong style="color:#64748b; font-size: 0.7rem; width: 14px;">F</strong>
               <input type="text" placeholder="Placar F" value="\${game.placar_jogo1 || ''}" style="width: 90px; font-size:0.65rem; padding:0.15rem; border:1px solid #cbd5e1; border-radius:2px; outline:none; text-align:center; color: #334155;" onchange="window.inlineUpdateScore('\${game.code}', '\${game.categoria_id}', '1', 'placar', this.value)">
               <select style="width: 70px; font-size:0.65rem; padding:0.15rem; border:1px solid #cbd5e1; border-radius:2px; outline:none; font-weight: 700; color: #334155;" onchange="window.inlineUpdateScore('\${game.code}', '\${game.categoria_id}', '1', 'vencedor', this.value)">
                  <option value="" \${!game.resultado_jogo1 ? 'selected' : ''}>-Venc-</option>
                  <option value="a" \${game.resultado_jogo1 === 'a' ? 'selected' : ''}>Eq. A</option>
                  <option value="b" \${game.resultado_jogo1 === 'b' ? 'selected' : ''}>Eq. B</option>
               </select>
             </div>
             
             <!-- M -->
             <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.1rem 0;">
               <strong style="color:#64748b; font-size: 0.7rem; width: 14px;">M</strong>
               <input type="text" placeholder="Placar M" value="\${game.placar_jogo2 || ''}" style="width: 90px; font-size:0.65rem; padding:0.15rem; border:1px solid #cbd5e1; border-radius:2px; outline:none; text-align:center; color: #334155;" onchange="window.inlineUpdateScore('\${game.code}', '\${game.categoria_id}', '2', 'placar', this.value)">
               <select style="width: 70px; font-size:0.65rem; padding:0.15rem; border:1px solid #cbd5e1; border-radius:2px; outline:none; font-weight: 700; color: #334155;" onchange="window.inlineUpdateScore('\${game.code}', '\${game.categoria_id}', '2', 'vencedor', this.value)">
                  <option value="" \${!game.resultado_jogo2 ? 'selected' : ''}>-Venc-</option>
                  <option value="a" \${game.resultado_jogo2 === 'a' ? 'selected' : ''}>Eq. A</option>
                  <option value="b" \${game.resultado_jogo2 === 'b' ? 'selected' : ''}>Eq. B</option>
               </select>
             </div>
             
             <!-- DX -->
             <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.1rem 0;">
               <strong style="color:#64748b; font-size: 0.7rem; width: 14px;">DX</strong>
               <input type="text" placeholder="Placar DX" value="\${game.placar_jogo3 || ''}" style="width: 90px; font-size:0.65rem; padding:0.15rem; border:1px solid #cbd5e1; border-radius:2px; outline:none; text-align:center; color: #334155;" onchange="window.inlineUpdateScore('\${game.code}', '\${game.categoria_id}', '3', 'placar', this.value)">
               <select style="width: 70px; font-size:0.65rem; padding:0.15rem; border:1px solid #cbd5e1; border-radius:2px; outline:none; font-weight: 700; color: #334155;" onchange="window.inlineUpdateScore('\${game.code}', '\${game.categoria_id}', '3', 'vencedor', this.value)">
                  <option value="" \${!game.resultado_jogo3 ? 'selected' : ''}>-Venc-</option>
                  <option value="a" \${game.resultado_jogo3 === 'a' ? 'selected' : ''}>Eq. A</option>
                  <option value="b" \${game.resultado_jogo3 === 'b' ? 'selected' : ''}>Eq. B</option>
               </select>
             </div>
          </div>
        \`}
      </div>
    </div>
  \`;
}`;

content = content.replace(regex, replaceWith);

// 3. Adicionar handlers globais usando o método oficial do store (recordMatchResult)
content += `

// --- INLINE EDIT HANDLERS ---
window.inlineUpdateTeam = function(code, catId, side, value) {
  const isBye = value === 'BYE';
  const teamId = isBye ? null : (value || null);
  const game = window.store.getGames(catId).find(g => g.code === code);
  if(!game) return;
  const teamA = side === 'A' ? teamId : (game.lado_a ? game.lado_a.id : null);
  const teamB = side === 'B' ? teamId : (game.lado_b ? game.lado_b.id : null);
  const byeState = side === 'B' ? isBye : game.is_bye; // Permite forçar BYE
  const res = window.store.updateFirstRoundMatch(catId, code, teamA, teamB, byeState, 'B');
  if(!res.success) alert(res.message);
  else {
    if (window.renderBracket) window.renderBracket();
  }
};

window.inlineUpdateScore = function(code, catId, jogoNum, field, value) {
  const game = window.store.getGames(catId).find(g => g.code === code);
  if(!game) return;
  
  if (field === 'placar') {
    game['placar_jogo' + jogoNum] = value;
  } else if (field === 'vencedor') {
    game['resultado_jogo' + jogoNum] = value || null;
  }
  
  // Coletar estado atual de todos os placares do jogo
  const scoresObj = {
    resultado_jogo1: game.resultado_jogo1 || null,
    placar_jogo1: game.placar_jogo1 || '',
    resultado_jogo2: game.resultado_jogo2 || null,
    placar_jogo2: game.placar_jogo2 || '',
    resultado_jogo3: game.resultado_jogo3 || null,
    placar_jogo3: game.placar_jogo3 || ''
  };
  
  // Usar a função oficial do store para calcular vitorias, propagar vencedor e perdedor
  const res = window.store.recordMatchResult(catId, code, scoresObj);
  
  if (res && res.success) {
    if (window.renderBracket) window.renderBracket();
  } else if (res && !res.success) {
    alert("Erro ao salvar resultado: " + res.message);
  }
};
`;

fs.writeFileSync(file, content);
console.log('bracketView.js totalmente atualizado e funcional!');
