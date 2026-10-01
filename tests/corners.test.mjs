import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {cornersCss} from '../scripts/corners.mjs';
// A selector list split at its own commas, not the ones inside :is(…).
const topLevel=sel=>{const out=[''];let depth=0;for(const c of sel){if(c==='('||c==='[')depth++;if(c===')'||c===']')depth--;if(c===','&&!depth)out.push('');else out[out.length-1]+=c;}return out;};

test('every pixel radius follows one dial, pills follow another, and circles and boards are left alone',()=>{
 assert.equal(cornersCss('.a{border-radius:12px;color:red}'),'.a{border-radius:calc(12px * var(--round,1));color:red}');
 assert.equal(cornersCss('.b{border-radius:8px 8px 0 0}'),'.b{border-radius:calc(8px * var(--round,1)) calc(8px * var(--round,1)) 0 0}');
 assert.equal(cornersCss('.c{border-top-left-radius:4px}'),'.c{border-top-left-radius:calc(4px * var(--round,1))}');
 assert.equal(cornersCss('.d{border-radius:999px}'),'.d{border-radius:var(--pill,999px)}');
 for(const keep of ['.e{border-radius:50%}','.f{border-radius:0}','.g{border-radius:2mm}','.merge-tile{border-radius:6px}','.snake-cell{border-radius:4px}'])assert.equal(cornersCss(keep),keep);
});

test('Washi is a whole look: its own fonts, both nights, square corners, and the defaults left as they were elsewhere',async()=>{
 const css=await readFile(new URL('../src/house-theme.css',import.meta.url),'utf8');
 for(const f of ['cormorant-latin-400-normal','cormorant-latin-500-normal','cormorant-latin-400-italic','jost-latin','jost-latin-italic'])assert.match(css,new RegExp(`url\\('\\./fonts/${f}\\.woff2'\\) format\\('woff2'\\)`),f);
 // Every rule is scoped to the look, so the printed guide's look is untouched by this sheet.
 for(const [,sel] of css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/@font-face\{[^}]*\}/g,'').replace(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*\s*\}/g,'').replace(/@media[^{]*\{/g,'').matchAll(/([^{}]+)\{[^{}]*\}/g))
  for(const part of topLevel(sel))assert.match(part.trim(),/^:root\[data-look=washi\]/,`${part.trim()} is scoped to the look`);
 assert.match(css,/:root\[data-look=washi\]\{[^}]*--round:\.15;--pill:2px/);
 assert.match(css,/:root\[data-look=washi\]\[data-theme=dark\]\{--ink:#/);
 assert.match(css,/@media \(prefers-color-scheme:dark\)\{:root\[data-look=washi\]\[data-theme=auto\]\{--ink:#/);
 assert.match(await readFile(new URL('../vite.config.js',import.meta.url),'utf8'),/themeCss\(cornersCss\(code\)\)/);
});

test('the boys’ pages keep their colour and soft corners inside the house look',async()=>{
 const {KIDS_PAGES,isKidsPage,MORE_SECTIONS}=await import('../src/nav-data.js');
 assert.deepEqual(KIDS_PAGES,MORE_SECTIONS.find(([l])=>l==='For the boys')[1]);
 assert.ok(isKidsPage('games')&&isKidsPage('stamps')&&!isKidsPage('today')&&!isKidsPage('ledger'));
 assert.match(await readFile(new URL('../src/main.jsx',import.meta.url),'utf8'),/<main data-kids=\{isKidsPage\(tab\)\?'':undefined\}>/);
 const css=await readFile(new URL('../src/house-theme.css',import.meta.url),'utf8');
 assert.match(css,/:root\[data-look=washi\] main\[data-kids\]\{[^}]*--accent:#[^}]*--round:\.8;--pill:999px\}/);
 assert.match(css,/:root\[data-look=washi\]\[data-theme=dark\] main\[data-kids\]\{--accent:#/);
 assert.match(css,/\[data-theme=auto\] main\[data-kids\]\{--accent:#/);
});

test('Washi has an answer for every solid colour written into the stylesheets, and leaves the boys\u2019 pages alone',async()=>{
 const {washiColours,washiFor}=await import('../scripts/washi-colours.mjs');
 const written=await readFile(new URL('../src/house-colours.css',import.meta.url),'utf8');
 assert.equal(written,await washiColours(),'src/house-colours.css is stale: run node scripts/washi-colours.mjs');
 assert.match(written,/^:root\[data-look=washi\]:not\(:has\(main\[data-kids\]\)\)\{/m);
 assert.equal(washiFor('#ffffff'),'paper');
 assert.equal(washiFor('#16383b'),'ink');
 assert.equal(washiFor('#da684f'),'danger-bright');
 assert.equal(washiFor('#16383b14'),null,'see-through colours are shadows and washes, and stay as written');
 assert.match(await readFile(new URL('../src/main.jsx',import.meta.url),'utf8'),/import '\.\/house-theme\.css';\nimport '\.\/house-colours\.css';/);
});
