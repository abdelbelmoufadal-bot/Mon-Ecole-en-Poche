const http = require('http');
const fs = require('fs');
const path = require('path');
const nativeAudio = require('./native-audio.cjs');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

const server = http.createServer((req, res) => {
  if (nativeAudio.handle(req, res)) return;
  // CORS & No-Cache pour le développement
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let cleanUrl = req.url.split('?')[0].split('#')[0];
  if (cleanUrl === '/' || cleanUrl === '') {
    cleanUrl = '/index.html';
  }

  let decoded;
  try {
    decoded = decodeURIComponent(cleanUrl);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 - URL invalide');
    return;
  }
  const filePath = path.resolve(ROOT, '.' + decoded);
  const relative = path.relative(ROOT, filePath);

  // Protection contre le path traversal
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 - Accès interdit');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 - Fichier introuvable : ${cleanUrl}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    const headers = {
      'Content-Type': mime,
      'Content-Length': stats.size,
      'Accept-Ranges': 'bytes'
    };
    let start = 0, end = stats.size - 1, status = 200;
    if (req.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!match || (!match[1] && !match[2])) {
        res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` });
        res.end(); return;
      }
      if (!match[1]) start = Math.max(0, stats.size - Number(match[2]));
      else {
        start = Number(match[1]);
        if (match[2]) end = Math.min(end, Number(match[2]));
      }
      if (start > end || start >= stats.size || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
        res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` });
        res.end(); return;
      }
      status = 206;
      headers['Content-Length'] = end - start + 1;
      headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
    }
    res.writeHead(status, headers);
    if (req.method === 'HEAD' || stats.size === 0) { res.end(); return; }

    const stream = fs.createReadStream(filePath, { start, end });
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });
});

if (require.main === module) server.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🚀 SERVEUR LOCAL MON ÉCOLE EN POCHE DÉMARRÉ`);
  console.log(`📡 URL : http://${HOST}:${PORT}`);
  console.log(`📁 Racine servie : ${ROOT}`);
  console.log(`⭐ Support CORS & Lazy Loading JSON activés`);
  console.log(`=======================================================`);
  console.log(`Appuyez sur Ctrl+C pour arrêter le serveur.`);
});
module.exports = { server };
