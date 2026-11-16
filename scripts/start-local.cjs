const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.CP_SITE_PORT || 3130);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('CP_SITE_PORT invalide.');
const url = `http://127.0.0.1:${port}/`;

if (process.argv.includes('--server')) {
  const { server } = require('./serve');
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1');
} else {
  function probe() {
    return new Promise(resolve => {
      const req = http.get(url + 'package.json', res => {
        let text = '';res.setEncoding('utf8');res.on('data', part => { text += part; });
        res.on('end', () => { try {resolve(JSON.parse(text).name === 'mon-ecole-en-poche');} catch {resolve(false);} });
      });
      req.setTimeout(500, () => req.destroy());req.on('error', () => resolve(false));
    });
  }
  (async () => {
    if (!await probe()) {
      fs.mkdirSync(path.join(root, 'scratch'), { recursive: true });
      const log = fs.openSync(path.join(root, 'scratch/site-local.log'), 'a');
      const child = spawn(process.execPath, [__filename, '--server'], {
        cwd: root, detached: true, windowsHide: true, stdio: ['ignore', log, log], env: process.env
      });
      child.unref();fs.closeSync(log);
      let ready = false;
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        if (await probe()) { ready = true;break; }
      }
      if (!ready) throw Error('Le serveur local ne démarre pas. Consultez scratch/site-local.log.');
    }
    console.log('Mon École en Poche : ' + url);
    console.log('Utilisez cette adresse pour les voix ; gardez vos anciens exports de progression.');
    if (!process.argv.includes('--no-open')) {
      const opener = spawn('cmd.exe', ['/d', '/c', `start "" "${url}"`], { windowsHide: true, stdio: 'ignore' });
      opener.unref();
    }
  })().catch(error => {console.error(error.message);process.exitCode = 1;});
}
