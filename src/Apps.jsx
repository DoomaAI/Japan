import React from 'react';
import PageTitle from './PageTitle.jsx';
import {ExternalLink,CircleCheck,Circle} from 'lucide-react';
import {APP_GROUPS,suggestedApps} from './apps-data.js';
import {useStored} from './stored.js';
// Apps to download: the local apps worth having, grouped by what they are for, with what to set up
// on home Wi-Fi. Each phone ticks off its own, since what one parent installs the other may not.
const when=(app,today,dayLabel)=>app.next===today?'Needed today':`Needed ${dayLabel(app.next)}`;
function AppCard({app,today,dayLabel,installed,toggle}){
 const on=!!installed[app.id];
 return <article className={`app-card${on?' installed':''}`}>
  <header><h3>{app.name}</h3>{app.soon&&!app.done&&<span className="app-soon">{when(app,today,dayLabel)}</span>}</header>
  <p>{app.why}</p>
  <p className="app-setup"><b>Set up:</b> {app.setup}</p>
  <p className="app-who">{app.who}</p>
  <div className="row wrap">
   <a className="button" href={app.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/> App Store</a>
   <button type="button" aria-pressed={on} onClick={()=>toggle(app.id)}>{on?<CircleCheck size={16}/>:<Circle size={16}/>} {on?'On this phone':'Mark as installed'}</button>
  </div>
 </article>;
}
export default function Apps({state,today,dayLabel}){
 const [installed,setInstalled]=useStored('japan.apps.installed',{});
 const toggle=id=>setInstalled(s=>({...s,[id]:!s[id]}));
 const apps=suggestedApps(state,today),live=apps.filter(a=>!a.done),done=apps.filter(a=>a.done);
 const count=live.filter(a=>installed[a.id]).length;
 const card=a=><AppCard key={a.id} app={a} today={today} dayLabel={dayLabel} installed={installed} toggle={toggle}/>;
 return <>
  <p className="eyebrow">ON THE PHONE BEFORE WE NEED IT</p><PageTitle help={<><p>The local apps that make Japan easier, and what to set up in each while there is still Wi-Fi.</p><p>Visit Japan Web is a website, not an app: it is on the Arrival paperwork page. With notifications on, parents get a reminder a week before we fly, and the evening before the Shinkansen and each park.</p></>}>Apps to download</PageTitle>
 <p>{count} of {live.length} on this phone</p>
  {APP_GROUPS.map(([id,title])=>{const list=live.filter(a=>a.group===id);return list.length>0&&<section className="app-group" key={id}><h2>{title}</h2>{list.map(card)}</section>;})}
  {done.length>0&&<details className="app-group"><summary>Already behind us ({done.length})</summary>{done.map(card)}</details>}
 </>;
}
