/**
 * Jacob Teng Portfolio — Server
 * Run: node server.js
 * Portfolio: http://localhost:3000
 * Admin:     http://localhost:3000/admin.html
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT    = 3000;
const DIR     = __dirname;
const DB_FILE = path.join(DIR, 'db.json');

const MIME = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.png':'image/png','.gif':'image/gif','.webp':'image/webp',
  '.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2',
};

/* ── Default data — seeded into db.json on first run ── */
const DEFAULT_DB = {
  homepageGallery: 'Jack Stadlman',
  galleries: [
    { title:'Jack Stadlman',            images:['uploads/js1.jpg','uploads/js2.jpg','uploads/js3.jpg','uploads/js4.jpg','uploads/js5.jpg','uploads/js6.jpg','uploads/js7.jpg'] },
    { title:'Faves (Ongoing)',           images:['uploads/dv1.jpg','uploads/dv2.jpg','uploads/dv3.jpg','uploads/dv4.jpg'] },
    { title:'Los Angeles Grand Prix',    images:[] },
    { title:'Jahsai Sommerville',        images:[] },
    { title:'Soundrunning Track Fest',   images:[] },
    { title:'Jacob Bayla',               images:[] },
    { title:'District Vision',           images:[] },
    { title:'Mahershala Ali – Interview',images:[] },
    { title:'Walt Siegl',                images:[] },
    { title:'Zion – Jordan Brand',       images:[] },
    { title:'Apex',                      images:[] },
    { title:'Michael Kelly – Interview', images:[] },
    { title:'Oakville Youth Rodeo',      images:[] },
    { title:'Silver Lining',             images:[] },
  ],
  info: {
    ig:     '@jtphoto._',
    igUrl:  'https://www.instagram.com/jtphoto._/',
    email:  'jacobteng00@gmail.com',
    about:  'Documentary and commercial photographer based in Los Angeles.\n\nAvailable for editorial, brand, and personal projects worldwide.',
    clients:'Banditrunning, TheRunnersCentral, Soundrunning, Flotrack, Joopiter, Brooks Running',
  }
};

/* ── DB helpers ── */
function loadDB(){
  try {
    const raw = JSON.parse(fs.readFileSync(DB_FILE,'utf8'));
    /* make sure it has the required keys */
    if(raw && raw.galleries && raw.homepageGallery !== undefined) return raw;
  } catch {}
  /* first run — seed the file */
  saveDB(DEFAULT_DB);
  return JSON.parse(JSON.stringify(DEFAULT_DB));
}

function saveDB(data){
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

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
    results.push({name:nm[1],filename:fm?fm[1]:null,data:fm?data:data.toString().trim()});
  }
  return results;
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
    const db = loadDB();
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify(db));
    return;
  }

  /* POST /api/data */
  if(pn==='/api/data' && m==='POST'){
    const body = await readBody(req);
    try {
      const data = JSON.parse(body.toString());
      saveDB(data);
      res.writeHead(200,{'Content-Type':'application/json'});
      res.end(JSON.stringify({ok:true}));
    } catch {
      res.writeHead(400); res.end('Bad JSON');
    }
    return;
  }

  /* POST /api/upload */
  if(pn==='/api/upload' && m==='POST'){
    const ct = req.headers['content-type']||'';
    const bm = ct.match(/boundary=([^\s;]+)/);
    if(!bm){ res.writeHead(400); res.end(); return; }
    const body  = await readBody(req);
    const parts = parseMultipart(body, bm[1]);
    const saved = [];
    for(const pt of parts){
      if(!pt.filename) continue;
      const safe = pt.filename.replace(/[^a-zA-Z0-9._-]/g,'_');
      const dest = path.join(DIR,'uploads',safe);
      fs.mkdirSync(path.join(DIR,'uploads'),{recursive:true});
      fs.writeFileSync(dest, pt.data);
      saved.push('uploads/'+safe);
    }
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify({ok:true,files:saved}));
    return;
  }

  /* Static files */
  let fp = pn==='/' ? '/jacobteng.html' : pn;
  fp = path.join(DIR, decodeURIComponent(fp));
  if(!fp.startsWith(DIR)){ res.writeHead(403); res.end('Forbidden'); return; }

  fs.readFile(fp,(err,data)=>{
    if(err){ res.writeHead(404); res.end('Not found'); return; }
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
  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('');
});
