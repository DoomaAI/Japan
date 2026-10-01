import React from 'react';
import {Check,Lock,ChevronRight} from 'lucide-react';
import {runUp,readiness} from './prep-data.js';
// The run-up widget: the days to go, and the milestone that is open now. Only before we fly.
export default function RunUp({state,today,go}){
 const r=runUp(state,today);if(!r)return null;
 const ready=readiness(state);
 return <section className="runup" aria-label="The run-up to the trip">
  <div className="runup-count"><strong>{r.days}</strong><span><b>{r.days===1?'day to go':'days to go'}</b><small>{r.days===1?'Tomorrow we fly to Japan.':'Until we fly to Japan'}</small></span></div>
  <details className="runup-ready"><summary><span>Ready to go</span><span className="runup-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={ready.percent}><i style={{width:`${ready.percent}%`}}/></span><b>{ready.percent}%</b></summary>
   <ul>{ready.parts.map(p=><li key={p.id}><button type="button" onClick={()=>go(p.page)}><span>{p.label}</span><span className="runup-bar"><i style={{width:`${Math.round(p.share*100)}%`}}/></span><small>{p.total?`${p.done} of ${p.total}`:'not started'}</small></button></li>)}</ul></details>
  <ol className="runup-steps">{r.milestones.map(m=><li key={m.at} className={m.complete&&m.unlocked?'done':m.unlocked?'open':'locked'} title={m.title}>
   <span aria-hidden="true">{m.complete&&m.unlocked?<Check size={14}/>:m.unlocked?'':<Lock size={12}/>}</span><small>{m.at}</small></li>)}</ol>
  {r.now?<button type="button" className="runup-now" onClick={()=>go(r.now.page)}><span><small>Unlocked at {r.now.at} days</small><b>{r.now.title}</b><small>{r.now.hint} {r.now.done} of {r.now.total}.</small></span><ChevronRight size={18}/></button>
   :r.next?<p className="runup-next"><Lock size={14}/> {r.finished?'All caught up. ':''}Next, at {r.next.at} days: {r.next.title}</p>
   :<p className="runup-next"><Check size={14}/> Every milestone done. Nothing left but the flight.</p>}
 </section>;
}
