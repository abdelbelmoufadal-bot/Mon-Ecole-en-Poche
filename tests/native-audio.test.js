const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const {server}=require('../scripts/serve');
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try {
    const capability=await fetch(base+'/api/audio/capabilities');
    assert.equal(capability.headers.get('access-control-allow-origin'),null);
    const {available,token}=await capability.json();
    assert.equal((await fetch(base+'/api/audio/capabilities',{headers:{Origin:'https://example.com'}})).status,403);
    assert.equal((await fetch(base+'/api/audio/play',{method:'POST',body:'{}'})).status,403);
    if(available){
      const post=(route,body)=>fetch(base+'/api/audio/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-CP-Audio-Token':token,Origin:base},body:JSON.stringify(body)});
      assert.equal((await post('play',{id:'test-traversal',src:'../scripts/serve.js'})).status,400);
      assert.equal((await post('play',{id:'test-invalid-rate',src:'assets/5c57cf5b41a82ac115c44e2e.mp3',rate:9})).status,400);
      assert.equal((await post('stop',{id:'test-stop-before-play'})).status,200);
      assert.equal((await post('play',{id:'test-stop-before-play',src:'assets/5c57cf5b41a82ac115c44e2e.mp3'})).status,400);
      assert.equal((await post('play',{id:'test-missing-file',src:'assets/000000000000000000000000.mp3'})).status,202);
      await new Promise(resolve=>setTimeout(resolve,100));
      const status=await fetch(base+'/api/audio/status?id=test-missing-file',{headers:{'X-CP-Audio-Token':token}});
      assert.equal((await status.json()).state,'error');
    }
    console.log('✓ API locale : origine, jeton, chemins, vitesse, arrêt anticipé et fichier absent.');
  } finally {await new Promise(resolve=>server.close(resolve));}
  const normal=new JSDOM('',{url:'http://127.0.0.1:3130/',runScripts:'outside-only'});
  try {
    let requests=0;normal.window.fetch=()=>{requests++;throw Error('Normal playback must not wait for Windows');};
    normal.window.eval(fs.readFileSync('assets/native-audio.js','utf8'));await normal.window.NativeRecordedAudio.ready;
    assert.equal(normal.window.NativeRecordedAudio.enabled,false);assert.equal(requests,0);
    console.log('✓ Lecture normale : aucun appel ni attente du lecteur Windows.');
  } finally {normal.window.close();}
  const dom=new JSDOM('',{url:'http://127.0.0.1:3130/?audioOutput=windows',runScripts:'outside-only'});
  try {
    const w=dom.window,calls=[];let states=['loading','playing','ended'];
    w.fetch=async(url,options={})=>{
      const body=options.body?JSON.parse(options.body):null;calls.push({url,body});
      return {ok:true,json:async()=>url.endsWith('capabilities')?{available:true,token:'test'}:url.includes('status?')?{state:states.shift()||'ended'}:{state:'loading'}};
    };
    w.eval(fs.readFileSync('assets/native-audio.js','utf8'));await w.NativeRecordedAudio.ready;
    assert.equal(w.NativeRecordedAudio.enabled,true);
    const player=w.NativeRecordedAudio.getPlayer();assert.equal(player,w.NativeRecordedAudio.getPlayer());
    player.src='../../assets/5c57cf5b41a82ac115c44e2e.mp3';player.playbackRate=.9;
    let playing=0,ended=0;player.onplaying=()=>playing++;player.onended=()=>ended++;
    await player.play();await new Promise(resolve=>setTimeout(resolve,200));
    assert.equal(playing,1);assert.equal(ended,1);assert.equal(player.paused,true);
    assert.equal(calls.find(c=>c.url.endsWith('/play')).body.rate,.9);
    states=['playing','playing'];await player.play();const previous=calls.filter(c=>c.url.endsWith('/play')).at(-1).body.id;
    player.pause();assert.ok(calls.some(c=>c.url.endsWith('/stop')&&c.body.id===previous));
    await new Promise(resolve=>setTimeout(resolve,200));assert.equal(ended,1,'stopped playback must not fire ended');
    states=['loading'];const pending=player.play();const rejected=assert.rejects(pending,error=>error.name==='AbortError');player.pause();await rejected;
    player.removeAttribute('src');assert.equal(player.getAttribute('src'),'');
    console.log('✓ Adaptateur : démarrage, fin unique, vitesse et arrêt sans callback tardif.');
  } finally {dom.window.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
