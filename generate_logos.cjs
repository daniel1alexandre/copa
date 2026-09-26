const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'assets', 'federations');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// Dados das 27 federações com cores e siglas oficiais
const federations = [
  { id: 'sp', sigla: 'FPT', nome: 'Federação Paulista de Tênis', uf: 'SP', cor1: '#c41e3a', cor2: '#1a1a2e', cor3: '#ffffff' },
  { id: 'rj', sigla: 'ADTERJ', nome: 'Ass Desp de Tênis do RJ', uf: 'RJ', cor1: '#0047AB', cor2: '#e63946', cor3: '#ffffff' },
  { id: 'pr', sigla: 'FPT', nome: 'Federação Paranaense de Tênis', uf: 'PR', cor1: '#1a5276', cor2: '#d4ac0d', cor3: '#ffffff' },
  { id: 'sc', sigla: 'FCT', nome: 'Federação Catarinense de Tênis', uf: 'SC', cor1: '#1e8449', cor2: '#c0392b', cor3: '#ffffff' },
  { id: 'rs', sigla: 'FGT', nome: 'Federação Gaúcha de Tênis', uf: 'RS', cor1: '#196f3d', cor2: '#c0392b', cor3: '#f4d03f' },
  { id: 'mg', sigla: 'FMTBT', nome: 'Fed Mineira de Tênis e BT', uf: 'MG', cor1: '#1a5276', cor2: '#c0392b', cor3: '#ffffff' },
  { id: 'ba', sigla: 'FBT', nome: 'Federação Bahiana de Tênis', uf: 'BA', cor1: '#1a237e', cor2: '#c62828', cor3: '#ffffff' },
  { id: 'df', sigla: 'FBT', nome: 'Federação Brasiliense de Tênis', uf: 'DF', cor1: '#1a237e', cor2: '#1a237e', cor3: '#ffffff' },
  { id: 'go', sigla: 'FGT', nome: 'Federação Goiana de Tênis', uf: 'GO', cor1: '#196f3d', cor2: '#d4ac0d', cor3: '#ffffff' },
  { id: 'es', sigla: 'FET', nome: 'Fed Espírito-santense de Tênis', uf: 'ES', cor1: '#2c3e6b', cor2: '#e91e90', cor3: '#c8e64a' },
  { id: 'pe', sigla: 'FPT', nome: 'Federação Pernambucana de Tênis', uf: 'PE', cor1: '#0d6efd', cor2: '#dc3545', cor3: '#ffffff' },
  { id: 'ce', sigla: 'FCTBT', nome: 'Fed Cearense de Tênis e BT', uf: 'CE', cor1: '#2980b9', cor2: '#2980b9', cor3: '#ffffff' },
  { id: 'al', sigla: 'FAT', nome: 'Federação Alagoana de Tênis', uf: 'AL', cor1: '#2fa4c7', cor2: '#2fa4c7', cor3: '#ffffff' },
  { id: 'rn', sigla: 'FPT', nome: 'Federação Potiguar de Tênis', uf: 'RN', cor1: '#27ae60', cor2: '#f39c12', cor3: '#ffffff' },
  { id: 'pb', sigla: 'FPBT', nome: 'Federação Paraibana de Tênis', uf: 'PB', cor1: '#c0392b', cor2: '#1a5276', cor3: '#f4d03f' },
  { id: 'se', sigla: 'FST', nome: 'Federação Sergipana de Tênis', uf: 'SE', cor1: '#2980b9', cor2: '#e67e22', cor3: '#ffffff' },
  { id: 'ma', sigla: 'FMT', nome: 'Federação Maranhense de Tênis', uf: 'MA', cor1: '#c0392b', cor2: '#1a5276', cor3: '#ffffff' },
  { id: 'pi', sigla: 'FTBTPI', nome: 'Fed de Tênis e BT do Piauí', uf: 'PI', cor1: '#27ae60', cor2: '#f1c40f', cor3: '#ffffff' },
  { id: 'mt', sigla: 'FMT', nome: 'Fed Mato-grossense de Tênis', uf: 'MT', cor1: '#0d47a1', cor2: '#1b5e20', cor3: '#ffffff' },
  { id: 'ms', sigla: 'FSMT', nome: 'Fed Sul-Matogrossense de Tênis', uf: 'MS', cor1: '#1b5e20', cor2: '#0d47a1', cor3: '#ffffff' },
  { id: 'pa', sigla: 'FPT', nome: 'Federação Paraense de Tênis', uf: 'PA', cor1: '#c0392b', cor2: '#1a5276', cor3: '#ffffff' },
  { id: 'am', sigla: 'FAT', nome: 'Federação Amazonense de Tênis', uf: 'AM', cor1: '#1a237e', cor2: '#c62828', cor3: '#f4d03f' },
  { id: 'to', sigla: 'FT', nome: 'Federação Tocantinense', uf: 'TO', cor1: '#f39c12', cor2: '#1a5276', cor3: '#ffffff' },
  { id: 'ro', sigla: 'FRT', nome: 'Federação Rondoniense de Tênis', uf: 'RO', cor1: '#196f3d', cor2: '#c0392b', cor3: '#f4d03f' },
  { id: 'rr', sigla: 'FRTBT', nome: 'Fed Roraimense de Tênis e BT', uf: 'RR', cor1: '#0d47a1', cor2: '#1b5e20', cor3: '#ffffff' },
  { id: 'ap', sigla: 'FAPT', nome: 'Federação Amapaense de Tênis', uf: 'AP', cor1: '#f1c40f', cor2: '#1a5276', cor3: '#ffffff' },
  { id: 'ac', sigla: 'FACT', nome: 'Federação Acreana de Tênis', uf: 'AC', cor1: '#2d6a4f', cor2: '#f4d03f', cor3: '#ffffff' },
];

