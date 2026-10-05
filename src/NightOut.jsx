import React,{useState} from 'react';
import {Moon,Wine,Martini,Music,IceCreamCone,X,ExternalLink,Plus,Footprints,Search,Hotel} from 'lucide-react';
import {InBar} from './home-bar.js';
import {nightShows,nightOf,nightAnchor,nightPlanned,moodsFor,moodOf,whoFor,nightStep,WHO,VIBES,PAYS} from './night-out-data.js';
import GuideByline from './GuideByline.jsx';
// After dinner, on Home in the evening: somewhere for a nightcap, a drink, a night out or a late
// treat near tonight's hotel. Each person chooses what they are after (the boys see the treat),
// and a grown-up can put a place on the plan as an optional stop. Put away on this phone for the
// day with one tap.
const ICON={nightcap:Martini,drink:Wine,out:Music,treat:IceCreamCone};
const label=(list,id)=>list.find(([k])=>k===id)?.[1]||'';
const KEY=day=>`japan.nightout.dismissed.${day}`;
const wasDismissed=day=>{try{return localStorage.getItem(KEY(day))==='1';}catch{return false;}};
export default function NightOut({state,user,day,today,clock,config,request,accept,mutate,busy,notice,openNearby}){
 const parent=user?.role==='parent',moods=moodsFor(user);
 const [dismissed,setDismissed]=useState(()=>wasDismissed(day)),[mood,setMood]=useState(moods[0]?.id),[who,setWho]=useState('adults'),[want,setWant]=useState(''),[working,setWorking]=useState(false),[time,setTime]=useState('');
 if(!moods.length||!nightShows(state,day,today,clock,dismissed||wasDismissed(day)))return null;
 const m=moodOf(mood),found=nightOf(state,day)[mood],anchor=nightAnchor(state,day),planned=nightPlanned(state,day),going=whoFor(mood,who);
 const dismiss=()=>{try{localStorage.setItem(KEY(day),'1');}catch{}setDismissed(true);};
 async function find(){setWorking(true);try{accept(await request('night-out',{day,mood,who:going,want}));}catch(e){notice?.(e.message);}finally{setWorking(false);}}
 async function addOption(o){
  const step=nightStep(state,day,mood,o,time||m.time,found?.who||going);
  if(await mutate({type:'add',step}))notice?.(`${step.title} is on the plan for ${step.time}, as an option.`);
 }
 const choose=id=>{setMood(id);setTime('');};
 const away=<button type="button" className="icon" aria-label="Not tonight: put this away for today" onClick={dismiss}><X size={17}/></button>;
 return <section className="night-card" aria-label="After dinner">
  <InBar fallback={<div className="section-heading"><h3><Moon size={17}/> After dinner</h3>{away}</div>}>{away}</InBar>
  {planned.length>0&&<p className="night-planned">On the plan as an option: {planned.map(s=>`${s.title}${s.time?` at ${s.time}`:''}`).join('; ')}.</p>}
  <p>{parent?'What are you after tonight?':'Fancy a late treat?'} Near {anchor.label}.</p>
  {moods.length>1&&<div className="night-moods" role="radiogroup" aria-label="What you are after">
   {moods.map(x=>{const Icon=ICON[x.id];return <button type="button" role="radio" key={x.id} aria-checked={mood===x.id} className={mood===x.id?'is-on':''} onClick={()=>choose(x.id)}><Icon size={15}/>{x.label}</button>;})}
  </div>}
  {(mood==='drink'||mood==='out')&&<div className="night-who" role="radiogroup" aria-label="Who is going">
   {WHO.map(([id,text])=><button type="button" role="radio" key={id} aria-checked={who===id} className={who===id?'is-on':''} onClick={()=>setWho(id)}>{text}</button>)}
  </div>}
  <label className="night-want">Anything in particular?<input value={want} maxLength={80} placeholder={mood==='treat'?'Parfait, ice cream, hot chocolate…':mood==='out'?'Jazz, a yokocho, a view…':'Whisky, sake, a quiet corner…'} onChange={e=>setWant(e.target.value)}/></label>
  <div className="row wrap">
   {config?.nightOut&&<button type="button" className="primary" disabled={working||busy} onClick={find}><Search size={16}/>{working?'Looking…':found?'Look again':`Find ${m.id==='treat'?'a treat':m.id==='out'?'somewhere to go':m.id==='nightcap'?'a nightcap':'a bar'}`}</button>}
   {openNearby&&<button type="button" onClick={openNearby}><Footprints size={16}/>What’s near here</button>}
  </div>
  {found&&<div className="night-found">
   <GuideByline state={state} verb='Picked by'/>
   <p><small>For {found.by}{found.want?`, after ${found.want}`:''} · {found.who==='family'?'with the boys':'just the grown-ups'}</small></p>
   {parent&&<label className="dinner-time">Go at<input type="time" value={time||m.time} onChange={e=>setTime(e.target.value)}/></label>}
   {found.options.map((o,i)=><article key={i} className="dinner-option night-option">
    <strong>{o.title}</strong>{o.japanese&&<span lang="ja" className="dinner-ja"> {o.japanese}</span>}
    <p><small>{[o.kind,o.inHotel?'in the hotel':o.walkMinutes!=null?`${o.walkMinutes} min walk`:'',o.priceBand,o.rating?`Google ${o.rating}★${o.ratingCount?` (${o.ratingCount})`:''}`:''].filter(Boolean).join(' · ')}</small></p>
    <ul className="dinner-flags">
     {o.inHotel&&<li className="good"><Hotel size={12}/> In the hotel</li>}
     <li>{label(VIBES,o.vibe)}</li>
     {o.kidsWelcome&&<li className="good">Kids welcome</li>}
     {o.nonSmoking===true&&<li className="good">Non-smoking</li>}{o.nonSmoking===false&&<li className="warn">Smoking allowed</li>}
     {o.cover&&<li className="warn">Cover: {o.cover}</li>}
     {o.pay==='cash'&&<li className="warn">{label(PAYS,o.pay)}</li>}
    </ul>
    {o.why&&<p>{o.why}</p>}
    {o.openNote&&<p><small>{o.openNote}</small></p>}
    <div className="row wrap">
     {o.website&&<a className="button" href={o.website} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>Website</a>}
     {parent&&<button type="button" className="primary" disabled={busy} onClick={()=>addOption(o)}><Plus size={15}/>Add as an option</button>}
    </div>
   </article>)}
   {!parent&&<p><small>Show a grown-up to put one on the plan.</small></p>}
   {found.note&&<p><small>{found.note}</small></p>}
   <small>Looked up on the web: hours, last orders and cover charges change, so check before walking far.</small>
  </div>}
  <div className="row wrap"><button type="button" onClick={dismiss}>Not tonight</button></div>
 </section>;
}
