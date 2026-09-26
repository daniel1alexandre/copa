const fs = require('fs');
const file = 'js/modules/bracketView.js';
let content = fs.readFileSync(file, 'utf8');

content += `

// --- INLINE EDIT HANDLERS ---
window.inlineUpdateTeam = function(code, catId, side, value) {
  const isBye = value === 'BYE';
  const teamId = isBye ? null : (value || null);
  const game = window.store.getGames(catId).find(g => g.code === code);
  if(!game) return;
  const teamA = side === 'A' ? teamId : (game.lado_a ? game.lado_a.id : null);
  const teamB = side === 'B' ? teamId : (game.lado_b ? game.lado_b.id : null);
  const byeState = side === 'B' ? isBye : game.is_bye;
  const res = window.store.updateFirstRoundMatch(catId, code, teamA, teamB, byeState, 'B');
  if(!res.success) alert(res.message);
  else window.renderBracket();
};

window.inlineUpdateScore = function(code, catId, jogoNum, field, value) {
  const game = window.store.getGames(catId).find(g => g.code === code);
  if(!game) return;
  
  if (field === 'placar') {
    game['placar_jogo' + jogoNum] = value;
  } else if (field === 'vencedor') {
    game['resultado_jogo' + jogoNum] = value || null;
  }
  
  window.store.saveState();
  
  const res1 = game.resultado_jogo1 || null;
  const res2 = game.resultado_jogo2 || null;
  const res3 = game.resultado_jogo3 || null;
  
  // O store propaga e lida com o encerramento do jogo
  window.store.propagateMatchResult(catId, code, res1, res2, res3);
  window.renderBracket();
};
`;

fs.writeFileSync(file, content);
console.log('Appended global handlers');
