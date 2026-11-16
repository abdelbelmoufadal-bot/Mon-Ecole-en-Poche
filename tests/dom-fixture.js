const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname,'..');
async function fixture(file='index.html', {offline=false,inputFile}={}) {
 const errors=[],audio=[],utterances=[],fetches=[],limitations=[],timers=new Map();let timerId=0;
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.message==='Not implemented: navigation to another Document')limitations.push(e.message);else errors.push(e.message)});
 const raw=fs.readFileSync(inputFile || path.join(ROOT,file),'utf8');
 const sourceHash=crypto.createHash('sha256').update(raw).digest('hex');
 const source=raw.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<script src="(?:\.\.\/)*assets\/week-journey\.js"><\/script>/g,()=>'<script>'+fs.readFileSync(path.join(ROOT,'assets/week-journey.js'),'utf8')+'</script>');
 const dom=new JSDOM(source,{url:'http://audit.local/'+file,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.HTMLElement.prototype.setPointerCapture=()=>{};w.HTMLElement.prototype.releasePointerCapture=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.setTimeout=(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id};w.clearTimeout=id=>timers.delete(id);
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(o,k)=>k==='measureText'?()=>({width:10}):()=>{}});
  w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/png;base64,AA==';
  w.SVGElement.prototype.getTotalLength=()=>100;w.SVGElement.prototype.getPointAtLength=n=>({x:n,y:n});
  w.HTMLMediaElement.prototype.play=function(){audio.push(this.getAttribute('src'));return Promise.resolve()};
  w.HTMLMediaElement.prototype.pause=()=>{};w.HTMLMediaElement.prototype.load=()=>{};
  w.Audio=function(src){const el=w.document.createElement('audio');if(src)el.src=src;return el};
  w.speechSynthesis={cancel(){},resume(){},getVoices(){return[]},speak(utterance){utterances.push(utterance)}};w.SpeechSynthesisUtterance=function(text){this.text=text};
  w.URL.createObjectURL=()=> 'blob:audit';w.URL.revokeObjectURL=()=>{};
  w.fetch=async raw=>{if(offline)throw Error('Offline test');const url=new URL(raw,w.location.href),file=path.join(ROOT,decodeURIComponent(url.pathname)),ok=fs.existsSync(file);fetches.push({path:url.pathname,ok});return {ok,json:async()=>JSON.parse(fs.readFileSync(file,'utf8'))}};
  w.addEventListener('error',e=>errors.push(e.error?.stack||e.message));
 }});
 const w=dom.window;
 await new Promise(resolve=>setTimeout(resolve,30));
 function route(hash){w.history.replaceState({},'',hash);w.route();}
 function flush(ms){for(const [id,t] of [...timers])if(t.ms===ms){timers.delete(id);t.fn()}}
 return {w,errors,audio,utterances,fetches,limitations,timers,route,flush,sourceHash,close:()=>w.close()};
}
module.exports={fixture};
