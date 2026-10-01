import React,{useState} from 'react';
import {SearchX,Phone,ExternalLink,Copy,ShieldAlert,Receipt,Ticket} from 'lucide-react';
import {ITEMS,COLOURS,desksFor,lostDraft,KOBAN,POLICE_LINKS,CLAIM,claimSummary} from './lost-data.js';
import {activeSteps} from './timing.js';
import {LINES,routeFor} from './route-data.js';
const tel=n=>`tel:${n.replace(/[^+\d]/g,'')}`;
// Lost something: the words, the right desk for the day, the kōban, and the claim.
export default function Lost({state,user,day,go,notice}){
 const parents=['Damien','Lauren'].map(n=>(state?.contacts||{})[n]||'').filter(Boolean);
 const [form,setForm]=useState({item:'wallet',colour:'',detail:'',where:'',when:'',phone:parents[0]||'',stepId:''});
 const set=(k,v)=>setForm(f=>({...f,[k]:v}));
 const steps=activeSteps(state||{days:[],steps:[]},day);
 const lines=[...new Set(steps.flatMap(s=>(routeFor(s)||[]).filter(l=>l.mode==='ride').map(l=>l.line)))].filter(id=>LINES[id]);
 const {today,rest}=desksFor(state,day);
 const draft=lostDraft(form);
 const copy=async text=>{try{await navigator.clipboard.writeText(text);notice?.('Copied.');}catch{notice?.('Select the text and copy it.');}};
 const insurance=(state?.documents||[]).filter(d=>d.category!=='memory'&&(d.tags||[]).some(t=>/insurance/i.test(t)));
 const stepTitle=steps.find(s=>s.id===form.stepId)?.title||'';
 const Desk=({d})=><li key={d.id} className="lost-desk"><strong>{d.operator}</strong><span>{d.title}</span>{d.hours&&<small>{d.hours}</small>}{d.note&&<small>{d.note}</small>}<span className="row wrap">{d.phone&&<a className="button" href={tel(d.phone)}><Phone size={14}/> {d.phone}</a>}{d.url&&<a className="button" href={d.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Their page</a>}</span></li>;
 return <>
  <p className="eyebrow">IT WILL PROBABLY COME BACK</p><h1>Lost something</h1>
  <p>Japan returns most things. The trick is the right desk, the right words and the police slip. Fill in what it was and the page writes the Japanese, names the desk for today’s trains and parks, and lists what the insurer will ask for.</p>
  <section className="arrival-part"><h2><SearchX size={20}/> What and where</h2>
   <div className="document-filters">
    <label>What<select value={form.item} onChange={e=>set('item',e.target.value)}>{ITEMS.map(([id,en])=><option key={id} value={id}>{en}</option>)}</select></label>
    <label>Colour<select value={form.colour} onChange={e=>set('colour',e.target.value)}>{COLOURS.map(([id,en])=><option key={id||'none'} value={id}>{en||'—'}</option>)}</select></label>
    <label>Where<select value={form.where} onChange={e=>set('where',e.target.value)}><option value="">—</option>{lines.map(id=><option key={id} value={`on the ${LINES[id].name}`}>on the {LINES[id].name}</option>)}<option value="in a taxi">in a taxi</option><option value="at the hotel">at the hotel</option><option value="in the park">in the park</option><option value="in a shop">in a shop or restaurant</option><option value="at the station">at the station</option></select></label>
    <label>Which stop<select value={form.stepId} onChange={e=>set('stepId',e.target.value)}><option value="">—</option>{steps.map(s=><option key={s.id} value={s.id}>{s.time?`${s.time} `:''}{s.title}</option>)}</select></label>
    <label>When<input value={form.when} onChange={e=>set('when',e.target.value)} placeholder="this morning · about 3 pm"/></label>
    <label>Anything else<input value={form.detail} onChange={e=>set('detail',e.target.value)} placeholder="a Pokémon keyring on it"/></label>
    <label>Our number<input value={form.phone} onChange={e=>set('phone',e.target.value)} inputMode="tel" placeholder={parents[0]||'+61 …'}/></label>
   </div>
   <div className="lost-card"><h2>落とし物 · Lost property</h2>{draft.ja.map(l=><p key={l} className="japanese" lang="ja"><strong>{l}</strong></p>)}{draft.en.map(l=><p key={l}>{l}</p>)}</div>
   <button type="button" onClick={()=>copy(draft.text)}><Copy size={16}/> Copy the words</button>
  </section>
  <section className="arrival-part"><h2><Phone size={20}/> The right desk today</h2>
   {today.length?<ul className="lost-desks">{today.map(d=><Desk key={d.id} d={d}/>)}</ul>:<p>No trains or parks on this day’s cards. The desks below cover the rest.</p>}
   <details><summary>Every other desk</summary><ul className="lost-desks">{rest.map(d=><Desk key={d.id} d={d}/>)}</ul></details>
  </section>
  <section className="arrival-part"><h2><ShieldAlert size={20}/> The police report</h2>
   <ol className="arrival-steps">{KOBAN.map(k=><li key={k}><span>{k}</span></li>)}</ol>
   <p className="row wrap">{POLICE_LINKS.map(([label,url])=><a key={url} className="button" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> {label}</a>)}</p>
  </section>
  <section className="arrival-part"><h2><Receipt size={20}/> For the insurance claim</h2>
   <ul>{CLAIM.map(([id,text])=><li key={id}>{text}</li>)}</ul>
   {insurance.length?<ul>{insurance.map(d=><li key={d.id}><strong>{d.title}</strong>{d.reference&&<> · {d.reference}</>}</li>)}</ul>:<p><small>Nothing tagged <strong>insurance</strong> in Tickets yet; the policy shows here once it is.</small></p>}
   <p className="row wrap"><button type="button" onClick={()=>copy(claimSummary({draft,day,stepTitle,policy:insurance[0]?.reference||''}))}><Copy size={16}/> Copy a claim summary</button>{go&&<><button type="button" onClick={()=>go('ledger')}><Receipt size={16}/> Receipts</button><button type="button" onClick={()=>go('tickets')}><Ticket size={16}/> Tickets</button></>}</p>
  </section>
 </>;
}
