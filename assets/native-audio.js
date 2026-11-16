/* Opt-in Windows recovery output. Normal clicks use the browser immediately. */
(function () {
  'use strict';
  const bridge = window.NativeRecordedAudio = {enabled:false};
  let token, serial=0, generation=0, id=null, timer, pendingReject;
  const api='/api/audio/';
  async function request(route,body) {
    const response=await fetch(api+route,{method:body?'POST':'GET',headers:{'X-CP-Audio-Token':token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,keepalive:!!body});
    const result=await response.json();
    if(!response.ok)throw Error(result.error||'Lecture Windows indisponible');
    return result;
  }
  const player={src:'',playbackRate:1,volume:1,muted:false,currentTime:0,paused:true,
    load(){},
    getAttribute(name){return name==='src'?this.src:null},
    removeAttribute(name){if(name==='src')this.src=''},
    pause(){generation++;clearTimeout(timer);this.paused=true;if(pendingReject){pendingReject(new DOMException('Lecture annulée','AbortError'));pendingReject=null;}if(id){void request('stop',{id}).catch(()=>{});id=null;}},
    play(){
      this.pause();this.paused=false;this.currentTime=0;
      const own=++generation;
      const ownId=id=Date.now().toString(36)+'-'+(++serial)+'-'+Math.random().toString(36).slice(2);
      const started=Date.now();let notified=false;
      return new Promise((resolve,reject)=>{
        pendingReject=reject;
        const fail=error=>{if(own!==generation){reject(new DOMException('Lecture annulée','AbortError'));return;}pendingReject=null;this.paused=true;if(this.onerror)this.onerror(error);reject(error)};
        const poll=async()=>{
          if(own!==generation){reject(new DOMException('Lecture annulée','AbortError'));return;}
          try {
            const status=await request('status?id='+encodeURIComponent(ownId));
            if(own!==generation){reject(new DOMException('Lecture annulée','AbortError'));return;}
            if(status.state==='error')throw Error(status.error);
            if(status.state==='stopped'){this.pause();reject(new DOMException('Lecture annulée','AbortError'));return;}
            if(status.state==='playing'||status.state==='ended') {
              if(!notified){notified=true;pendingReject=null;if(this.onplaying)this.onplaying();resolve();}
              this.currentTime=(Date.now()-started)/1000;
              if(this.ontimeupdate)this.ontimeupdate();
            }
            if(status.state==='ended'){this.paused=true;id=null;if(this.onended)this.onended();return;}
            timer=setTimeout(poll,150);
          }catch(error){fail(error);}
        };
        request('play',{id:ownId,src:this.src,rate:this.playbackRate}).then(poll,fail);
      });
    }
  };
  bridge.getPlayer=()=>player;
  bridge.ready = new URLSearchParams(location.search).get('audioOutput')==='windows'
    && location.protocol==='http:' && ['127.0.0.1','localhost'].includes(location.hostname)
    ? fetch(api+'capabilities').then(r=>r.ok?r.json():{}).then(result=>{token=result.token;bridge.enabled=!!result.available;}).catch(()=>{})
    : Promise.resolve();
  window.addEventListener('pagehide',()=>player.pause());
})();
