import React,{useState} from 'react';
import {Plus,Trash2,Pencil,Download,X} from 'lucide-react';
import {EXPENSE_CATEGORIES,PAY_METHODS,PAYERS,expenses,expenseSummary,expensesCsv,expenseCategoryLabel,payMethodLabel,yenToAud,rateIsSet} from './trip-features.js';
import {yen,aud,rateText} from './Currency.jsx';
import {dayLabel} from './AdventurePages.jsx';
import {japanDate} from './timing.js';
// What Damien and Lauren spend, in yen as the receipt says, with dollars at the shared rate.
// Adding one works with no signal, because a payment happens at a till, not near a router.
function download(name,data,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function Breakdown({title,values,label,total,rate}){
 const rows=Object.entries(values).sort((a,b)=>b[1]-a[1]);
 if(!rows.length)return null;
 return <div className="ledger-breakdown"><h3>{title}</h3>{rows.map(([id,v])=><div key={id} className="ledger-bar">
  <span>{label(id)}</span><span className="ledger-track"><span style={{width:`${Math.max(2,Math.round(v/total*100))}%`}}/></span>
  <span>{yen(v)} <small>{aud(yenToAud(v,rate))}</small></span></div>)}</div>;
}
function ExpenseForm({state,user,day,editing,mutate,busy,done}){
 const payer=PAYERS.includes(user.name)?user.name:PAYERS[0];
 async function save(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  const op={title:String(f.get('title')||'').trim(),yen:Number(String(f.get('yen')||'').replace(/[^\d]/g,'')),category:f.get('category'),
   method:f.get('method'),paidBy:f.get('paidBy'),day:f.get('day')||null,notes:String(f.get('notes')||'')};
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
  <div className="row wrap"><button className="primary" disabled={busy}>{editing?'Save':'Add payment'}</button><button type="button" onClick={done}>Cancel</button></div>
 </form>;
}
export default function Ledger({state,user,mutate,busy}){
 const today=japanDate(),onTrip=state.days.some(d=>d.date===today);
 const [day,setDay]=useState(onTrip?today:''),[form,setForm]=useState(null);
 const all=expenseSummary(state),one=day?expenseSummary(state,{day}):null;
 const list=expenses(state).filter(e=>!day||e.day===day);
 const shown=one||all;
 return <>
  <p className="eyebrow">WHERE THE MONEY WENT</p>
  <h1>Family spending</h1>
  <p>What we spend, in yen as the receipt says, with dollars at the family’s shared rate of {rateText(all.rate)}{rateIsSet(state)?'':' (an estimate until the rate is set on the Yen page)'}. The boys’ own money is under Spending money.</p>
  <div className="ledger-totals">
   <div><small>Whole trip</small><strong>{yen(all.total)}</strong><span>{aud(all.aud)}</span>{all.dailyAverage!==null&&<small>about {yen(all.dailyAverage)} a day</small>}</div>
   {one&&<div><small>{dayLabel(day)}</small><strong>{yen(one.total)}</strong><span>{aud(one.aud)}</span>
    {one.budget&&<small className={one.overBudget>0?'over':''}>{one.overBudget>0?`${yen(one.overBudget)} over`:`${yen(-one.overBudget)} left`} of {yen(one.budget)}</small>}</div>}
  </div>
  {!form&&<div className="row wrap"><button className="primary" onClick={()=>setForm({})}><Plus size={16}/> Add a payment</button>
   <button disabled={!all.count} onClick={()=>download('japan-family-spending.csv',expensesCsv(state),'text/csv')}><Download size={16}/> Spreadsheet</button></div>}
  {form&&<ExpenseForm state={state} user={user} day={day||today} editing={form.id?form:null} mutate={mutate} busy={busy} done={()=>setForm(null)}/>}
  <label className="ledger-show">Show<select value={day} onChange={e=>setDay(e.target.value)}><option value="">The whole trip</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)}</option>)}</select></label>
  {shown.total>0&&<>
   <Breakdown title="By category" values={shown.byCategory} label={expenseCategoryLabel} total={shown.total} rate={shown.rate}/>
   <Breakdown title="By how we paid" values={shown.byMethod} label={payMethodLabel} total={shown.total} rate={shown.rate}/>
   <Breakdown title="By who paid" values={shown.byPayer} label={n=>n} total={shown.total} rate={shown.rate}/>
  </>}
  <h2>{day?'Payments that day':'Every payment'}</h2>
  {!list.length&&<p>Nothing entered yet.</p>}
  <ul className="ledger-list">{list.map(e=><li key={e.id}>
   <div><strong>{e.title}</strong><small>{e.day?dayLabel(e.day):'Not on a trip day'} · {expenseCategoryLabel(e.category)} · {payMethodLabel(e.method)} · {e.paidBy}{e.pending?' · Waiting to sync':''}</small>{e.notes&&<small>{e.notes}</small>}</div>
   <div className="ledger-amount"><strong>{yen(e.yen)}</strong><small>{aud(yenToAud(e.yen,all.rate))}</small></div>
   {!e.pending&&<div className="row"><button aria-label={`Change ${e.title}`} onClick={()=>setForm(e)}><Pencil size={15}/></button>
    <button aria-label={`Remove ${e.title}`} disabled={busy} onClick={()=>{if(confirm(`Remove ${e.title}?`))mutate({type:'expenseRemove',id:e.id});}}><Trash2 size={15}/></button></div>}
  </li>)}</ul>
 </>;
}
