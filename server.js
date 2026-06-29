/**
 * Jacob Teng Portfolio — Server with Cloudinary
 * Run: node server.js
 * Portfolio: http://localhost:3000
 * Admin:     http://localhost:3000/admin.html
 */

const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');
const https = require('https');

const PORT    = process.env.PORT || 3000;
const DIR     = __dirname;
const DB_FILE = path.join(DIR, 'db.json');

/* ── Cloudinary config ── */
const CLOUD_NAME   = 'da28fgw5i';
const CLOUD_KEY    = '177289537144266';
const CLOUD_SECRET = '_8NhXZi8DhxWDHFgKQB-VB6J_Zg';

const MIME = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.png':'image/png','.gif':'image/gif','.webp':'image/webp',
  '.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2',
};

/* ── Default DB ── */
const DEFAULT_DB = {
  homepageGallery: 'Jack Stadlman',
  galleries: [
    { title:'Jack Stadlman',             images:[] },
    { title:'Faves (Ongoing)',            images:[] },
    { title:'Los Angeles Grand Prix',     images:[] },
    { title:'Jahsai Sommerville',         images:[] },
    { title:'Soundrunning Track Fest',    images:[] },
    { title:'Jacob Bayla',               images:[] },
    { title:'District Vision',            images:[] },
    { title:'Mahershala Ali – Interview', images:[] },
    { title:'Walt Siegl',                 images:[] },
    { title:'Zion – Jordan Brand',        images:[] },
    { title:'Apex',                       images:[] },
    { title:'Michael Kelly – Interview',  images:[] },
    { title:'Oakville Youth Rodeo',       images:[] },
    { title:'Silver Lining',              images:[] },
  ],
  info:{
    ig:'@jtphoto._',
    igUrl:'https://www.instagram.com/jtphoto._/',
    email:'jacobteng00@gmail.com',
    about:'Documentary and commercial photographer based in Los Angeles.\n\nAvailable for editorial, brand, and personal projects worldwide.',
    clients:'Banditrunning, TheRunnersCentral, Soundrunning, Flotrack, Joopiter, Brooks Running',
  }
};

/* ── DB ── */
function loadDB(){
  try {
    const raw = JSON.parse(fs.readFileSync(DB_FILE,'utf8'));
    if(raw && raw.galleries) return raw;
  } catch {}
  saveDB(DEFAULT_DB);
  return JSON.parse(JSON.stringify(DEFAULT_DB));
}
function saveDB(d){ fs.writeFileSync(DB_FILE, JSON.stringify(d,null,2),'utf8'); }

/* ── Body reader ── */
function readBody(req){
  return new Promise((res,rej)=>{
    const c=[];
    req.on('data',x=>c.push(x));
    req.on('end',()=>res(Buffer.concat(c)));
    req.on('error',rej);
  });
}

/* ── Multipart parser ── */
function parseMultipart(buf, boundary){
  const results=[], sep=Buffer.from('--'+boundary), parts=[];
  let start=0;
  while(true){
    const idx=buf.indexOf(sep,start);
    if(idx===-1) break;
    if(start>0) parts.push(buf.slice(start,idx-2));
    start=idx+sep.length+2;
  }
  for(const part of parts){
    const he=part.indexOf('\r\n\r\n');
    if(he===-1) continue;
    const hs=part.slice(0,he).toString();
    const data=part.slice(he+4);
    const nm=hs.match(/name="([^"]+)"/);
    const fm=hs.match(/filename="([^"]+)"/);
    if(!nm) continue;
    results.push({name:nm[1],filename:fm?fm[1]:null,data:fm?data:data.toString().trim(),contentType:(hs.match(/Content-Type:\s*([^\r\n]+)/)||[])[1]||'image/jpeg'});
  }
  return results;
}

/* ── Cloudinary upload ── */
function cloudinaryUpload(imageBuffer, filename){
  return new Promise((resolve, reject)=>{
    const timestamp = Math.floor(Date.now()/1000);
    const crypto = require('crypto');
    const sigStr = `timestamp=${timestamp}${CLOUD_SECRET}`;
    const signature = crypto.createHash('sha1').update(sigStr).digest('hex');

    const boundary = '----FormBoundary'+Math.random().toString(36).substr(2);
    const b64 = imageBuffer.toString('base64');
    const dataUri = `data:image/jpeg;base64,${b64}`;

    let body = '';
    body += `--${boundary}\r\nContent-Disposition: form-data; name="file"\r\n\r\n${dataUri}\r\n`;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="api_key"\r\n\r\n${CLOUD_KEY}\r\n`;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="timestamp"\r\n\r\n${timestamp}\r\n`;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="signature"\r\n\r\n${signature}\r\n`;
    body += `--${boundary}--\r\n`;

    const bodyBuf = Buffer.from(body);
    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUD_NAME}/image/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuf.length
      }
    };

    const req = https.request(options, res=>{
      let data='';
      res.on('data',c=>data+=c);
      res.on('end',()=>{
        try {
          const json = JSON.parse(data);
          if(json.secure_url) resolve(json.secure_url);
          else reject(new Error(json.error?.message||'Upload failed'));
        } catch(e){ reject(e); }
      });
    });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

/* ── Server ── */
http.createServer(async(req,res)=>{
  const pn = url.parse(req.url).pathname;
  const m  = req.method;

  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(m==='OPTIONS'){ res.writeHead(204); res.end(); return; }

  /* GET /api/data */
  if(pn==='/api/data' && m==='GET'){
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify(loadDB()));
    return;
  }

  /* POST /api/data */
  if(pn==='/api/data' && m==='POST'){
    const body = await readBody(req);
    try {
      saveDB(JSON.parse(body.toString()));
      res.writeHead(200,{'Content-Type':'application/json'});
      res.end(JSON.stringify({ok:true}));
    } catch { res.writeHead(400); res.end('Bad JSON'); }
    return;
  }

  /* POST /api/upload — upload to Cloudinary */
  if(pn==='/api/upload' && m==='POST'){
    const ct = req.headers['content-type']||'';
    const bm = ct.match(/boundary=([^\s;]+)/);
    if(!bm){ res.writeHead(400); res.end(); return; }
    const body  = await readBody(req);
    const parts = parseMultipart(body, bm[1]);
    const saved = [];
    for(const pt of parts){
      if(!pt.filename || !pt.data.length) continue;
      try {
        const cloudUrl = await cloudinaryUpload(pt.data, pt.filename);
        saved.push(cloudUrl);
        console.log('Uploaded to Cloudinary:', cloudUrl);
      } catch(e){
        console.error('Cloudinary error:', e.message);
      }
    }
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify({ok:true, files:saved}));
    return;
  }

  /* Static files */
  let fp = pn==='/' ? '/jacobteng.html' : pn;
  fp = path.join(DIR, decodeURIComponent(fp));
  if(!fp.startsWith(DIR)){ res.writeHead(403); res.end('Forbidden'); return; }

  fs.readFile(fp,(err,data)=>{
    if(err){ res.writeHead(404); res.end('Not found: '+pn); return; }
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream'});
    res.end(data);
  });

}).listen(PORT,()=>{
  console.log('');
  console.log('  Jacob Teng Portfolio');
  console.log('  ─────────────────────────────────');
  console.log(`  Portfolio  →  http://localhost:${PORT}`);
  console.log(`  Admin      →  http://localhost:${PORT}/admin.html`);
  console.log('  Images     →  Cloudinary (da28fgw5i)');
  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('');
});