function generateShieldLogo(fed) {
  const { sigla, uf, cor1, cor2, cor3 } = fed;
  const siglaSize = sigla.length <= 3 ? 42 : (sigla.length <= 4 ? 36 : (sigla.length <= 5 ? 30 : 24));
  const siglaY = sigla.length <= 4 ? 118 : 116;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="shieldGrad_${fed.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${cor1};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:${cor2};stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="ballGrad_${fed.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#c8e64a;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#8db600;stop-opacity:1"/>
    </linearGradient>
    <filter id="shadow_${fed.id}" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.25"/>
    </filter>
    <clipPath id="shieldClip_${fed.id}">
      <path d="M100,10 L175,35 Q185,38 185,48 L185,110 Q185,150 100,190 Q15,150 15,110 L15,48 Q15,38 25,35 Z"/>
    </clipPath>
  </defs>

  <!-- Shield shape -->
  <path d="M100,10 L175,35 Q185,38 185,48 L185,110 Q185,150 100,190 Q15,150 15,110 L15,48 Q15,38 25,35 Z" 
        fill="url(#shieldGrad_${fed.id})" filter="url(#shadow_${fed.id})" stroke="${cor3}" stroke-width="3"/>

  <!-- Shield inner border -->
  <path d="M100,18 L170,40 Q178,43 178,50 L178,108 Q178,144 100,182 Q22,144 22,108 L22,50 Q22,43 30,40 Z" 
        fill="none" stroke="${cor3}" stroke-width="1.5" opacity="0.5"/>

  <!-- Upper decorative band -->
  <path d="M100,18 L170,40 Q178,43 178,50 L178,60 L22,60 L22,50 Q22,43 30,40 Z" 
        fill="${cor3}" opacity="0.15"/>

  <!-- Tennis ball -->
  <circle cx="100" cy="148" r="22" fill="url(#ballGrad_${fed.id})" stroke="${cor3}" stroke-width="1.5" opacity="0.85"/>
  <!-- Tennis ball curve lines -->
  <path d="M82,138 Q90,148 82,158" fill="none" stroke="${cor3}" stroke-width="1.5" opacity="0.6"/>
  <path d="M118,138 Q110,148 118,158" fill="none" stroke="${cor3}" stroke-width="1.5" opacity="0.6"/>

  <!-- Crossed rackets behind the ball -->
  <g opacity="0.3">
    <line x1="65" y1="80" x2="135" y2="165" stroke="${cor3}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="135" y1="80" x2="65" y2="165" stroke="${cor3}" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="72" cy="86" rx="12" ry="16" fill="none" stroke="${cor3}" stroke-width="2" transform="rotate(-40,72,86)"/>
    <ellipse cx="128" cy="86" rx="12" ry="16" fill="none" stroke="${cor3}" stroke-width="2" transform="rotate(40,128,86)"/>
  </g>

  <!-- Federation sigla (main text) -->
  <text x="100" y="${siglaY}" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" 
        font-size="${siglaSize}" font-weight="900" fill="${cor3}" letter-spacing="2"
        stroke="${cor1}" stroke-width="0.5" paint-order="stroke">${sigla}</text>

  <!-- UF badge at bottom -->
  <rect x="80" y="168" width="40" height="16" rx="8" fill="${cor3}" opacity="0.9"/>
  <text x="100" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="800" fill="${cor1}">${uf}</text>

  <!-- Star decoration at top -->
  <polygon points="100,25 103,33 111,33 105,38 107,46 100,42 93,46 95,38 89,33 97,33" fill="${cor3}" opacity="0.85"/>
</svg>`;
}

// Generate all 27 federation logos
federations.forEach(fed => {
  const svg = generateShieldLogo(fed);
  const filePath = path.join(dir, `${fed.id}.svg`);
  fs.writeFileSync(filePath, svg, 'utf-8');
  console.log(`✅ ${fed.id}.svg → ${fed.sigla} (${fed.uf}) — Logo gerada`);
});

console.log(`\n🎾 Total: ${federations.length} logos de federações geradas com sucesso!`);
