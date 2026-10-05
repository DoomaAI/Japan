import React,{useContext} from 'react';
import {createPortal} from 'react-dom';
import {ChevronRight} from 'lucide-react';
import {LOCAL_KIND_ICON,localPicks} from './local-data.js';
import {HomeBarSlot} from './home-bar.js';
// Like a local, on Home: two or three things the locals do in the base we are in today, turned
// over day by day, with a weekend-only one leading on the days it can be done. A row opens the
// page on that card. Nothing on a day away from every base, and nothing before or after the trip.
// Under Home's own "Like a local" bar the card draws no heading of its own: All of them sits in
// the bar, so the title is said once.
export default function LikeALocalCard({state,today,day,go}){
 const picks=localPicks(state,day),slot=useContext(HomeBarSlot);
 if(!picks.length)return null;
 return <section className="local-card" aria-label="Like a local">
  {slot?createPortal(<button type="button" className="local-all" onClick={()=>go('local')}>All of them</button>,slot)
   :<div className="section-heading"><div><p className="eyebrow">Like a local</p><h2>{day===today?'Where the locals go today':`Where the locals go`}</h2></div><button type="button" onClick={()=>go('local')}>All of them</button></div>}
  {picks.map(e=><button type="button" key={e.id} className="local-row" onClick={()=>go('local',undefined,e.id)}>
   <span aria-hidden="true">{LOCAL_KIND_ICON[e.kind]}</span>
   <span><b>{e.title}</b><small>{e.weekdays&&e.next===day?'Today · ':''}{e.cost}</small></span>
   <ChevronRight size={16}/>
  </button>)}
 </section>;
}
