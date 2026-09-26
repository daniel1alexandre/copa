const fs = require('fs');
const file = 'js/data/federations.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /assets\/federations\/\.png/g;
let match;
while ((match = regex.exec(content)) !== null) {
  const beforeMatch = content.slice(0, match.index);
  const idMatches = [...beforeMatch.matchAll(/id:\s*"([a-z]{2})"/g)];
  if (idMatches.length > 0) {
    const lastId = idMatches[idMatches.length - 1][1];
    // Replace just this specific instance
    content = content.substring(0, match.index) + `assets/federations/${lastId}.svg` + content.substring(match.index + 23);
    // Reset regex index because we modified the string
    regex.lastIndex = match.index + `assets/federations/${lastId}.svg`.length;
  }
}

fs.writeFileSync(file, content);
console.log('Fixed federations.js');
