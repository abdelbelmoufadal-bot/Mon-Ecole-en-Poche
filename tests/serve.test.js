const assert = require('node:assert/strict');
const http = require('node:http');
const { server } = require('../scripts/serve');
function request(port, path, headers={}, method='GET') {
  return new Promise((resolve,reject)=>{
    http.request({host:'127.0.0.1',port,path,headers,method},res=>{
      const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
    }).on('error',reject).end();
  });
}
(async()=>{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 try {
  const port=server.address().port;
  assert.equal((await request(port,'/%')).status,400);
  assert.equal((await request(port,'/../CP-other/private.txt')).status,403);
  assert.equal((await request(port,'/does-not-exist.mp3')).status,404);
  const full=await request(port,'/package.json');assert.equal(full.status,200);
  const partial=await request(port,'/package.json',{Range:'bytes=2-9'});
  assert.equal(partial.status,206);assert.deepEqual(partial.body,full.body.subarray(2,10));
  assert.equal((await request(port,'/package.json',{Range:'bytes=999999-'})).status,416);
  assert.equal((await request(port,'/package.json',{},'HEAD')).body.length,0);
  assert.equal((await request(port,'/')).status,200);
  console.log('✓ HTTP : URL malformée, confinement des chemins, 404, HEAD et plages de lecture.');
 } finally {await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1});
