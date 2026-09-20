import React,{useState} from 'react';
import {RefreshCw,Check,AlertCircle,ArrowLeftRight} from 'lucide-react';
import {yenPerAud,rateIsSet,yenToAud,audToYen,DEFAULT_YEN_PER_AUD} from './trip-features.js';
import {japanClock,japanDate} from './timing.js';
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
 const [amount,setAmount]=useState('1000'),[from,setFrom]=useState('JPY');
 const [checking,setChecking]=useState(false),[found,setFound]=useState(null),[failed,setFailed]=useState('');
 const parent=user.role==='parent';
 const value=Number(String(amount).replace(/[^\d.]/g,''))||0;
 const converted=from==='JPY'?aud(yenToAud(value,rate)):yen(audToYen(value,rate));
 async function check(){
  setChecking(true);setFailed('');setFound(null);
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
  <p>Everything in Japan is priced in yen. This converts either way, works with no signal, and uses one rate the whole family shares.</p>
  {!set&&<p className="callout"><AlertCircle size={18}/><span><strong>No one has set the rate yet.</strong> The converter is using an estimate of {rateText(DEFAULT_YEN_PER_AUD)} to the dollar. {parent?'Set the real one below.':'Ask Damien or Lauren to set the real one.'}</span></p>}

  <section className="rate-card">
   <p className="eyebrow">TODAY’S RATE</p>
   <strong className="rate-headline">$1 = {rateText(rate)}</strong>
   <small>{set
    ?`Set by ${state.rates.by} on ${japanDate(new Date(state.rates.at))} at ${japanClock(new Date(state.rates.at))} JST${state.rates.source==='live'?' from the ECB reference rate':''}.`
    :'Estimate only — not set by anyone yet.'}</small>
   {parent&&<div className="row wrap">
    <button disabled={busy||checking} onClick={check}><RefreshCw size={16}/>{checking?'Checking…':'Check today’s rate'}</button>
   </div>}
   {found&&<div className="rate-found"><span>Found <strong>$1 = {rateText(found.perAud)}</strong>{found.date?` (${found.date})`:''}</span>
    <button className="primary" disabled={busy} onClick={()=>save(found.perAud,'live')}><Check size={16}/>Use this</button></div>}
   {failed&&<p className="callout"><AlertCircle size={18}/>{failed}</p>}
   {parent&&<form className="rate-manual" onSubmit={async e=>{e.preventDefault();const v=Number(new FormData(e.currentTarget).get('perAud'));if(!Number.isFinite(v)||v<1||v>1000){notice('Enter how many yen one dollar buys.');return;}await save(v,'manual');}}>
    <label>Set it by hand — yen per $1<input name="perAud" type="number" step="0.01" min="1" max="1000" defaultValue={rate} inputMode="decimal"/></label>
    <button disabled={busy}>Save rate</button>
   </form>}
   <small>A reference rate. What your card or an ATM actually gives you will be a little worse once fees and the spread are taken out — treat this as “near enough”, not exact.</small>
  </section>

  <section className="converter">
   <div className="segmented">
    <button className={from==='JPY'?'selected':''} onClick={()=>setFrom('JPY')}>Yen → dollars</button>
    <button className={from==='AUD'?'selected':''} onClick={()=>setFrom('AUD')}>Dollars → yen</button>
   </div>
   <label>{from==='JPY'?'Price in yen':'Amount in dollars'}
    <input value={amount} inputMode="decimal" onChange={e=>setAmount(e.target.value)} placeholder={from==='JPY'?'1000':'20'}/></label>
   <p className="converted"><ArrowLeftRight size={18}/><strong>{converted}</strong></p>
  </section>

  <h2>At a glance</h2>
  <div className="rate-table">{COMMON.map(n=><div className="rate-row" key={n}><span>{yen(n)}</span><strong>{aud(yenToAud(n,rate))}</strong></div>)}</div>
  <p><small>Handy rule of thumb: drop two zeros from the yen price and you are within a few cents of the dollar amount at around {yen(100)} to the dollar.</small></p>
 </>;
}
