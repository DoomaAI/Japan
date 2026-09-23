import React,{useState} from 'react';
import {Radar,Plus,Pencil,Trash2,ExternalLink,Link2,Link2Off,Truck,Languages,Inbox,CircleCheck,Circle} from 'lucide-react';
import {TRACKER_KINDS,SHARE_LINK_DAYS,LOST_BAG_LINES,trackers,trackerKindLabel,linkState,trackerChecks} from './trackers.js';
const when=d=>d.toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Tokyo'});
// What to hold up at a baggage counter: the three lines staff need, then which bag it is and
// how to reach us. The bag is described in our own words, because that is what we wrote down.
function LostBagCard({tracker,state}){
 const phones=Object.entries(state.contacts||{}).filter(([,n])=>n);
 return <div className="tracker-lost" aria-label={`Lost bag card for ${tracker.label}`}>
  <p className="eyebrow">SHOW THE BAGGAGE COUNTER</p>
  {LOST_BAG_LINES.map(l=><div className="destination" key={l.ja}><h2 lang="ja">{l.ja}</h2><small>{l.en}</small></div>)}
  <p><strong>{tracker.label}</strong>{tracker.notes&&<> · {tracker.notes}</>}</p>
  {!!phones.length&&<p>連絡先 · Contact: {phones.map(([name,n])=><span key={name}>{name} <a href={`tel:${n.replace(/[^\d+]/g,'')}`}>{n}</a> </span>)}</p>}
  <p><small>For an airline, send the Find My link from the card below, not a screenshot: it keeps updating, and it stops by itself after {SHARE_LINK_DAYS} days or once the bag is back with us.</small></p>
 </div>;
}
function ShareLink({tracker,parent,mutate,busy}){
 const [pasting,setPasting]=useState(false);
 const {state:link,expires}=linkState(tracker);
 if(!parent)return link==='live'
  ?<p className="tracker-link live"><Link2 size={15}/>Mum or Dad can see where this is right now.</p>
  :<p className="tracker-link"><Link2Off size={15}/>Mum or Dad can find this in Find My.</p>;
 async function save(e){
  e.preventDefault();const form=e.currentTarget,url=new FormData(form).get('url').trim();
  if(await mutate({type:'trackerLink',id:tracker.id,url}))setPasting(false);
 }
 return <div className="tracker-link-box">
  {link==='live'&&tracker.shareUrl&&<>
   <a className="button primary" href={tracker.shareUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Open where it is</a>
   <small>Shared {tracker.shareUrlBy?`by ${tracker.shareUrlBy} `:''}· good until about {when(expires)}, or until the bag is back with us.</small>
  </>}
  {link==='expired'&&<p className="tracker-link expired"><Link2Off size={15}/>The link from {when(new Date(tracker.shareUrlAt))} has probably stopped working. Make a new one in Find My.</p>}
  {link==='none'&&!pasting&&<small>No link shared. Only needed if the bag goes missing, or while it is forwarded between hotels.</small>}
  {pasting?<form className="todo-add" onSubmit={save}>
   <input name="url" type="url" required maxLength={2000} autoFocus placeholder="https://… from Share Item Location" aria-label="Find My shared link"/>
   <button className="primary" disabled={busy}>Save the link</button>
   <button type="button" onClick={()=>setPasting(false)}>Cancel</button>
   <small>In Find My: Items → {tracker.label} → Share Item Location → copy the link.</small>
  </form>:<div className="row wrap">
   <button onClick={()=>setPasting(true)}><Link2 size={16}/>{link==='none'?'Add the Find My link':'Paste a new link'}</button>
   {link!=='none'&&<button disabled={busy} onClick={()=>mutate({type:'trackerLink',id:tracker.id,url:null})}><Link2Off size={16}/>Forget the link</button>}
  </div>}
 </div>;
}
function TrackerCard({tracker,state,user,mutate,busy,onEdit}){
 const parent=user.role==='parent',[lost,setLost]=useState(false);
 return <section className="feature-card tracker-card">
  <div className="section-heading">
   <div><p className="eyebrow">{trackerKindLabel(tracker.kind).toUpperCase()}</p><h2>{tracker.label}</h2></div>
   {parent&&<div className="todo-actions">
    <button className="icon" aria-label={`Edit ${tracker.label}`} onClick={()=>onEdit(tracker)}><Pencil size={16}/></button>
    <button className="icon danger" aria-label={`Remove ${tracker.label}`} disabled={busy}
     onClick={()=>{if(confirm(`Take “${tracker.label}” off the tracker list? The tag itself stays in Find My.`))mutate({type:'trackerRemove',id:tracker.id});}}><Trash2 size={16}/></button>
   </div>}
  </div>
  <small>{tracker.person==='Family'?'All of ours':`${tracker.person}’s`}{tracker.owner&&` · on ${tracker.owner}’s Apple Account`}</small>
  {tracker.forwarded&&<p className="tracker-link"><Truck size={15}/>Travels on its own between hotels.</p>}
  {tracker.notes&&<p>{tracker.notes}</p>}
  <ShareLink tracker={tracker} parent={parent} mutate={mutate} busy={busy}/>
  {parent&&<ul className="tracker-checks">{trackerChecks(tracker).map(c=><li key={c.id}>
   <button className={`tracker-check ${c.done?'done':''}`} disabled={busy} aria-pressed={c.done}
    onClick={()=>mutate({type:'trackerCheck',id:tracker.id,check:c.id,done:!c.done})}>
    {c.done?<CircleCheck size={16}/>:<Circle size={16}/>}<span><strong>{c.label}</strong><small>{c.why}</small></span>
   </button></li>)}</ul>}
  {tracker.kind!=='backpack'&&<button onClick={()=>setLost(v=>!v)}><Languages size={16}/>{lost?'Hide the lost-bag card':'Lost bag? Show the counter'}</button>}
  {lost&&<LostBagCard tracker={tracker} state={state}/>}
 </section>;
}
export default function Trackers({state,user,mutate,busy}){
 const [edit,setEdit]=useState(null),parent=user.role==='parent',list=trackers(state);
 async function save(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  if(await mutate({type:edit.id?'trackerEdit':'trackerAdd',id:edit.id,label:f.get('label'),kind:f.get('kind'),
   person:f.get('person'),owner:f.get('owner')||'',forwarded:f.get('forwarded')==='on',notes:f.get('notes')}))setEdit(null);
 }
 return <><p className="eyebrow">WHERE THE BAGS ARE</p><h1>Tracker tags</h1>
 <p>Which AirTag is in which bag, and the Find My link to where it is. The app cannot see a tag itself — no web app on an iPhone can — so the link is how Find My hands its whereabouts over: one tap for us, and something to send an airline if a bag does not come off the carousel.</p>
 {parent&&<button className="primary" onClick={()=>setEdit({kind:'suitcase',person:'Family',owner:user.name,label:'',notes:'',forwarded:false})}><Plus size={18}/>Add a tracker</button>}
 {edit&&<form key={edit.id||'new'} className="feature-card" onSubmit={save}>
  <h2>{edit.id?'Edit this tracker':'Add a tracker'}</h2>
  <label>What is it in?<input name="label" required maxLength={120} defaultValue={edit.label} placeholder="Big navy suitcase · Boston’s backpack"/></label>
  <div className="form-row">
   <label>Kind<select name="kind" defaultValue={edit.kind}>{TRACKER_KINDS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <label>Whose<select name="person" defaultValue={edit.person}><option>Family</option>{state.members.map(n=><option key={n}>{n}</option>)}</select></label>
  </div>
  <label>On whose Apple Account<select name="owner" defaultValue={edit.owner||''}><option value="">Not sure</option>{state.members.map(n=><option key={n}>{n}</option>)}</select></label>
  <label className="checkline"><input type="checkbox" name="forwarded" defaultChecked={edit.forwarded}/>Travels on its own between hotels (luggage forwarding)</label>
  <label>How to recognise it<textarea name="notes" maxLength={1000} defaultValue={edit.notes||''} placeholder="Navy hard case, orange strap, name tag on the handle"/></label>
  <div className="row wrap"><button className="primary" disabled={busy}>{edit.id?'Save':'Add it'}</button><button type="button" onClick={()=>setEdit(null)}>Cancel</button></div>
 </form>}
 {list.map(t=><TrackerCard key={t.id} tracker={t} state={state} user={user} mutate={mutate} busy={busy} onEdit={setEdit}/>)}
 {!list.length&&<div className="empty"><Inbox/><h2>No trackers written down.</h2><p>{parent?'Add each AirTag and the bag it is in. It takes a minute, and it is the minute you will not have at a baggage counter.':'Mum or Dad can add the trackers in our bags.'}</p></div>}
 <details className="feature-card"><summary><Radar size={16}/> Getting a tag ready for the trip</summary>
  <ol>
   <li><strong>Share it with the other parent</strong> — Find My → Items → the tag → Add Person. Both of you can see it, and neither phone warns that an unknown AirTag is travelling with you.</li>
   <li><strong>Turn on Notify When Left Behind</strong> for the boys’ backpacks and anything carried on a train.</li>
   <li><strong>For a forwarded suitcase</strong>, share its location the morning it goes, and paste the link here. It lasts {SHARE_LINK_DAYS} days.</li>
   <li><strong>If a bag goes missing</strong>, make a Share Item Location link, paste it here, and give the airline the same link with the lost-bag card. Qantas takes them.</li>
  </ol>
  <p><small>The boys can see which bags have a tracker; only a parent sees or opens the link.</small></p>
 </details>
 </>;
}
