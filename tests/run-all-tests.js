const { execSync } = require('child_process');

console.log('===============================================================');
console.log('SUITE DE TESTS QUALITÉ & ARCHITECTURE — MON ÉCOLE EN POCHE');
console.log('===============================================================\n');

const testSuites = [
  { name: 'Tests des Boutons & Interactions', script: 'tests/buttons.test.js' },
  { name: 'Tests du Routeur Unifié', script: 'tests/router.test.js' },
  { name: 'Tests des Données JSON de Cours', script: 'tests/data.test.js' },
  { name: 'Tests de Simulation Runtime', script: 'tests/runtime.test.js' },
  { name: 'Tests de Navigation Inter-cours & Livres', script: 'tests/navigation.test.js' },
  { name: 'Régressions fonctionnelles des cours et sauvegardes', script: 'tests/regressions.test.js' },
  { name: 'Serveur HTTP et médias', script: 'tests/serve.test.js' },
  { name: 'Lecture native des enregistrements et chemins des voix', script: 'tests/audio-output.test.js' },
  { name: 'Compatibilité vocale Windows locale', script: 'tests/native-audio.test.js' },
  { name: 'Parcours des semaines en cinq étapes', script: 'tests/week-journey.test.js' },
  { name: 'Enchaînement des voix du Grand Bilan', script: 'tests/bilan-audio.test.js' },
  { name: 'Enchaînement des voix des défis anglais', script: 'tests/english-audio-sequence.test.js' },
  { name: 'Présentation mobile et menu compact', script: 'tests/mobile-layout.test.js' },
  { name: 'Carte des aventures et validation manuelle des ateliers', script: 'tests/adventure.test.js' }
];

let failed = 0;
const start = Date.now();

testSuites.forEach((t, i) => {
  try {
    execSync(`node "${t.script}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ Échec de la suite : ${t.name}`);
    failed++;
  }
});

const duration = ((Date.now() - start) / 1000).toFixed(2);
console.log('===============================================================');
if (failed === 0) {
  console.log(`✅ TOUS LES TESTS SONT AU VERT (${testSuites.length}/${testSuites.length} suites validées en ${duration}s).`);
  console.log('Scénarios automatisés validés. Consulter le rapport pour le périmètre et les limites.');
} else {
  console.log(`❌ ${failed} suite(s) de tests en échec.`);
  process.exit(1);
}
console.log('===============================================================');
