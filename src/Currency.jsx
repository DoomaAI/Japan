import React,{useState} from 'react';
import {RefreshCw,Check,AlertCircle,ArrowUpDown,ChevronDown,Delete} from 'lucide-react';
import {yenPerAud,rateIsSet,yenToAud,audToYen,DEFAULT_YEN_PER_AUD} from './trip-features.js';
import {japanClock,japanDate} from './timing.js';
import Runway from './Runway.jsx';
import {press,KEYS,shown} from './numpad-data.js';
// European Central Bank reference rates, free and no key. Strictly optional: the converter
// works from the saved rate alone, so if this is unreachable nothing breaks.
const RATE_SOURCE='https://api.frankfurter.dev/v1/latest?base=AUD&symbols=JPY';
export const yen=n=>`¥${Math.round(n).toLocaleString()}`;
// The rate itself keeps its cents — ¥101.37 rounded to ¥101 misreports what we are converting at.
export const rateText=n=>`¥${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const aud=n=>`$${n.toFixed(2)}`;
const COMMON=[100,300,500,1000,2000,3000,5000,10000];
export default function Currency({state,user,mutate,busy,notice}){
 const rate=yenPerAud(state),set=rateIsSet(state);
 const [amount,setAmount]=useState(''),[from,setFrom]=useState('JPY');
 const [checking,setChecking]=useState(false),[found,setFound]=useState(null),[failed,setFailed]=useState('');
 // Collapsed to one line by default; opens itself while no one has set a rate yet.
 const [open,setOpen]=useState(!set);
 const parent=user.role==='parent';
 async function check(){
  setChecking(true);setFailed('');setFound(null);setOpen(true);
  try{
   const r=await fetch(RATE_SOURCE);
   if(!r.ok)throw new Error('no');
   const data=await r.json(),live=data?.rates?.JPY;
   if(!Number.isFinite(live)||live<1||live>1000)throw new Error('no');
   setFound({perAud:Math.round(live*100)/100,date:data.date||''});
  }catch{setFailed('Could not reach the rate service. Enter the rate yourself — the converter works either way.');}
  finally{setChecking(false);}
 }
 async function save(perAud,source){
  if(await mutate({type:'exchangeRate',perAud,source})){setFound(null);notice(`Rate saved: $1 = ${rateText(perAud)}`);}
 }
 return <>
  {/* The tool comes first; the rate it uses and how it works sit under it. */}
  <section className="converter">
   <NumberPad amount={amount} setAmount={setAmount} from={from} setFrom={setFrom} rate={rate}/>
  </section>
  <Runway state={state} user={user}/>
  {!set&&<p className="callout"><AlertCircle size={18}/><span><strong>Using an estimate of {rateText(DEFAULT_YEN_PER_AUD)} to the dollar.</strong> {parent?'Set the real rate below.':'Ask Damien or Lauren to set the real rate.'}</span></p>}
  <section className={`rate-card${open?' open':''}`}>
   <div className="rate-line">
    <button type="button" className="rate-toggle" aria-expanded={open} onClick={()=>setOpen(o=>!o)}>
     <span className="eyebrow">TODAY’S RATE</span>
     <strong className="rate-headline">$1 = {rateText(rate)}</strong>
     <ChevronDown size={18} className="rate-chevron"/>
    </button>
    {parent&&<button type="button" className="rate-refresh" disabled={busy||checking} onClick={check} aria-label="Check today’s rate" title="Check today’s rate"><RefreshCw size={18} className={checking?'spin':''}/></button>}
   </div>
   {open&&<div className="rate-body">
    <small>{set
     ?`Set by ${state.rates.by} on ${japanDate(new Date(state.rates.at))} at ${japanClock(new Date(state.rates.at))} JST${state.rates.source==='live'?' from the ECB reference rate':''}.`
     :'Estimate only — not set by anyone yet.'}</small>
    {checking&&<small>Checking today’s rate…</small>}
    {found&&<div className="rate-found"><span>Found <strong>$1 = {rateText(found.perAud)}</strong>{found.date?` (${found.date})`:''}</span>
     <button className="primary" disabled={busy} onClick={()=>save(found.perAud,'live')}><Check size={16}/>Use this</button></div>}
    {failed&&<p className="callout"><AlertCircle size={18}/>{failed}</p>}
    {parent&&<form className="rate-manual" onSubmit={async e=>{e.preventDefault();const v=Number(new FormData(e.currentTarget).get('perAud'));if(!Number.isFinite(v)||v<1||v>1000){notice('Enter how many yen one dollar buys.');return;}await save(v,'manual');}}>
     <label>Set it by hand — yen per $1<input name="perAud" type="number" step="0.01" min="1" max="1000" defaultValue={rate} inputMode="decimal"/></label>
     <button disabled={busy}>Save rate</button>
    </form>}
    <small>A reference rate. What your card or an ATM actually gives you will be a little worse once fees and the spread are taken out — treat this as “near enough”, not exact.</small>
   </div>}
  </section>


  <h2>At a glance</h2>
  <div className="rate-table">{COMMON.map(n=><div className="rate-row" key={n}><span>{yen(n)}</span><strong>{aud(yenToAud(n,rate))}</strong></div>)}</div>
  <p><small>Handy rule of thumb: drop two zeros from the yen price and you are within a few cents of the dollar amount at around {yen(100)} to the dollar.</small></p>
 </>;
}
// The pad: the amount large, its conversion under it, a flip that swaps the direction and carries
// the answer across, and twelve keys. Each digit rolls in as it lands; with reduced motion it
// simply appears.
function NumberPad({amount,setAmount,from,setFrom,rate}){
 const value=Number(String(amount).replace(/[^\d.]/g,''))||0;
 const other=from==='JPY'?'AUD':'JPY';
 const converted=from==='JPY'?yenToAud(value,rate):audToYen(value,rate);
 const flip=()=>{setFrom(other);setAmount(value?(other==='JPY'?String(Math.round(converted)):converted.toFixed(2).replace(/\.00$/,'')):'');};
 const text=shown(amount,from);
 return <div className="numpad">
  <p className="numpad-label">{from==='JPY'?'Price in yen':'Amount in dollars'}</p>
  <output className="numpad-amount" aria-live="polite" aria-label={text}>{[...text].map((c,i)=><span key={`${i}-${c}-${text.length}`} className="numpad-digit">{c}</span>)}</output>
  <div className="numpad-result"><strong>{from==='JPY'?aud(converted):yen(converted)}</strong>
   <button type="button" className="numpad-flip" onClick={flip} aria-label={`Switch to ${other==='JPY'?'yen to dollars':'dollars to yen'}`}><ArrowUpDown size={18}/>{from==='JPY'?'Yen → dollars':'Dollars → yen'}</button></div>
  <div className="numpad-keys">{KEYS(from).map(k=><button type="button" key={k} className="numpad-key" aria-label={k==='back'?'Delete the last digit':k} onClick={()=>setAmount(a=>press(a,k,from))}
   onContextMenu={k==='back'?e=>{e.preventDefault();setAmount('');}:undefined}>{k==='back'?<Delete size={22}/>:k}</button>)}</div>
  {amount&&<button type="button" className="linkish numpad-clear" onClick={()=>setAmount('')}>Clear</button>}
 </div>;
}
