import React from 'react';
import {Radio} from 'lucide-react';
import {InBar} from './home-bar.js';
import {freshReports,findReportKind,minutesAgo,agoText} from './report-data.js';
// What the other phones have said in the last two hours, newest first, with the stop it was said
// on. It is only on Home while there is something to show; the rest of the time it takes no room.
export default function Reports({state,user,day,now,selectStep}){
 const list=freshReports(state,{day,now});
 if(!list.length)return null;
 return <section className="reports" aria-label="Reports from the family">
  <InBar fallback={<p className="eyebrow"><Radio size={13}/> From the family · last two hours</p>}><span className="bar-note">Last two hours</span></InBar>
  <ul>{list.map(n=>{const k=findReportKind(n.report.kind),step=n.stepId?state.steps.find(s=>s.id===n.stepId):null;
   return <li key={n.id} className={`report-${n.report.kind}`}>
    <span aria-hidden="true">{k?.icon}</span>
    <div><b>{n.text}</b><small>{n.by===user.name?'You':n.by} · {agoText(minutesAgo(n,now))}{step&&<> · <button type="button" onClick={()=>selectStep(step)}>{step.title}</button></>}{n.pending?' · waiting to sync':''}</small></div>
   </li>;})}</ul>
 </section>;
}
