/* Real DOM integration audit. Storage and media are isolated test doubles;
   decoding and browser interaction are verified separately. */
const fs = require('node:fs');
const path = require('node:path');
const { fixture } = require('./dom-fixture');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs/audit-fonctionnel-2026-11-15');
const pages = ['index.html', 'courses/francais_cp/index.html', 'courses/english_starship_1/index.html'];
const report = { mode: 'jsdom, isolated storage; media playback mocked', pages: [] };
const selectedPage=process.argv.find(arg=>arg.startsWith('--page='))?.slice(7);
if(selectedPage && fs.existsSync(path.join(OUT,'dom-after.json'))) report.pages=JSON.parse(fs.readFileSync(path.join(OUT,'dom-after.json'),'utf8')).pages.filter(p=>p.file!==selectedPage);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function audit(file) {
  const routes = [], buttons = [], links = new Set();
  const base = 'http://audit.local/' + file;
  const backups = {'index.html':'portal.html','courses/francais_cp/index.html':'french.html','courses/english_starship_1/index.html':'english.html'};
  const input = process.argv.includes('--baseline') ? path.join(OUT,'before',backups[file]) : path.join(ROOT,file);
  const f = await fixture(file,{inputFile:input});
  const {w,errors,fetches} = f;
  if (!w.eval('Boolean(family)')) { errors.push('Family boot did not finish'); f.close(); return {file,errors}; }
  const fresh = {};
  for (const hash of ['#week/0','#exam/0','#week/1']) {
    f.route(hash);
    fresh[hash] = { heading:w.document.querySelector('main h1')?.textContent, locked:/verrouill/i.test(w.document.querySelector('main h1')?.textContent||'') };
  }
  // Unlock later weeks in the disposable fixture to reach all lessons.
  w.eval('for(let i=0;i<12;i++)saveWeekBilan(i,20,20,20)');
  const queue = ['#subjects','#weeks','#home','#games','#settings','#review','#alphabet','#numbers','#library','#guide','#progress','#parent','#profiles','#family','#coverage','#workshop/all','#about','#english','#english/book','#english/games','#english/review','#english/progress','#english/settings','#english/classroom','#classe'];
  const weeks = w.eval('WEEK_EXERCISES');
  for(let i=0;i<12;i++) {
    queue.push(`#week/${i}`,`#exam/${i}`);
    weeks[i].letters.forEach((l,j)=>['oral','ecrit'].forEach(r=>l[r].forEach((_,k)=>queue.push(`#atelier/${i}-${j}-${r}-${k}`))));
  }
  const english = w.eval('ENGLISH');
  for(const l of english.lessons) for(const view of ['discover','book','listen','game','talk','adult']) queue.push(`#english/${l.id}/${view}`);
  for(const l of w.eval('UPGRADE.course')) for(const view of ['discover','book','listen','game','write','adult']) queue.push(`#lesson/${l.id}/${view}`);
  const visited = new Set();
  while(queue.length && visited.size<1800) {
    const hash=queue.shift(); if(visited.has(hash)||hash==='#main'||hash==='#')continue; visited.add(hash);
    const before=errors.length;
    try {
      f.route(hash);
      const main=w.document.querySelector('main');
      const heading=main?.querySelector('h1,h2')?.textContent?.trim()||'';
      if(!main?.textContent.trim())throw new Error('Empty main');
      const missing=[];
      for(const el of w.document.querySelectorAll('[src],a[href],link[href]')) {
        const raw=el.getAttribute('src')||el.getAttribute('href'); if(!raw||/^(data:|blob:|https?:|mailto:|javascript:)/.test(raw))continue;
        const url=new URL(raw,base);
        if(!fs.existsSync(path.join(ROOT,decodeURIComponent(url.pathname))))missing.push(raw);
        if(el.tagName==='A') {
          links.add(url.pathname+url.hash);
          if(url.pathname===new URL(base).pathname&&url.hash)queue.push(url.hash);
        }
      }
      routes.push({hash,heading,missing:[...new Set(missing)],errors:errors.slice(before)});
      // Click each audio control; deliberately leave scoring/import/delete controls alone.
      const audioControls=[...main.querySelectorAll('button')].filter(b=>/écouter|listen|🔊|audio|speak|replay/i.test(b.textContent+' '+b.getAttribute('aria-label')+' '+b.id));
      for(const b of audioControls) {
        const n=errors.length;
        try{b.click();buttons.push({hash,label:(b.textContent||b.id).trim().slice(0,100),errors:errors.slice(n)});}catch(e){errors.push(`${hash}: ${e.message}`)}
      }
      w.stopSpeech();
    }catch(e){routes.push({hash,error:e.stack})}
  }
  // Trigger both recording maps directly, in addition to rendered controls.
  for(const text of Object.keys(w.eval('ENGLISH.audio||{}'))) { w.enSpeak(text); w.stopSpeech(); }
  for(const text of Object.keys(w.eval('UPGRADE.audio||{}'))) { w.speak(text); w.stopSpeech(); }
  const audio=f.audio.filter(Boolean).map(src=>({src,exists:fs.existsSync(path.join(ROOT,decodeURIComponent(new URL(src,base).pathname)))}));
  const brokenDestinations=routes.filter(r=>/introuvable|not found/i.test(r.heading||'') && links.has(new URL(base).pathname+r.hash)).map(r=>r.hash);
  const data={file,testedHash:f.sourceHash,brokenDestinations,environmentLimitations:[...new Set(f.limitations)],fresh,routes,buttons,links:[...links],fetches,audioCalls:audio.length,missingAudio:[...new Map(audio.filter(a=>!a.exists).map(a=>[a.src,a])).values()],errors:[...new Set(errors)]};
  f.close(); return data;
}
(async()=>{
  for(const file of pages.filter(file=>!selectedPage||file===selectedPage)) { const result=await audit(file); report.pages.push(result); console.log(file,JSON.stringify({routes:result.routes?.length,buttons:result.buttons?.length,fresh:result.fresh,errors:result.errors?.length,missingAudio:result.missingAudio?.length})); fs.mkdirSync(OUT,{recursive:true}); fs.writeFileSync(path.join(OUT,process.argv.includes('--baseline')?'dom-before.json':'dom-after.json'),JSON.stringify(report,null,2)); }
  fs.mkdirSync(OUT,{recursive:true}); const name=process.argv.includes('--baseline')?'dom-before.json':'dom-after.json'; fs.writeFileSync(path.join(OUT,name),JSON.stringify(report,null,2));
  const failed=report.pages.some(p=>p.errors.length||p.brokenDestinations?.length||p.missingAudio?.length||p.routes?.some(r=>r.error||r.missing?.length)||p.fetches?.some(f=>!f.ok)||p.fresh?.['#week/0'].locked||p.fresh?.['#exam/0'].locked);
  process.exitCode=failed?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
