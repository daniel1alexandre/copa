const fs = require('fs');
const file = 'js/modules/bracketView.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /function renderMatchCard\(game\) \{[\s\S]*?^\}/m;
const replaceWith = `function renderMatchCard(game) {
  const isWinnerA = game.vencedor_id && game.lado_a?.id === game.vencedor_id;
  const isWinnerB = game.vencedor_id && game.lado_b?.id === game.vencedor_id;
  const isBye = Boolean(game.is_bye);
  const isFirstRound = game.fase === '1ª Fase';

  const feds = window.store?.getFederations() || [];
  const getFedsOptions = (selectedId) => {
    let opts = '<option value="">-- Em Aberto --</option>';
    opts += '<option value="BYE" ' + (selectedId === 'BYE' ? 'selected' : '') + '>⏩ BYE (Avança Direto)</option>';
    feds.forEach(f => {
      opts += \`<option value="\${f.id}" \${selectedId === f.id ? 'selected' : ''}>\${f.nome} (\${f.uf})</option>\`;
    });
    return opts;
  };

  const getTeamName = (team, isTeamBye) => {
    if (isTeamBye) return '<span style="color: #059669; font-weight: 800; font-size: 0.8rem;">⏩ VAGA BYE</span>';
    if (!team) return '<span style="color: var(--text-muted); font-style: italic; font-size: 0.8rem;">Aguardando adversário</span>';
    return \`
      <div style="display: flex; align-items: center; gap: 0.4rem;">
        <img src="assets/federations/\${team.id}.jpg" alt="\${team.uf}" style="width: 22px; height: 15px; border-radius: 2px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.2);">
        <span style="font-weight: 700; font-size: 0.85rem; color: #1e293b;">\${team.uf}</span>
        \${team.seed ? \`<span style="font-size: 0.65rem; color: var(--accent-gold); font-weight: 800; background: #fef3c7; padding: 0.1rem 0.2rem; border-radius: 2px;">#\${team.seed}</span>\` : ''}
      </div>
    \`;
  };

  return \`
    <div class="bracket-match-card \${game.status === 'em andamento' ? 'is-live' : ''} \${game.status === 'encerrado' ? 'is-finished' : ''} \${isBye ? 'is-bye' : ''} \${isFirstRound ? 'is-first-round' : ''}" style="height: auto; padding: 0.6rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0; background: #ffffff; cursor: default; transition: all 0.2s ease;">
      
      <div class="match-card-header" style="margin-bottom: 0.6rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.4rem;">
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          <span class="match-code-tag" style="background: #334155; color: white; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: 800;">\${game.code}</span>
        </div>
        <span class="badge-status \${isBye ? 'encerrado' : game.status}" style="font-size: 0.65rem; padding: 0.2rem 0.5rem; border-radius: 12px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">\${isBye ? 'BYE' : game.status}</span>
      </div>

      <!-- TIME A -->
      <div class="match-team-row \${isWinnerA ? 'is-winner' : (isWinnerB ? 'is-loser' : '')}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0.4rem; background: \${isWinnerA ? '#f0fdf4' : (isWinnerB ? '#f8fafc' : '#ffffff')}; border-radius: 4px; margin-bottom: 0.3rem; border: 1px solid \${isWinnerA ? '#bbf7d0' : 'transparent'};">
        <div class="match-team-info" style="flex: 1; min-width: 0;">
          \${isFirstRound ? \`
            <select class="inline-team-select" style="width: 100%; font-size: 0.75rem; padding: 0.25rem; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; font-weight: 600; outline: none; cursor: pointer; text-overflow: ellipsis; white-space: nowrap;" onchange="window.inlineUpdateTeam('\${game.code}', '\${game.categoria_id}', 'A', this.value)">
              \${getFedsOptions(game.is_bye && !game.lado_a ? 'BYE' : game.lado_a?.id)}
            </select>
          \` : getTeamName(game.lado_a, isBye && !game.lado_a)}
        </div>
        \${!isFirstRound || game.status !== 'aguardando' ? \`
          <div class="match-team-score-badge" style="font-weight: 800; font-size: 0.9rem; color: \${isWinnerA ? '#166534' : '#64748b'}; margin-left: 0.5rem; background: \${isWinnerA ? '#dcfce7' : '#f1f5f9'}; padding: 0.1rem 0.4rem; border-radius: 4px;">
            \${isBye ? '-' : (game.vitorias_a || 0)}
          </div>
        \` : ''}
      </div>

      <!-- TIME B -->
      <div class="match-team-row \${isWinnerB ? 'is-winner' : (isWinnerA ? 'is-loser' : '')}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0.4rem; background: \${isWinnerB ? '#f0fdf4' : (isWinnerA ? '#f8fafc' : '#ffffff')}; border-radius: 4px; border: 1px solid \${isWinnerB ? '#bbf7d0' : 'transparent'};">
        <div class="match-team-info" style="flex: 1; min-width: 0;">
          \${isFirstRound ? \`
             <select class="inline-team-select" style="width: 100%; font-size: 0.75rem; padding: 0.25rem; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; font-weight: 600; outline: none; cursor: pointer; text-overflow: ellipsis; white-space: nowrap;" onchange="window.inlineUpdateTeam('\${game.code}', '\${game.categoria_id}', 'B', this.value)">
              \${getFedsOptions(game.is_bye && !game.lado_b ? 'BYE' : game.lado_b?.id)}
            </select>
          \` : getTeamName(game.lado_b, isBye && !game.lado_b)}
        </div>
        \${!isFirstRound || game.status !== 'aguardando' ? \`
          <div class="match-team-score-badge" style="font-weight: 800; font-size: 0.9rem; color: \${isWinnerB ? '#166534' : '#64748b'}; margin-left: 0.5rem; background: \${isWinnerB ? '#dcfce7' : '#f1f5f9'}; padding: 0.1rem 0.4rem; border-radius: 4px;">
            \${isBye ? '-' : (game.vitorias_b || 0)}
          </div>
        \` : ''}
      </div>

      <!-- DETALHES DE SUBJOGOS (PLACAR) -->
      <div class="match-footer-details" style="margin-top: 0.6rem; padding-top: 0.5rem; border-top: 1px dashed #cbd5e1;">
        \${isBye ? \`
          <div style="text-align: center; font-size: 0.75rem; color: #047857; font-weight: 700; background: #ecfdf5; padding: 0.3rem; border-radius: 4px; border: 1px solid #a7f3d0;">
            ✅ Vencedor avança para \${game.proxima_fase || 'próxima fase'}
          </div>
        \` : \`
          <div style="display: flex; flex-direction: column; gap: 0.35rem; width: 100%;">
             <!-- F -->
             <div style="display: flex; align-items: center; justify-content: space-between; background: #fdf2f8; padding: 0.3rem; border-radius: 4px; border: 1px solid #fbcfe8;">
               <strong style="color:#be185d; width: 22px; font-size: 0.75rem; text-align: center;">F</strong>
               <input type="text" placeholder="Placar (ex: 6/4)" value="\${game.placar_jogo1 || ''}" style="flex: 1; margin: 0 0.4rem; font-size:0.7rem; padding:0.25rem 0.3rem; border:1px solid #f9a8d4; border-radius:3px; background: #fff; outline: none; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02); color: #831843; font-weight: 600;" onchange="window.inlineUpdateScore('\${game.code}', '\${game.categoria_id}', '1', 'placar', this.value)">
               <select style="font-size:0.7rem; padding:0.2rem; border:1px solid #f9a8d4; border-radius:3px; width: 60px; background: #fff; color: #be185d; font-weight: 700; outline: none; cursor: pointer;" onchange="window.inlineUpdateScore('\${game.code}', '\${game.categoria_id}', '1', 'vencedor', this.value)">
                  <option value="" \${!game.resultado_jogo1 ? 'selected' : ''}>Venc?</option>
                  <option value="a" \${game.resultado_jogo1 === 'a' ? 'selected' : ''}>Eq. A</option>
                  <option value="b" \${game.resultado_jogo1 === 'b' ? 'selected' : ''}>Eq. B</option>
               </select>
             </div>
             
             <!-- M -->
             <div style="display: flex; align-items: center; justify-content: space-between; background: #eff6ff; padding: 0.3rem; border-radius: 4px; border: 1px solid #bfdbfe;">
               <strong style="color:#1d4ed8; width: 22px; font-size: 0.75rem; text-align: center;">M</strong>
               <input type="text" placeholder="Placar (ex: 7/5)" value="\${game.placar_jogo2 || ''}" style="flex: 1; margin: 0 0.4rem; font-size:0.7rem; padding:0.25rem 0.3rem; border:1px solid #93c5fd; border-radius:3px; background: #fff; outline: none; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02); color: #1e3a8a; font-weight: 600;" onchange="window.inlineUpdateScore('\${game.code}', '\${game.categoria_id}', '2', 'placar', this.value)">
               <select style="font-size:0.7rem; padding:0.2rem; border:1px solid #93c5fd; border-radius:3px; width: 60px; background: #fff; color: #1d4ed8; font-weight: 700; outline: none; cursor: pointer;" onchange="window.inlineUpdateScore('\${game.code}', '\${game.categoria_id}', '2', 'vencedor', this.value)">
                  <option value="" \${!game.resultado_jogo2 ? 'selected' : ''}>Venc?</option>
                  <option value="a" \${game.resultado_jogo2 === 'a' ? 'selected' : ''}>Eq. A</option>
                  <option value="b" \${game.resultado_jogo2 === 'b' ? 'selected' : ''}>Eq. B</option>
               </select>
             </div>
             
             <!-- DX -->
             <div style="display: flex; align-items: center; justify-content: space-between; background: #fffbeb; padding: 0.3rem; border-radius: 4px; border: 1px solid #fde68a;">
               <strong style="color:#b45309; width: 22px; font-size: 0.75rem; text-align: center;">DX</strong>
               <input type="text" placeholder="Super TB (ex: 10/8)" value="\${game.placar_jogo3 || ''}" style="flex: 1; margin: 0 0.4rem; font-size:0.7rem; padding:0.25rem 0.3rem; border:1px solid #fcd34d; border-radius:3px; background: #fff; outline: none; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02); color: #78350f; font-weight: 600;" onchange="window.inlineUpdateScore('\${game.code}', '\${game.categoria_id}', '3', 'placar', this.value)">
               <select style="font-size:0.7rem; padding:0.2rem; border:1px solid #fcd34d; border-radius:3px; width: 60px; background: #fff; color: #b45309; font-weight: 700; outline: none; cursor: pointer;" onchange="window.inlineUpdateScore('\${game.code}', '\${game.categoria_id}', '3', 'vencedor', this.value)">
                  <option value="" \${!game.resultado_jogo3 ? 'selected' : ''}>Venc?</option>
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
fs.writeFileSync(file, content);
console.log('bracketView.js atualizado com visual moderno!');
