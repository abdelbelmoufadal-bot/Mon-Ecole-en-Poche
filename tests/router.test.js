const fs = require('fs');

console.log('=== TEST 2 : VALIDATION DU ROUTEUR UNIFIÉ ===');

function testRouter(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fichier introuvable : ${filePath}`);
    return false;
  }
  const content = fs.readFileSync(filePath, 'utf8');

  // Vérifier la présence du routeur unifié
  const hasUnified = content.includes('function unifiedRoute()');
  const hasSingleRouteVar = content.includes('var route = unifiedRoute') || content.includes('const route = unifiedRoute');
  
  // Vérifier l'absence des anciens marqueurs de monkey-patching
  const hasOldDef2 = content.includes('const oldRoute=route;');
  const hasOldDef3 = content.includes('const routeWithoutEnglish=route;');
  const hasOldDef4 = content.includes('const routeBeforeEnglishUI=route;');
  const hasOldDef5 = content.includes('const legacySubjectRoute=route;');
  const hasOldDef6 = content.includes('const originalRouteWithSubjects = route;');

  const monkeyPatchingCleaned = !hasOldDef2 && !hasOldDef3 && !hasOldDef4 && !hasOldDef5 && !hasOldDef6;

  if (hasUnified && hasSingleRouteVar && monkeyPatchingCleaned) {
    console.log(`  ✓ ${filePath} : Routeur unifié opérationnel, 0 monkey-patching résiduel.`);
    return true;
  } else {
    console.error(`  ❌ ${filePath} : Anomalie routeur (hasUnified: ${hasUnified}, clean: ${monkeyPatchingCleaned})`);
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
  if (!testRouter(t)) allOk = false;
});

if (!allOk) process.exit(1);
console.log('✅ TEST 2 RÉUSSI AVEC SUCCÈS.\n');
