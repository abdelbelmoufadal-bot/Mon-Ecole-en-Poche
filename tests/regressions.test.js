const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {fixture}=require('./dom-fixture');
const {finishFeedback}=require('./bilan-audio-helpers');
const result={pages:[],workshops:0,exams:0,englishQuestions:0,frenchQuestions:0,numberQuestions:0};
async function check(file){
 const f=await fixture(file),{w,route,flush}=f,$=s=>w.document.querySelector(s);
 try{
  assert.ok(w.eval('Boolean(family)'),'family boot');
  route('#weeks');assert.equal(w.document.querySelectorAll('.trail-card').length,12,'week overview works from every entry point');
  for(const index of [64,72,80,88]){route('#page/0-'+index);assert.ok($('#reader-image'),'legacy page '+index);assert.equal(w.eval('reader.ids[reader.index]'),'1-'+(index-63),'legacy page maps to the correct second-file page');}
  route('#week/0');assert.ok(!/verrouill/i.test($('main h1').textContent),'first week must open');
  route('#week/1');assert.match($('main h1').textContent,/verrouill/i,'next week remains locked');
  w.eval("state.lastPage='en-119'");route('#library');assert.equal(w.document.querySelectorAll('#library-grid a').length,98,'French library default excludes guide and English');
  assert.match($('main a.btn').getAttribute('href'),/^#page\/[01]-/,'resume stays in the French book');
  w.eval("setAppLanguage('ar')");assert.equal(w.document.documentElement.lang,'ar');assert.equal(w.document.documentElement.dir,'rtl');
  w.eval("setAppLanguage('fr')");assert.equal(w.document.documentElement.dir,'ltr');
  route('#settings');$('#large-type').checked=true;$('#large-type').dispatchEvent(new w.Event('change'));
  assert.equal(w.eval('ensureLearning().settings.size'),'large');assert.ok(w.document.body.classList.contains('large-reading'));
  $('#high-contrast').checked=true;$('#high-contrast').dispatchEvent(new w.Event('change'));assert.ok(w.document.body.classList.contains('high-contrast'));
  assert.ok(w.eval('validFamily(familySnapshot())'),'settings survive export validation');
  route('#english/welcome-actions/book');assert.ok($('#reader-image'));assert.ok(!$('#reader-image').getAttribute('src').includes('undefined'));
  route('#english/review-one');assert.ok($('main h1'));
  route('#english/playtime-toys');assert.ok($('main h1'));
  route('#english/school-lesson-3');for(const el of w.document.querySelectorAll('[data-en-model]'))el.click();
  // A stopped recording must not be restarted by a stale rejection.
  route('#english');w.enSpeak('Are they twins?');w.stopSpeech();
  assert.ok(f.audio.every(src=>src&&fs.existsSync(path.join(__dirname,'..',new URL(src,w.location.href).pathname))), 'audio paths resolve');
  const en=w.eval('ENGLISH');assert.equal(en.lessons.length,53);assert.ok(en.vocab.bat&&en.vocab.scooter);
  const units=new Set(en.units.map(u=>u.id));assert.ok(en.lessons.every(l=>units.has(l.unit)));
  for(const q of en.questions){if(!['oral','repeat','action','dialogue'].includes(q.kind)){assert.ok(Array.isArray(q.choices),q.id);assert.ok(q.choices.includes(q.answer),q.id)}}
  result.pages.push({file,testedHash:f.sourceHash,fetches:f.fetches.length,audioChecks:f.audio.length});
  assert.deepEqual(f.errors,[]);
 }finally{f.close()}
}
async function solve(){
 const f=await fixture(),{w,route,flush}=f,$=s=>w.document.querySelector(s);
 try{
  w.eval('for(let i=0;i<12;i++)saveWeekBilan(i,20,20,20)');
  const weeks=w.eval('WEEK_EXERCISES');
  for(let i=0;i<weeks.length;i++)for(let j=0;j<weeks[i].letters.length;j++)for(const r of ['oral','ecrit'])for(const [k,ex] of weeks[i].letters[j][r].entries()){
   const hash=`#atelier/${i}-${j}-${r}-${k}`;route(hash);
   const click=s=>{assert.ok($(s),hash+' '+s);$(s).click()};
   if(ex.type==='circle_identical')ex.bubbles.forEach((b,n)=>{if(b.correct)click(`[data-bubble="${n}"]`)});
   else if(ex.type==='graphies_match')ex.items.forEach((b,n)=>{if(b.correct)click(`[data-graphie="${n}"]`)});
   else if(['audit_hunt','sound_pos'].includes(ex.type))ex.items.forEach((b,n)=>{if(ex.type==='audit_hunt'?b.hasSound:b.isAtPos)click(`[data-audit-card="${n}"]`)});
   else if(ex.type==='syllable_count')click(`[data-syl-count="${ex.correctCount}"]`);
   else if(ex.type==='rhyme_comp')click(`[data-rhyme-opt="${ex.options.findIndex(o=>o.correct)}"]`);
   else if(ex.type==='circle_in_words')ex.cards.forEach((card,n)=>card.targets.forEach(t=>click(`[data-card="${n}"][data-letter="${t}"]`)));
   else if(ex.type==='fill_blank')click(`[data-fill-opt="${ex.target}"]`);
   else assert.equal(ex.type,'write_slate');
   click('#atelier-main-action-btn');
   assert.ok(w.eval(`isAtelierDone(${i},${j},'${r}',${k})`),hash+' completion');
   const earned=w.eval('state.earned.length');click('#atelier-main-action-btn');assert.equal(w.eval('state.earned.length'),earned,'idempotent reward');
   route('#subjects');flush(400);flush(450);flush(1400);flush(200);assert.equal(w.location.hash,'#subjects','stale celebration must not navigate');
   result.workshops++;
  }
  w.eval('state.bilans=[]');
  const bilans=w.eval('WEEK_BILANS');
  for(let week=0;week<12;week++){
   route('#exam/'+week);
   for(const test of bilans[week].tests){
    if(test.type==='write')$('#bilan-submit-write').click();
    else {
     const n=test.options.findIndex(o=>o.correct);assert.ok(n>=0);
     const wrong=test.options.findIndex(o=>!o.correct);const before=w.eval('currentBilanState.score');
     if(wrong>=0){$(`[data-opt="${wrong}"]`).click();assert.equal(w.eval('currentBilanState.score'),before)}
     $(`[data-opt="${n}"]`).click();assert.equal(w.eval('currentBilanState.score'),before+1);
    }
    await finishFeedback(f);
   }
   assert.equal(w.eval(`getWeekBilan(${week}).note20`),20);result.exams++;
  }
  // All English questions are exercised separately, without random extra items.
  w.eval('shuffle = items => [...items]');
  route('#english');
  for(const q of w.eval('ENGLISH.questions')){
   $('#main').innerHTML='<div id="audit-question"></div>';
   w.eval(`startEnglishMission(document.querySelector('#audit-question'),[enQuestions.get(${JSON.stringify(q.id)})],null,{review:true})`);
   if(['action','oral','repeat','dialogue'].includes(q.kind))$('#audit-question [data-en-observe="alone"]').click();
   else {const answer=[...w.document.querySelectorAll('[data-en-answer]')].find(b=>b.dataset.enAnswer===q.answer);assert.ok(answer,q.id);answer.click()}
   assert.ok(w.eval(`ensureEnglish().earned.includes(${JSON.stringify(q.id)})`),q.id+' earned');flush(800);result.englishQuestions++;
  }
  assert.ok(w.eval('validFamily(familySnapshot())'),'completed progress can be exported and restored');
  route('#home');
  for(const q of w.eval('UPGRADE.course.flatMap(l=>l.questions)')){
   $('#main').innerHTML='<div id="audit-french"></div>';
   w.eval(`startMission([UPGRADE.course.flatMap(l=>l.questions).find(q=>q.id===${JSON.stringify(q.id)})],null,document.querySelector('#audit-french'))`);
   if(q.kind==='hunt'){
    for(const button of w.document.querySelectorAll('[data-pick]'))if(q.answer.includes(button.dataset.pick))button.click();$('#mission-check').click();
   }else if(['build','sentence'].includes(q.kind)){
    const remaining=[...w.document.querySelectorAll('[data-tile]')];
    const words=q.kind==='sentence'?q.answer.split(' '):null;
    let assembled='';
    if(words){for(const word of words){const i=remaining.findIndex(b=>q.tiles[+b.dataset.tile]===word);assert.ok(i>=0,q.id);remaining.splice(i,1)[0].click()}}
    else {while(assembled!==q.answer){const i=remaining.findIndex(b=>q.answer.startsWith(assembled+q.tiles[+b.dataset.tile]));assert.ok(i>=0,q.id);const b=remaining.splice(i,1)[0];assembled+=q.tiles[+b.dataset.tile];b.click()}}
    $('#mission-check').click();
   }else {const b=[...w.document.querySelectorAll('[data-answer]')].find(b=>b.dataset.answer===q.answer);assert.ok(b,q.id);b.click()}
   assert.ok(w.eval(`ensureLearning().earned.includes(${JSON.stringify(q.id)})`),q.id+' earned');result.frenchQuestions++;
  }
  route('#numbers');
  for(const q of w.eval('numberQuestions()')){
   $('#main').innerHTML='<div id="audit-number"></div>';
   w.eval(`startNumberMission([numberQuestions().find(q=>q.id===${JSON.stringify(q.id)})],document.querySelector('#audit-number'))`);
   if(q.kind==='basket'){for(const b of [...w.document.querySelectorAll('[data-num-apple]')].slice(0,+q.answer))b.click();$('#number-check').click()}
   else if(q.kind==='order'){for(const value of q.answer.split(',')){const b=[...w.document.querySelectorAll('[data-num-tile]')].find(b=>b.dataset.numTile===value&&!b.disabled);assert.ok(b,q.id);b.click()}$('#number-check').click()}
   else {const b=[...w.document.querySelectorAll('[data-number-answer]')].find(b=>b.dataset.numberAnswer===q.answer);assert.ok(b,q.id);b.click()}
   assert.ok(w.eval(`ensureNumeracy().earned.includes(${JSON.stringify(q.id)})`),q.id+' earned');result.numberQuestions++;
  }
  assert.ok(w.eval('validFamily(familySnapshot())'),'all subject results survive validation');
  const original=w.eval('family.active'),stars=w.eval('state.earned.length'),snapshot=JSON.parse(w.eval('JSON.stringify(familySnapshot())'));
  route('#profiles');$('#profile-name').value='Profil de test';$('#profile-add').click();
  const second=w.eval('family.active');assert.notEqual(second,original);assert.equal(w.eval('state.earned.length'),0,'child progress isolated');
  w.eval(`switchProfile(${JSON.stringify(original)})`);assert.equal(w.eval('state.earned.length'),stars);
  // Restore uses the real import handler and confirmation callback in isolated storage.
  const imported={target:{files:[{size:100,text:async()=>JSON.stringify(snapshot)}],value:'test'}};
  await w.importFamilyEvent(imported);$('#confirm-yes').click();assert.equal(w.eval('family.profiles.length'),snapshot.profiles.length);
  const beforeBad=w.eval('JSON.stringify(familySnapshot())');
  await w.importFamilyEvent({target:{files:[{size:10,text:async()=>'{invalid'}],value:'test'}});
  assert.equal(w.eval('JSON.stringify(familySnapshot())'),beforeBad,'invalid import must preserve progress');
  assert.ok(w.eval('validFamily(familySnapshot())'));
  assert.deepEqual(f.errors,[]);
 }finally{f.close()}
}
(async()=>{
 fs.mkdirSync(path.join(__dirname,'../docs/audit-fonctionnel-2026-11-15'),{recursive:true});
 if(process.argv.includes('--check-entrypoints')){for(const file of ['index.html','courses/francais_cp/index.html','courses/english_starship_1/index.html'])await check(file);fs.writeFileSync(path.join(__dirname,'../docs/audit-fonctionnel-2026-11-15/targeted-retest.json'),JSON.stringify(result.pages,null,2));console.log('✓ Recontrôle ciblé des trois points d’entrée',JSON.stringify(result.pages));return;}
 for(const file of ['index.html','courses/francais_cp/index.html','courses/english_starship_1/index.html'])await check(file);
 await solve();
 fs.writeFileSync(path.join(__dirname,'../docs/audit-fonctionnel-2026-11-15/regressions.json'),JSON.stringify(result,null,2));
 console.log('✓ Régressions :',JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1});
