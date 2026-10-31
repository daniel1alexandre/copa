// Script para processamento oficial da pré-lista de inscritos da Copa das Federações 2026 CBT
const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const catMap = {
  'PRO': 'prof',
  'A': 'cat_a',
  'B': 'cat_b',
  'C': 'cat_c',
  'Sub-12': 'sub12',
  'Sub-14': 'sub14',
  'Sub-16': 'sub16',
  'Sub-18': 'sub18',
  '40+': 'master40',
  '50+': 'master50',
  '60+': 'master60'
};

const fedHeadersMap = {
  'Ass Desp de Tênis Do Estado Do Rio de Janeiro': 'rj',
  'Federação Acreana de Tênis': 'ac',
  'Federação Alagoana de Tênis': 'al',
  'Federação Amapaense de Tênis': 'ap',
  'Federação Amazonense de Tênis': 'am',
  'Federação Bahiana de Tênis': 'ba',
  'Federação Brasiliense de Tênis': 'df',
  'Federacão Catarinense de Tênis': 'sc',
  'Federação Cearense de Tênis': 'ce',
  'Federação de Tênis e Beach Tênis do Piauí': 'pi',
  'Federação Espírito-santense de Tênis': 'es',
  'Federação Gaúcha de Tênis': 'rs',
  'Federação Goiana de Tênis': 'go',
  'Federação Maranhense de Tênis': 'ma',
  'Federação Mato-grossense de Tênis': 'mt',
  'Federação Mineira de Tênis e Beach Tennis': 'mg',
  'Federação Paraense de Tênis': 'pa',
  'Federação Paraibana de Tênis': 'pb',
  'Federação Paranaense de Tênis': 'pr',
  'Federação Paulista de Tênis': 'sp',
  'Federação Pernambucana de Tênis': 'pe',
  'Federação Potiguar de Tênis': 'rn',
  'Federação Rondoniense de Tênis': 'ro',
  'Federação Roraimense de Tênis E Beach Tennis': 'rr',
  'Federação Sergipana de Tênis': 'se',
  'Federação Sul - Matogrossense de Tênis': 'ms',
  'Federação Tocantinense de Tênis': 'to'
};

async function main() {
  const pdfPath = path.resolve(__dirname, '..', 'pre_lista_inscritos.pdf');
  const parser = new PDFParse({ data: fs.readFileSync(pdfPath) });
  await parser.load();
  const textRes = await parser.getText();

  let currentCategory = null;
  let currentFed = null;

  // Mapa de atletas únicos indexados por cbt_id + '_' + fed
  const athleteMap = new Map();
  let totalEntries = 0;

  for (let p = 0; p < textRes.pages.length; p++) {
    const lines = textRes.pages[p].text.split('\n').map(l => l.trim()).filter(Boolean);

    for (let i = 0; i < Math.min(6, lines.length); i++) {
      if (catMap[lines[i]]) {
        currentCategory = catMap[lines[i]];
        break;
      }
    }

    for (const line of lines) {
      if (
        line.startsWith('Confederação') ||
        line.startsWith('Copa das') ||
        line.startsWith('ID NOME') ||
        catMap[line]
      ) {
        continue;
      }

      if (fedHeadersMap[line]) {
        currentFed = fedHeadersMap[line];
        continue;
      }

      // 40811 Ralff Calazans Abreu RJ 43 Capitão
      const match = line.match(/^(\d+)\s+(.+?)\s+([A-Z]{2})\s+(\d+)(?:\s+(.*))?$/);
      if (match) {
        totalEntries++;
        const cbtIdNum = match[1];
        const rawNome = match[2].trim();
        const uf = match[3];
        const idade = parseInt(match[4], 10);
        const rest = match[5] || '';

        const fed = currentFed || uf.toLowerCase();
        const cbtId = 'CBT-' + cbtIdNum;

        let ranking = null;
        const rMatch = rest.match(/(\d+\s*º|\d+º)/);
        if (rMatch) ranking = rMatch[1].replace(/\s+/g, '');

        const isCapitao = /capit[aã]o/i.test(rest);

        const key = cbtId + '_' + fed;

        if (!athleteMap.has(key)) {
          athleteMap.set(key, {
            id: `ath-${fed}-${cbtIdNum}`,
            nome: rawNome,
            equipe_id: fed,
            uf: uf,
            cbt_id: cbtId,
            idade: isNaN(idade) ? undefined : idade,
            categorias: currentCategory ? [currentCategory] : [],
            ranking: ranking || undefined,
            funcao: isCapitao ? 'Capitão' : undefined
          });
        } else {
          const existing = athleteMap.get(key);
          if (currentCategory && !existing.categorias.includes(currentCategory)) {
            existing.categorias.push(currentCategory);
          }
          if (isCapitao) {
            existing.funcao = 'Capitão';
          }
          if (ranking && !existing.ranking) {
            existing.ranking = ranking;
          }
        }
      }
    }
  }

  const allAthletes = Array.from(athleteMap.values());
  // Ordena por estado e depois por nome
  allAthletes.sort((a, b) => {
    if (a.equipe_id !== b.equipe_id) return a.equipe_id.localeCompare(b.equipe_id);
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });

  console.log(`Sucesso: ${totalEntries} inscrições processadas em 77 páginas.`);
  console.log(`Total de atletas únicos cadastrados: ${allAthletes.length}`);

  const byFed = {};
  for (const ath of allAthletes) {
    byFed[ath.equipe_id] = (byFed[ath.equipe_id] || 0) + 1;
  }
  console.log('\nAtletas únicos por federação:');
  console.table(byFed);

  const byCat = {};
  for (const ath of allAthletes) {
    for (const c of ath.categorias) {
      byCat[c] = (byCat[c] || 0) + 1;
    }
  }
  console.log('\nInscrições por categoria:');
  console.table(byCat);

  // Gera o arquivo js/data/athletesData.js
  const fileContent = `// Base Oficial de Atletas da Copa das Federações de Beach Tennis 2026 - CBT (Tênis Integrado)
// Extraído diretamente da Pré-Lista Oficial de Inscritos (77 páginas, 27 federações)
// Total de Atletas Únicos: ${allAthletes.length} | Total de Inscrições: ${totalEntries}

export const CBT_OFFICIAL_ATHLETES_VERSION = "2026.11-cbt-official";

export const CBT_OFFICIAL_ATHLETES_2026 = ${JSON.stringify(allAthletes, null, 2)};
`;

  const outputPath = path.resolve(__dirname, '..', 'js', 'data', 'athletesData.js');
  fs.writeFileSync(outputPath, fileContent, 'utf-8');
  console.log(`\nArquivo gravado com sucesso em: ${outputPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
