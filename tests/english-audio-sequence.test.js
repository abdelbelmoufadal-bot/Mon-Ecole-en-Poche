const assert=require('node:assert/strict');
const {fixture}=require('./dom-fixture');
const {settle,finishVoice,finishFeedback}=require('./bilan-audio-helpers');
(async()=>{
 for(const file of ['index.html','courses/francais_cp/index.html','courses/english_starship_1/index.html']){
  const f=await fixture(file),{w,route,flush}=f,$=s=>w.document.querySelector(s);
  try{
   route('#english');
   const question=w.eval("ENGLISH.questions.find(q=>q.kind==='yesno'&&q.answer==='Yes, it is.')");assert.ok(question);
   function mission(q=question){
    $('#main').innerHTML='<div id="test-english-mission"></div>';
    w.eval(`startEnglishMission(document.querySelector('#test-english-mission'),[${JSON.stringify(q)}],null,{review:true})`);
   }
   const answer=()=>{const correct=[...w.document.querySelectorAll('[data-en-answer]')].find(b=>b.dataset.enAnswer===question.answer);assert.ok(correct);correct.click();};
   mission();answer();const initial=f.audio.length+f.utterances.length;
   flush(800);flush(1000);await settle();assert.ok($('#en-question'),'800 ms must not interrupt encouragement');assert.equal($('#en-next').hidden,true);
   await finishVoice(f);assert.equal(f.audio.length+f.utterances.length,initial);flush(500);await settle();
   assert.equal(f.audio.length+f.utterances.length,initial+1,'answer starts after encouragement and silence');
   flush(1000);await settle();assert.ok($('#en-question'),'wait for actual narrator end');
   await finishVoice(f);assert.ok($('#en-question'));flush(1000);await settle();assert.ok(!$('#en-question'),'advance after final pause');
   mission();answer();w.stopSpeech();await settle();flush(500);flush(1000);assert.ok($('#en-question'));assert.equal($('#en-next').hidden,false);
   $('#en-next').click();assert.ok(!$('#en-question'),'Continue is available after cancellation');
   mission();answer();await finishVoice(f);$('#en-pause').click();flush(500);flush(1000);await settle();assert.ok($('.pause-panel'));assert.ok(!$('#en-audio-status'));
   $('#en-resume').click();assert.ok($('#en-question'));
   answer();$('#en-listen').click();const afterListen=f.audio.length+f.utterances.length;flush(500);flush(1000);await settle();
   assert.ok($('#en-question'));assert.equal($('#en-next').hidden,false,'Listen cancels transition and leaves Continue');assert.equal(f.audio.length+f.utterances.length,afterListen,'old sequence cannot restart another voice');
   mission();answer();$('#en-help').click();await settle();flush(500);flush(1000);assert.equal($('#en-next').hidden,false,'help cannot strand the child after clearing feedback');
   // Long synthetic phrases wait for onend, never an estimated duration.
   const speech=w.eval('enSpeak("A synthetic phrase used only for this test.")');let ended=false;speech.then(value=>{ended=value;});
   flush(5040);await settle();assert.equal(ended,false);await finishVoice(f);assert.equal(await speech,true);
   const stopped=w.eval('enSpeak("Another synthetic phrase used only for this test.")');w.stopSpeech();assert.equal(await stopped,false);
   const repeated=w.eval('enSpeak("grandfather",{practice:true})');let repetitionsEnded=false;repeated.then(value=>{repetitionsEnded=value;});
   await finishVoice(f);assert.equal(repetitionsEnded,false);flush(3000);await settle();await finishVoice(f);flush(3000);await settle();await finishVoice(f);assert.equal(await repeated,true);
   mission();answer();route('#english/book');const before=f.audio.length+f.utterances.length;flush(500);flush(1000);await settle();assert.ok($('#reader-image')||$('#en-book-host'));assert.equal(f.audio.length+f.utterances.length,before);
   assert.deepEqual(f.errors,[]);
   console.log('✓ English : voix successives, fin réelle, Stop, Listen, Pause, aide, répétitions et navigation : '+file);
  }finally{f.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1});
