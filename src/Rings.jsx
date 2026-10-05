import React,{useContext,useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {SlidersHorizontal} from 'lucide-react';
import {RINGS,ringsFor,dayScore,cleanRings,shownRings,SCORED} from './rings-data.js';
import {useWobble,mergeVisible} from './wobble.js';
import {HomeBarSlot} from './home-bar.js';
// Rings for the day, drawn the way a loyalty app draws its progress: an open gauge each, the
// count in the middle and "2 of 5" underneath. Three fit across the card; any more and the row
// scrolls sideways. Which rings, and their order, belong to this person on this phone: the
// slider button chooses them, and press and hold sets the row wobbling to drag them about.
// Under Home's "Your rings" bar the count closed and the slider sit in the bar, and the card
// draws no heading of its own.
const COLOURS={stops:'var(--ring-stops,#e2583e)',photos:'var(--ring-photos,#3f8f6e)',phrase:'var(--ring-phrase,#3d6fb6)',
 fact:'var(--ring-fact,#c08a1e)',rated:'var(--ring-rated,#8a4fb0)',voice:'var(--ring-voice,#2a8a9a)'};
// 270 degrees of a circle, open at the bottom.
const R=40,SWEEP=0.75,LEN=2*Math.PI*R*SWEEP;
function Gauge({ring}){
 const arc={cx:50,cy:50,r:R,fill:'none',strokeWidth:9,strokeLinecap:'round',transform:'rotate(135 50 50)'};
 return <svg viewBox="0 0 100 92" className="gauge-art" aria-hidden="true">
  <circle {...arc} className="gauge-track" strokeDasharray={`${LEN} 999`}/>
  {ring.done>0&&<circle {...arc} stroke={COLOURS[ring.id]} strokeDasharray={`${Math.max(0.001,ring.share)*LEN} 999`}/>}
  <text x="50" y="58" textAnchor="middle" className="gauge-number">{ring.closed&&ring.target===1?'✓':ring.done}</text>
 </svg>;
}
const read=name=>{try{return cleanRings(JSON.parse(localStorage.getItem(`japan.rings.${name}`)||'null'));}catch{return cleanRings(null);}};
export default function Rings({state,user,day}){
 const me=user?.name&&state.members?.includes(user.name)?user.name:null;
 const [prefs,setPrefs]=useState(()=>read(me)),[choosing,setChoosing]=useState(false),slot=useContext(HomeBarSlot);
 useEffect(()=>{if(me)setPrefs(read(me));},[me]);
 const save=next=>{const clean=cleanRings(next);setPrefs(clean);try{localStorage.setItem(`japan.rings.${me}`,JSON.stringify(clean));}catch{}};
 const ids=shownRings(prefs);
 const w=useWobble({ids,onMove:next=>save({...prefs,order:mergeVisible(prefs.order,next)})});
 if(!me)return null;
 const [stops,photos]=ringsFor(state,me,day,['stops','photos']);
 if(!stops.target&&!photos.done)return null;
 const rings=ringsFor(state,me,day,w.order);
 const closed=rings.filter(r=>r.closed).length;
 const toggle=id=>save({...prefs,shown:prefs.shown.includes(id)?prefs.shown.filter(x=>x!==id):[...prefs.shown,id]});
 return <section className="rings" aria-label="Your rings for the day">
  {(()=>{const tools=<>
   <span className="rings-closed">{closed} of {rings.length} closed</span>
   <button type="button" className="icon" aria-label="Choose rings" aria-expanded={choosing} onClick={()=>setChoosing(c=>!c)}><SlidersHorizontal size={18}/></button>
  </>;
   return slot?createPortal(tools,slot):<header className="rings-head"><h3>Your rings today</h3>{tools}</header>;})()}
  {choosing&&<fieldset className="rings-choose">
   <legend>Show these rings</legend>
   {prefs.order.map(id=><label key={id}><input type="checkbox" checked={prefs.shown.includes(id)} disabled={prefs.shown.includes(id)&&prefs.shown.length===1} onChange={()=>toggle(id)}/><span><b>{RINGS[id].label}</b><small>{RINGS[id].note}{SCORED.includes(id)?' · counts on the leaderboard':''}</small></span></label>)}
   <small>Press and hold a ring to drag it into a new place.</small>
  </fieldset>}
  <ul className="rings-row" data-wobbling={w.editing||undefined} data-scrolls={rings.length>3||undefined} {...w.rowProps}>
   {rings.map(r=>{const {held,...item}=w.item(r.id);
    return <li key={r.id} className={`gauge${held?' held':''}${r.closed?' closed':''}`} tabIndex={w.editing?0:undefined} aria-label={`${r.label}: ${r.done} of ${r.target}${r.closed?', closed':''}`} {...item}>
     <Gauge ring={r}/>
     <p className="gauge-count"><b>{r.done}</b> of <b>{r.target}</b></p>
     <p className="gauge-label">{r.label}</p>
    </li>;})}
  </ul>
  {w.editing&&<div ref={w.bar} className="wobble-done" role="status"><small>Drag the rings into the order you want.</small><button type="button" onClick={w.finish}>Done</button></div>}
  <small className="rings-family">{(state.members||[]).filter(n=>n!==me).map(n=>`${n} ${dayScore(state,n,day)}/3`).join(' · ')}</small>
 </section>;
}
