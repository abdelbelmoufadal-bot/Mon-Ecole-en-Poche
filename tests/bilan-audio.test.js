const assert=require('node:assert/strict');
const {fixture}=require('./dom-fixture');
const {settle,finishVoice,finishFeedback}=require('./bilan-audio-helpers');
(async()=>{
 for(const file of ['index.html','courses/francais_cp/index.html','courses/english_starship_1/index.html']){
  const f=await fixture(file),{w,route,flush}=f,$=s=>w.document.querySelector(s);
  const step=()=>w.eval('currentBilanState.stepIndex');
  const correct=()=>{const i=w.eval('WEEK_BILANS[0].tests[currentBilanState.stepIndex].options.findIndex(o=>o.correct)');$(`[data-opt="${i}"]`).click();};
  try{
   route('#bilan/0');correct();
   const voicesBefore=f.audio.length+f.utterances.length;
   flush(350);flush(1200);await settle();
   assert.equal(step(),0,'the old 1.2s timer must not advance while encouragement speaks');
   assert.equal(f.audio.length+f.utterances.length,voicesBefore,'pending initial prompt must not interrupt encouragement');
   await finishVoice(f);assert.equal(step(),0);
   assert.ok([...f.timers.values()].some(t=>t.ms===500),'pause starts only after actual encouragement end');
   flush(500);await settle();
   assert.equal(f.audio.length+f.utterances.length,voicesBefore+1,'narrator starts after the pause');
   flush(1000);await settle();assert.equal(step(),0,'no transition before narrator end');
   await finishVoice(f);assert.equal(step(),0);flush(1000);await settle();assert.equal(step(),1);
   correct();const score=w.eval('currentBilanState.score');correct();assert.equal(w.eval('currentBilanState.score'),score,'score remains idempotent');
   w.stopSpeech();await settle();flush(500);flush(1000);flush(350);await settle();assert.equal(step(),1,'Stop cancels every pending transition');
   assert.equal($('#bilan-next-question').hidden,false,'manual recovery after Stop');$('#bilan-next-question').click();assert.equal(step(),2);
   correct();await finishVoice(f);w.stopSpeech();flush(500);flush(1000);await settle();assert.equal(step(),2,'Stop also cancels silence between voices');
   route('#week/0');flush(350);flush(500);flush(1000);await settle();assert.equal(w.location.hash,'#week/0');assert.ok($('.cp-week-journey'));
   route('#bilan/0');w.stopSpeech();const count=f.audio.length+f.utterances.length;flush(350);await settle();assert.equal(f.audio.length+f.utterances.length,count,'Stop cancels initial prompt too');
   // Synthetic voices must complete on onend rather than an estimated duration.
   w.eval("ensureLearning().settings.voice='system'");route('#bilan/0');correct();
   flush(500);flush(1200);await settle();assert.equal(step(),0);await finishFeedback(f);assert.equal(step(),1);
   // An error offers manual continuation and never auto-grades the next question.
   correct();f.utterances.at(-1).onerror();await settle();flush(500);flush(1000);assert.equal(step(),1);assert.equal($('#bilan-next-question').hidden,false);
   // Writing follows the same ordered sequence.
   route('#bilan/0');
   w.eval("ensureLearning().settings.voice='recorded';WEEK_BILANS[0].tests[0]={type:'write',letter:'a',prompt:'Trace la lettre a.',say:'Trace la lettre a.'};renderBilanStep()");
   const writeStep=step();$('#bilan-submit-write').click();assert.equal(step(),writeStep);flush(1200);assert.equal(step(),writeStep);await finishFeedback(f);assert.equal(step(),writeStep+1);
   assert.deepEqual(f.errors,[]);
   console.log('✓ Bilan : fin réelle des deux voix, pauses, Stop, erreur, navigation et écriture : '+file);
  }finally{f.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1});
