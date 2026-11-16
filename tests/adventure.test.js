const assert=require('node:assert/strict');
const {fixture}=require('./dom-fixture');
const {finishVoice,settle}=require('./bilan-audio-helpers');
(async()=>{
 for(const file of ['index.html','courses/francais_cp/index.html','courses/english_starship_1/index.html']){
  const f=await fixture(file,{viewportWidth:390,viewportHeight:844}),{w,route,flush}=f,$=s=>w.document.querySelector(s);
  try{
   route('#weeks');
   assert.equal(w.document.querySelectorAll('.adventure-chapter').length,3);
   assert.equal(w.document.querySelectorAll('.adventure-stop').length,12);
   assert.equal($('.adventure-start').getAttribute('href'),'#week/0');
   assert.equal(w.document.querySelectorAll('.adventure-week-link[href]').length,1,'locked weeks cannot bypass the assessment');
   $('.adventure-stop.locked button').click();assert.match($('#main').textContent,/verrouill/i);
   route('#weeks');const earned=w.eval('state.earned.length');$('#mascot-speak').click();assert.equal(w.eval('state.earned.length'),earned);
   w.eval('state.bilans[0]={weekId:0,score:10,maxScore:10,note20:20,passed:true,attempts:1}');
   route('#weeks');assert.equal($('.adventure-start').getAttribute('href'),'#week/1');assert.ok($('.adventure-stop.completed'));assert.equal($('.adventure-progress-track').getAttribute('aria-valuenow'),'1');
   route('#atelier/0-0-oral-2');
   w.eval("showEncouragementModal('Bravo ! Tu as trouvé.', '', ()=>{window.testAdvance=(window.testAdvance||0)+1;})");
   assert.equal($('#atelier-continue').hidden,true);
   const spoken=f.audio.length+f.utterances.length;
   flush(1400);flush(200);assert.equal(w.testAdvance,undefined,'old timer never advances');
   assert.equal(f.audio.length+f.utterances.length,spoken,'one encouragement voice, not two');
   await finishVoice(f);flush(500);await settle();assert.equal($('#atelier-continue').hidden,false);assert.equal(w.testAdvance,undefined);
   const button=$('#atelier-continue');button.click();button.click();assert.equal(w.testAdvance,1,'explicit continuation is idempotent');
   w.eval("showEncouragementModal('Bravo !', '', ()=>{window.testAdvance++;})");
   $('#atelier-stop-feedback').click();await settle();assert.equal($('#atelier-continue').hidden,false,'Stop offers manual continuation');
   route('#subjects');await finishVoice(f);flush(500);await settle();assert.equal(w.testAdvance,1,'navigation cancels stale continuation');
   assert.deepEqual(f.errors,[]);
   console.log('✓ Carte des 12 aventures, verrouillage et atelier à validation manuelle : '+file);
  }finally{f.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
