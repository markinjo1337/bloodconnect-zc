// Produces a static staging artifact only. Does not deploy or contact Firebase.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const configPath = process.argv[2];
if (!configPath) throw Error('Usage: node scripts/build-staging.cjs /path/to/staging-firebase.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const allowed = ['apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId','measurementId'];
for (const key of ['apiKey','authDomain','projectId','appId']) {
  if (typeof config[key] !== 'string' || !config[key].trim()) throw Error(`Missing Firebase web config: ${key}`);
}
if (Object.keys(config).some(key => !allowed.includes(key))) throw Error('Only Firebase WEB configuration is accepted, never service-account credentials.');
if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(config.projectId) || config.projectId === 'bloodconnect-zc' || config.projectId.startsWith('demo-')) {
  throw Error('Use a separate real staging Firebase project; production and emulator project IDs are refused.');
}
if (config.authDomain !== `${config.projectId}.firebaseapp.com`) throw Error('authDomain must belong to the staging project.');
const production = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
for (const key of ['apiKey','appId','messagingSenderId']) {
  if (config[key] && production.includes(JSON.stringify(config[key]))) throw Error(`Refusing production ${key}; use the staging web app configuration.`);
}
const out = path.join(root, '.preview', 'staging');
fs.mkdirSync(out, {recursive:true});
let html = fs.readFileSync(path.join(root,'index.html'),'utf8');
html = html.replace('<body>', `<body><div role="note" style="padding:10px 18px;background:#fff1d9;color:#603b00;font:14px system-ui;text-align:center">STAGING · Fictitious test data only · Firebase project: ${config.projectId}</div>`);
fs.writeFileSync(path.join(out,'index.html'), html);
fs.copyFileSync(path.join(root,'coordination.js'), path.join(out,'coordination.js'));
fs.writeFileSync(path.join(out,'config.js'), `// Staging web configuration only.\nexport const firebaseConfig = ${JSON.stringify(config,null,2)};\n`);
fs.writeFileSync(path.join(out,'_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n');
console.log(`Staging files prepared at ${out}. No deployment performed.`);
