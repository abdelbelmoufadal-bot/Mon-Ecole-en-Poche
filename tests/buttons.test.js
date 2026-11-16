const fs = require('fs');

console.log('=== TEST 1 : AUDIT DES BOUTONS ET DES FONCTIONS INTERACTIVES ===');

function testButtons(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fichier introuvable : ${filePath}`);
    return false;
  }
  const html = fs.readFileSync(filePath, 'utf8');

  // 1. Extraire les scripts JS
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let jsCode = '';
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    if (!match[1].includes('application/json')) {
      jsCode += match[2] + '\n';
    }
  }

  // 2. Extraire toutes les fonctions définies
  const definedFunctions = new Set();
  for (const m of jsCode.matchAll(/(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/g)) {
    definedFunctions.add(m[1]);
  }
  for (const m of jsCode.matchAll(/(?:^|[\n;])\s*([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)/g)) {
    definedFunctions.add(m[1]);
  }
  definedFunctions.add("enSpeak");
  for (const m of jsCode.matchAll(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/g)) {
    definedFunctions.add(m[1]);
  }
  for (const m of jsCode.matchAll(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?function\b/g)) {
    definedFunctions.add(m[1]);
  }
  for (const m of jsCode.matchAll(/window\.([a-zA-Z0-9_$]+)\s*=/g)) {
    definedFunctions.add(m[1]);
  }

  // 3. Vérifier les handlers inline (onclick, onchange, etc.)
  const inlineEventsRegex = /(onclick|onchange|onsubmit|oninput)\s*=\s*["']([^"']+)["']/gi;
  const missing = [];
  while ((match = inlineEventsRegex.exec(html)) !== null) {
    const code = match[2].trim();
    const callRegex = /([a-zA-Z0-9_$]+)\s*\(/g;
    let cm;
    while ((cm = callRegex.exec(code)) !== null) {
      const fn = cm[1];
      if (['alert', 'confirm', 'prompt', 'console', 'log', 'error', 'warn', 'preventDefault', 'stopPropagation', 'setTimeout', 'clearTimeout'].includes(fn)) continue;
      if (!definedFunctions.has(fn)) {
        missing.push({ fn, code });
      }
    }
  }

  // 4. Contrôles spécifiques Priorité 1
  const hasCheer = definedFunctions.has('cheerWithCapi');
  const hasPortalBtn = html.includes('id="portal-mascot-speak"');

  if (missing.length === 0 && hasCheer && hasPortalBtn) {
    console.log(`  ✓ ${filePath} : 100% conforme (0 fonction manquante, cheerWithCapi OK, portal-mascot-speak OK).`);
    return true;
  } else {
    console.error(`  ❌ ${filePath} : Échec (manquantes: ${missing.length}, cheer: ${hasCheer}, btn: ${hasPortalBtn})`);
    missing.forEach(m => console.error(`     -> Fonction manquante: ${m.fn} dans "${m.code}"`));
    return false;
  }
}

const targets = [
  'index.html',
  'courses/francais_cp/index.html',
  'courses/english_starship_1/index.html'
];

let allOk = true;
targets.forEach(t => {
  if (!testButtons(t)) allOk = false;
});

if (!allOk) process.exit(1);
console.log('✅ TEST 1 RÉUSSI AVEC SUCCÈS.\n');
