const assert=require('node:assert/strict');
const {fixture}=require('./dom-fixture');
(async()=>{
 for(const file of ['index.html','courses/francais_cp/index.html','courses/english_starship_1/index.html']){
  const f=await fixture(file),{w,route}=f,$=s=>w.document.querySelector(s);
  try{
   route('#week/0');
   const turns=[...w.document.querySelectorAll('#week-step-0 .dialogue-turn')];
   assert.equal(turns.length,6,'each speaker turn has its own paragraph');
   assert.equal(turns[2].textContent,'Sami : Petit chat, tu t’appelles comment ? Moi, c’est Sami. Et voici Lina, c’est ma sœur.','printed line wrapping is merged within the same turn');
   assert.equal(turns[4].querySelector('strong').textContent,'Le tonton :');
   assert.ok(!turns.some(p=>p.textContent.includes('&#x20;')));
   const sample=w.document.createElement('div');sample.innerHTML=w.formatDialogue('Lina : Bonjour\nles amis.\nSami : <script>test</script>');
   assert.equal(sample.querySelectorAll('p').length,2);assert.equal(sample.querySelector('p').textContent,'Lina : Bonjour les amis.');assert.equal(sample.querySelector('script'),null);
   assert.ok($('.cp-next'),'main action survives course shell rendering');
   assert.equal(w.document.querySelectorAll('.cp-stage:not([hidden])').length,1);
   const stars=w.eval('state.earned.length');
   $('[data-week-step="1"]').click();
   assert.equal($('.cp-track').getAttribute('aria-valuenow'),'0','viewing a stage does not complete it');
   assert.equal(w.eval('state.earned.length'),stars);
   route('#subjects');route('#week/0');
   assert.equal($('[data-week-step="1"]').getAttribute('aria-current'),'step','selected step resumes');
   // Completing an existing workshop is still the only way to earn its star.
   w.eval("saveAtelierDone(0,0,'oral',0)");route('#week/0');
   assert.equal($('.cp-next').textContent,'Continuer mes ateliers →');$('.cp-next').click();
   assert.equal(w.location.hash,'#atelier/0-0-oral-1','resume skips completed workshop');
   route('#week/0');$('[data-week-step="0"]').click();$('.cp-next').click();
   assert.equal(w.eval('state.weekJourney[0].story'),true);
   assert.equal($('.cp-track').getAttribute('aria-valuenow'),'1');
   $('[data-week-step="3"]').click();assert.equal($('.cp-next').disabled,true);
   for(let index=0;index<2;index++){
    const q=w.eval(`WEEK_BILANS[0].tests.filter(q=>q.type==='choice')`);
    const question=index===0?q[0]:q.find(x=>x!==q[0]&&String(x.say||x.prompt).includes('son i'))||q[1];
    const wrong=question.options.findIndex(o=>!o.correct),correct=question.options.findIndex(o=>o.correct);
    $(`[data-review-answer="${wrong}"]`).click();assert.equal($('.cp-next').disabled,true);
    $(`[data-review-answer="${correct}"]`).click();$('.cp-review-more').click();
   }
   assert.equal(w.eval('state.weekJourney[0].review'),true);assert.equal($('.cp-next').disabled,false);
   assert.equal(w.eval('Boolean(getWeekBilan(0))'),false,'review must not validate the exam');
   assert.equal(w.eval('validFamily(familySnapshot())'),true,'journey survives export validation');
   assert.equal(w.eval('validWeekJourney({"12":{story:true}})'),false);
   assert.equal(w.eval('validWeekJourney({"0":{step:9}})'),false);
   // All 12 weeks retain their original 18 workshop links, sound handlers and exam.
   w.eval('for(let i=0;i<12;i++)saveWeekBilan(i,20,20,20)');
   for(let week=0;week<12;week++){
    route('#week/'+week);
    assert.ok(w.document.querySelectorAll('#week-step-0 .dialogue-turn').length>1,'dialogue organized by speaker in week '+week);
    assert.equal(w.document.querySelectorAll('[data-week-step]').length,5);
    const links=[...w.document.querySelectorAll('.cp-stage a.exercise-pill-btn')];
    assert.equal(links.length,18);assert.equal(new Set(links.map(a=>a.getAttribute('href'))).size,18);
    for(const link of links)assert.ok(link.getAttribute('href').startsWith('#atelier/'+week+'-'));
    for(const stage of [1,2]){
     $(`[data-week-step="${stage}"]`).click();const before=f.audio.length;
     $('#play-sound-'+stage).click();assert.equal(f.audio.length,before+1,'sound handler remains bound');
    }
    $('[data-week-step="4"]').click();assert.equal($('.cp-stage:not([hidden]) a[href^="#bilan/"]').getAttribute('href'),'#bilan/'+week);
   }
   const snapshot=JSON.parse(w.eval('JSON.stringify(familySnapshot())'));
   const original=w.eval('family.active');
   route('#profiles');$('#profile-name').value='Autre enfant';$('#profile-add').click();
   route('#week/0');assert.equal($('.cp-track').getAttribute('aria-valuenow'),'0','journey is isolated per learner');
   assert.equal($('[data-week-step="0"]').getAttribute('aria-current'),'step');
   w.eval(`switchProfile(${JSON.stringify(original)})`);route('#week/0');
   assert.equal($('[data-week-step="4"]').getAttribute('aria-current'),'step','original learner keeps their selected step');
   await w.importFamilyEvent({target:{files:[{size:100,text:async()=>JSON.stringify(snapshot)}],value:'test'}});
   $('#confirm-yes').click();route('#week/0');
   assert.equal(w.eval('state.weekJourney[0].story'),true,'story survives actual export/import');
   assert.equal(w.eval('state.weekJourney[0].review'),true,'review survives actual export/import');
   assert.deepEqual(f.errors,[]);
   console.log('✓ 12 semaines, 5 étapes, 216 liens, voix, reprise, révision et export : '+file);
  }finally{f.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1});
