import React,{useState} from 'react';
import PageTitle from './PageTitle.jsx';
import {Plus,Pencil,Trash2,Search,CreditCard,Banknote,Lightbulb} from 'lucide-react';
import {PAY_KINDS,PAY_HOLDERS,FEE_FIELDS,PAY_TIPS,payMethods,payKindLabel,advise,withdrawalSizes} from './pay-advice.js';
import {yen,aud,rateText} from './Currency.jsx';
import {rateIsSet} from './trip-features.js';
const blank={name:'',kind:'debit',holder:'Damien',notes:'',fxFeePct:'',marginPct:'',atmFeeAud:'',atmFeePct:'',cashAdvancePct:''};
const asForm=m=>({...blank,...m,...Object.fromEntries(FEE_FIELDS.map(([f])=>[f,m?.[f]??'']))});
const num=v=>v===''||v===null||v===undefined?null:Number(v);
const feeText=(m,field,unit)=>m[field]===null||m[field]===undefined?'not entered':unit==='$'?`$${Number(m[field]).toFixed(2)}`:`${m[field]}%`;
function CardForm({editing,config,request,mutate,busy,notice,done}){
 const [f,setF]=useState(asForm(editing)),[looking,setLooking]=useState(false),[found,setFound]=useState(null),[researched,setResearched]=useState(editing?.researched??undefined);
 const set=(k,v)=>setF(prev=>({...prev,[k]:v}));
 async function lookUp(){
  if(!f.name.trim()){notice('Type the card’s name first.');return;}
  setLooking(true);setFound(null);
  try{setFound(await request('pay-research',{name:f.name,kind:f.kind}));}catch(e){notice(e.message||'The lookup did not work. Enter the fees yourself.');}
  finally{setLooking(false);}
 }
 function useFound(){
  const d=found.draft;
  setF(prev=>({...prev,kind:d.kind||prev.kind,...Object.fromEntries(FEE_FIELDS.map(([k])=>[k,d[k]??'']))}));
  setResearched({summary:found.summary,checkFirst:found.checkFirst,sources:found.sources});
  setFound(null);
 }
 async function save(e){
  e.preventDefault();
  const op={name:f.name,kind:f.kind,holder:f.holder,notes:f.notes,...Object.fromEntries(FEE_FIELDS.map(([k])=>[k,num(f[k])]))};
  if(researched!==undefined)op.researched=researched;
  if(FEE_FIELDS.some(([k])=>op[k]!==null&&!Number.isFinite(op[k]))){notice('Fees must be numbers, or left blank.');return;}
  if(await mutate(editing?{type:'payMethodEdit',id:editing.id,...op}:{type:'payMethodAdd',...op}))done();
 }
 return <form className="feature-card" onSubmit={save}>
  <label>Card or account<input required maxLength={120} value={f.name} onChange={e=>set('name',e.target.value)} placeholder="ING Orange Everyday, Wise, Qantas Travel Money"/></label>
  <label>Kind<select value={f.kind} onChange={e=>set('kind',e.target.value)}>{PAY_KINDS.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label>
  <label>Whose<select value={f.holder} onChange={e=>set('holder',e.target.value)}>{PAY_HOLDERS.map(n=><option key={n}>{n}</option>)}</select></label>
  {config?.research&&<button type="button" disabled={looking||busy} onClick={lookUp}><Search size={16}/> {looking?'Looking up the fees… (about a minute)':'Look up this card’s fees'}</button>}
  {found&&<div className="callout pay-found"><div>
   <strong>{found.draft.product||f.name}</strong>
   <p>{found.summary}</p>
   <ul>{FEE_FIELDS.map(([k,label,unit])=><li key={k}>{label}: <strong>{feeText(found.draft,k,unit)}</strong></li>)}</ul>
   <p><small><strong>Check:</strong> {found.checkFirst}</small></p>
   {found.sources.length>0&&<p><small>{found.sources.map((s,i)=><React.Fragment key={s.url}>{i?' · ':''}<a href={s.url} target="_blank" rel="noopener noreferrer">{s.title||new URL(s.url).hostname}</a></React.Fragment>)}</small></p>}
   <div className="row wrap"><button type="button" className="primary" onClick={useFound}>Use these figures</button><button type="button" onClick={()=>setFound(null)}>Ignore</button></div>
  </div></div>}
  <p><small>Leave a fee blank if you do not know it: blank counts as unknown, not free. Most bank cards convert at the Visa or Mastercard rate, so their margin is 0.</small></p>
  {FEE_FIELDS.map(([k,label,unit,min,max])=><label key={k}>{label} ({unit})<input inputMode="decimal" value={f[k]} onChange={e=>set(k,e.target.value.replace(/[^\d.]/g,''))} placeholder={unit==='%'?'e.g. 3':'e.g. 5.00'} aria-describedby={`${k}-range`}/><small id={`${k}-range`}>{min}–{max}{unit==='%'?'%':' dollars'}</small></label>)}
  <label>Notes<input maxLength={1000} value={f.notes} onChange={e=>set('notes',e.target.value)} placeholder="ATM fees refunded if $1,000 deposited this month"/></label>
  <div className="row wrap"><button className="primary" disabled={busy}>{editing?'Save':'Add card'}</button><button type="button" onClick={done}>Cancel</button></div>
 </form>;
}
export default function WhichCard({state,user,config,request,mutate,busy,notice,remove}){
 const [amount,setAmount]=useState('5000'),[situation,setSituation]=useState('shop'),[operator,setOperator]=useState('0'),[form,setForm]=useState(null);
 const cards=payMethods(state);
 const yenAmount=Number(String(amount).replace(/[^\d]/g,''))||0,op=Number(String(operator).replace(/[^\d]/g,''))||0;
 const {rate,options}=advise(state,{yen:yenAmount,situation,atmOperatorYen:situation==='atm'?op:0});
 const best=options[0];
 return <>
  <p className="eyebrow">WHICH CARD, WHICH CASH</p>
  <PageTitle help={<><p>Put in what we carry and what each one charges.</p><p>This works out which is cheapest for a payment in a shop or for taking cash out, at the family’s shared rate of {rateText(rate)}{rateIsSet(state)?'':' (an estimate until someone sets the rate on the FX page)'}.</p></>}>Which card should we use?</PageTitle>
  <section className="pay-advice">
   <div className="row wrap">
    <button className={situation==='shop'?'primary':''} onClick={()=>setSituation('shop')}><CreditCard size={16}/> Paying in a shop</button>
    <button className={situation==='atm'?'primary':''} onClick={()=>setSituation('atm')}><Banknote size={16}/> Cash from an ATM</button>
   </div>
   <label className="pay-amount">{situation==='atm'?'How much to take out (yen)':'How much it costs (yen)'}<input inputMode="numeric" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
   {situation==='atm'&&<label>The ATM’s own fee, if the screen shows one (yen)<input inputMode="numeric" value={operator} onChange={e=>setOperator(e.target.value)}/></label>}
   {!cards.length&&<p>Add our cards below and the answer appears here.</p>}
   {cards.length>0&&!options.length&&<p>None of our cards can do that{situation==='atm'?': cash from an ATM needs a debit, credit or travel card':''}.</p>}
   {options.length>0&&<ol className="pay-options">{options.map((o,i)=><li key={o.method.id} className={i===0&&!o.unknown.length?'best':''}>
    <div><strong>{o.method.name}</strong><small>{payKindLabel(o.method.kind)} · {o.method.holder}</small>
     {o.unknown.length>0&&<small className="warn">Unknown: {o.unknown.join(', ')}. The real cost is higher.</small>}
     {o.note&&<small>{o.note}</small>}</div>
    <div className="pay-cost"><strong>{aud(o.total)}</strong><small>{o.unknown.length?(o.fees>0?`${aud(o.fees)}+ in fees`:'fees unknown'):o.fees>0?`${aud(o.fees)} in fees`:'no fees'}</small></div>
   </li>)}</ol>}
   {best&&situation==='atm'&&(best.method.atmFeeAud||op)>0&&<p><small>Fixed fees per withdrawal (the ATM’s own, plus {best.method.name}’s) come to {withdrawalSizes(best.method,{rate,atmOperatorYen:op}).map(w=>`${w.fixedPct}% of ${yen(w.yen)}`).join(', ')}. Fewer, larger withdrawals cost less.</small></p>}
  </section>
  <details className="callout" open={!cards.length}><summary><Lightbulb size={16}/> <strong>Paying in Japan: five things worth knowing</strong></summary><ul>{PAY_TIPS.map(t=><li key={t}>{t}</li>)}</ul></details>
  <h2>Our cards</h2>
  {!form&&<button className="primary" onClick={()=>setForm({})}><Plus size={16}/> Add a card</button>}
  {form&&<CardForm editing={form.id?form:null} config={config} request={request} mutate={mutate} busy={busy} notice={notice} done={()=>setForm(null)}/>}
  <ul className="pay-cards">{cards.map(m=><li key={m.id}>
   <div><strong>{m.name}</strong><small>{payKindLabel(m.kind)} · {m.holder}</small>
    <small>{FEE_FIELDS.filter(([k])=>m.kind==='credit'||k!=='cashAdvancePct').map(([k,label,unit])=>`${label.replace(/ \(.*\)/,'')}: ${feeText(m,k,unit)}`).join(' · ')}</small>
    {m.researched&&<small>Looked up {new Date(m.researched.at).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}{m.researched.sources?.[0]&&<> · <a href={m.researched.sources[0].url} target="_blank" rel="noopener noreferrer">source</a></>}</small>}
    {m.notes&&<small>{m.notes}</small>}</div>
   <div className="row"><button aria-label={`Change ${m.name}`} onClick={()=>setForm(m)}><Pencil size={15}/></button>
    <button aria-label={`Remove ${m.name}`} disabled={busy} onClick={()=>remove({type:'payMethodRemove',id:m.id},{...m,type:'payMethodAdd',id:undefined,researched:undefined},`${m.name} removed.`)}><Trash2 size={15}/></button></div>
  </li>)}</ul>
 </>;
}
