import React,{useEffect,useRef,useState} from 'react';
import HowThisWorks from './HowThisWorks.jsx';
import {Plus,Pencil,Trash2,Eye,EyeOff,Copy,Camera,FileText,ShieldCheck,Lock,AlertCircle,Download,X} from 'lucide-react';
import {shrinkPhoto} from './MenuReader.jsx';
import {VAULT_KINDS,VAULT_KIND_LABELS,VAULT_NUMBER_LABELS,VAULT_FIELDS,VAULT_FILE_MAX,VAULT_FILES_PER_DOC,maskNumber,expiryStatus,vaultByPerson,missingPassports,vaultFileUrl} from './vault-data.js';
import {japanDate} from './timing.js';
import {readDataUrl} from './browser.js';
// Passports, visas and the rest, for Damien and Lauren only. Nothing here is in the trip the other
// phones are sent: it comes from its own route, sealed on the server, and is only kept on this
// phone if a parent asks for it to be, for a counter with no signal.
const OFFLINE_FLAG='japan.vault-offline',CACHE='japan-private-v1';
const offlineOn=()=>{try{return localStorage.getItem(OFFLINE_FLAG)==='1';}catch{return false;}};
const readAsBase64=async file=>{const s=await readDataUrl(file);return s.slice(s.indexOf(',')+1);};
const fmtDate=d=>d?new Date(`${d}T00:00:00Z`).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'';
// The copy on this phone: the list itself and every photo, in the same private store as saved
// tickets, so Sign out and clear this phone takes it with everything else.
async function keepOnPhone(data){
 if(!('caches' in window))throw new Error('This browser cannot keep copies offline.');
 const c=await caches.open(CACHE),want=new Set(['/api/vault']);
 await c.put('/api/vault',new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}}));
 for(const r of data.records)for(const f of r.files||[]){
  const url=vaultFileUrl(r,f);want.add(url);
  if(await c.match(url))continue;
  const res=await fetch(url,{credentials:'same-origin'});if(!res.ok)throw new Error('A photo could not be saved on this phone.');
  await c.put(url,res);
 }
 for(const req of await c.keys()){const p=new URL(req.url);if(p.pathname.startsWith('/api/vault')&&!want.has(p.pathname+p.search))await c.delete(req);}
}
async function dropFromPhone(){
 if(!('caches' in window))return;
 const c=await caches.open(CACHE);
 for(const req of await c.keys())if(new URL(req.url).pathname.startsWith('/api/vault'))await c.delete(req);
}
function DocForm({editing,state,user,save,cancel,busy}){
 const [kind,setKind]=useState(editing?.kind||'passport');
 const v=f=>editing?.[f]||'';
 return <form className="feature-card vault-form" onSubmit={e=>{e.preventDefault();save(Object.fromEntries(new FormData(e.currentTarget)));}}>
  <label>Whose<select name="person" defaultValue={editing?.person||user.name}>{state.members.map(m=><option key={m}>{m}</option>)}<option value="Family">The whole family</option></select></label>
  <label>What kind<select name="kind" value={kind} onChange={e=>setKind(e.target.value)}>{VAULT_KINDS.map(k=><option key={k} value={k}>{VAULT_KIND_LABELS[k]}</option>)}</select></label>
  <label>Name for it<input name="label" maxLength={VAULT_FIELDS.label} defaultValue={v('label')} placeholder={kind==='passport'?'Australian passport':VAULT_KIND_LABELS[kind]}/></label>
  <label>Name as printed<input name="nameOnDoc" maxLength={VAULT_FIELDS.nameOnDoc} defaultValue={v('nameOnDoc')} autoComplete="off" placeholder="PASFIELD, DAMIEN"/></label>
  <label>{VAULT_NUMBER_LABELS[kind]}<input name="number" maxLength={VAULT_FIELDS.number} defaultValue={v('number')} autoComplete="off" autoCapitalize="characters" spellCheck={false}/></label>
  <label>{kind==='insurance'?'Insurer':'Issuing country'}<input name="country" maxLength={VAULT_FIELDS.country} defaultValue={v('country')} placeholder={kind==='insurance'?'':'Australia'}/></label>
  {['passport','licence','other'].includes(kind)&&<label>Date of birth<input type="date" name="dateOfBirth" defaultValue={v('dateOfBirth')}/></label>}
  <div className="row wrap vault-dates"><label>{kind==='insurance'?'Cover starts':'Issued'}<input type="date" name="issued" defaultValue={v('issued')}/></label>
   <label>{kind==='insurance'?'Cover ends':'Expires'}<input type="date" name="expires" defaultValue={v('expires')}/></label></div>
  <label>{kind==='insurance'?'Emergency assistance line':'Issuing office'}<input name="authority" maxLength={VAULT_FIELDS.authority} defaultValue={v('authority')}/></label>
  <label>Notes<textarea name="notes" maxLength={VAULT_FIELDS.notes} defaultValue={v('notes')} placeholder={kind==='visa'?'Entry conditions, number of entries, where it is recorded':''}/></label>
  <div className="row wrap"><button className="primary" disabled={busy}>{editing?'Save':'Add document'}</button><button type="button" onClick={cancel}>Cancel</button></div>
 </form>;
}
function DocCard({record,today,homeDay,shown,toggle,edit,remove,addFile,removeFile,busy,notice,online}){
 const status=expiryStatus(record,today,homeDay),input=useRef();
 const copy=()=>navigator.clipboard.writeText(record.number).then(()=>notice(`${VAULT_NUMBER_LABELS[record.kind]} copied.`)).catch(()=>notice('Select and copy the number instead.'));
 return <article className={`vault-doc ${status?.level||''}`}>
  <header><div><strong>{record.label}</strong><small>{VAULT_KIND_LABELS[record.kind]}{record.country?` · ${record.country}`:''}</small></div>
   <button className="icon" aria-label={shown?'Hide details':'Show details'} onClick={toggle}>{shown?<EyeOff size={18}/>:<Eye size={18}/>}</button></header>
  {record.number&&<p className="vault-number"><span>{shown?record.number:maskNumber(record.number)}</span>{shown&&<button className="icon" aria-label="Copy number" onClick={copy}><Copy size={16}/></button>}</p>}
  {status&&<p className={`vault-expiry ${status.level}`}>{status.level!=='ok'&&<AlertCircle size={15}/>} {record.kind==='insurance'?'Cover ends':'Expires'} {fmtDate(record.expires)}{status.text?` · ${status.text}`:''}</p>}
  {shown&&<dl className="vault-details">
   {record.nameOnDoc&&<><dt>Name</dt><dd>{record.nameOnDoc}</dd></>}
   {record.dateOfBirth&&<><dt>Born</dt><dd>{fmtDate(record.dateOfBirth)}</dd></>}
   {record.issued&&<><dt>{record.kind==='insurance'?'Cover starts':'Issued'}</dt><dd>{fmtDate(record.issued)}</dd></>}
   {record.authority&&<><dt>{record.kind==='insurance'?'Emergency line':'Office'}</dt><dd>{record.kind==='insurance'&&/^[+\d][\d\s()-]{5,}$/.test(record.authority)?<a href={`tel:${record.authority.replace(/[^\d+]/g,'')}`}>{record.authority}</a>:record.authority}</dd></>}
   {record.notes&&<><dt>Notes</dt><dd className="vault-notes">{record.notes}</dd></>}
  </dl>}
  {shown&&!!record.files?.length&&<div className="vault-files">{record.files.map(f=><figure key={f.id}>
   <a href={vaultFileUrl(record,f)} target="_blank" rel="noopener noreferrer">{f.type==='application/pdf'?<span className="vault-pdf"><FileText size={28}/>PDF</span>:<img src={vaultFileUrl(record,f)} alt={f.label||record.label} loading="lazy"/>}</a>
   <figcaption>{f.label||(f.type==='application/pdf'?'PDF':'Photo')}{online&&<button className="icon" aria-label="Remove this photo" disabled={busy} onClick={()=>removeFile(record,f)}><X size={14}/></button>}</figcaption></figure>)}</div>}
  {!shown&&!!record.files?.length&&<small className="vault-hidden-note"><Lock size={13}/> {record.files.length} photo{record.files.length===1?'':'s'} hidden · tap the eye to show</small>}
  {shown&&online&&<div className="row wrap vault-actions">
   {(record.files||[]).length<VAULT_FILES_PER_DOC&&<label className="file-button"><Camera size={15}/> Add a photo or PDF<input ref={input} type="file" accept="image/*,application/pdf" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)addFile(record,file);}}/></label>}
   <button onClick={()=>edit(record)} disabled={busy}><Pencil size={15}/> Edit</button>
   <button className="danger" onClick={()=>remove(record)} disabled={busy}><Trash2 size={15}/> Delete</button>
  </div>}
 </article>;
}
export default function Vault({state,user,request,notice,online}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[editing,setEditing]=useState(null);
 const [shown,setShown]=useState(()=>new Set()),[busy,setBusy]=useState(false),[working,setWorking]=useState('');
 const [offline,setOffline]=useState(offlineOn),[fromPhone,setFromPhone]=useState(false);
 const today=japanDate(),homeDay=state.days.at(-1)?.date;
 function accept(next,keep=offline){
  setData(next);setFromPhone(false);
  if(keep)keepOnPhone(next).catch(e=>notice(e.message));
 }
 useEffect(()=>{
  let live=true;
  request('vault').then(r=>{if(!live)return;accept(r,offline&&navigator.onLine);setFromPhone(!navigator.onLine);})
   .catch(e=>{if(live)setError(e.status===403?'Travel documents are for Mum and Dad only.':e.message);});
  return()=>{live=false;};
 },[]);
 // Everything shown goes back behind the dots when the phone is put down or the app is left, and
 // after two minutes on its own, so a phone handed to a boy or left on a counter shows nothing.
 useEffect(()=>{
  if(!shown.size)return;
  const hide=()=>setShown(new Set());
  const away=()=>{if(document.visibilityState==='hidden')hide();};
  document.addEventListener('visibilitychange',away);const t=setTimeout(hide,120000);
  return()=>{document.removeEventListener('visibilitychange',away);clearTimeout(t);};
 },[shown]);
 const toggle=id=>setShown(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});
 async function run(label,fn){
  setBusy(true);setWorking(label);
  try{await fn();return true;}catch(e){notice(e.message||'That did not save. Try again with signal.');return false;}
  finally{setBusy(false);setWorking('');}
 }
 const save=fields=>run('Saving…',async()=>{
  const next=await request('vault',{record:{...fields,...(editing?.id?{id:editing.id}:{})}});
  const fresh=!editing?.id&&next.records.at(-1);
  accept(next);setEditing(null);
  if(fresh)setShown(new Set([fresh.id]));
 });
 const remove=record=>{if(!confirm(`Delete ${record.label} for ${record.person}, and its photos? This cannot be undone.`))return;
  run('Deleting…',async()=>accept(await request('vault',{remove:record.id})));};
 const addFile=(record,file)=>run('Sealing the photo…',async()=>{
  const pdf=file.type==='application/pdf';
  if(pdf&&file.size>VAULT_FILE_MAX)throw new Error('That PDF is over 4 MB. Save just the page that matters.');
  // A passport photo has to stay sharp enough to read the lines at the bottom, so it is kept
  // larger than a menu photo; it still arrives well inside the request limit.
  const body=pdf?await readAsBase64(file):(await shrinkPhoto(file,2400,0.85)).image;
  const label=prompt('What is this a photo of?',record.kind==='passport'&&!(record.files||[]).length?'Photo page':'')??'';
  accept(await request('vault-file',{id:record.id,data:body,label}));
 });
 const removeFile=(record,f)=>{if(!confirm('Remove this photo from the document?'))return;
  run('Removing…',async()=>accept(await request('vault-file',{id:record.id,fileId:f.id,remove:true})));};
 async function setKeep(on){
  const ok=await run(on?'Saving on this phone…':'Removing from this phone…',async()=>{
   if(on){if(!data)throw new Error('Open this page with signal first.');await keepOnPhone(data);}
   else await dropFromPhone();
  });
  if(!ok)return;
  try{on?localStorage.setItem(OFFLINE_FLAG,'1'):localStorage.removeItem(OFFLINE_FLAG);}catch{}
  setOffline(on);notice(on?'A copy is on this phone for when there is no signal.':'The copy on this phone is gone.');
 }
 const records=data?.records||[],missing=data?missingPassports(records,state.members):[];
 return <>
  <p className="eyebrow">FOR MUM AND DAD ONLY</p><h1>Passports & visas</h1>
  <p className="vault-intro"><ShieldCheck size={18}/> Details and photos are encrypted before they are stored, and only a parent’s phone can open them.</p>
 <HowThisWorks><p>They are never part of the trip the boys’ phones are sent, and never read by Ask.</p></HowThisWorks>
  {error&&<p className="callout"><AlertCircle size={18}/>{error}</p>}
  {data&&!data.ready&&<p className="callout"><AlertCircle size={18}/><span>The vault is not switched on yet. Add a <code>VAULT_KEY</code> to the server’s environment (64 hex characters) and redeploy.</span></p>}
  {fromPhone&&<p className="callout"><Download size={18}/>No signal: this is the copy saved on this phone. Changes need signal.</p>}
  {!data&&!error&&<p>Opening…</p>}
  {working&&<p className="vault-working">{working}</p>}
  {data?.ready&&<>
   {!!missing.length&&<p className="callout"><AlertCircle size={18}/>No passport stored yet for {missing.join(', ').replace(/, ([^,]*)$/,' and $1')}.</p>}
   {editing?<DocForm editing={editing.id?editing:null} state={state} user={user} save={save} cancel={()=>setEditing(null)} busy={busy}/>
    :online&&<button className="primary" onClick={()=>setEditing({})} disabled={busy}><Plus size={18}/> Add a document</button>}
   {vaultByPerson(records,state.members).map(([person,list])=><section key={person} className="vault-person"><h2>{person==='Family'?'The whole family':person}</h2>
    {list.map(r=><DocCard key={r.id} record={r} today={today} homeDay={homeDay} shown={shown.has(r.id)} toggle={()=>toggle(r.id)}
     edit={r=>{setEditing(r);window.scrollTo({top:0,behavior:'smooth'});}} remove={remove} addFile={addFile} removeFile={removeFile} busy={busy} notice={notice} online={online&&!fromPhone}/>)}</section>)}
   {!records.length&&!editing&&<p>Nothing stored yet. Start with each passport: the number, the expiry, and a photo of the photo page.</p>}
   <details className="vault-offline"><summary>Keeping a copy for no signal</summary>
    <p>A copy can be kept on this phone, so the numbers and photos open at a hotel desk or a police box with no signal. It sits with the saved tickets, and <strong>Sign out and clear this phone</strong> removes it. It cannot be taken back remotely, so only keep one on a phone with a passcode that only you use.</p>
    <label className="own-row"><input type="checkbox" checked={offline} disabled={busy||(!offline&&!data)} onChange={e=>setKeep(e.target.checked)}/> Keep a copy on this phone</label>
   </details>
   <details><summary>If a passport is lost or stolen</summary>
    <p>Report it at the nearest police box (kōban) and ask for the report number, then contact the Australian Embassy in Tokyo on <a href="tel:+81352324111">+81 3 5232 4111</a>, or the 24-hour Consular Emergency Centre on <a href="tel:+61262613305">+61 2 6261 3305</a>, for an emergency passport. The photo page stored here speeds that up. Reporting it lost cancels it, even if it turns up.</p><p>In Japan a visitor has to carry the real passport at all times; a photo of it is not a substitute.</p>
   </details>
  </>}
 </>;
}
