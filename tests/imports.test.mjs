import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
// A helper used on a screen but never imported there builds fine and fails only when the screen
// draws (a ReferenceError at runtime). This catches that class: every name exported by a module in
// src/ that a .jsx file calls must be imported, declared or defined in that file.
test('every helper a screen calls is imported or defined there',async()=>{
 const dir=new URL('../src/',import.meta.url),files=await readdir(dir);
 const exported=new Set();
 for(const f of files.filter(f=>/\.(js|jsx)$/.test(f))){
  const src=await readFile(new URL(f,dir),'utf8');
  for(const m of src.matchAll(/export (?:async )?(?:function|const|let) ([A-Za-z_$][\w$]*)/g))exported.add(m[1]);
 }
 const problems=[];
 for(const f of files.filter(f=>f.endsWith('.jsx'))){
  const src=await readFile(new URL(f,dir),'utf8');
  const known=new Set();
  for(const m of src.matchAll(/import\s+(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from/g)){if(m[1])known.add(m[1]);for(const n of (m[2]||'').split(','))known.add(n.trim().split(/\s+as\s+/).pop());}
  for(const m of src.matchAll(/(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/g))known.add(m[1]);
  for(const m of src.matchAll(/[{,]\s*([A-Za-z_$][\w$]*)\s*(?:=[^,}]*)?(?=[,}])/g))known.add(m[1]);
  for(const m of src.matchAll(/\[([^\[\]]*)\]\s*=/g))for(const n of m[1].split(','))known.add(n.trim().replace(/^\.\.\./,''));
  for(const m of src.matchAll(/\(\s*([A-Za-z_$][\w$]*)\s*(?:,\s*([A-Za-z_$][\w$]*))?\s*\)\s*=>/g)){known.add(m[1]);if(m[2])known.add(m[2]);}
  for(const m of src.matchAll(/([A-Za-z_$][\w$]*)\s*=>/g))known.add(m[1]);
  const code=src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:'"`\\])\/\/.*$/gm,'$1');
  for(const name of exported){
   if(known.has(name))continue;
   if(new RegExp(`(?<![\\w$.'"\`])${name.replace(/\$/g,'\\$')}\\(`).test(code))problems.push(`${f}: ${name}`);
  }
 }
 assert.deepEqual(problems,[]);
});
