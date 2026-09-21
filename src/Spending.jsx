import React,{useState} from 'react';
import {PiggyBank,Plus,Trash2,ShoppingBag,ListChecks,CalendarDays,Check,AlertCircle,Wallet,X} from 'lucide-react';
import {BOYS,purse,spendItemsFor,topUpsFor,allowanceFor,allowanceDays,spendCost,buyTodosFor,yenPerAud,yenToAud} from './trip-features.js';
import {dayLabel} from './AdventurePages.jsx';
import {japanClock,japanDate} from './timing.js';
const yen=n=>`¥${Math.round(n||0).toLocaleString('en-AU')}`;
const dollars=(n,rate)=>`$${yenToAud(Math.abs(n||0),rate).toFixed(2)}`;
// Both figures, always: a boy thinks in yen while he is standing in the shop and in dollars when
// he works out whether it was worth it.
const both=(n,rate)=>`${n<0?'−':''}${yen(Math.abs(n))} · ${dollars(n,rate)}`;
// Blank is not zero: leaving the price out means “whatever we guessed”, not “it was free”.
const asYen=v=>{const t=String(v??'').replace(/[^\d.-]/g,'');if(!t)return null;const n=Math.round(Number(t));return Number.isFinite(n)?n:null;};

// The whole purse in one bar. Money already spent fills it from the left, the things still on the
// list sit beside it in a lighter shade, and whatever stays empty is money that is genuinely free.
// When the two together run past what went in, the bar shows the overrun and marks where the money
// actually ran out, rather than quietly clipping it off at the end.
export function PurseMeter({total,spent,planned}){
 const scale=Math.max(total,spent+planned,1);
 const pct=n=>`${Math.max(0,Math.min(100,(n/scale)*100))}%`;
 const over=spent+planned>total;
 return <div className={`purse-meter${over?' over':''}`} role="img"
  aria-label={`${yen(spent)} spent and ${yen(planned)} still to buy, out of ${yen(total)}`}>
  <span className="purse-spent" style={{width:pct(spent)}}/>
  <span className="purse-planned" style={{width:pct(planned)}}/>
  {over&&<i className="purse-limit" style={{left:pct(total)}} aria-hidden="true"/>}
 </div>;
}

// One thing a boy wants, or has already bought. Ticking it is the moment it turns into money out,
// so that is also the moment he is asked what it really cost — inline, because a guess written
// down weeks ago is not a balance and a browser prompt box is not an answer a child will read.
function SpendRow({item,user,rate,mine,busy,mutate,onEdit}){
 const bought=!!item.boughtAt,[asking,setAsking]=useState(false);
 async function record(e){
  e.preventDefault();
  const spent=asYen(new FormData(e.currentTarget).get('spent'));
  if(await mutate({type:'spendBought',id:item.id,done:true,spent:spent===null||spent<0?null:spent,by:user.name}))setAsking(false);
 }
 return <div className={`todo-row spend-row${bought?' done':''}`}>
  <label className="todo-tick">
   <input type="checkbox" checked={bought||asking} disabled={busy||!mine}
    onChange={e=>{if(e.target.checked)setAsking(true);else if(bought)mutate({type:'spendBought',id:item.id,done:false,by:user.name});else setAsking(false);}}
    aria-label={`${bought?'Put back on the list':'Mark bought'} ${item.title}`}/>
  </label>
  <div className="todo-body">
   <strong><ShoppingBag size={15}/>{item.title}</strong>
   <small>{bought
    ?`Bought by ${item.boughtBy}${item.boughtAt?` at ${japanClock(new Date(item.boughtAt))}`:''}`
    :item.estimate===null?'No price guessed yet':`About ${both(item.estimate,rate)}`}
    {item.day?` · ${dayLabel(item.day)}`:''}
    {item.todoId?' · From the to-do list':''}
    {item.pending?' · Waiting to sync':''}</small>
   {item.notes&&<p>{item.notes}</p>}
   {asking&&!bought&&<form className="spend-actual" onSubmit={record}>
    <label>What did it actually cost, in yen?
     <input name="spent" inputMode="numeric" autoFocus defaultValue={item.estimate??''} placeholder="1500"/></label>
    <button className="primary" disabled={busy}><Check size={16}/>Bought</button>
    <button type="button" onClick={()=>setAsking(false)}><X size={16}/>Not yet</button>
   </form>}
  </div>
  <div className="spend-amount">
   <strong>{bought?both(spendCost(item),rate):item.estimate===null?'—':both(item.estimate,rate)}</strong>
   {mine&&<div className="todo-actions">
    <button className="icon" aria-label={`Edit ${item.title}`} onClick={()=>onEdit(item)}><CalendarDays size={16}/></button>
    <button className="icon danger" aria-label={`Remove ${item.title}`} disabled={busy}
     onClick={()=>{if(confirm(`Take “${item.title}” off the spending list?`))mutate({type:'spendRemove',id:item.id});}}><Trash2 size={16}/></button>
   </div>}
  </div>
 </div>;
}

