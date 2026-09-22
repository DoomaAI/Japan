import React,{useState} from 'react';
import {MapPin,Navigation,Search,Plus,Check,AlertCircle,Clock,Coins,ExternalLink,Inbox,Users,LocateFixed,UtensilsCrossed,Star} from 'lucide-react';
import {NEARBY_KINDS,FOOD_NEARBY_KINDS,MAX_DISH_HUNT,MINUTES_PER_STAR,isRatedKind,nearbyKindLabel,priceBandLabel,ratingText,walkingLink,COORD_PLACES} from './trip-features.js';
import {askPhoneWhereItIs} from './geo.js';
import {activeSteps} from './timing.js';
// Asked standing in the street, so it opens on what it can answer fastest: where the phone says
// you are, or the place the itinerary says you should be. Nothing is added anywhere by itself.
//
// Asked from the food page it is the same lookup with a narrower question: the dishes still on
// our list come with it, the amenity half of the menu is put away, and an answer that does one of
// those dishes says which and goes to the top.
//
// The order of the cards is not the order they came back in. A place to eat or drink is worth its
// Google rating less a tenth of a star for every minute of the walk — our own exchange rate,
// written down once in trip-features and applied on the server — so the good bowl of noodles eight
// minutes away beats the ordinary one outside the station, and the station one wins again at
// twelve. A toilet, a cash machine or a Lawson is not chosen on a rating, so those are the nearest
// one, as they always were.
//
// The asking is specific for the same reason: matcha, ramen, sushi, a bakery, something the boys
// can hold. "Somewhere to eat" is the question you ask when nobody minds, and somebody usually
// minds.
export default function Nearby({state,user,day,step,request,mutate,busy,notice,close,selectStep,mode,wishlist}){
 const today=state.days.find(d=>d.date===day),steps=activeSteps(state,day);
 const current=step||steps.find(s=>!['done','skipped'].includes(s.status))||steps.at(-1);
 const hunt=mode==='food';
 const offered=(wishlist||[]).slice(0,MAX_DISH_HUNT);
 const [anchor,setAnchor]=useState(current?`s:${current.id}`:'me');
 const [coords,setCoords]=useState(null),[locating,setLocating]=useState(false);
 const [kinds,setKinds]=useState(hunt?['food','quick']:['food']),[note,setNote]=useState('');
 const [dishes,setDishes]=useState(offered);
 const [working,setWorking]=useState(false),[result,setResult]=useState(null),[error,setError]=useState(''),[added,setAdded]=useState([]);
 const parent=user.role==='parent';
 const chosen=anchor.startsWith('s:')?state.steps.find(s=>s.id===anchor.slice(2)):null;
 const toggle=id=>setKinds(k=>k.includes(id)?k.filter(x=>x!==id):[...k,id]);
 const toggleDish=name=>setDishes(d=>d.includes(name)?d.filter(x=>x!==name):[...d,name]);
 async function locate(){
  setLocating(true);setError('');
  // About a hundred metres, which finds a konbini and does not point at a hotel room.
  try{setCoords(await askPhoneWhereItIs(COORD_PLACES));setAnchor('me');}
  catch(e){setError(`${e.message}. Choose a planned place below instead.`);}
  finally{setLocating(false);}
 }
 async function ask(){
  if(!kinds.length){setError('Choose what you are looking for.');return;}
  const body={kinds,city:today?.city,note};
  if(dishes.length)body.wishlist=dishes;
  if(anchor==='me'){
   if(!coords){setError('Tap Use my position first, or choose a planned place.');return;}
   body.lat=coords.lat;body.lng=coords.lng;
   if(current)body.place=`somewhere near ${current.place||current.title}`;
  }else if(anchor==='hotel')body.place=today?.hotel;
  else if(chosen)body.place=chosen.place||chosen.title;
  if(!body.lat&&!body.place){setError('Say where you are first.');return;}
  setWorking(true);setError('');setResult(null);setAdded([]);
  try{setResult(await request('nearby',body));}
  catch(e){setError(e.message||'That did not work. Try Maps — a convenience store is rarely far.');}
  finally{setWorking(false);}
 }
 // Straight onto today, right after whatever we are in the middle of, so it lands where it
 // actually happens rather than at the end of the day.
 async function addToDay(item){
  const order=current?current.order+0.5:undefined;
  const saved=await mutate({type:'add',step:{title:item.draft.title,day,time:null,
   duration:item.draft.duration,place:item.draft.place||item.area,japanese:item.draft.japanese,
   notes:[item.what,item.dish?`On our food list: ${item.dish}`:'',
    item.rating===null?'':`Google ${ratingText(item.rating,item.ratingCount)}`,item.why,item.openNote].filter(Boolean).join('\n'),kind:'flexible',
   page:today?.pages?.[0]||1,participants:[...state.members],...(order?{order}:{})}});
  if(!saved)return;
  setAdded(a=>[...a,item.draft.title]);
  notice?.(`${item.draft.title} added to today, after ${current?.title||'the last stop'}.`);
 }
 async function saveIdea(item){
  const saved=await mutate({type:'proposalAdd',person:user.name,...item.draft,
   notes:[item.draft.notes,item.why].filter(Boolean).join('\n\n').slice(0,4000)});
  if(saved){setAdded(a=>[...a,item.draft.title]);notice?.('Saved to the planning board.');}
 }
 return <div className="nearby">
  <div className="segmented nearby-scope">
   <button className={anchor==='me'?'selected':''} onClick={()=>{setAnchor('me');if(!coords)locate();}}><LocateFixed size={16}/>Where I am</button>
   <button className={anchor!=='me'?'selected':''} onClick={()=>setAnchor(current?`s:${current.id}`:'hotel')}><MapPin size={16}/>A planned place</button>
  </div>
  {anchor==='me'
   ?<div className="nearby-position">
     {coords?<p><Check size={16}/>Using your position, rounded to about a hundred metres ({coords.lat.toFixed(COORD_PLACES)}, {coords.lng.toFixed(COORD_PLACES)}). <button onClick={locate} disabled={locating}>Update</button></p>
      :<><button className="primary" onClick={locate} disabled={locating}><LocateFixed size={17}/>{locating?'Finding you…':'Use my position'}</button>
        <small>Your phone asks before sharing. The position is rounded to about a hundred metres before it is sent, and it is never saved into the trip.</small></>}
    </div>
   :<label>Near which place<select value={anchor} onChange={e=>setAnchor(e.target.value)}>
     {today?.hotel&&<option value="hotel">Tonight’s hotel · {today.hotel}</option>}
     {steps.filter(s=>s.place||s.title).map(s=><option key={s.id} value={`s:${s.id}`}>{s.time?`${s.time} · `:''}{s.title}</option>)}
    </select></label>}
  {hunt&&offered.length>0&&<fieldset><legend>Still on our list</legend>
   <p className="nearby-hint">Somewhere that does one of these comes first. Tap off whatever nobody is hunting right now — with none of them on, it just looks for somewhere to eat.</p>
   <div className="chips">{offered.map(name=><label className={`chip ${dishes.includes(name)?'on':''}`} key={name}><input type="checkbox" checked={dishes.includes(name)} onChange={()=>toggleDish(name)}/>{name}</label>)}</div>
  </fieldset>}
  <fieldset><legend>{hunt?'What kind of place?':'Something to eat or drink'}</legend>
   <div className="chips">{NEARBY_KINDS.filter(([id])=>FOOD_NEARBY_KINDS.includes(id)).map(([id,label])=><label className={`chip ${kinds.includes(id)?'on':''}`} key={id}><input type="checkbox" checked={kinds.includes(id)} onChange={()=>toggle(id)}/>{label}</label>)}</div></fieldset>
  {!hunt&&<fieldset><legend>The practical things</legend>
   <p className="nearby-hint">These are answered with the nearest one rather than the best rated — nobody chooses a toilet on four and a half stars.</p>
   <div className="chips">{NEARBY_KINDS.filter(([id])=>!FOOD_NEARBY_KINDS.includes(id)).map(([id,label])=><label className={`chip ${kinds.includes(id)?'on':''}`} key={id}><input type="checkbox" checked={kinds.includes(id)} onChange={()=>toggle(id)}/>{label}</label>)}</div></fieldset>}
  <label>Anything else<input value={note} onChange={e=>setNote(e.target.value)} maxLength={250} placeholder="nothing spicy · we have the pram · twenty minutes before the train"/></label>
  <button className="primary nearby-go" onClick={ask} disabled={working||busy}><Search size={18}/>{working?'Having a look…':hunt?'Where can we eat near here?':'What is near here?'}</button>
  {error&&<p className="callout"><AlertCircle size={18}/>{error}</p>}
  {result&&<div className="nearby-results">
   <h3>Near {result.anchor||today?.city}</h3>
   <p className="nearby-hint">Somewhere to eat or drink comes best first rather than nearest first: the Google rating with the walk taken off it, a tenth of a star for every minute — so we will walk {MINUTES_PER_STAR} minutes more for a whole extra star. Somewhere with no rating is ranked as an ordinary place and says so on its card. Toilets, cash, lockers and convenience stores are the nearest one, which is the only thing that matters about them.</p>
   {result.note&&<p className="callout"><AlertCircle size={18}/>{result.note}</p>}
   {result.options.map(item=>{
    const done=added.includes(item.draft.title),link=walkingLink(item.draft.title,item.area,result.from);
    return <article className={`feature-card nearby-card ${done?'finished':''}`} key={item.draft.title+item.area}>
     <div className="section-heading"><div><span className="eyebrow">{nearbyKindLabel(item.kind)}</span><h4>{item.draft.title}</h4></div>
      <div className="nearby-marks">
       {isRatedKind(item.kind)&&<span className={`nearby-rating${item.rating===null?' unrated':''}`}><Star size={14}/>{item.rating===null?'—':item.rating.toFixed(1)}<small>{item.rating===null?'no rating':'Google'}</small></span>}
       {item.walkMinutes!==null&&<span className="nearby-walk">{item.walkMinutes}<small>min walk</small></span>}
      </div></div>
     {item.draft.japanese&&<p className="destination-japanese" lang="ja">{item.draft.japanese}</p>}
     {item.dish&&<p className="nearby-dish"><UtensilsCrossed size={15}/>Does <strong>{item.dish}</strong>, which is still on our list</p>}
     <p>{item.what}</p>
     {item.why&&<p className="suggest-why">{item.why}</p>}
     <div className="plan-facts">
      {item.area&&<span><MapPin size={14}/>{item.area}</span>}
      {isRatedKind(item.kind)&&<span><Star size={14}/>{item.rating===null?'No Google rating we could find':`${ratingText(item.rating,item.ratingCount)} on Google`}</span>}
      {item.priceBand&&<span><Coins size={14}/>{priceBandLabel(item.priceBand)}</span>}
      {item.openNote&&<span><Clock size={14}/>{item.openNote}</span>}
      <span><Users size={14}/>{item.kidFriendly?'Fine with Nate':'Not one for Nate'}</span>
     </div>
     <div className="row wrap">
      <a className="button primary" href={link} target="_blank" rel="noopener noreferrer"><Navigation size={16}/>Walk me there <ExternalLink size={13}/></a>
      {done?<span className="tag"><Check size={13}/>Added</span>:<>
       {parent&&<button disabled={busy} onClick={()=>addToDay(item)}><Plus size={16}/>Add to today</button>}
       <button disabled={busy} onClick={()=>saveIdea(item)}><Inbox size={16}/>Save to the board</button>
      </>}
     </div>
    </article>;})}
   <p className="callout"><AlertCircle size={18}/>These are suggestions from a model that cannot see a map and does not know what closed this year. Walking times are estimates and nothing here is confirmed open — check the door before you count on it.</p>
   <small>{result.usage.searches} web {result.usage.searches===1?'search':'searches'}.</small>
  </div>}
 </div>;
}
