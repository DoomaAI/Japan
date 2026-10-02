import React,{useState} from 'react';
import PageTitle from './PageTitle.jsx';
import {Plus,Trash2,Pencil,Download,X,Receipt,Scale,CreditCard,Paperclip} from 'lucide-react';
import {upload} from '@vercel/blob/client';
import {balanceBetween,settlements,icBalance,icLow,IC_MAX,RECEIPT_TYPES,receiptUrl} from './ledger-data.js';
import {EXPENSE_CATEGORIES,PAY_METHODS,PAYERS,expenses,expenseSummary,expensesCsv,expenseCategoryLabel,payMethodLabel,yenToAud,rateIsSet} from './trip-features.js';
import {yen,aud,rateText} from './Currency.jsx';
import {dayLabel} from './AdventurePages.jsx';
import Runway from './Runway.jsx';
import {japanDate} from './timing.js';
import {download} from './browser.js';
// What Damien and Lauren spend, in yen as the receipt says, with dollars at the shared rate.
// Adding one works with no signal, because a payment happens at a till, not near a router.
function Breakdown({title,values,label,total,rate}){
 const rows=Object.entries(values).sort((a,b)=>b[1]-a[1]);
 if(!rows.length)return null;
 return <div className="ledger-breakdown"><h3>{title}</h3>{rows.map(([id,v])=><div key={id} className="ledger-bar">
  <span>{label(id)}</span><span className="ledger-track"><span style={{width:`${Math.max(2,Math.round(v/total*100))}%`}}/></span>
  <span>{yen(v)} <small>{aud(yenToAud(v,rate))}</small></span></div>)}</div>;
}
function ExpenseForm({state,user,day,editing,mutate,busy,done,config,online,notice}){
 const payer=PAYERS.includes(user.name)?user.name:PAYERS[0];
 // The receipt goes to the family's private storage first and the payment only keeps where it
 // is; with no signal or no storage the payment still saves, receipt-less, the way it always did.
 const [receipt,setReceipt]=useState(editing?.receipt||null),[uploading,setUploading]=useState(false);
 const canAttach=!!config?.uploads&&online;
 async function attach(e){
  const file=e.target.files?.[0];if(!file)return;
  if(!RECEIPT_TYPES.includes(file.type)){notice?.('A receipt has to be a photo or a PDF.');return;}
  setUploading(true);
  try{const blob=await upload(`receipts/${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`,file,{access:'private',contentType:file.type,handleUploadUrl:'/api/upload'});
   setReceipt({pathname:blob.pathname,type:file.type});}
  catch(err){notice?.(err.message||'The receipt could not be uploaded. The payment can still be saved without it.');}
  finally{setUploading(false);}
 }
 async function save(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  const op={title:String(f.get('title')||'').trim(),yen:Number(String(f.get('yen')||'').replace(/[^\d]/g,'')),category:f.get('category'),
   method:f.get('method'),paidBy:f.get('paidBy'),day:f.get('day')||null,notes:String(f.get('notes')||''),own:f.get('own')==='on',receipt};
  const ok=editing?await mutate({type:'expenseEdit',id:editing.id,...op}):await mutate({type:'expenseAdd',...op,by:user.name});
  if(ok)done();
 }
 return <form className="feature-card" onSubmit={save} key={editing?.id||'new'}>
  <label>Amount in yen<input name="yen" inputMode="numeric" required pattern="[0-9,]+" defaultValue={editing?.yen??''} placeholder="3,200"/></label>
  <label>What for<input name="title" required maxLength={200} defaultValue={editing?.title||''} placeholder="Lunch at Nishiki Market"/></label>
  <label>Category<select name="category" defaultValue={editing?.category||'food'}>{EXPENSE_CATEGORIES.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label>
  <label>Paid with<select name="method" defaultValue={editing?.method||'card'}>{PAY_METHODS.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label>
  <label>Paid by<select name="paidBy" defaultValue={editing?.paidBy||payer}>{PAYERS.map(n=><option key={n}>{n}</option>)}</select></label>
  <label>Day<select name="day" defaultValue={editing?editing.day||'':day}>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)}</option>)}<option value="">Not on a trip day</option></select></label>
  <label>Notes<input name="notes" maxLength={1000} defaultValue={editing?.notes||''}/></label>
  <label className="own-row"><input type="checkbox" name="own" defaultChecked={!!editing?.own}/> Just the payer’s own, not split between us</label>
  <div className="receipt-row">
   {receipt?<><a href={editing?.receipt===receipt?receiptUrl(editing):'#'} onClick={e=>{if(editing?.receipt!==receipt)e.preventDefault();}} target="_blank" rel="noopener noreferrer"><Paperclip size={15}/> Receipt attached</a><button type="button" onClick={()=>setReceipt(null)}><X size={14}/> Remove</button></>
    :canAttach?<label className="file-button"><Receipt size={15}/> {uploading?'Uploading…':'Add a receipt photo'}<input type="file" accept="image/*,application/pdf" capture="environment" disabled={uploading} onChange={attach}/></label>
    :<small>{online?'Receipt photos need the family’s private file storage connected.':'No signal: add the receipt photo later, by editing this payment.'}</small>}
  </div>
  <div className="row wrap"><button className="primary" disabled={busy||uploading}>{editing?'Save':'Add payment'}</button><button type="button" onClick={done}>Cancel</button></div>
 </form>;
}
// Who owes whom, at a glance, and one button to say it has been squared up.
function BalanceCard({state,mutate,busy}){
 const b=balanceBetween(state),given=settlements(state);
 if(!b)return null;
 const square=async()=>{if(!confirm(`${b.from} has handed ${yen(b.yen)} to ${b.to}?`))return;await mutate({type:'settleUp',from:b.from,to:b.to,yen:b.yen});};
 return <div className="balance-card">
  <Scale size={20}/>
  <div>{b.yen?<><strong>{b.from} owes {b.to} {yen(b.yen)}</strong><small>Splitting {yen(b.shared)} of shared payments down the middle{given.length?`, after ${given.length} square-up${given.length>1?'s':''}`:''}.</small></>
   :<><strong>You’re square.</strong><small>{yen(b.shared)} of shared payments, split evenly{given.length?` after ${given.length} square-up${given.length>1?'s':''}`:''}.</small></>}</div>
  {b.yen>0&&<button disabled={busy} onClick={square}>Squared up</button>}
 </div>;
}
// The balance on each IC card, typed in from the gate or the machine, so an empty card is
// noticed before the barrier. Low is under a thousand yen: one more ride, maybe.
function IcCards({state,mutate,busy}){
 const [editing,setEditing]=useState(null);
 async function save(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  if(await mutate({type:'icBalance',person:editing,yen:Number(String(f.get('yen')||'').replace(/[^\d]/g,''))}))setEditing(null);
 }
 return <section className="ic-cards">
  <h2><CreditCard size={18}/> IC cards</h2>
  <ul>{state.members.map(n=>{const b=icBalance(state,n);return <li key={n} className={icLow(state,n)?'low':''}>
   <span><strong>{n}</strong><small>{b?`${b.at.slice(0,10)===japanDate()?'Today':dayLabel(b.at.slice(0,10))}, by ${b.by}`:'Not set yet'}</small></span>
   {editing===n?<form onSubmit={save} className="row"><input name="yen" inputMode="numeric" required pattern="[0-9,]+" autoFocus defaultValue={b?.yen??''} placeholder="2,500" aria-label={`${n}’s card balance in yen`}/><button className="primary" disabled={busy}>Save</button><button type="button" onClick={()=>setEditing(null)}>Cancel</button></form>
    :<button onClick={()=>setEditing(n)}>{b?<strong>{yen(b.yen)}</strong>:'Set'}{icLow(state,n)?<small> · top up</small>:null}</button>}
  </li>;})}</ul>
  <p><small>Up to {yen(IC_MAX)} a card, as the machine says. Tap a balance to change it.</small></p>
 </section>;
}
export default function Ledger({state,user,mutate,busy,remove,config,online=true,notice}){
 const today=japanDate(),onTrip=state.days.some(d=>d.date===today);
 const [day,setDay]=useState(onTrip?today:''),[form,setForm]=useState(null);
 const all=expenseSummary(state),one=day?expenseSummary(state,{day}):null;
 const list=expenses(state).filter(e=>!day||e.day===day);
 const shown=one||all;
 return <>
  <p className="eyebrow">WHERE THE MONEY WENT</p>
  <PageTitle help={<><p>What we spend, in yen as the receipt says, with dollars at the family’s shared rate of {rateText(all.rate)}{rateIsSet(state)?'':' (an estimate until the rate is set on the FX page)'}. The boys’ own money is under Spending money.</p></>}>Family spending</PageTitle>
  <div className="ledger-totals">
   <div><small>Whole trip</small><strong>{yen(all.total)}</strong><span>{aud(all.aud)}</span>{all.dailyAverage!==null&&<small>about {yen(all.dailyAverage)} a day</small>}</div>
   {one&&<div><small>{dayLabel(day)}</small><strong>{yen(one.total)}</strong><span>{aud(one.aud)}</span>
    {one.budget&&<small className={one.overBudget>0?'over':''}>{one.overBudget>0?`${yen(one.overBudget)} over`:`${yen(-one.overBudget)} left`} of {yen(one.budget)}</small>}</div>}
  </div>
  <Runway state={state} user={user}/>
  <BalanceCard state={state} mutate={mutate} busy={busy}/>
  {!form&&<div className="row wrap"><button className="primary" onClick={()=>setForm({})}><Plus size={16}/> Add a payment</button>
   <button disabled={!all.count} onClick={()=>download('japan-family-spending.csv',expensesCsv(state),'text/csv')}><Download size={16}/> Spreadsheet</button></div>}
  {form&&<ExpenseForm state={state} user={user} day={day||today} editing={form.id?form:null} mutate={mutate} busy={busy} done={()=>setForm(null)} config={config} online={online} notice={notice}/>}
  <IcCards state={state} mutate={mutate} busy={busy}/>
  <label className="ledger-show">Show<select value={day} onChange={e=>setDay(e.target.value)}><option value="">The whole trip</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)}</option>)}</select></label>
  {shown.total>0&&<>
   <Breakdown title="By category" values={shown.byCategory} label={expenseCategoryLabel} total={shown.total} rate={shown.rate}/>
   <Breakdown title="By how we paid" values={shown.byMethod} label={payMethodLabel} total={shown.total} rate={shown.rate}/>
   <Breakdown title="By who paid" values={shown.byPayer} label={n=>n} total={shown.total} rate={shown.rate}/>
  </>}
  <h2>{day?'Payments that day':'Every payment'}</h2>
  {!list.length&&<p>Nothing entered yet.</p>}
  <ul className="ledger-list">{list.map(e=><li key={e.id}>
   <div><strong>{e.title}</strong><small>{e.day?dayLabel(e.day):'Not on a trip day'} · {expenseCategoryLabel(e.category)} · {payMethodLabel(e.method)} · {e.paidBy}{e.own?' · own':''}{e.pending?' · Waiting to sync':''}{e.receipt&&!e.pending&&<> · <a href={receiptUrl(e)} target="_blank" rel="noopener noreferrer"><Paperclip size={12}/> receipt</a></>}</small>{e.notes&&<small>{e.notes}</small>}</div>
   <div className="ledger-amount"><strong>{yen(e.yen)}</strong><small>{aud(yenToAud(e.yen,all.rate))}</small></div>
   {!e.pending&&<div className="row"><button aria-label={`Change ${e.title}`} onClick={()=>setForm(e)}><Pencil size={15}/></button>
    <button aria-label={`Remove ${e.title}`} disabled={busy} onClick={()=>remove({type:'expenseRemove',id:e.id},{type:'expenseAdd',title:e.title,yen:e.yen,category:e.category,method:e.method,paidBy:e.paidBy,day:e.day,notes:e.notes,own:e.own,receipt:e.receipt||null,at:e.createdAt},`${e.title} removed.`)}><Trash2 size={15}/></button></div>}
  </li>)}</ul>
 </>;
}
