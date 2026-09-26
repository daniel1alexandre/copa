const fs = require('fs');
const file = 'js/modules/bracketView.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('window.maskScore')) {
  content += `
// --- MASK SCORE ---
window.maskScore = function(input) {
  // Guarda a posição do cursor
  let start = input.selectionStart;
  let lenBefore = input.value.length;

  let v = input.value.replace(/\\D/g, ''); // Remove não números
  let out = '';
  
  if (v.length <= 6) {
    for (let i = 0; i < v.length; i++) {
      if (i === 1 || i === 3 || i === 5) out += '/' + v[i];
      else if (i === 2 || i === 4) out += ' ' + v[i];
      else out += v[i];
    }
  } else if (v.length === 7) { // ex: 6 4 6 3 10 8 -> 6/4 6/3 10/8
    out = v[0] + '/' + v[1] + ' ' + v[2] + '/' + v[3] + ' ' + v.substring(4, 6) + '/' + v[6];
  } else if (v.length >= 8) { // ex: 6 4 6 3 12 10 -> 6/4 6/3 12/10
    out = v[0] + '/' + v[1] + ' ' + v[2] + '/' + v[3] + ' ' + v.substring(4, 6) + '/' + v.substring(6, 8);
  }

  input.value = out;
  
  // Ajusta cursor grosseiramente
  let diff = out.length - lenBefore;
  input.setSelectionRange(start + diff, start + diff);
};
`;
}

// Substitui os inputs de placar para incluir a máscara e onkeyup 
// Para acionar o store apenas onblur ou enter, mas se o usuário quer ver mudar, 
// o onchange (que dispara ao sair do campo) ou no select do vencedor já faz isso.
// Mas vamos adicionar oninput="window.maskScore(this)" e trocar o placeholder
content = content.replace(/<input type="text" placeholder="Placar F"([^>]*)onchange="([^"]*)"/g, '<input type="text" placeholder="_/_ _/_ _/_" $1 oninput="window.maskScore(this)" onchange="$2"');
content = content.replace(/<input type="text" placeholder="Placar M"([^>]*)onchange="([^"]*)"/g, '<input type="text" placeholder="_/_ _/_ _/_" $1 oninput="window.maskScore(this)" onchange="$2"');
content = content.replace(/<input type="text" placeholder="Placar DX"([^>]*)onchange="([^"]*)"/g, '<input type="text" placeholder="_/_ _/_ _/_" $1 oninput="window.maskScore(this)" onchange="$2"');

fs.writeFileSync(file, content);
console.log('Mask injected!');
