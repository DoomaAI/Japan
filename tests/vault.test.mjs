import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import handler from '../server/handler.mjs';
import {seal,open,sniff,resetDemoVault,vaultReady} from '../server/vault.mjs';
import {cleanVaultRecord,maskNumber,expiryStatus,vaultByPerson,missingPassports} from '../src/vault-data.js';
const MEMBERS=['Damien','Lauren','Nate','Boston'];
const JPEG=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(200,7)]);
const PDF=Buffer.from('%PDF-1.7\nhello');

test('vault: sealed values open only with the same key and for the same record',()=>{
 process.env.VAULT_KEY='ab'.repeat(32);
 try{
  const sealed=seal(Buffer.from('PA1234567'),'record:one');
  assert.ok(!sealed.includes(Buffer.from('PA1234567')),'the number is not readable in what is stored');
  assert.equal(open(sealed,'record:one').toString(),'PA1234567');
  assert.throws(()=>open(sealed,'record:two'),/could not be unlocked/,'a value moved to another record will not open');
  const tampered=Buffer.from(sealed);tampered[tampered.length-1]^=1;
  assert.throws(()=>open(tampered,'record:one'),/could not be unlocked/);
  process.env.VAULT_KEY='cd'.repeat(32);
  assert.throws(()=>open(sealed,'record:one'),/could not be unlocked/,'nor under a different key');
 }finally{delete process.env.VAULT_KEY;}
});
test('vault: fails closed in production with no key, and only these file types are taken',()=>{
 delete process.env.VAULT_KEY;delete process.env.LOCAL_DEMO;
 assert.equal(vaultReady(),false);
 assert.throws(()=>seal(Buffer.from('x'),'r'),e=>e.status===503);
 assert.equal(sniff(JPEG),'image/jpeg');assert.equal(sniff(PDF),'application/pdf');
 assert.equal(sniff(Buffer.from('<html><script>')),null,'a page dressed as a photo is refused');
});
test('vault: records keep only known fields, and are checked',()=>{
 const r=cleanVaultRecord({kind:'passport',person:'Nate',number:' PA123 ',expires:'2030-01-01',sneaky:'x'},MEMBERS);
 assert.equal(r.number,'PA123');assert.equal(r.label,'Passport');assert.equal(r.sneaky,undefined);
 assert.throws(()=>cleanVaultRecord({kind:'passport',person:'Someone'},MEMBERS),/whose/);
 assert.throws(()=>cleanVaultRecord({kind:'tattoo',person:'Nate'},MEMBERS),/kind/);
 assert.throws(()=>cleanVaultRecord({kind:'visa',person:'Nate',expires:'soon'},MEMBERS),/real date/);
 assert.throws(()=>cleanVaultRecord({kind:'visa',person:'Nate',issued:'2026-01-02',expires:'2026-01-01'},MEMBERS),/before the issue/);
 assert.equal(maskNumber('PA1234567'),'••••••567');assert.equal(maskNumber(''),'');
});
test('vault: a passport is flagged if it runs out before home, or within six months of it',()=>{
 const today='2026-09-29',home='2026-10-08';
 assert.equal(expiryStatus({kind:'passport',expires:'2026-09-01'},today,home).level,'expired');
 assert.equal(expiryStatus({kind:'passport',expires:'2026-10-05'},today,home).text,'Runs out before we fly home');
 assert.equal(expiryStatus({kind:'passport',expires:'2027-02-01'},today,home).level,'soon');
 assert.equal(expiryStatus({kind:'visa',expires:'2027-02-01'},today,home).level,'ok','the six-month rule is a passport one');
 assert.equal(expiryStatus({kind:'passport',expires:'2031-06-01'},today,home).text,'Valid for 4 more years');
 assert.equal(expiryStatus({kind:'insurance',expires:'2026-10-10'},today,home).text,'Valid for 11 more days');
 assert.equal(expiryStatus({kind:'passport'},today,home),null);
 const recs=[{person:'Nate',kind:'passport'},{person:'Family',kind:'insurance'},{person:'Damien',kind:'visa'}];
 assert.deepEqual(vaultByPerson(recs,MEMBERS).map(([p])=>p),['Damien','Nate','Family']);
 assert.deepEqual(missingPassports(recs,MEMBERS),['Damien','Lauren','Boston']);
});
test('vault API: stored sealed, served back to a parent, and never in the trip',async()=>{
 process.env.LOCAL_DEMO='1';delete process.env.VERCEL;resetDemoVault();
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const post=(path,data)=>fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(data)});
  assert.deepEqual(await(await fetch(base+'/api/vault')).json(),{ready:true,records:[]});
  const added=await(await post('vault',{record:{kind:'passport',person:'Boston',number:'PB7654321',expires:'2031-03-01',nameOnDoc:'PASFIELD BOSTON'}})).json();
  assert.equal(added.records.length,1);const doc=added.records[0];assert.equal(doc.number,'PB7654321');assert.equal(doc.by,'Damien');
  assert.equal((await post('vault',{record:{kind:'passport',person:'Nobody'}})).status,400);
  const withFile=await(await post('vault-file',{id:doc.id,data:JPEG.toString('base64'),label:'Photo page'})).json();
  const file=withFile.records[0].files[0];assert.equal(file.type,'image/jpeg');assert.equal(file.pathname,undefined,'where it is stored is not handed out');
  assert.equal((await post('vault-file',{id:doc.id,data:Buffer.from('<svg onload=alert(1)>').toString('base64')})).status,400);
  const got=await fetch(`${base}/api/vault-file?id=${doc.id}&file=${file.id}`);
  assert.equal(got.headers.get('content-type'),'image/jpeg');assert.equal(got.headers.get('cache-control'),'private, no-store');
  assert.deepEqual(Buffer.from(await got.arrayBuffer()),JPEG);
  const edited=await(await post('vault',{record:{...doc,number:'PB0000001'}})).json();
  assert.equal(edited.records[0].number,'PB0000001');assert.equal(edited.records[0].files.length,1,'editing keeps the photos');
  const state=await(await fetch(base+'/api/state')).json();
  assert.ok(!JSON.stringify(state).includes('PB0000001'),'the vault is never part of the trip');
  assert.equal((await(await post('vault-file',{id:doc.id,fileId:file.id,remove:true})).json()).records[0].files.length,0);
  assert.equal((await fetch(`${base}/api/vault-file?id=${doc.id}&file=${file.id}`)).status,404);
  assert.deepEqual((await(await post('vault',{remove:doc.id})).json()).records,[]);
 }finally{delete process.env.LOCAL_DEMO;resetDemoVault();await new Promise(r=>server.close(r));}
});
test('vault API: every route is a parent’s, and none of it goes to Ask or the backup',async()=>{
 const source=await readFile(new URL('../server/handler.mjs',import.meta.url),'utf8');
 const routes=[...source.matchAll(/if\(route==='(vault(?:-file)?)'&&[^)]*\)\{\s*parent\(user\)/g)].map(m=>m[1]);
 assert.deepEqual(routes.sort(),['vault','vault','vault-file','vault-file'],'each vault route checks for a parent first');
 const ask=await readFile(new URL('../server/ask.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(ask,/vault/);
 // With no session at all, nothing is let in.
 delete process.env.LOCAL_DEMO;process.env.DATABASE_URL='postgres://u:p@127.0.0.1:1/none';
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{assert.equal((await fetch(base+'/api/vault')).status,401);}
 finally{delete process.env.DATABASE_URL;await new Promise(r=>server.close(r));}
});