export default function Spending({state,user,mutate,busy,go,notice=()=>{},today=japanDate()}){
 const parent=user.role==='parent';
 const boys=BOYS.filter(n=>state.members.includes(n));
 const [person,setPerson]=useState(BOYS.includes(user.name)?user.name:boys[0]);
 const [edit,setEdit]=useState(null),[showMoney,setShowMoney]=useState(false);
 // Every hook has run before this: the page is drawn the same way whoever is holding the phone.
 if(!person)return <><p className="eyebrow">THEIR OWN MONEY</p><h1>Spending money</h1><div className="empty"><PiggyBank/><h2>Nobody has a purse here.</h2><p>Spending money belongs to Nate and Boston, and neither is on this trip.</p></div></>;
 const rate=yenPerAud(state),mine=parent||person===user.name;
 const money=purse(state,person,today),items=spendItemsFor(state,person);
 const plan=allowanceFor(state,person),days=allowanceDays(state,person,today);
 const tops=topUpsFor(state,person),waiting=buyTodosFor(state,person);
 async function save(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  if(await mutate({type:edit.id?'spendEdit':'spendAdd',id:edit.id,person,title:f.get('title'),
   estimate:asYen(f.get('estimate')),day:f.get('day')||null,notes:f.get('notes'),by:user.name}))setEdit(null);
 }
 async function setAllowance(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  const perDay=asYen(f.get('yenPerDay'))??0;
  if(perDay&&!f.get('from')){notice('Choose the day the spending money starts.');return;}
  if(await mutate({type:'spendAllowance',person,yenPerDay:perDay,from:f.get('from')||null,to:f.get('to')||null}))
   notice(perDay?`${person} now gets ${yen(perDay)} a day.`:`${person} no longer gets an amount a day.`);
 }
 async function topUp(e){
  e.preventDefault();const form=e.currentTarget,amount=asYen(new FormData(form).get('yen'));
  if(!amount){notice('Enter how much is going in, in yen.');return;}
  if(await mutate({type:'spendTopUp',person,yen:amount,note:new FormData(form).get('note')}))form.reset();
 }
 return <>
 <p className="eyebrow">THEIR OWN MONEY, THEIR OWN CHOICES</p><h1>Spending money</h1>
 <p>What Nate and Boston have to spend, what they have already spent it on, and what is left. Money goes in by hand or as an amount a day that fills up by itself as the trip runs. Ticking something off is what turns it into money out, and that works with no signal.</p>
 <div className="segmented spend-people">{boys.map(n=>
  <button key={n} className={person===n?'selected':''} onClick={()=>{setPerson(n);setEdit(null);}}>{n}</button>)}</div>

 <section className="purse-card">
  <p className="eyebrow">{person.toUpperCase()}’S PURSE</p>
  <strong className="purse-headline">{yen(money.left)} left</strong>
  <small>{dollars(money.left,rate)} at $1 = {yen(Math.round(rate))} · {yen(money.paidIn)} in, {yen(money.spent)} spent</small>
  <PurseMeter total={money.paidIn} spent={money.spent} planned={money.planned}/>
  <div className="purse-key">
   <span><i className="key-spent"/>Spent {both(money.spent,rate)}</span>
   <span><i className="key-planned"/>Still to buy {both(money.planned,rate)}</span>
   <span><i className="key-left"/>Left {both(money.left,rate)}</span>
  </div>
  {money.planned>0&&money.paidIn>0&&<p className={`purse-after${money.after<0?' short':''}`}>
   {money.after<0
    ? <><AlertCircle size={18}/>Everything still on the list comes to {both(money.planned,rate)}, which is {both(-money.after,rate)} more than there is. Something has to come off the list, or wait for more to go in.</>
    : <><Wallet size={18}/>Buy everything still on the list and {both(money.after,rate)} would be left.</>}
  </p>}
  {!money.paidIn&&<p className="callout"><AlertCircle size={18}/><span><strong>Nothing has gone in yet.</strong> {parent?'Put some in below, or set an amount a day.':'Ask Mum or Dad to put some in.'}</span></p>}
  <small>{plan
   ?`${yen(plan.yenPerDay)} a day from ${dayLabel(plan.from)}${plan.to?` to ${dayLabel(plan.to)}`:' to the end of the trip'} · ${days} day${days===1?'':'s'} paid so far, ${yen(money.allowance)}. Money put in by hand adds ${yen(money.topUps)}.`
   :`No amount a day is set. Everything in this purse (${yen(money.topUps)}) was put in by hand.`}</small>
 </section>

 {parent&&<><button className="spend-toggle" onClick={()=>setShowMoney(s=>!s)}>
   <PiggyBank size={18}/>{showMoney?'Hide money in':`Put money in for ${person}, or set an amount a day`}</button>
 {showMoney&&<section className="feature-card spend-money">
  <h2>Money in for {person}</h2>
  <form className="spend-form" onSubmit={topUp}>
   <div className="form-row">
    <label>How much, in yen<input name="yen" inputMode="numeric" placeholder="2000" required/></label>
    <label>What for<input name="note" maxLength={250} placeholder="Birthday money from Nan"/></label>
   </div>
   <button className="primary" disabled={busy}><Plus size={16}/>Put it in</button>
  </form>
  <h3>An amount a day</h3>
  <p><small>Worked out from the trip’s own days rather than paid out by something running overnight, so the balance is right even on a phone that has been switched off since Kyoto. Set it to 0 to stop it.</small></p>
  <form className="spend-form" key={plan?`${plan.yenPerDay}-${plan.from}-${plan.to}`:'none'} onSubmit={setAllowance}>
   <label>Yen a day<input name="yenPerDay" inputMode="numeric" defaultValue={plan?.yenPerDay??''} placeholder="500"/></label>
   <div className="form-row">
    <label>From<select name="from" defaultValue={plan?.from||''}><option value="">Choose a day</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)}</option>)}</select></label>
    <label>Until<select name="to" defaultValue={plan?.to||''}><option value="">The last day</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)}</option>)}</select></label>
   </div>
   <button disabled={busy}><Check size={16}/>Save the amount a day</button>
  </form>
  {!!tops.length&&<><h3>Put in by hand</h3>
   {tops.map(t=><div className="list-row" key={t.id}>
    <span><strong>{both(t.yen,rate)}</strong><small>{t.note||'No note'} · {t.by} on {japanDate(new Date(t.at))}</small></span>
    <button className="danger" disabled={busy} onClick={()=>{if(confirm(`Take ${yen(t.yen)} back off ${person}’s purse?`))mutate({type:'spendTopUpRemove',id:t.id});}}>Remove</button>
   </div>)}</>}
 </section>}</>}

 {mine&&<button className="primary" onClick={()=>setEdit({title:'',estimate:'',day:'',notes:''})}>
  <Plus size={18}/>Something {person===user.name?'I want':`for ${person}`} to buy</button>}

 {!!waiting.length&&mine&&<section className="spend-fromtodo">
  <div className="section-heading"><div><p className="eyebrow">ALREADY ON THE TO-DO LIST</p><h2>Move one over to buy</h2></div></div>
  <p><small>Things to buy that {person} or the family wrote down. Move one across and it counts against the purse; buying it ticks the job off the to-do list too.</small></p>
  {waiting.map(t=><div className="todo-row" key={t.id}>
   <div className="todo-body">
    <strong><ListChecks size={15}/>{t.title}</strong>
    <small>{t.person==='Family'?'All of us':`For ${t.person}`}{t.day?` · ${dayLabel(t.day)}`:''}</small>
   </div>
   <button disabled={busy} onClick={()=>mutate({type:'spendAdd',person,title:t.title,notes:t.notes,day:t.day,todoId:t.id,by:user.name})}>
    <Plus size={16}/>Add to buy</button>
  </div>)}
 </section>}

 <section className="todo-group">
  <h2>{money.waiting} still to buy · {money.bought} bought</h2>
  {items.map(item=><SpendRow key={item.id} item={item} user={user} rate={rate} mine={mine} busy={busy} mutate={mutate} onEdit={setEdit}/>)}
  {!items.length&&<div className="empty"><ShoppingBag/><h2>Nothing on the list yet.</h2>
   <p>Write down what {person} wants to buy with a guess at the price, and the bar above shows whether the money stretches to all of it.</p></div>}
 </section>

 {edit&&mine&&<form key={edit.id||'new'} className="feature-card" onSubmit={save}>
  <h2>{edit.id?'Edit this one':`Something for ${person} to buy`}</h2>
  <label>What is it?<input name="title" required maxLength={250} autoFocus defaultValue={edit.title||''} placeholder="A Beyblade · a card pack · a Gachapon"/></label>
  <div className="form-row">
   <label>Roughly what does it cost, in yen?<input name="estimate" inputMode="numeric" defaultValue={edit.estimate??''} placeholder="1500"/></label>
   <label>Which day<select name="day" defaultValue={edit.day||''}><option value="">Any day</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.city}</option>)}</select></label>
  </div>
  <label>Notes<textarea name="notes" maxLength={2000} defaultValue={edit.notes||''} placeholder="Which shop, which one, what colour"/></label>
  <div className="row wrap"><button className="primary" disabled={busy}>{edit.id?'Save':'Add it'}</button><button type="button" onClick={()=>setEdit(null)}>Cancel</button></div>
 </form>}

 {go&&<p className="callout"><ShoppingBag size={18}/><span>Things the whole family is buying — with shops, links and quantities — live on the <button onClick={()=>go('shopping')}>Shopping list</button>. This page is the boys’ own money.</span></p>}
 </>;
}
