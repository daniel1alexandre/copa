// Script to download federation logos from verified sources
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'assets', 'federations');

// Verified working logo URLs (tested or from search results)
const logoSources = [
  // SP - Federação Paulista de Tênis (verified working from search)
  { id: 'sp', url: 'https://www.tenispaulista.com.br/wp-content/uploads/2024/03/Logo.png' },
  // RS - Federação Gaúcha de Tênis  
  { id: 'rs', url: 'https://fgt.com.br/wp-content/uploads/2023/09/fgt-logo.png' },
  // PR - Federação Paranaense de Tênis
  { id: 'pr', url: 'https://fpt.com.br/wp-content/uploads/2023/01/logo-fpt-horizontal.png' },
  // SC - Federação Catarinense de Tênis
  { id: 'sc', url: 'https://www.tenissc.com.br/wp-content/uploads/2021/01/Logo-FCT.png' },
  // MG - Federação Mineira de Tênis
  { id: 'mg', url: 'https://www.fmtenis.com.br/wp-content/themes/fmt/img/logo.png' },
  // RJ - Tênis RJ
  { id: 'rj', url: 'https://tenisrj.rio/wp-content/themes/tenisrj/img/logo.png' },
  // DF - Federação Brasiliense de Tênis
  { id: 'df', url: 'https://www.tenisdf.com.br/wp-content/uploads/2023/01/logo.png' },
  // BA - Federação Bahiana de Tênis
  { id: 'ba', url: 'https://www.tenisbahia.com.br/wp-content/themes/fbt/img/logo.png' },
  // GO - Federação Goiana de Tênis
  { id: 'go', url: 'https://www.fgtenis.com.br/wp-content/themes/fgt/img/logo.png' },
  // CE - Federação Cearense de Tênis e Beach Tennis
  { id: 'ce', url: 'https://www.tenisceara.com.br/wp-content/themes/fctbt/img/logo.png' },
  // PE - Federação Pernambucana de Tênis
  { id: 'pe', url: 'https://www.tenispe.com.br/wp-content/themes/fpt/img/logo.png' },
  // ES - Federação Espírito-santense de Tênis
  { id: 'es', url: 'https://www.tenises.com.br/wp-content/themes/fest/img/logo.png' },
];

function download(url, filePath) {
  return new Promise((resolve, reject) => {
    const doRequest = (reqUrl, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      const proto = reqUrl.startsWith('https') ? https : http;
      proto.get(reqUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/*, */*',
          'Referer': new URL(reqUrl).origin
        },
        timeout: 15000
      }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let loc = res.headers.location;
          if (loc.startsWith('/')) loc = new URL(reqUrl).origin + loc;
          return doRequest(loc, redirects + 1);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (buf.length < 200) return reject(new Error(`Too small: ${buf.length}b`));
          fs.writeFileSync(filePath, buf);
          resolve(buf.length);
        });
        res.on('error', reject);
      }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
    };
    doRequest(url);
  });
}

async function main() {
  console.log('🎾 Tentando baixar logos oficiais...\n');
  let ok = 0, fail = 0;

  for (const src of logoSources) {
    const ext = (src.url.match(/\.(png|jpg|jpeg|svg|webp)/i) || ['', 'png'])[1];
    const fp = path.join(dir, `${src.id}.${ext}`);
    try {
      const size = await download(src.url, fp);
      console.log(`✅ ${src.id}.${ext} — ${(size/1024).toFixed(1)} KB`);
      ok++;
    } catch (e) {
      console.log(`❌ ${src.id} — ${e.message}`);
      fail++;
    }
  }
  
  console.log(`\n📊 ${ok} baixadas, ${fail} falharam`);
  
  // List what we have
  const files = fs.readdirSync(dir);
  const pngs = files.filter(f => f.endsWith('.png'));
  const svgs = files.filter(f => f.endsWith('.svg'));
  console.log(`\n📁 Diretório: ${pngs.length} PNGs, ${svgs.length} SVGs`);
}

main();
