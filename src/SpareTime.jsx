import React from 'react';
import {Hourglass,Star,Plus,MapPin} from 'lucide-react';
import {InBar} from './home-bar.js';
import {parkForDay,THRILL} from './park-data.js';
import {spareTime} from './spare-time.js';
import {activeSteps,japanClock,japanDate} from './timing.js';
// The "if we have time" card for a park day, on Home and on Today. It shows only on the day
// itself, since it reads the clock and what has been ticked off.
export default function SpareTime({state,day,now,user,parent,busy,mutate,selectStep,openPark}){
 const park=parkForDay(day);
 if(!park||day!==japanDate(now))return null;
 const t=spareTime(state,park,day,now);
 async function add(pick){
  const steps=activeSteps(state,day),at=steps.findIndex(s=>s.status==='started')>=0?steps.findIndex(s=>s.status==='started'):steps.findLastIndex(s=>s.status==='done');
  const before=steps[at]||null,after=steps[at+1]||null;
  const order=before&&after?(before.order+after.order)/2:before?before.order+5:(after?.order??10)-5;
  const result=await mutate({type:'add',step:{title:pick.ride.name,day,time:japanClock(now),duration:pick.allow,kind:'optional',place:park.name,page:before?.page||after?.page||1,order,
   notes:`If we have time: ${pick.ride.land}. ${pick.ride.note} Allow about ${pick.allow} min; check the live wait in the app.`}});
  const added=result?.state?.steps?.at(-1);if(added&&selectStep)selectStep(added);
 }
 const rides=openPark&&<button className="linkish" onClick={()=>openPark(park)}>All rides</button>;
 return <section className={`spare-time ${t.status}`} aria-label="If we have time">
  <InBar fallback={<div className="section-heading"><h2 className="eyebrow"><Hourglass size={14}/> If we have time</h2>{rides}</div>}>{rides}</InBar>
  <p className="spare-headline"><strong>{t.headline}</strong>{t.finished&&<small>Last stop finished {t.finished.text}.</small>}{t.where&&<small><MapPin size={12}/> We’re around {t.where}.</small>}</p>
  {t.status==='behind'
   ?(t.skippable.length?<p>To catch up, these could go: {t.skippable.map((s,i)=><React.Fragment key={s.id}>{i?', ':''}<button className="linkish" onClick={()=>selectStep?.(s)}>{s.title}</button></React.Fragment>)}.</p>:<p>No extras for now. Keep to the plan.</p>)
   :t.picks.length?<ul className="spare-picks">{t.picks.map(p=><li key={p.ride.id}>
     <div><strong>{p.ride.name}</strong><small>{[p.ride.land,THRILL[p.ride.thrill],`allow ~${p.allow} min`,...p.why].filter(Boolean).join(' · ')}</small></div>
     {p.stars.length>0&&<Star size={15} fill="currentColor" className="spare-star" aria-label={`Starred by ${p.stars.join(', ')}`}/>}
     {parent&&<button className="icon" aria-label={`Add ${p.ride.name} to the day`} disabled={busy} onClick={()=>add(p)}><Plus size={17}/></button>}
    </li>)}</ul>
   :<p>{t.status==='tight'?'Not quite enough time for an extra before the next stop.':'Nothing new left that fits; time for a favourite again.'}</p>}
  {t.status!=='behind'&&t.picks.length>0&&<small>Times allow for a typical queue. Check the live wait in the park app before heading over.</small>}
 </section>;
}
