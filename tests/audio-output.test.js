const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fixture } = require('./dom-fixture');
(async () => {
  for (const file of ['index.html','courses/francais_cp/index.html','courses/english_starship_1/index.html']) {
    const f = await fixture(file), w = f.w;
    try {
      w.eval(`window.audioConnections=0; _sharedAudioCtx={state:'running',destination:{},createMediaElementSource(audio){return {connect(){window.audioConnections++}}}}`);
      const first=w.getGlobalAudioPlayer(),second=w.getGlobalAudioPlayer();
      assert.equal(first,second);assert.equal(w.audioConnections,0,'native output must remain independent of the effects context');
      assert.equal(first.muted,false);assert.equal(first.volume,1);
      for(const text of ['grandfather','father',"He's my father."]){
        w.eval(`enSpeak(${JSON.stringify(text)})`);
        const src=first.getAttribute('src');assert.ok(src,text);
        assert.ok(fs.existsSync(path.join(__dirname,'..',new URL(src,w.location.href).pathname)),src);
        first.dispatchEvent(new w.Event('playing'));
        f.flush(8000);
        assert.equal(w.eval('currentAudio'),first,'a started recording must not be replaced by a watchdog fallback');
        w.stopSpeech();
      }
      assert.equal(w.audioConnections,0,'recordings must not be routed through the unconfirmed effects output');
      f.route('#english/family-people/discover');
      w.testAudioOutput();
      assert.match(first.getAttribute('src'),/bb08bd8067a0216db3765b63\.mp3$/,'the sound test must play a real recording, not only a chime or delayed TTS');
      w.stopSpeech();
      w.eval('ensureEnglish().repeatCount=3;ensureEnglish().repeatGap=3;enSpeak("grandfather")');
      const singleCount=f.audio.length;
      first.dispatchEvent(new w.Event('ended'));f.flush(3000);
      assert.equal(f.audio.length,singleCount,'a simple click must play once even when practice is configured for three repeats');
      w.eval('enSpeak("grandfather",{practice:true})');
      const practiceCount=f.audio.length;
      first.dispatchEvent(new w.Event('ended'));f.flush(3000);
      assert.equal(f.audio.length,practiceCount+1,'only explicit practice must repeat');
      first.dispatchEvent(new w.Event('ended'));w.stopSpeech();f.flush(3000);
      assert.equal(f.audio.length,practiceCount+1,'Stop must cancel the next scheduled repeat');
      assert.deepEqual(f.errors,[]);
      console.log('✓ Sortie des voix et chemins : '+file);
    } finally {f.close();}
  }
})().catch(error=>{console.error(error);process.exitCode=1});
