// Passports, visas and the other papers a family cannot travel without. Kept out of the trip on
// purpose, like the check-ins: the trip is sent to every phone, the boys' included, is saved on
// each of them for offline use, goes into the itinerary backup and is what Ask reads from. None of
// that is somewhere a passport number belongs. So the vault is its own table and its own routes,
// a parent's only, and nothing in it is ever part of the trip.
//
// Everything is sealed before it is stored — the details in Neon and the photographs in Blob —
// with AES-256-GCM under VAULT_KEY, which lives only in the server's environment. A copy of the
// database or of the Blob store on its own reads as noise. Each sealed value is bound to the
// record or file it belongs to, so one cannot be swapped in for another.
import {createCipheriv,createDecipheriv,createHash,randomBytes,randomUUID} from 'node:crypto';
import {put,get,del} from '@vercel/blob';
import {database,localDemo} from './store.mjs';
import {AppError} from './model.mjs';
import {VAULT_KINDS,VAULT_FILE_TYPES,VAULT_FILE_MAX,VAULT_FILES_PER_DOC,VAULT_LIMIT,VAULT_FIELDS,cleanVaultRecord} from '../src/vault-data.js';
const VERSION=Buffer.from([1]);
let demoRecords=new Map(),demoFiles=new Map(),ready;
function key(){
 const raw=process.env.VAULT_KEY||'';
 if(/^[a-f0-9]{64}$/i.test(raw))return Buffer.from(raw,'hex');
 if(raw.length>=32)return createHash('sha256').update(raw).digest();
 // The preview on a laptop has no secrets to protect and no key to ask for.
 if(localDemo())return createHash('sha256').update('local preview vault').digest();
 return null;
}
export const vaultReady=()=>!!key();
function need(){const k=key();if(!k)throw new AppError('Travel documents need VAULT_KEY set on the server before anything can be stored.',503);return k;}
export function seal(bytes,bound){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',need(),iv);
 cipher.setAAD(Buffer.from(String(bound)));
 const body=Buffer.concat([cipher.update(bytes),cipher.final()]);
 return Buffer.concat([VERSION,iv,cipher.getAuthTag(),body]);
}
export function open(sealed,bound){
 if(!Buffer.isBuffer(sealed)||sealed.length<29||sealed[0]!==1)throw new AppError('That document could not be read.',500);
 try{
  const decipher=createDecipheriv('aes-256-gcm',need(),sealed.subarray(1,13));
  decipher.setAAD(Buffer.from(String(bound)));decipher.setAuthTag(sealed.subarray(13,29));
  return Buffer.concat([decipher.update(sealed.subarray(29)),decipher.final()]);
 }catch{throw new AppError('That document could not be unlocked. Has VAULT_KEY changed?',500);}
}
async function db(){
 const sql=await database();
 ready??=sql`CREATE TABLE IF NOT EXISTS japan_vault (id text PRIMARY KEY, sealed text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`.catch(e=>{ready=undefined;throw e;});
 await ready;return sql;
}
const unseal=(id,text)=>JSON.parse(open(Buffer.from(text,'base64'),`record:${id}`).toString('utf8'));
async function readAll(){
 if(localDemo())return [...demoRecords.entries()].map(([id,text])=>unseal(id,text));
 const sql=await db();
 return (await sql`SELECT id,sealed FROM japan_vault ORDER BY updated_at`).map(r=>unseal(r.id,r.sealed));
}
async function readOne(id){
 if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw new AppError('That document is not in the vault.',404);
 if(localDemo()){const t=demoRecords.get(id);return t?unseal(id,t):null;}
 const sql=await db();const [r]=await sql`SELECT sealed FROM japan_vault WHERE id=${id}`;
 return r?unseal(id,r.sealed):null;
}
async function write(record){
 need();
 const text=seal(Buffer.from(JSON.stringify(record)),`record:${record.id}`).toString('base64');
 if(localDemo()){demoRecords.set(record.id,text);return;}
 const sql=await db();
 await sql`INSERT INTO japan_vault(id,sealed,updated_at) VALUES (${record.id},${text},now()) ON CONFLICT(id) DO UPDATE SET sealed=excluded.sealed,updated_at=now()`;
}
async function forget(id){
 if(localDemo()){demoRecords.delete(id);return;}
 const sql=await db();await sql`DELETE FROM japan_vault WHERE id=${id}`;
}
async function storeFile(pathname,bytes){
 if(localDemo()){demoFiles.set(pathname,bytes);return;}
 await put(pathname,bytes,{access:'private',contentType:'application/octet-stream',addRandomSuffix:false,allowOverwrite:false});
}
async function loadFile(pathname){
 if(localDemo()){const b=demoFiles.get(pathname);if(!b)throw new AppError('That photo is no longer stored.',404);return b;}
 const result=await get(pathname,{access:'private',useCache:false});
 if(!result||!result.stream)throw new AppError('That photo is no longer stored.',404);
 return Buffer.from(await new Response(result.stream).arrayBuffer());
}
async function dropFile(pathname){if(localDemo()){demoFiles.delete(pathname);return;}await del(pathname).catch(()=>{});}
// What a file says it is, checked against what its first bytes say it is. A phone's picker
// reports a type; the bytes are the truth, and only these four ever come back out of the vault.
export function sniff(bytes){
 if(bytes.length>3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'image/jpeg';
 if(bytes.length>8&&bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])))return 'image/png';
 if(bytes.length>12&&bytes.subarray(0,4).toString('latin1')==='RIFF'&&bytes.subarray(8,12).toString('latin1')==='WEBP')return 'image/webp';
 if(bytes.length>5&&bytes.subarray(0,5).toString('latin1')==='%PDF-')return 'application/pdf';
 return null;
}
export async function listVault(){
 const records=await readAll();
 return records.sort((a,b)=>VAULT_KINDS.indexOf(a.kind)-VAULT_KINDS.indexOf(b.kind)||String(a.createdAt).localeCompare(String(b.createdAt)));
}
export async function saveVault(body,user,members){
 const at=new Date().toISOString();
 if(body?.remove){
  const found=await readOne(body.remove);
  if(!found)return;
  await forget(found.id);
  for(const f of found.files||[])await dropFile(f.pathname);
  return;
 }
 let fields;
 try{fields=cleanVaultRecord(body?.record,members);}catch(e){throw new AppError(e.message,e.status||400);}
 if(body?.record?.id){
  const found=await readOne(body.record.id);
  if(!found)throw new AppError('That document is not in the vault any more.',404);
  const next={...found,...fields,updatedBy:user.name,updatedAt:at};
  await write(next);return next;
 }
 if((await readAll()).length>=VAULT_LIMIT)throw new AppError(`That is ${VAULT_LIMIT} documents already. Remove one first.`);
 const next={id:randomUUID(),...fields,files:[],by:user.name,createdAt:at};
 await write(next);return next;
}
export async function addVaultFile(body,user){
 const found=await readOne(body?.id);
 if(!found)throw new AppError('That document is not in the vault any more.',404);
 if(body.remove){
  const file=(found.files||[]).find(f=>f.id===body.fileId);
  if(!file)return found;
  const next={...found,files:found.files.filter(f=>f.id!==file.id),updatedBy:user.name,updatedAt:new Date().toISOString()};
  await write(next);await dropFile(file.pathname);return next;
 }
 if((found.files||[]).length>=VAULT_FILES_PER_DOC)throw new AppError(`That is ${VAULT_FILES_PER_DOC} photos on one document already. Remove one first.`);
 if(typeof body.data!=='string'||!body.data||body.data.length>Math.ceil(VAULT_FILE_MAX*4/3)+8)throw new AppError('Use a photo or PDF of up to 4 MB.');
 const bytes=Buffer.from(body.data,'base64'),type=sniff(bytes);
 if(!type||!VAULT_FILE_TYPES.includes(type))throw new AppError('Use a photo (JPEG, PNG or WebP) or a PDF.');
 if(bytes.length>VAULT_FILE_MAX)throw new AppError('Use a photo or PDF of up to 4 MB.');
 const id=randomUUID(),pathname=`vault/${id}.bin`;
 await storeFile(pathname,seal(bytes,`file:${found.id}:${id}`));
 const label=String(body.label||'').trim().slice(0,VAULT_FIELDS.label);
 const next={...found,files:[...(found.files||[]),{id,pathname,type,size:bytes.length,label,by:user.name,at:new Date().toISOString()}],updatedBy:user.name,updatedAt:new Date().toISOString()};
 try{await write(next);}catch(e){await dropFile(pathname);throw e;}
 return next;
}
export async function readVaultFile(id,fileId){
 const found=await readOne(id);
 const file=found?.files?.find(f=>f.id===fileId);
 if(!file)throw new AppError('That photo is no longer stored.',404);
 return {type:file.type,bytes:open(await loadFile(file.pathname),`file:${found.id}:${file.id}`)};
}
// What the screen gets: everything but where the sealed files sit in storage.
export const vaultView=records=>records.map(r=>({...r,files:(r.files||[]).map(({pathname,...f})=>f)}));
export const resetDemoVault=()=>{demoRecords=new Map();demoFiles=new Map();};
