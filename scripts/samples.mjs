import fs from 'node:fs';
fs.mkdirSync('public/audio',{recursive:true});
const samples=[36,39,42,45,48,51,54,57,60,63,66,69,72,75,78,81,84];
await Promise.all(samples.map(async key=>{const names=['C','Cs','D','Ds','E','F','Fs','G','Gs','A','As','B'];const file=names[key%12]+(Math.floor(key/12)-1)+'.mp3';const r=await fetch('https://raw.githubusercontent.com/Tonejs/audio/master/salamander/'+file);if(!r.ok)throw Error(file+' '+r.status);fs.writeFileSync('public/audio/'+file,Buffer.from(await r.arrayBuffer()));}));
const license=await fetch('https://raw.githubusercontent.com/Tonejs/audio/master/salamander/LICENSE');if(license.ok)fs.writeFileSync('public/audio/LICENSE',await license.text());
console.log('Bundled 17 Salamander piano samples');
