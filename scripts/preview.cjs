// Private local preview only. Every Firebase request goes to local emulators.
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const esbuild=require('esbuild');
const root=path.resolve(__dirname,'..');
if(process.argv.includes('--layout')) { process.env.LAYOUT_ONLY='1'; process.env.PORT='3003'; }
async function build(file){
  let html=fs.readFileSync(file,'utf8');
  let script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]
    .replaceAll('https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js','firebase/app')
    .replaceAll('https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js','firebase/auth')
    .replaceAll('https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js','firebase/firestore')
    .replace("import { firebaseConfig } from './config.js';",`const firebaseConfig={apiKey:'demo-key',projectId:'demo-bloodconnect-zc',authDomain:'localhost'};`)
    .replace('const db = getFirestore(app);', `const db = initializeFirestore(app,{host:location.host,ssl:location.protocol==='https:'});\nconnectAuthEmulator(auth,location.origin,{disableWarnings:true});`);
  script=`import {connectAuthEmulator} from 'firebase/auth';\nimport {initializeFirestore} from 'firebase/firestore';\n`+script;
  if(process.env.LAYOUT_ONLY==='1') {
    script=script.replace('function startListeners(){','function startListeners(){ return;');
    script+=`\nglobalThis.setLayoutFixture = fixture => { stopListeners(); fb.user=fixture.user; fb.profile=fixture.profile; fb.ready=true; Object.assign(raw,fixture.raw); Object.assign(state,fixture.state); rebuild(); go(fixture.tab || 'home', fixture.detail || null); };`;
  }
  const result=await esbuild.build({stdin:{contents:script,resolveDir:root,sourcefile:'app-preview.js'},bundle:true,write:false,format:'esm'});
  html=html.replace(/<script type="module">[\s\S]*?<\/script>/,'<script type="module" src="/app-preview.js"></script>');
  html=html.replace('<body>','<body><div style="padding:8px 18px;background:#fff1d9;color:#603b00;font:14px system-ui;text-align:center">FICTITIOUS LOCAL DEMO · No production data · Staff: staff@example.test · Donor: donor1@example.test · Password: Defense27!</div>');
  return {html,js:result.outputFiles[0].text};
}
(async()=>{
const file=process.env.BASELINE_FILE || path.join(root,'index.html');
let built=await build(file);
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/' || url.pathname==='/index.html') {built=await build(file);res.setHeader('Content-Type','text/html');res.end(built.html);return;}
  if(url.pathname==='/app-preview.js'){res.setHeader('Content-Type','text/javascript');res.end(built.js);return;}
  if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const auth=/identitytoolkit|securetoken|emulator\/auth/.test(url.pathname);
  const firestore=/google.firestore|^\/v1\/|^\/emulator\/v1\//.test(url.pathname);
  if(!auth&&!firestore){res.writeHead(404);res.end();return;}
  const upstream=http.request({hostname:'127.0.0.1',port:auth?9099:8086,path:req.url,method:req.method,headers:{...req.headers,host:auth?'127.0.0.1:9099':'127.0.0.1:8086'}},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});
  upstream.on('error',()=>{res.writeHead(503);res.end('Local emulator not running. Start npm run emulators.');});
  req.pipe(upstream);
}).listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Isolated emulator preview listening on '+(process.env.PORT||3000)));
})();
