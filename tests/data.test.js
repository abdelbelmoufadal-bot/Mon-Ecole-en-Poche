const fs = require('fs');

console.log('=== TEST 3 : CONFORMITÉ DES DONNÉES JSON DE COURS ===');

function testCourseData() {
  const frPath = 'courses/francais_cp/data/francais_cp_data.json';
  const enPath = 'courses/english_starship_1/data/english_starship_data.json';

  let ok = true;

  // Test Français
  try {
    const fr = JSON.parse(fs.readFileSync(frPath, 'utf8'));
    const valid = Array.isArray(fr.lessons) && fr.lessons.length > 0 && Array.isArray(fr.modules);
    if (valid) {
      console.log(`  ✓ Français CP (${frPath}) : Valide (${fr.lessons.length} leçons, ${fr.modules.length} modules).`);
    } else {
      console.error(`  ❌ Français CP : Schéma invalide.`);
      ok = false;
    }
  } catch(e) {
    console.error(`  ❌ Erreur lecture ${frPath}:`, e.message);
    ok = false;
  }

  // Test Anglais
  try {
    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const cur = en.curriculum;
    const valid = cur && Array.isArray(cur.lessons) && cur.lessons.length > 0 && Array.isArray(cur.questions) && cur.questions.length > 0;
    if (valid) {
      console.log(`  ✓ English Starship (${enPath}) : Valide (${cur.lessons.length} leçons, ${cur.questions.length} questions, ${Object.keys(cur.vocab || {}).length} vocab).`);
    } else {
      console.error(`  ❌ English Starship : Schéma invalide.`);
      ok = false;
    }
  } catch(e) {
    console.error(`  ❌ Erreur lecture ${enPath}:`, e.message);
    ok = false;
  }

  return ok;
}

if (!testCourseData()) process.exit(1);
console.log('✅ TEST 3 RÉUSSI AVEC SUCCÈS.\n');
