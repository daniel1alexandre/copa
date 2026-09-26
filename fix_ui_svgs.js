const fs = require('fs');
const path = require('path');
const dir = 'js/modules';

const files = ['bracketView.js', 'categoryView.js', 'modal.js', 'rankingView.js', 'teamsAthletesView.js'];

files.forEach(f => {
  const file = path.join(dir, f);
  let content = fs.readFileSync(file, 'utf8');
  
  // A regex procura por src="assets/federations/.jpg" alt="${variavel.uf}" ou similar
  // e extrai "variavel" para reconstruir o src correto.
  
  // Exemplo: src="assets/federations/.jpg" alt="${top1.uf}" -> src="assets/federations/${top1.id}.jpg"
  
  // Vamos usar uma função no replace para ser mais inteligente.
  content = content.replace(/assets\/federations\/\.jpg/g, (match, offset, string) => {
    // Procura o próximo alt="${...}"
    const tail = string.slice(offset);
    const altMatch = tail.match(/alt="\$\{([^\}]+)\.uf\}"/);
    if (altMatch) {
      const varName = altMatch[1]; // Ex: top1
      return `assets/federations/\${${varName}.id}.jpg`;
    }
    
    // Fallback para outros casos se houver
    return 'assets/federations/${f.id}.jpg';
  });
  
  fs.writeFileSync(file, content);
  console.log('Fixed ' + f);
});
