/* Compact mobile shell. Existing controls are moved, never duplicated or rebound. */
(function () {
 'use strict';
 const header=document.querySelector('.topbar'),main=document.getElementById('main');
 if(!header||!main)return;
 const media=matchMedia('(max-width: 700px), (max-width: 950px) and (max-height: 500px)'),moves=[];
 let queued=false,contextNodes=[],contextSignature='',lastQuestion=null,audioObserver=null,observedBar=null;
 const menuButton=document.createElement('button');menuButton.type='button';menuButton.id='cp-menu-toggle';menuButton.className='cp-mobile-button';menuButton.textContent='☰ Menu';menuButton.setAttribute('aria-haspopup','dialog');menuButton.setAttribute('aria-controls','cp-mobile-menu');menuButton.setAttribute('aria-expanded','false');
 const back=document.createElement('button');back.type='button';back.id='cp-mobile-back';back.className='cp-mobile-button';back.textContent='‹';back.setAttribute('aria-label','Retour à la leçon');
 const menu=document.createElement('dialog');menu.id='cp-mobile-menu';menu.className='cp-mobile-menu';menu.setAttribute('aria-labelledby','cp-menu-title');
 menu.innerHTML='<div class="cp-menu-heading"><strong id="cp-menu-title">Menu</strong><button type="button" class="cp-menu-close" aria-label="Fermer le menu">✕</button></div><div class="cp-menu-content"></div>';
 const menuContent=menu.querySelector('.cp-menu-content');
 const context=document.createElement('div');context.className='cp-menu-context';context.setAttribute('role','navigation');context.setAttribute('aria-label','Étapes de la leçon');menuContent.append(context);
 header.prepend(back);header.append(menuButton,menu);
 function closeMenu(restoreFocus=false){if(menu.open)menu.close();menuButton.setAttribute('aria-expanded','false');if(restoreFocus)menuButton.focus();}
 menuButton.onclick=()=>{if(menu.open){closeMenu(true);return;}menu.showModal();menuButton.setAttribute('aria-expanded','true');};
 menu.querySelector('.cp-menu-close').onclick=()=>closeMenu(true);
 menu.addEventListener('close',()=>menuButton.setAttribute('aria-expanded','false'));
 menu.addEventListener('click',event=>{if(event.target===menu){const r=menu.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeMenu(true);}if(event.target.closest('a[href],[data-lang],[data-en-length]'))closeMenu();});
 back.onclick=()=>{
  const parts=location.hash.slice(1).split('/');let href;
  if(['atelier','bilan','exam'].includes(parts[0]))href='#week/'+String(parts[1]||'0').split('-')[0];
  else if(parts[0]==='english'&&parts.length>2&&parts[2]!=='discover')href='#english/'+parts[1]+'/discover';
  else href=main.querySelector('.breadcrumb a:last-of-type,.crumb a:last-of-type')?.getAttribute('href')||(parts[0]==='english'?'#english':'#weeks');
  if(href)location.href=href;
 };
 function move(node){
  if(!node||moves.some(item=>item.node===node))return;
  const marker=document.createComment('mobile-control');node.before(marker);moves.push({node,marker});menuContent.append(node);
 }
 function syncMoves(){
  for(let i=moves.length-1;i>=0;i--){const item=moves[i];if(!item.marker.isConnected){item.node.remove();moves.splice(i,1);}}
  if(media.matches){
   for(const selector of ['#app-nav','.sound-test-btn','.lang-switcher','#total-stars','#profile-pill'])move(header.querySelector(selector));
   move(main.querySelector('.en-mission-length'));
   move(main.querySelector('#en-rate')?.closest('label'));
  }else{
   closeMenu();
   for(const {node,marker} of moves)if(marker.isConnected)marker.replaceWith(node);
   moves.length=0;
  }
 }
 function syncContext(){
  const week=main.querySelector('.cp-week-journey');
  const nodes=week?[...week.querySelectorAll('[data-week-step]')]:[...main.querySelectorAll('.en-tabs a[href]')];
  const title=main.querySelector('h1')?.textContent||'';
  const signature=title+nodes.map(node=>node.textContent+'|'+node.getAttribute('aria-current')+'|'+node.className).join('');
  document.body.classList.toggle('cp-mobile-week-context',Boolean(week&&nodes.length));
  document.body.classList.toggle('cp-mobile-lesson-context',Boolean(!week&&nodes.length));
  if(signature===contextSignature&&nodes.length===contextNodes.length&&nodes.every((node,i)=>node===contextNodes[i]))return;
  contextSignature=signature;contextNodes=nodes;context.replaceChildren();
  if(!nodes.length)return;
  const heading=document.createElement('p');heading.textContent=title;context.append(heading);
  nodes.forEach(source=>{
   const control=document.createElement(source.tagName==='A'?'a':'button');
   if(control.tagName==='A')control.setAttribute('href',source.getAttribute('href'));
   else{control.type='button';control.onclick=()=>{source.click();closeMenu(true);main.querySelector('.cp-stage:not([hidden])')?.scrollIntoView({block:'start',behavior:'auto'});};}
   control.textContent=source.textContent.trim().replace(/\s+/g,' ');
   if(source.getAttribute('aria-current')||source.classList.contains('active'))control.setAttribute('aria-current','step');
   context.append(control);
  });
 }
 function english(){return document.body.classList.contains('english-course');}
 function syncAudio(){
  const bar=document.getElementById('narrator-bar');if(!bar)return;
  if(!bar.querySelector('#cp-mobile-replay')){
   const replay=document.createElement('button');replay.type='button';replay.id='cp-mobile-replay';replay.className='cp-mobile-audio-button';
   replay.onclick=()=>{
    if(english()&&typeof replayEnglish==='function'){replayEnglish(false);return;}
    const caption=document.getElementById('narrator-caption')?.textContent||'';
    const sound=/^Son de la graphie «\s*(.*?)\s*»$/.exec(caption);
    if(sound&&typeof playPhoneme==='function')playPhoneme(sound[1]);else if(typeof speak==='function')speak(caption);
   };
   const options=document.createElement('button');options.type='button';options.id='cp-audio-options';options.className='cp-mobile-audio-button';options.textContent='Options';options.setAttribute('aria-expanded','false');
   options.onclick=()=>{const open=bar.classList.toggle('cp-audio-expanded');options.setAttribute('aria-expanded',String(open));schedule();};
   const status=document.createElement('span');status.id='cp-mobile-audio-status';
   const french=document.createElement('div');french.id='cp-mobile-fr-options';french.innerHTML='<label>Vitesse de lecture<select aria-label="Vitesse de lecture"><option value="0.8">Très lente</option><option value="0.9">Lente</option><option value="1">Normale</option><option value="1.1">Rapide</option></select></label>';
   french.querySelector('select').onchange=event=>{if(typeof ensureLearning==='function'){ensureLearning().settings.rate=+event.target.value;if(typeof currentAudio!=='undefined'&&currentAudio)currentAudio.playbackRate=+event.target.value;save();}};
   bar.append(replay,options,status,french);
  }
  const en=english(),replay=bar.querySelector('#cp-mobile-replay'),options=bar.querySelector('#cp-audio-options'),status=bar.querySelector('#cp-mobile-audio-status'),french=bar.querySelector('#cp-mobile-fr-options');
  const replayLabel=en?'Replay':'Rejouer';if(replay.textContent!==replayLabel)replay.textContent=replayLabel;
  options.setAttribute('aria-controls',en?'en-repeat-controls':'cp-mobile-fr-options');
  const shortStatus=en?(bar.querySelector('#en-play-status')?.textContent||'').replace(/^Listen (\d+) of (\d+)\.$/,'Listen $1/$2').replace(/^Your turn.*$/,'Your turn'):'';
  if(status.textContent!==shortStatus)status.textContent=shortStatus;
  if(french.hidden!==en)french.hidden=en;
  if(!en&&typeof ensureLearning==='function')french.querySelector('select').value=String(ensureLearning().settings.rate);
  if(observedBar!==bar){
   audioObserver?.disconnect();observedBar=bar;audioObserver=new MutationObserver(schedule);audioObserver.observe(bar,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
   if(typeof ResizeObserver==='function')new ResizeObserver(updateAudioSpace).observe(bar);
  }
  updateAudioSpace();
 }
 function updateAudioSpace(){
  const bar=document.getElementById('narrator-bar');
  const height=media.matches&&bar&&!bar.hidden&&getComputedStyle(bar).position==='fixed'?Math.ceil(bar.getBoundingClientRect().height)+12:0;
  const value=height+'px';if(document.body.style.getPropertyValue('--cp-audio-space')!==value)document.body.style.setProperty('--cp-audio-space',value);
 }
 function refresh(){
  queued=false;if(!header.isConnected||!main.isConnected)return;syncMoves();syncContext();
  const labels=document.documentElement.lang==='ar'?{menu:'القائمة',close:'إغلاق القائمة',back:'العودة إلى الدرس'}:english()?{menu:'Menu',close:'Close menu',back:'Back to lesson'}:{menu:'Menu',close:'Fermer le menu',back:'Retour à la leçon'};
  if(menuButton.textContent!=='☰ '+labels.menu)menuButton.textContent='☰ '+labels.menu;
  if(menu.querySelector('#cp-menu-title').textContent!==labels.menu)menu.querySelector('#cp-menu-title').textContent=labels.menu;
  menu.querySelector('.cp-menu-close').setAttribute('aria-label',labels.close);back.setAttribute('aria-label',labels.back);
  const active=Boolean(main.querySelector('.en-game,.bilan-container,.atelier-container,.cp-week-journey'))||/^#(?:atelier|bilan|exam|lesson\/\d+\/(?:game|listen)|english\/[^/]+\/(?:mission|speak|discover|talk))/.test(location.hash);
  document.body.classList.toggle('cp-mobile-activity',active);
  const h1=main.querySelector(':scope > h1');
  let heading=main.querySelector(':scope > .cp-mobile-context');
  if(h1){if(!heading){heading=document.createElement('p');heading.className='cp-mobile-context';h1.before(heading);}if(heading.textContent!==h1.textContent)heading.textContent=h1.textContent;}
  const hero=main.querySelector('.portal-hero-left');
  if(hero&&!hero.querySelector('.cp-mobile-portal-title')){const title=document.createElement('h1');title.className='cp-mobile-portal-title';title.textContent=document.documentElement.lang==='ar'?'مغامراتي التعليمية':document.documentElement.lang==='en'?'My learning adventure':'Mes aventures de CP';hero.querySelector('.portal-title')?.after(title);}
  if(hero&&!hero.querySelector('.cp-mobile-intro')){const intro=document.createElement('p');intro.className='cp-mobile-intro';intro.textContent=document.documentElement.lang==='ar'?'اختر مادتك لتبدأ.':document.documentElement.lang==='en'?'Choose a subject to begin.':'Choisis ta matière pour commencer.';hero.append(intro);}
  const words=main.querySelector('.en-word-grid');
  if(words&&!words.previousElementSibling?.classList.contains('cp-mobile-vocab-note')){const note=document.createElement('p');note.className='cp-mobile-vocab-note';note.textContent='Tap a card to listen.';words.before(note);}
  syncAudio();
  const question=main.querySelector('#en-question,.bilan-prompt-text,.atelier-prompt-title');
  if(question!==lastQuestion){lastQuestion=question;if(question&&media.matches&&!menu.open)requestAnimationFrame(()=>{if(question.isConnected)(question.closest('.en-game,.bilan-container,.atelier-container')||question).scrollIntoView({block:'start',behavior:'auto'});});}
 }
 function schedule(){if(!queued){queued=true;queueMicrotask(refresh);}}
 new MutationObserver(schedule).observe(header,{childList:true,subtree:true});
 new MutationObserver(schedule).observe(main,{childList:true,subtree:true});
 new MutationObserver(schedule).observe(document.body,{childList:true});
 new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
 if(media.addEventListener)media.addEventListener('change',schedule);else if(media.addListener)media.addListener(schedule);
 addEventListener('hashchange',()=>{closeMenu();observedBar?.classList.remove('cp-audio-expanded');document.getElementById('cp-audio-options')?.setAttribute('aria-expanded','false');schedule();});
 addEventListener('resize',schedule);
 refresh();
})();
