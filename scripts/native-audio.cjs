// Local Windows compatibility output. Only the site's hashed recordings are accepted.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const token = crypto.randomBytes(32).toString('hex');
const available = process.platform === 'win32' && spawnSync('ffmpeg', ['-version'], {windowsHide:true, stdio:'ignore'}).status === 0;
const jobs = new Map();
let active;
function stop(job) {
  if (!job || ['ended','error','stopped'].includes(job.state)) return;
  job.state = 'stopped';
  if (job.child) job.child.kill();
}
function run(job, executable, args, playing, env) {
  return new Promise((resolve,reject) => {
    if(job.state === 'stopped') return resolve();
    const child = job.child = spawn(executable,args,{windowsHide:true,stdio:['ignore','pipe','pipe'],env:env||process.env});
    let error = '';
    child.stderr.on('data',data=>{error=(error+data).slice(-2000)});
    child.stdout.on('data',data=>{if(playing && String(data).includes('playing') && job.state!=='stopped') job.state='playing'});
    const timeout=setTimeout(()=>{child.kill();reject(Error('Délai de lecture dépassé'))},120000);
    child.on('error',err=>{clearTimeout(timeout);reject(err)});
    child.on('close',code=>{clearTimeout(timeout);job.child=null;code===0||job.state==='stopped'?resolve():reject(Error(error||'Lecteur Windows indisponible'))});
  });
}
async function play(job, file, rate) {
  try {
    const input = path.join(root,'assets',file);
    const real = await fs.promises.realpath(input);
    if(path.dirname(real).toLowerCase() !== path.join(root,'assets').toLowerCase()) throw Error('Fichier interdit');
    const cache=path.join(root,'scratch','native-audio-cache');
    await fs.promises.mkdir(cache,{recursive:true});
    const output=path.join(cache,file.replace('.mp3',`-${rate}.wav`));
    if(!fs.existsSync(output)) {
      const temporary=output+'.'+job.id+'.wav';
      try {
        await run(job,'ffmpeg',['-hide_banner','-loglevel','error','-y','-i',input,'-af',`atempo=${rate}`,'-acodec','pcm_s16le','-ar','44100',temporary]);
        if(job.state==='stopped') return;
        await fs.promises.rename(temporary,output);
      } finally { await fs.promises.rm(temporary,{force:true}).catch(()=>{}); }
    }
    // Invoke the fixed commands directly, just like the audible Windows test.
    // The recording path is data in the environment, never PowerShell source.
    const command=await fs.promises.readFile(path.join(__dirname,'play-wav.ps1'),'utf8');
    await run(job,'powershell.exe',['-NoProfile','-NonInteractive','-Command',command],true,{...process.env,CP_RECORDED_AUDIO:output});
    if(job.state!=='stopped') job.state='ended';
  } catch(error) { if(job.state!=='stopped'){job.state='error';job.error=error.message;} }
}
function handle(req,res) {
  const url = new URL(req.url,'http://localhost');
  if(!url.pathname.startsWith('/api/audio/')) return false;
  const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
  const expected='http://'+req.headers.host;
  const host=(req.headers.host||'').split(':')[0];
  if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||!['127.0.0.1','localhost'].includes(host)|| (req.headers.origin && req.headers.origin!==expected) || req.headers['sec-fetch-site']==='cross-site') {reply(403,{error:'Origine interdite'});return true;}
  if(url.pathname==='/api/audio/capabilities' && req.method==='GET') {reply(200,{available,token:available?token:null});return true;}
  if(req.headers['x-cp-audio-token']!==token){reply(403,{error:'Jeton requis'});return true;}
  if(url.pathname==='/api/audio/status' && req.method==='GET') {
    const job=jobs.get(url.searchParams.get('id'));reply(job?200:404,job?{state:job.state,error:job.error}:{error:'Lecture inconnue'});return true;
  }
  if(req.method!=='POST'){reply(405,{error:'Méthode interdite'});return true;}
  let body='';
  req.on('data',chunk=>{body+=chunk;if(body.length>2048)req.destroy()});
  req.on('end',()=>{
    try {
      const data=JSON.parse(body);
      if(!/^[a-zA-Z0-9-]{8,80}$/.test(data.id||'')) throw Error('Identifiant invalide');
      if(url.pathname==='/api/audio/stop'){
        if(jobs.has(data.id)) stop(jobs.get(data.id));
        else jobs.set(data.id,{id:data.id,state:'stopped'});
        while(jobs.size>32)jobs.delete(jobs.keys().next().value);
        reply(200,{state:'stopped'});return;
      }
      if(url.pathname!=='/api/audio/play'||!available) {reply(404,{error:'Lecture indisponible'});return;}
      const match=/^(?:\.\.\/)*assets\/([a-f0-9]{24}\.mp3)$/.exec(data.src||'');
      const rate=Number(data.rate||1);
      if(!match||!Number.isFinite(rate)||rate<0.5||rate>2) throw Error('Enregistrement ou vitesse invalide');
      if(jobs.has(data.id)) throw Error('Identifiant déjà utilisé');
      stop(active);
      const job=active={id:data.id,state:'loading'};jobs.set(job.id,job);
      while(jobs.size>32)jobs.delete(jobs.keys().next().value);
      void play(job,match[1],rate);
      reply(202,{state:job.state});
    } catch(error){reply(400,{error:error.message});}
  });
  return true;
}
module.exports={handle};
