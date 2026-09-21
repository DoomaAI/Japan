import React,{useRef,useState} from 'react';
import {ThumbsUp,ThumbsDown,Star,MapPin,ExternalLink,CalendarDays,LockKeyhole,LockKeyholeOpen,Clock,Coins,Plus,Inbox,Trash2,ChevronRight,Users,Ticket,Search,AlertCircle} from 'lucide-react';
import {dayLabel} from './AdventurePages.jsx';
import {TravelParty,Suggestions} from './PlanningParty.jsx';
import {PROPOSAL_KINDS,PROPOSAL_TIMING,PROPOSAL_SORTS,PLACEMENT_LABEL,rankedProposals,proposalPlacement,proposalScore,proposalVoters,proposalMusts,yenPerAud,yenToAud} from './trip-features.js';
const labelFor=(list,id,fallback)=>(list.find(([key])=>key===id)||fallback)[1];
const kindLabel=id=>labelFor(PROPOSAL_KINDS,id,PROPOSAL_KINDS.at(-1));
const timingLabel=id=>labelFor(PROPOSAL_TIMING,id,PROPOSAL_TIMING[0]);
const mapsLink=p=>p.mapUrl||(p.place?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.place+' Japan')}`:'');
const blank={source:'typed',title:'',place:'',japanese:'',website:'',ticketUrl:'',mapUrl:'',notes:'',cost:'',costNote:'',category:'place',suitableFor:[],tags:[],day:'',availability:'',timing:'flex',time:'',duration:60};
const toForm=p=>({...blank,...p,cost:p.cost??'',day:p.day||'',time:p.time||''});
const readForm=el=>{const f=new FormData(el);return {...blank,
 source:f.get('source')||'typed',title:f.get('title'),place:f.get('place'),japanese:f.get('japanese'),website:f.get('website'),ticketUrl:f.get('ticketUrl'),
 mapUrl:f.get('mapUrl'),notes:f.get('notes'),cost:f.get('cost'),costNote:f.get('costNote'),category:f.get('category'),
 timing:f.get('timing'),availability:f.get('availability'),day:f.get('day'),time:f.get('time'),duration:Number(f.get('duration')),
 suitableFor:f.getAll('suitableFor'),tags:String(f.get('tags')||'').split(',').map(t=>t.trim()).filter(Boolean)};};
const fromForm=v=>({source:v.source,title:v.title,place:v.place,japanese:v.japanese,website:v.website,ticketUrl:v.ticketUrl,mapUrl:v.mapUrl,
 notes:v.notes,cost:v.cost,costNote:v.costNote,category:v.category,suitableFor:v.suitableFor,tags:v.tags,
 day:v.day||null,availability:v.availability,timing:v.timing,time:v.time||null,duration:Number(v.duration)});
const FIELD_LABEL={title:'Name',place:'Where',japanese:'Japanese',website:'Website',ticketUrl:'Tickets',mapUrl:'Map',
 availability:'Available times',cost:'Cost',costNote:'Cost note',duration:'How long',category:'Kind',timing:'Timing',
 notes:'Notes',tags:'Tags',suitableFor:'Suits',day:'Day',time:'Time'};
// The form opens on defaults nobody chose — sixty minutes, a place, any time — so a lookup is
// free to replace those. Anything a person actually typed is offered back rather than overwritten.
const UNCHOSEN={duration:60,category:'place',timing:'flex'};
const unset=(key,v)=>v===''||v===null||v===undefined||(Array.isArray(v)&&!v.length)||UNCHOSEN[key]===v;
const shown=(key,v)=>Array.isArray(v)?v.join(', '):key==='cost'?`¥${Number(v).toLocaleString()}`:key==='category'?kindLabel(v):key==='timing'?timingLabel(v):String(v);
function merge(held,draft){
 const next={...held},extra=[];
 for(const [key,value] of Object.entries(draft)){
  if(unset(key,value))continue;
  if(unset(key,held[key]))next[key]=value;
  else if(shown(key,held[key])!==shown(key,value))extra.push([key,value]);
 }
 return {next,extra};
}
// An idea the family is still deciding on. Everyone can put one up, everyone can vote on it or
// star it as a must-do, and a parent turns the ones that win into real activities on a day.
export default function Planning({state,user,day,mutate,busy,selectStep,go,request,config,initialId}){
 const initial=(state.proposals||[]).find(p=>p.id===initialId);
 const [query,setQuery]=useState(initial?.title||''),[category,setCategory]=useState(''),[suits,setSuits]=useState(''),[by,setBy]=useState('');
 const [placement,setPlacement]=useState(initial?'':'open'),[date,setDate]=useState(''),[sort,setSort]=useState('top');
 const [edit,setEdit]=useState(null),[scheduling,setScheduling]=useState(null),[moving,setMoving]=useState(null);
 const [rev,setRev]=useState(0),[looking,setLooking]=useState(false),[found,setFound]=useState(null),[lookupError,setLookupError]=useState('');
 const form=useRef();
 const parent=user.role==='parent',rate=yenPerAud(state),canLook=parent&&!!config?.research;
 const list=rankedProposals(state,{query,category,suits,by,placement,day:date,sort});
 const counts=Object.fromEntries(Object.keys(PLACEMENT_LABEL).map(key=>[key,(state.proposals||[]).filter(p=>proposalPlacement(state,p).state===key).length]));
 function open(values){setEdit(values);setFound(null);setLookupError('');setRev(n=>n+1);}
 // Looks the place up on the web and fills in the blanks. Nothing is saved: it comes back as a
 // draft in the same editable fields, because a search result is not a fact about a Tuesday.
 async function lookup(values){
  if(!String(values.title||'').trim()){setLookupError('Type what you want looked up first.');return;}
  setLooking(true);setLookupError('');setFound(null);
  try{
   const result=await request('research',{title:values.title,place:values.place,notes:values.notes});
   const {next,extra}=merge(values,result.draft);
   setEdit({...next,id:values.id});setFound({...result,extra});setRev(n=>n+1);
  }catch(e){setLookupError(e.message||'The lookup did not work. Fill the details in yourself.');}
  finally{setLooking(false);}
 }
 function takeRest(){
  const values=form.current?readForm(form.current):edit;
  setEdit({...values,id:edit.id,...Object.fromEntries(found.extra)});
  setFound({...found,extra:[]});setRev(n=>n+1);
 }
 async function save(e){
  e.preventDefault();
  if(await mutate({type:edit.id?'proposalEdit':'proposalAdd',id:edit.id,person:user.name,...fromForm(readForm(e.currentTarget))})){setEdit(null);setFound(null);}
 }
 async function schedule(e,p){
  e.preventDefault();const f=new FormData(e.currentTarget);
  // Scheduling it takes it out of the "up for a vote" list it was sitting in, so widen the
  // board at the same time rather than letting the card the parent just acted on vanish.
  if(await mutate({type:'proposalSchedule',id:p.id,day:f.get('day'),time:f.get('time')||null,kind:f.get('kind'),locked:f.get('kind')==='fixed'})){setScheduling(null);if(placement==='open')setPlacement('');}
 }
 async function move(e,step){
  e.preventDefault();const f=new FormData(e.currentTarget);
  if(await mutate({type:'patch',id:step.id,patch:{day:f.get('day'),time:f.get('time')||null}}))setMoving(null);
 }
 return <><p className="eyebrow">BEFORE IT IS A PLAN</p><h1>Planning board</h1>
 <p>Anywhere any of us wants to go, eat or see. Put it up, and the rest of the family can back it, pass on it or star it as a must-do. A parent puts the ones we agree on onto a day — locked to a booked time, or left flexible.</p>
 <button className="primary" onClick={()=>open({...blank,day:date||'',suitableFor:[]})}><Plus size={18}/>Add an idea</button>
 <TravelParty state={state} user={user} mutate={mutate} busy={busy}/>
 {canLook&&<Suggestions state={state} user={user} day={date||day} request={request} mutate={mutate} busy={busy}
  onAdded={()=>{if(placement==='scheduled')setPlacement('open');}}
  onLookUp={p=>{open(toForm(p));lookup(toForm(p));}}/>}
 <div className="segmented plan-scope">{[['open','Up for a vote'],['scheduled','On the itinerary'],['','Everything']].map(([key,label])=><button key={key||'all'} className={placement===key?'selected':''} onClick={()=>setPlacement(key)}>{label}{key&&counts[key]?` · ${counts[key]}`:''}</button>)}</div>
 <div className="document-filters">
  <label>Search<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Place, note, tag or who added it"/></label>
  <div className="form-row">
   <label>Kind<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Anything</option>{PROPOSAL_KINDS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <label>Suits<select value={suits} onChange={e=>setSuits(e.target.value)}><option value="">Anyone</option>{state.members.map(n=><option key={n}>{n}</option>)}</select></label>
   <label>Added or voted by<select value={by} onChange={e=>setBy(e.target.value)}><option value="">Anyone</option>{state.members.map(n=><option key={n}>{n}</option>)}</select></label>
  </div>
  <div className="form-row">
   <label>Day<select value={date} onChange={e=>setDate(e.target.value)}><option value="">Any day</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.city}</option>)}</select></label>
   <label>Order<select value={sort} onChange={e=>setSort(e.target.value)}>{PROPOSAL_SORTS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
  </div>
  {(category||suits||by||date||query)&&<button onClick={()=>{setCategory('');setSuits('');setBy('');setDate('');setQuery('');}}>Clear filters</button>}
 </div>
 <p><strong>{list.length} idea{list.length===1?'':'s'}</strong>{counts.parked?` · ${counts.parked} parked`:''}{counts.options?` · ${counts.options} in Options`:''}</p>
 <div className="feature-grid">{list.map(p=>{
  const where=proposalPlacement(state,p),up=proposalVoters(p,1),down=proposalVoters(p,-1),musts=proposalMusts(p),score=proposalScore(p);
  const mine=(p.votes||{})[user.name],myMust=!!(p.musts||{})[user.name],canEdit=parent||p.addedBy===user.name;
  return <article className={`feature-card plan-card ${where.state}`} key={p.id}>
   <div className="section-heading"><div><span className="eyebrow">{kindLabel(p.category)}</span><h2>{p.title}</h2></div><span className={`plan-score ${score>0?'for':score<0?'against':''}`} aria-label={`${score} net votes`}>{score>0?'+':''}{score}</span></div>
   {p.place&&<p className="place-line"><MapPin size={16}/>{p.place}{p.japanese&&<small lang="ja"> · {p.japanese}</small>}</p>}
   {p.notes&&<p>{p.notes}</p>}
   <div className="plan-facts">
    <span><Clock size={15}/>{where.state==='scheduled'?`${dayLabel(where.day)}${where.time?` · ${where.time}`:' · any time'} · ${where.locked?'Locked':'Flexible'}`:timingLabel(p.timing)}</span>
    {p.availability&&<span>Available {p.availability}</span>}
    {p.time&&where.state!=='scheduled'&&<span>Suggested {p.time}</span>}
    {!!p.duration&&<span>About {p.duration} min</span>}
    {p.cost!==null&&p.cost!==undefined&&<span><Coins size={15}/>¥{p.cost.toLocaleString()} ≈ ${yenToAud(p.cost,rate).toFixed(2)}{p.costNote?` · ${p.costNote}`:''}</span>}
   </div>
   <div className="row wrap plan-tags">
    <span className={`tag placement ${where.state}`}>{PLACEMENT_LABEL[where.state]}</span>
    <button className="tag" onClick={()=>setBy(p.addedBy)}>{p.source==='suggested'?'Suggested, put up by':'Added by'} {p.addedBy}</button>
    {p.suitableFor?.length?p.suitableFor.map(n=><button className="tag" key={n} onClick={()=>setSuits(n)}><Users size={12}/>Suits {n}</button>):<span className="tag"><Users size={12}/>Suits everyone</span>}
    {musts.map(n=><span className="tag must" key={n}><Star size={12}/>{n}’s must-do</span>)}
    {up.map(n=><span className="tag up" key={n}><ThumbsUp size={12}/>{n}</span>)}
    {down.map(n=><span className="tag down" key={n}><ThumbsDown size={12}/>{n}</span>)}
    {(p.tags||[]).map(t=><button className="tag" key={t} onClick={()=>setQuery(t)}>{t}</button>)}
    {p.pending&&<span className="tag">Waiting to sync</span>}
   </div>
   <div className="row wrap plan-vote">
    <button className={mine===1?'selected':''} disabled={busy} onClick={()=>mutate({type:'proposalVote',id:p.id,person:user.name,vote:mine===1?0:1})}><ThumbsUp size={16}/>Yes · {up.length}</button>
    <button className={mine===-1?'selected':''} disabled={busy} onClick={()=>mutate({type:'proposalVote',id:p.id,person:user.name,vote:mine===-1?0:-1})}><ThumbsDown size={16}/>Not for me · {down.length}</button>
    <button className={myMust?'selected':''} disabled={busy} onClick={()=>mutate({type:'proposalMust',id:p.id,person:user.name,must:!myMust})}><Star size={16}/>Must do · {musts.length}</button>
   </div>
   <div className="row wrap">
    {p.ticketUrl&&<a className="button" href={p.ticketUrl} target="_blank" rel="noopener noreferrer"><Ticket size={15}/>Tickets <ExternalLink size={13}/></a>}
    {p.website&&<a className="button" href={p.website} target="_blank" rel="noopener noreferrer">Website <ExternalLink size={14}/></a>}
    {mapsLink(p)&&<a className="button" href={mapsLink(p)} target="_blank" rel="noopener noreferrer">Map <ExternalLink size={14}/></a>}
    {where.step&&<button onClick={()=>selectStep(where.step)}>{where.day?'Open the activity':'See it in Options'} <ChevronRight size={15}/></button>}
    {canLook&&<button disabled={looking} onClick={()=>{open(toForm(p));lookup(toForm(p));}}><Search size={16}/>{looking?'Looking it up…':'Look it up'}</button>}
    {parent&&!where.step&&<button className="primary" onClick={()=>{setScheduling(scheduling===p.id?null:p.id);setMoving(null);}}><CalendarDays size={16}/>Add to a day</button>}
    {parent&&where.state==='scheduled'&&<>
     <button onClick={()=>{setMoving(moving===p.id?null:p.id);setScheduling(null);}}><CalendarDays size={16}/>Move day or time</button>
     <button disabled={busy} onClick={()=>mutate({type:'lock',id:where.step.id,locked:!where.locked})}>{where.locked?<><LockKeyholeOpen size={16}/>Unlock the time</>:<><LockKeyhole size={16}/>Lock the time</>}</button>
    </>}
    {canEdit&&<button onClick={()=>open(toForm(p))}>Edit</button>}
    {canEdit&&!where.step&&<button disabled={busy} onClick={()=>mutate({type:'proposalPark',id:p.id,parked:!p.parked})}><Inbox size={16}/>{p.parked?'Back on the board':'Park it'}</button>}
    {canEdit&&!where.step&&<button className="danger" disabled={busy} onClick={()=>{if(confirm('Remove this idea and its votes?'))mutate({type:'proposalRemove',id:p.id});}}><Trash2 size={16}/>Remove</button>}
   </div>
   {where.state==='scheduled'&&where.locked&&moving===p.id&&<p className="callout">Unlock the time before moving this one.</p>}
   {scheduling===p.id&&<form className="plan-schedule" onSubmit={e=>schedule(e,p)}>
    <h3>Put {p.title} on a day</h3>
    <div className="form-row"><label>Day<select name="day" required defaultValue={p.day||date||day}>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.title}</option>)}</select></label><label>Japan time<input name="time" type="time" defaultValue={p.time||''}/></label></div>
    <label>Time tag<select name="kind" defaultValue={p.timing==='fixed'?'fixed':'flexible'}><option value="flexible">Flexible · can move when the day slips</option><option value="fixed">Fixed · locked against rescheduling</option><option value="optional">Optional · drop it if we run late</option><option value="review">Needs checking before we rely on it</option></select></label>
    <p>Opening hours and the cost go across into the activity’s notes, and the ticket page becomes its booking link. A fixed time is locked, so rescheduling and the running-late plan will work around it.</p>
    <div className="row wrap"><button className="primary" disabled={busy}>Add to the itinerary</button><button type="button" onClick={()=>setScheduling(null)}>Cancel</button></div>
   </form>}
   {moving===p.id&&where.step&&<form className="plan-schedule" onSubmit={e=>move(e,where.step)}>
    <h3>Move {p.title}</h3>
    <div className="form-row"><label>Day<select name="day" defaultValue={where.day||day}>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.title}</option>)}</select></label><label>Japan time<input name="time" type="time" defaultValue={where.time||''}/></label></div>
    <div className="row wrap"><button className="primary" disabled={busy||where.locked}>Move it</button><button type="button" onClick={()=>setMoving(null)}>Cancel</button></div>
   </form>}
  </article>;})}
 </div>
 {!list.length&&<div className="empty"><Inbox/><h2>{(state.proposals||[]).length?'Nothing here to look at.':'The board is empty.'}</h2><p>{(state.proposals||[]).length?'Every idea we have is somewhere else. Try Everything, or clear the filters.':'Add somewhere you want to go, something you want to eat, or an event we should try to catch. The rest of us will vote on it.'}</p></div>}
 {edit&&<form ref={form} key={`${edit.id||'new'}-${rev}`} className="feature-card plan-form" onSubmit={save}>
  <h2>{edit.id?'Edit this idea':'Add an idea'}</h2>
  <input type="hidden" name="source" value={edit.source||'typed'}/>
  {edit.id&&proposalPlacement(state,edit).step&&<p className="callout">This idea is already an activity. Changing it here records what the family decided; it does not rewrite the activity on the day — edit that from its own card.</p>}
  <label>What is it?<input name="title" required maxLength={250} defaultValue={edit.title} placeholder="teamLab Planets, a conveyor-belt sushi place, the Ghibli clock…"/></label>
  {canLook&&<div className="plan-lookup">
   <button type="button" disabled={looking} onClick={()=>lookup({...readForm(form.current),id:edit.id})}><Search size={16}/>{looking?'Searching the web…':'Look it up and fill in the rest'}</button>
   <small>Searches the web for its opening hours, ticket page, address and price, and fills in whatever is still blank. Needs a connection, costs a few cents, and checks nothing for you.</small>
  </div>}
  {lookupError&&<p className="callout"><AlertCircle size={18}/>{lookupError}</p>}
  {found&&<div className="plan-found">
   <h3>What the lookup found</h3>
   {found.checkFirst&&<p className="callout"><AlertCircle size={18}/>{found.checkFirst}</p>}
   {found.bestDay&&<p>It suggests <strong>{dayLabel(found.bestDay)}</strong>, the day we are in {state.days.find(d=>d.date===found.bestDay)?.city}. Change it below if you disagree — it is a wish, not a booking.</p>}
   {!!found.extra.length&&<><p>It also found these, but you had already filled them in:</p>
    <ul>{found.extra.map(([key,value])=><li key={key}><strong>{FIELD_LABEL[key]||key}:</strong> {shown(key,value)}</li>)}</ul>
    <button type="button" onClick={takeRest}>Use these too</button></>}
   {!!found.sources.length&&<><p>Read from:</p><ul className="plan-sources">{found.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title||s.url} <ExternalLink size={12}/></a></li>)}</ul></>}
   <small>{found.usage.searches} web {found.usage.searches===1?'search':'searches'}. Hours, prices and whether a ticket is still available change — confirm anything you are planning around on the official page before you book.</small>
  </div>}
  <div className="form-row">
   <label>Kind<select name="category" defaultValue={edit.category}>{PROPOSAL_KINDS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <label>Timing<select name="timing" defaultValue={edit.timing}>{PROPOSAL_TIMING.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
  </div>
  <label>Where<input name="place" maxLength={250} defaultValue={edit.place} placeholder="Place name, address or area"/></label>
  <label>Japanese name or address (if we know it)<input name="japanese" maxLength={250} defaultValue={edit.japanese}/></label>
  <div className="form-row">
   <label>Website<input name="website" type="url" maxLength={2000} placeholder="https://…" defaultValue={edit.website}/></label>
   <label>Ticket or booking page<input name="ticketUrl" type="url" maxLength={2000} placeholder="https://…" defaultValue={edit.ticketUrl}/></label>
  </div>
  <label>Map link<input name="mapUrl" type="url" maxLength={2000} placeholder="https://maps.app.goo.gl/…" defaultValue={edit.mapUrl}/></label>
  <label>Available times / opening hours<input name="availability" maxLength={250} defaultValue={edit.availability} placeholder="Tue–Sun 10:00–17:00, last entry 16:00"/></label>
  <div className="form-row">
   <label>Day we are hoping for<select name="day" defaultValue={edit.day}><option value="">Any day</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.city}</option>)}</select></label>
   <label>Time, if it matters<input name="time" type="time" defaultValue={edit.time}/></label>
   <label>How long (minutes)<input name="duration" type="number" min="0" max="1440" defaultValue={edit.duration}/></label>
  </div>
  <div className="form-row">
   <label>Cost (yen)<input name="cost" type="number" min="0" max="10000000" step="1" defaultValue={edit.cost}/></label>
   <label>Cost note<input name="costNote" maxLength={250} defaultValue={edit.costNote} placeholder="each · for all four · free for Nate"/></label>
  </div>
  <fieldset><legend>Who is it for?</legend><p>Leave them all unticked if it suits everyone.</p><div className="checks">{state.members.map(n=><label key={n}><input type="checkbox" name="suitableFor" value={n} defaultChecked={(edit.suitableFor||[]).includes(n)}/>{n}</label>)}</div></fieldset>
  <label>Tags (comma-separated)<input name="tags" maxLength={1000} defaultValue={(edit.tags||[]).join(', ')} placeholder="rainy day, Kyoto, book ahead"/></label>
  <label>Notes<textarea name="notes" maxLength={4000} defaultValue={edit.notes} placeholder="Why we want to go, what to book, who told us about it"/></label>
  <div className="row wrap"><button className="primary" disabled={busy}>{edit.id?'Save changes':'Put it on the board'}</button><button type="button" onClick={()=>{setEdit(null);setFound(null);setLookupError('');}}>Cancel</button></div>
 </form>}
 <p className="callout">Ideas on this board are not on the itinerary. Nothing here changes a booking, and adding one to a day does not make a reservation.</p>
 {go&&<button onClick={()=>go('options')}><Inbox size={16}/>Saved stops with no date live in Options &amp; ideas</button>}
 </>;
}
