const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'Brasoes');
const targetDir = path.join(__dirname, 'assets', 'federations');

const mapping = {
  'Acre.jpg': 'ac',
  'Alagoas.jpg': 'al',
  'Amapa.jpg': 'ap',
  'Amazonas.jpg': 'am',
  'Bahia.jpg': 'ba',
  'Brasiliense.jpg': 'df',
  'Catarinense.jpg': 'sc',
  'Ceara.jpg': 'ce',
  'Espirito Santo.jpg': 'es',
  'Gaucha.jpg': 'rs',
  'Goiana.jpg': 'go',
  'Maranhaense.jpg': 'ma',
  'Mato grosso.jpg': 'mt',
  'mineira.jpg': 'mg',
  'Para.jpg': 'pa',
  'Paraiba.jpg': 'pb',
  'paranaense.jpg': 'pr',
  'Pernanbuco.jpg': 'pe',
  'Piaui.jpg': 'pi',
  'Potiguar.jpg': 'rn',
  'rio de janeiro.jpg': 'rj',
  'Rondonia.jpg': 'ro',
  'Roraima.jpg': 'rr',
  'Sergipe.jpg': 'se',
  'Sul Matogrossense.jpg': 'ms',
  'Tocantins.jpg': 'to'
};

// Ler arquivos da pasta Brasoes
const files = fs.readdirSync(sourceDir);

files.forEach(file => {
  let destId = mapping[file];
  
  // Tratar So Paulo separadamente por causa do caractere estranho
  if (!destId && file.includes('Paulo')) {
    destId = 'sp';
  }
  
  if (destId) {
    const srcPath = path.join(sourceDir, file);
    const destPath = path.join(targetDir, destId + '.jpg');
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copiado: ${file} -> ${destId}.jpg`);
  } else {
    console.log(`Não mapeado: ${file}`);
  }
});

// Atualizar o federations.js
const fedFile = path.join(__dirname, 'js', 'data', 'federations.js');
let content = fs.readFileSync(fedFile, 'utf8');

// Trocar todos os .svg ou .png por .jpg
content = content.replace(/imagem:\s*"assets\/federations\/([a-z]{2})\.(svg|png)"/g, 'imagem: "assets/federations/$1.jpg"');

fs.writeFileSync(fedFile, content);
console.log('federations.js atualizado com sucesso!');
