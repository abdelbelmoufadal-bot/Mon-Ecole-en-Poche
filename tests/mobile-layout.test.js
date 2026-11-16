const assert=require('node:assert/strict');
const {fixture}=require('./dom-fixture');
const {settle}=require('./bilan-audio-helpers');
(async()=>{
 for(const file of ['index.html','courses/francais_cp/index.html','courses/english_starship_1/index.html']){
  const f=await fixture(file,{viewportWidth:390}),{w,route}=f,$=s=>w.document.querySelector(s);
  try{
   await settle();const nav=$('#app-nav'),menu=$('#cp-mobile-menu');
   assert.equal(w.document.querySelectorAll('#cp-menu-toggle').length,1);
   assert.ok(menu.contains(nav),'one original navigation is moved into the drawer');
   for(const id of ['profile-pill','total-stars'])assert.ok(menu.contains($('#'+id)),id+' remains available');
   assert.equal(w.document.querySelectorAll('#app-nav').length,1);
   $('#cp-menu-toggle').click();assert.equal(menu.open,true);assert.equal($('#cp-menu-toggle').getAttribute('aria-expanded'),'true');
   $('.cp-menu-close').click();assert.equal(menu.open,false);
   route('#week/0');await settle();
   assert.equal($('.cp-menu-context').querySelectorAll('button').length,5);
   $('.cp-menu-context button:nth-of-type(2)').click();await settle();
   assert.equal($('[data-week-step="1"]').getAttribute('aria-current'),'step');
   assert.equal(menu.open,false);
   assert.equal(w.eval('getLetterProgress(0,0).totalDone'),0,'menu navigation must not complete an exercise');
   route('#english/school-lesson-2/mission');await settle();
   assert.ok(menu.querySelector('.en-mission-length'),'mission settings remain reachable in Menu');
   assert.ok(!$('#main .en-mission-length'),'settings do not take up the activity area');
   assert.equal($('.cp-menu-context').querySelectorAll('a').length,6,'all lesson steps remain reachable');
   $('#en-listen').click();await settle();assert.equal($('#narrator-bar').hidden,false);
   assert.equal($('#cp-audio-options').getAttribute('aria-expanded'),'false');
   $('#cp-audio-options').click();await settle();assert.equal($('#narrator-bar').classList.contains('cp-audio-expanded'),true);
   assert.ok($('#en-player-rate'));assert.ok($('#en-repeat-count'));assert.ok($('#en-repeat-gap'));
   const before=f.audio.length+f.utterances.length;$('#cp-mobile-replay').click();await settle();assert.equal(f.audio.length+f.utterances.length,before+1,'compact replay uses the existing engine');
   $('#narrator-stop').click();assert.equal($('#narrator-bar').hidden,true);
   // Breakpoint changes restore the actual controls and their original handlers.
   w.innerWidth=1200;w.dispatchEvent(new w.Event('resize'));await settle();
   assert.equal(nav.parentElement,w.document.querySelector('.topbar'));
   assert.ok($('#main .en-mission-length'));assert.equal(menu.open,false);
   w.innerWidth=844;w.innerHeight=390;w.dispatchEvent(new w.Event('resize'));await settle();assert.ok(menu.contains(nav),'landscape phone keeps the compact menu');
   w.innerHeight=844;
   w.innerWidth=390;w.dispatchEvent(new w.Event('resize'));await settle();assert.ok(menu.contains(nav));
   route('#english/school-lesson-2/discover');await settle();assert.equal(menu.querySelectorAll('.en-mission-length').length,0,'old mission controls are removed');
   assert.ok(menu.contains($('#en-rate')),'vocabulary speed remains available in Menu');assert.ok($('.cp-mobile-vocab-note'));
   route('#bilan/0');await settle();assert.equal($('.cp-menu-context').children.length,0,'old lesson menu is removed on a French route');
   $('#bilan-speak-prompt').click();await settle();
   assert.equal($('#cp-mobile-fr-options').hidden,false);$('#cp-mobile-fr-options select').value='0.9';$('#cp-mobile-fr-options select').dispatchEvent(new w.Event('change'));assert.equal(w.eval('ensureLearning().settings.rate'),.9);
   assert.ok(w.eval('validFamily(familySnapshot())'));
   w.subjectsHome();await settle();assert.ok($('.cp-mobile-intro'));
   assert.deepEqual(f.errors,[]);
   console.log('✓ Mobile : Menu unique, navigation, options audio, reprise, langues et restauration bureau : '+file);
  }finally{f.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1});
