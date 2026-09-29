import React,{useState} from 'react';
import {Users,Sparkles,Search,Plus,Check,AlertCircle,Coins,Clock,X,Camera,ChevronRight,Heart,ThumbsUp,Split,MapPin,LocateFixed,Tag,Star,Navigation,Globe,Ticket,ExternalLink} from 'lucide-react';
import {dayLabel} from './AdventurePages.jsx';
import {INTERESTS,PACES,SUGGEST_KINDS,PROPOSAL_KINDS,MAX_LIKES,MAX_LIKE_LENGTH,cleanLikes,party,personProfile,partyInterests,partyLikes,profileFilled,interestLabel,paceLabel,recommendIdeas,proposals,sitOutStops,rejoinAt,BOYS,yenPerAud,yenToAud,photosOf,rankByParty,travelText,COORD_PLACES,ratingText,UNRATED_STARS,directionsLink,bookingSearchLink} from './trip-features.js';
import {activeSteps} from './timing.js';
import {askPhoneWhereItIs} from './geo.js';
import {photoUrl} from './PhotoDay.jsx';
import {SuggestDeck,PartyMatch} from './SuggestDeck.jsx';
const kindLabel=id=>(PROPOSAL_KINDS.find(([key])=>key===id)||PROPOSAL_KINDS.at(-1))[1];
const flavourLabel=id=>(SUGGEST_KINDS.find(([key])=>key===id)||SUGGEST_KINDS[1])[1];
// Who is going, and what each of them would actually want out of a day. The boys fill in their
// own — a five-year-old who has ticked playgrounds gets a different list back from a brother who
// has ticked trains. None of it is on the plan; it is what the suggestions are built from.
// The newest few of this person's photographs, on their own profile, with the way through to
// all of them. A link rather than a button because it is a place, and the back button should
// behave like one.
function PersonPhotos({state,name}){
 const theirs=photosOf(state,name);
 if(!theirs.length)return null;
 return <div className="person-photos">
  <a href={`/?tab=photos&who=${encodeURIComponent(name)}`}>
   <Camera size={14}/> {theirs.length} photo{theirs.length===1?'':'s'} <ChevronRight size={14}/></a>
  <div className="person-photo-strip">{theirs.slice(0,4).map(p=>
   <img key={p.id} loading="lazy" src={photoUrl(p)} alt={p.feedback?.subject||`A photo by ${name}`}/>)}</div>
 </div>;
}
// A person's own likes, as tags they type — ramen, Lego, jazz bars. Commas or Enter add one, a
// tap on a tag takes it off, and what the rest of the family or the board already says is
// offered underneath so a five-year-old can pick rather than spell.
function LikesInput({state,name,likes,setLikes}){
 const [draft,setDraft]=useState('');
 const add=text=>{
  const next=cleanLikes([...likes,...String(text).split(',')]).filter(t=>t.length<=MAX_LIKE_LENGTH).slice(0,MAX_LIKES);
  setLikes(next);setDraft('');
 };
 const have=new Set(likes.map(t=>t.toLowerCase()));
 const offered=cleanLikes([...partyLikes(state).filter(l=>!l.who.includes(name)).map(l=>l.tag),
  ...proposals(state).flatMap(p=>p.tags||[]).filter(t=>t!=='book ahead')])
  .filter(t=>!have.has(t.toLowerCase())&&t.length<=MAX_LIKE_LENGTH).slice(0,12);
 return <fieldset className="likes-input"><legend>Things {name} likes, in their own words</legend>
  {!!likes.length&&<div className="chips">{likes.map(t=><button type="button" className="chip on" key={t} onClick={()=>setLikes(likes.filter(x=>x!==t))} aria-label={`Remove ${t}`}><Heart size={13}/>{t}<X size={13}/></button>)}</div>}
  <div className="row">
   <input value={draft} maxLength={MAX_LIKE_LENGTH*3} onChange={e=>setDraft(e.target.value)} placeholder="ramen · Pokémon · steam trains"
    onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(draft.trim())add(draft);}}} enterKeyHint="done" aria-label="Add a like"/>
   <button type="button" disabled={!draft.trim()||likes.length>=MAX_LIKES} onClick={()=>add(draft)}><Plus size={16}/>Add</button>
  </div>
  {!!offered.length&&<><small>Tap to add</small><div className="chips">{offered.map(t=><button type="button" className="chip" key={t} disabled={likes.length>=MAX_LIKES} onClick={()=>add(t)}><Plus size={13}/>{t}</button>)}</div></>}
 </fieldset>;
}
export function TravelParty({state,user,mutate,busy}){
 const [editing,setEditing]=useState(null),[likes,setLikes]=useState([]);
 const parent=user.role==='parent',us=party(state),shared=partyInterests(state),sharedLikes=partyLikes(state).filter(l=>l.who.length>1);
 const edit=name=>{setLikes(name&&name!=='trip'?personProfile(state,name).likes:[]);setEditing(name);};
 const blank=state.members.filter(n=>!profileFilled(state,n));
 async function savePerson(e,name){
  e.preventDefault();const f=new FormData(e.currentTarget);
  if(await mutate({type:'partyPerson',name,age:f.get('age'),interests:f.getAll('interests'),likes,
   loves:f.get('loves'),avoid:f.get('avoid'),dietary:f.get('dietary'),notes:f.get('notes')}))setEditing(null);
 }
 async function saveTrip(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  if(await mutate({type:'partyTrip',pace:f.get('pace'),budget:f.get('budget'),notes:f.get('notes')}))setEditing(null);
 }
 return <details className="party-panel">
  <summary><Users size={17}/>Who we are, and what we like{blank.length?` · ${blank.length} still blank`:''}</summary>
  <p>Fill in your own and the suggestions get better. Everyone keeps their own; a parent can fill in the ones the five-year-old will not.</p>
  {!!(shared.length||sharedLikes.length)&&<p className="row wrap plan-tags">{shared.map(i=><span className="tag" key={i.id}>{i.label} · {i.who.join(', ')}</span>)}{sharedLikes.map(l=><span className="tag" key={l.tag}><Heart size={12}/>{l.tag} · {l.who.join(', ')}</span>)}</p>}
  {state.members.map(name=>{
   const me=personProfile(state,name),mine=parent||user.name===name;
   return <div className="party-person" key={name}>
    <div className="section-heading"><h3>{name}{me.age?` · ${me.age}`:''}</h3>{mine&&<button onClick={()=>edit(editing===name?null:name)}>{editing===name?'Close':profileFilled(state,name)?'Edit':'Fill this in'}</button>}</div>
    {editing!==name&&<>
     {me.interests.length||me.likes.length?<div className="row wrap plan-tags">{me.interests.map(id=><span className="tag" key={id}>{interestLabel(id)}</span>)}{me.likes.map(t=><span className="tag like" key={t}><Heart size={12}/>{t}</span>)}</div>:<p><small>Nothing said yet.</small></p>}
     {me.loves&&<p><small><strong>Loves:</strong> {me.loves}</small></p>}
     {me.avoid&&<p><small><strong>Would rather avoid:</strong> {me.avoid}</small></p>}
     {me.dietary&&<p><small><strong>Food:</strong> {me.dietary}</small></p>}
     {me.notes&&<p><small>{me.notes}</small></p>}
     <PersonPhotos state={state} name={name}/>
    </>}
    {editing===name&&<form onSubmit={e=>savePerson(e,name)}>
     <label>Age<input name="age" type="number" min="0" max="120" defaultValue={me.age??''}/></label>
     <fieldset><legend>What {name} is into</legend><div className="chips">{INTERESTS.map(([id,label])=><label className="chip" key={id}><input type="checkbox" name="interests" value={id} defaultChecked={me.interests.includes(id)}/>{label}</label>)}</div></fieldset>
     <LikesInput state={state} name={name} likes={likes} setLikes={setLikes}/>
     <label>Loves<input name="loves" maxLength={500} defaultValue={me.loves} placeholder="a proper coffee · anything with a train in it"/></label>
     <label>Would rather avoid<input name="avoid" maxLength={500} defaultValue={me.avoid} placeholder="long queues · another temple"/></label>
     <label>Food<input name="dietary" maxLength={500} defaultValue={me.dietary} placeholder="no raw fish · allergies · will eat anything"/></label>
     <label>Anything else worth knowing<textarea name="notes" maxLength={500} defaultValue={me.notes} placeholder="Flags after about three o'clock."/></label>
     <div className="row wrap"><button className="primary" disabled={busy}>Save {name}</button><button type="button" onClick={()=>edit(null)}>Cancel</button></div>
    </form>}
   </div>;})}
  <div className="party-person">
   <div className="section-heading"><h3>How we want the days to go</h3>{parent&&<button onClick={()=>edit(editing==='trip'?null:'trip')}>{editing==='trip'?'Close':'Edit'}</button>}</div>
   {editing!=='trip'?<>
    <p><small><strong>Pace:</strong> {paceLabel(us.pace)}{us.budget?` · about ¥${us.budget.toLocaleString()} a day for the four of us (≈$${yenToAud(us.budget,yenPerAud(state)).toFixed(0)})`:''}</small></p>
    {us.notes&&<p><small>{us.notes}</small></p>}
   </>:<form onSubmit={saveTrip}>
    <label>Pace<select name="pace" defaultValue={us.pace}>{PACES.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <label>Rough daily budget for all four (yen)<input name="budget" type="number" min="0" max="10000000" defaultValue={us.budget??''}/></label>
    <label>Worth knowing<textarea name="notes" maxLength={2000} defaultValue={us.notes} placeholder="Nate flags after lunch. We have done enough temples. Save the big walk for a cool day."/></label>
    <div className="row wrap"><button className="primary" disabled={busy}>Save</button><button type="button" onClick={()=>setEditing(null)}>Cancel</button></div>
   </form>}
  </div>
 </details>;
}
// Ideas already on the board, picked out for one of us or for all four, from what each person
// ticked, tagged and voted — worked out on the phone, so it needs no signal and no API key.
// Everyone gets it, the boys included: "what is on the board that I would like?" is theirs too.
export function PickedFor({state,user,mutate,busy,onOpen}){
 const [who,setWho]=useState(user.role==='parent'?'':user.name);
 // Swiping through them is a vote, and always the voter's own: right is "yes", left is
 // "not for me". The pile is dealt once from the ideas this person has not voted on yet, so a
 // vote landing does not reshuffle the cards still to come.
 const [deck,setDeck]=useState(null);
 const picks=recommendIdeas(state,who);
 const filled=state.members.filter(n=>profileFilled(state,n));
 const myVote=p=>(p.votes||{})[user.name];
 const unvoted=recommendIdeas(state,who,{limit:20}).filter(r=>myVote(r.proposal)===undefined);
 const vote=(r,v)=>mutate({type:'proposalVote',id:r.proposal.id,person:user.name,vote:v});
 const live=r=>proposals(state).find(p=>p.id===r.proposal.id)||r.proposal;
 const card=(r,actions)=>{const p=live(r),votes=Object.values(p.votes||{}).filter(v=>v===1).length;
  return <article className="feature-card suggest-card picked-card" key={p.id}>
   <div className="section-heading"><h4>{p.title}</h4>{!who&&<span className="tag"><Users size={12}/>{r.fans.length} of {state.members.length}</span>}</div>
   {p.place&&<p><small>{p.place}</small></p>}
   <ul className="picked-why">{Object.entries(r.reasons).map(([name,why])=><li key={name}><Heart size={13}/><span>{who?'':<strong>{name}: </strong>}{why.join(', ')}</span></li>)}
    {Object.entries(r.avoid).map(([name,terms])=><li key={`x${name}`} className="picked-avoid"><AlertCircle size={13}/><span>{name} would rather avoid {terms.join(', ')}</span></li>)}</ul>
   <div className="row wrap">{!!votes&&<span className="tag"><ThumbsUp size={12}/>{votes}</span>}{actions}</div>
  </article>;};
 return <details className="party-panel picked-panel">
  <summary><Heart size={17}/>Picked for {who===user.name?'you':who||'all of us'}</summary>
  <div className="segmented" role="group" aria-label="Picked for">{[['',"Everyone"],...state.members.map(n=>[n,n===user.name?`${n} (you)`:n])].map(([key,label])=>
   <button key={key||'all'} className={who===key?'selected':''} onClick={()=>{setWho(key);setDeck(null);}}>{label}</button>)}</div>
  <p>{who?`Ideas up for a vote that match what ${who===user.name?'you':who} ticked, tagged or backed.`:'Ideas up for a vote that please the most of us at once, and who each one is for.'}</p>
  {!picks.length&&<p className="callout"><AlertCircle size={18}/>{!filled.length||(who&&!profileFilled(state,who))
   ?`Nothing to go on yet — fill in ${who&&who!==user.name?`${who}’s`:who?'your':'a'} profile under “Who we are, and what we like” with a few interests and likes.`
   :'Nothing up for a vote matches yet. Add an idea, or ask for suggestions.'}</p>}
  {deck?<>
   <SuggestDeck key={deck.round} items={deck.items} keyOf={r=>r.proposal.id} titleOf={r=>r.proposal.title} busy={busy}
    kept={deck.items.filter(r=>myVote(live(r))===1).map(r=>r.proposal.id)}
    onKeep={r=>vote(r,1)} onPass={r=>vote(r,-1)} onUnpass={r=>vote(r,0)}
    keepLabel="Yes, I’m in" keepStamp="Yes" passLabel="Not for me" passStamp="Nope" keptWord="backed by you"
    render={r=>card(r,null)}/>
   <button onClick={()=>setDeck(null)}><X size={16}/>Back to the list</button>
  </>:<>
   {!!unvoted.length&&<button className="primary" onClick={()=>setDeck({items:unvoted,round:Date.now()})}><ThumbsUp size={16}/>Swipe to vote · {unvoted.length} you have not voted on</button>}
   {picks.map(r=>card(r,<button onClick={()=>onOpen?.(r.proposal)}><ChevronRight size={16}/>See it on the board</button>))}
  </>}
 </details>;
}
// Ideas for a place, in the flavours asked for — the famous ones, the ones nobody finds on their
// own, and everything in between. Nothing is added to the board here: each one is put up by a
// person, and the rest of the family votes on it like any other idea.
// Getting there and getting in, on every card: directions built by the app from where the day
// starts, the place's own website and its booking page when the search actually turned them up,
// and a search for tickets when it did not but the place is usually booked ahead.
export function CardLinks({item,from}){
 const {title,place,website,ticketUrl}=item.draft;
 const out={target:'_blank',rel:'noopener noreferrer'};
 return <div className="row wrap card-links">
  <a className="button" href={directionsLink(title,place||item.area,from,item.travelMode)} {...out}><Navigation size={16}/>Directions<ExternalLink size={12}/></a>
  {website&&<a className="button" href={website} {...out}><Globe size={16}/>Website<ExternalLink size={12}/></a>}
  {ticketUrl?<a className="button primary" href={ticketUrl} {...out}><Ticket size={16}/>{item.kind?'Book a table':'Book'}<ExternalLink size={12}/></a>
   :item.bookAhead&&<a className="button" href={bookingSearchLink(title,place)} {...out}><Ticket size={16}/>Find where to book<ExternalLink size={12}/></a>}
 </div>;
}
export function Suggestions({state,user,day,request,mutate,busy,onLookUp,onAdded}){
 const [scope,setScope]=useState(day?`d:${day}`:'');
 const [elsewhere,setElsewhere]=useState(''),[kinds,setKinds]=useState(['landmark','unique']),[count,setCount]=useState(6);
 const [forWhom,setForWhom]=useState('');
 // Where the day starts from. With one, "ideas for Tokyo" becomes "what should we do around
 // here", and every card says how far away it is.
 const scopeDay=scope.startsWith('d:')?state.days.find(d=>d.date===scope.slice(2)):null;
 const dayStops=scopeDay?activeSteps(state,scopeDay.date).filter(s=>s.place||s.title):[];
 const [start,setStart]=useState(''),[startText,setStartText]=useState(''),[coords,setCoords]=useState(null),[locating,setLocating]=useState(false);
 const startStop=start.startsWith('s:')?state.steps.find(s=>s.id===start.slice(2)):null;
 const near=start==='hotel'?scopeDay?.hotel:startStop?(startStop.place||startStop.title):start==='me'&&coords?`the phone's position, ${coords.lat}, ${coords.lng}${scopeDay?` in ${scopeDay.city}`:''}`:start==='text'?startText.trim():'';
 async function locate(){
  setLocating(true);setError('');
  try{setCoords(await askPhoneWhereItIs(COORD_PLACES));setStart('me');}
  catch(e){setError(`${e.message}. Choose a planned place instead.`);}
  finally{setLocating(false);}
 }
 // "Something else instead": a stop on the plan, and who would rather not do it.
 const [mode,setMode]=useState('ideas'),[altDay,setAltDay]=useState(day||state.days[0]?.date||''),[stopId,setStopId]=useState(''),[sitting,setSitting]=useState([]);
 const stops=sitOutStops(state,altDay),stop=stops.find(s=>s.id===stopId)||null,rejoin=stop?rejoinAt(state,stop):null;
 const staying=stop?stop.participants.filter(n=>!sitting.includes(n)):[];
 const boysAlone=sitting.length>0&&sitting.every(n=>BOYS.includes(n));
 const [splitDone,setSplitDone]=useState([]);
 const [working,setWorking]=useState(false),[round,setRound]=useState(0),[result,setResult]=useState(null),[error,setError]=useState(''),[added,setAdded]=useState([]);
 const cities=[...new Set(state.days.map(d=>d.city))];
 const filled=state.members.filter(n=>profileFilled(state,n));
 const toggle=id=>setKinds(k=>k.includes(id)?k.filter(x=>x!==id):[...k,id]);
 async function ask(e){
  e.preventDefault();
  if(mode==='instead'&&(!stop||!sitting.length)){setError('Choose the stop, and who would rather not go.');return;}
  if(mode==='ideas'&&!kinds.length){setError('Choose at least one kind of idea.');return;}
  setWorking(true);setError('');setResult(null);setAdded([]);setSplitDone([]);setRound(r=>r+1);
  try{
   if(mode==='instead'){setResult(await request('suggest',{instead:{stepId:stop.id,who:sitting},count:Number(count)}));return;}
   const body={kinds,count:Number(count)};
   if(forWhom)body.forWhom=forWhom;
   if(near)body.near=near;
   if(scope.startsWith('d:'))body.day=scope.slice(2);
   else if(scope.startsWith('c:'))body.city=scope.slice(2);
   else body.city=elsewhere;
   setResult(await request('suggest',body));
  }catch(e){setError(e.message||'Suggestions did not work. Add your own idea instead.');}
  finally{setWorking(false);}
 }
 async function add(item,look){
  const notes=[item.draft.notes,item.why].filter(Boolean).join('\n\n').slice(0,4000);
  const saved=await mutate({type:'proposalAdd',person:user.name,...item.draft,notes});
  if(!saved)return null;
  setAdded(a=>[...a,item.draft.title]);onAdded?.();
  const created=saved?.state?.proposals?.at(-1);
  if(look&&created)onLookUp?.(created);
  return created||null;
 }
 // Straight onto the day as a split: the idea goes up on the board as the record of why, and
 // then sits beside the planned stop, with the ones who would rather not on it.
 async function splitOff(item){
  const created=added.includes(item.draft.title)?proposals(state).findLast(p=>p.title===item.draft.title&&!p.stepId):await add(item,false);
  if(!created)return;
  if(await mutate({type:'proposalInstead',id:created.id,stepId:result.instead.stepId,who:result.instead.who}))setSplitDone(d=>[...d,item.draft.title]);
 }
 const insteadGone=result?.instead&&(splitDone.length||state.steps.find(s=>s.id===result.instead.stepId)?.group);
 // Right on the deck is the main thing the panel was asked for: onto the board, or, when some of
 // us are sitting a stop out and the rest carry on, straight onto the day as a split.
 const splitting=!!(result?.instead?.staying.length&&!insteadGone);
 // Dealt with the ones that please the most of us on top; the model's own order breaks a tie.
 // After the party, the better-rated of two equal fits. Something with no rating counts as an
 // ordinary place, as on Near here, rather than as the worst one.
 const ranked=result?rankByParty(result.suggestions,state,i=>i.draft,(a,b)=>(b.rating??UNRATED_STARS)-(a.rating??UNRATED_STARS)):[];
 return <details className="party-panel suggest-panel">
  <summary><Sparkles size={17}/>Suggest some ideas</summary>
  <p>Built from who is going and what each of us said we are into{filled.length?` — ${filled.join(', ')} so far`:''}. {filled.length<state.members.length&&<strong>Fill in the rest above and these get sharper.</strong>}</p>
  <div className="segmented" role="group" aria-label="What to suggest">{[['ideas','New ideas'],['instead','Something else instead']].map(([key,label])=>
   <button type="button" key={key} className={mode===key?'selected':''} onClick={()=>{setMode(key);setError('');}}>{label}</button>)}</div>
  {mode==='instead'?<form onSubmit={ask}>
   <p><small>When some of us would rather not do a stop that is planned: ideas close by, in the same time, for the ones sitting it out — and back in time for the next thing we all do.</small></p>
   <label>Day<select value={altDay} onChange={e=>{setAltDay(e.target.value);setStopId('');setSitting([]);}}>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.city} · {d.title}</option>)}</select></label>
   <label>Instead of<select value={stopId} onChange={e=>{setStopId(e.target.value);setSitting([]);}}>
    <option value="">{stops.length?'Choose a stop…':'Nothing on this day to sit out'}</option>
    {stops.map(s=><option key={s.id} value={s.id}>{s.time?`${s.time} · `:''}{s.title}</option>)}
   </select></label>
   {stop&&<fieldset><legend>Who would rather not go</legend><div className="chips">{stop.participants.map(n=><label className={`chip ${sitting.includes(n)?'on':''}`} key={n}><input type="checkbox" checked={sitting.includes(n)} onChange={()=>setSitting(w=>w.includes(n)?w.filter(x=>x!==n):[...w,n])}/>{n}</label>)}</div></fieldset>}
   {stop&&!!sitting.length&&<p><small>{staying.length?`${staying.join(' and ')} carry on with ${stop.title}`:'Nobody would be doing it — anything you pick goes on the board to swap in'}{staying.length&&rejoin?`; everyone meets back up at ${rejoin.title}${rejoin.time?` at ${rejoin.time}`:''}.`:staying.length?'. Nothing later brings everyone back together yet.':'.'}</small></p>}
   {boysAlone&&<p className="callout"><AlertCircle size={18}/>Only the boys are ticked. A grown-up has to go with them — tick Damien or Lauren as well.</p>}
   <label>How many<select value={count} onChange={e=>setCount(e.target.value)}>{[4,6,8].map(n=><option key={n}>{n}</option>)}</select></label>
   <button className="primary" disabled={working||!stop||!sitting.length}><Split size={17}/>{working?'Thinking, and checking what is near…':'Suggest something else'}</button>
  </form>:<form onSubmit={ask}>
   <label>Where<select value={scope} onChange={e=>{setScope(e.target.value);if(start==='hotel'||start.startsWith('s:'))setStart('');}}>
    <option value="">Somewhere else…</option>
    <optgroup label="A day on the trip">{state.days.map(d=><option key={d.date} value={`d:${d.date}`}>{dayLabel(d.date)} · {d.city} · {d.title}</option>)}</optgroup>
    <optgroup label="Anywhere in">{cities.map(c=><option key={c} value={`c:${c}`}>{c}</option>)}</optgroup>
   </select></label>
   {!scope&&<label>Which place?<input value={elsewhere} onChange={e=>setElsewhere(e.target.value)} maxLength={120} placeholder="Nara · Gion after dark · near Tokyo Station"/></label>}
   {scopeDay&&!dayStops.length&&<p className="callout"><Sparkles size={18}/>Nothing is planned for {dayLabel(scopeDay.date)} yet. Say where the day starts and these become what to do around there.</p>}
   <label>Starting from<select value={start} onChange={e=>{const v=e.target.value;setStart(v);if(v==='me'&&!coords)locate();}}>
    <option value="">Anywhere{scopeDay?` in ${scopeDay.city}`:''} — no distances</option>
    {scopeDay?.hotel&&<option value="hotel">That night’s hotel · {scopeDay.hotel}</option>}
    {dayStops.map(s=><option key={s.id} value={`s:${s.id}`}>{s.time?`${s.time} · `:''}{s.title}</option>)}
    <option value="me">Where I am now</option>
    <option value="text">Somewhere I’ll type…</option>
   </select></label>
   {start==='text'&&<label>Where?<input value={startText} onChange={e=>setStartText(e.target.value)} maxLength={200} placeholder="Shibuya Station · our Airbnb in Asakusa"/></label>}
   {start==='me'&&<p><small>{locating?'Finding you…':coords?<><LocateFixed size={13}/> Using your position, rounded to about a hundred metres. <button type="button" onClick={locate}>Update</button></>:<button type="button" onClick={locate}><LocateFixed size={14}/>Use my position</button>}</small></p>}
   <fieldset><legend>What kind of thing</legend><div className="chips">{SUGGEST_KINDS.map(([id,label])=><label className={`chip ${kinds.includes(id)?'on':''}`} key={id}><input type="checkbox" checked={kinds.includes(id)} onChange={()=>toggle(id)}/>{label}</label>)}</div></fieldset>
   <label>For<select value={forWhom} onChange={e=>setForWhom(e.target.value)}>
    <option value="">All of us — what most of us like</option>
    {state.members.map(n=><option key={n} value={n}>{n} — {profileFilled(state,n)?'from their likes':'nothing filled in yet'}</option>)}
   </select></label>
   <label>How many<select value={count} onChange={e=>setCount(e.target.value)}>{[4,6,8].map(n=><option key={n}>{n}</option>)}</select></label>
   <button className="primary" disabled={working||(!scope&&!elsewhere.trim())}><Sparkles size={17}/>{working?'Thinking, and checking what is on…':'Suggest ideas'}</button>
   <small>Searches for what is actually on while we are there. Rough costs and times only — nothing here is checked, and <strong>Look it up</strong> on an idea is what fills in the hours, the ticket page and the map.</small>
  </form>}
  {error&&<p className="callout"><AlertCircle size={18}/>{error}</p>}
  {result&&<div className="suggest-results">
   <h3>{result.instead?`${result.suggestions.length} things ${result.instead.who.join(' and ')} could do instead of ${result.instead.title}`:`${result.suggestions.length} ideas for ${result.forWhom?`${result.forWhom} in `:''}${result.where}`}</h3>
   {result.note&&<p className="callout"><AlertCircle size={18}/>{result.note}</p>}
   <SuggestDeck key={round} items={ranked} keyOf={item=>item.draft.title} kept={added} busy={busy}
    onKeep={splitting?splitOff:item=>add(item,false)}
    keepLabel={splitting?`Split the day: ${result.instead.who.join(' and ')} do this`:'Put it on the board'} keepStamp={splitting?'Split':'On the board'}
    passLabel="Pass" keptWord={splitting?'split off':'on the board'}
    render={item=><article className="feature-card suggest-card">
     <div className="section-heading"><div><span className="eyebrow">{flavourLabel(item.flavour)}</span><h4>{item.draft.title}</h4></div></div>
     {item.draft.place&&<p><small>{item.draft.place}{item.draft.japanese&&<span lang="ja"> · {item.draft.japanese}</span>}</small></p>}
     <p className="suggest-why">{item.why}</p>
     <PartyMatch fit={item.fit} members={state.members} top={item===ranked[0]}/>
     <p>{item.draft.notes}</p>
     <div className="plan-facts">
      {item.travelMinutes!=null&&<span className="suggest-travel"><MapPin size={14}/>{travelText(item.travelMinutes,item.travelMode,result.from)}</span>}
      <span><Tag size={14}/>{kindLabel(item.draft.category)}</span>
      {item.rating!=null&&<span className="suggest-rating"><Star size={14}/>{ratingText(item.rating,item.ratingCount)} on Google</span>}
      {!!item.draft.duration&&<span><Clock size={14}/>About {item.draft.duration} min</span>}
      {item.draft.cost!==null&&<span><Coins size={14}/>Around ¥{item.draft.cost.toLocaleString()}{item.draft.costNote?` · ${item.draft.costNote}`:''}</span>}
      {item.bookAhead&&<span>Usually booked ahead</span>}
      <span>{item.draft.suitableFor.length?`Suits ${item.draft.suitableFor.join(', ')}`:'Suits everyone'}</span>
     </div>
     <CardLinks item={item} from={start==='me'&&coords?coords:result.from}/>
     <div className="row wrap">
      {splitting&&<button disabled={busy} onClick={()=>add(item,false)}><Plus size={16}/>Just put it on the board</button>}
      <button disabled={busy} onClick={()=>add(item,true)}><Search size={16}/>Add and look it up</button>
     </div>
    </article>}/>
   {result.instead&&!!splitDone.length&&<p className="tag"><Split size={13}/>On the day, split with {result.instead.title}: {splitDone.join(', ')}</p>}
   <small>{result.usage.searches} web {result.usage.searches===1?'search':'searches'}. These are ideas, not checked facts — costs and times are rough, and anything you plan around needs looking up first.</small>
   <button onClick={()=>setResult(null)}><X size={16}/>Clear these</button>
  </div>}
 </details>;
}
