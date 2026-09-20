import {readFile,writeFile,readdir} from 'node:fs/promises';
const files=(await readdir(new URL('../dist/assets/',import.meta.url))).map(n=>'/assets/'+n);
const path=new URL('../dist/sw.js',import.meta.url);
let sw=await readFile(path,'utf8');
sw=sw.replace(/\/\* BUILD_ASSETS \*\/ \[[^\]]*\]/,JSON.stringify(['/','/favicon-32.png','/icon-180.png','/icon-192.png','/manifest.webmanifest','/cover.jpg',...files]));
await writeFile(path,sw);
console.log(`Prepared offline shell with ${files.length} versioned assets.`);
