/**
 * TEST 5 : NAVIGATION INTER-COURS ET ARCHITECTURE MODULAIRE
 * Vérifie :
 * 1. Le portail épuré index.html (Mes matières, Mes enfants, Famille & sauvegardes)
 * 2. La grille standardisée en 8 onglets sur Français CP & English Starship 1 :
 *    - All subjects
 *    - My course
 *    - My book
 *    - 🏫 Classe
 *    - My games
 *    - My review
 *    - My progress
 *    - Grown-ups
 */

const fs = require('fs');

console.log('=== TEST 5 : NAVIGATION INTER-COURS & STANDARDISATION DES MATIÈRES ===');

function testNavigation() {
  let ok = true;

  // 1. Portail index.html
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  const indexNavSubjects = indexHtml.includes('href="#subjects" data-nav="subjects" data-i18n="navSubjects"');
  const indexNavProfiles = indexHtml.includes('href="#profiles" data-nav="profiles" data-i18n="navProfiles"');
  const indexNavFamily = indexHtml.includes('href="#family" data-nav="family" data-i18n="navFamily"');
  const indexCardsFrench = indexHtml.includes('courses/francais_cp/index.html#weeks');
  const indexCardsEnglish = indexHtml.includes('courses/english_starship_1/index.html#english');

  if (indexNavSubjects && indexNavProfiles && indexNavFamily && indexCardsFrench && indexCardsEnglish) {
    console.log('  ✓ index.html : Portail épuré (Matières, Enfants, Famille & Sauvegardes) avec cartes de redirection actives.');
  } else {
    console.error('  ❌ index.html : Navigation du portail non conforme.');
    ok = false;
  }

  // 2. Français CP (8 onglets)
  const frHtml = fs.readFileSync('courses/francais_cp/index.html', 'utf8');
  const frTabs = [
    'data-nav="subjects"',
    'data-nav="course"',
    'data-nav="book"',
    'data-nav="classroom"',
    'data-nav="games"',
    'data-nav="review"',
    'data-nav="progress"',
    'data-nav="adult"'
  ];
  const frAllTabs = frTabs.every(t => frHtml.includes(t));
  const frReturnPortal = frHtml.includes('href="../../index.html#subjects" data-nav="subjects"');
  const frClasseRoute = frHtml.includes("name === 'classe' || name === 'classroom'");

  if (frAllTabs && frReturnPortal && frClasseRoute) {
    console.log('  ✓ courses/francais_cp/index.html : 8 onglets standardisés présents, retour portail et classe interactifs.');
  } else {
    console.error('  ❌ courses/francais_cp/index.html : Onglets ou routage de classe non conformes.');
    ok = false;
  }

  // 3. English Starship 1 (8 onglets)
  const enHtml = fs.readFileSync('courses/english_starship_1/index.html', 'utf8');
  const enTabs = [
    'data-nav="subjects"',
    'data-nav="course"',
    'data-nav="book"',
    'data-nav="classroom"',
    'data-nav="games"',
    'data-nav="review"',
    'data-nav="progress"',
    'data-nav="adult"'
  ];
  const enAllTabs = enTabs.every(t => enHtml.includes(t));
  const enReturnPortal = enHtml.includes('href="../../index.html#subjects" data-nav="subjects"');
  const enClassroomRoute = enHtml.includes("arg === 'classroom'");
  const enLayoutCurriculum = enHtml.includes('stage-welcome') &&
    enHtml.includes('stage-triplet') &&
    enHtml.includes('stage-yle') &&
    enHtml.includes("['school', 'family', 'review-1']") &&
    enHtml.includes("['playtime', 'park', 'review-2']") &&
    enHtml.includes("['pets', 'abilities', 'review-3']") &&
    enHtml.includes("['food', 'weather', 'review-4']");

  if (enAllTabs && enReturnPortal && enClassroomRoute && enLayoutCurriculum) {
    console.log('  ✓ courses/english_starship_1/index.html : 8 onglets standardisés & layout Starship YLE (Welcome, 4 triplets & YLE) conformes.');
  } else {
    console.error('  ❌ courses/english_starship_1/index.html : Onglets ou layout Starship non conformes.');
    ok = false;
  }

  if (ok) {
    console.log('✅ TEST 5 RÉUSSI AVEC SUCCÈS.');
  } else {
    console.error('❌ ÉCHEC DU TEST 5.');
  }
  return ok;
}

const success = testNavigation();
if (!success) {
  process.exit(1);
}
