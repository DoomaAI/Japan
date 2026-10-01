import React,{useEffect,useRef,useState} from 'react';
import {MessageSquareQuote,Plus,Sparkles,ListChecks,ChevronRight,AlertCircle,X,ClipboardPaste,Image as ImageIcon,Trash2} from 'lucide-react';
import {PROPOSAL_KINDS,tripAreas,ideasByBase} from './trip-features.js';
import {japanDate} from './timing.js';
import Dictate from './Dictate.jsx';
import {shrinkPhoto} from './MenuReader.jsx';
import {splitRecommendations,matchProposal,recommenderList,recommendedProposals,recommenders,peekRecommendation,clearRecommendation,
 RECOMMEND_TEXT,RECOMMENDER_NAME,RECOMMEND_VIA,MAX_RECOMMEND_SHOTS} from './recommend-data.js';
// Recommendations from friends and family, gathered in one place on the planning board. They
// arrive however people send them: a WhatsApp list pasted or shared in, an email forwarded to the
// trip address and sent on from the inbox, screenshots of a chat, or a phone call said aloud
// afterwards. Say who it was from, tick through what it recommends, and each tick goes onto the
// board as an ordinary idea for the family to vote on; a place already there gets their name
// added, so the board shows one idea three people told us about rather than three copies of it.
// One line in the summary: the idea, who told us, and how to get there.
function Line({p,onOpen}){
 const r=recommenders(p);
 return <><button className="recommend-link" onClick={()=>onOpen?.(p)}><strong>{p.title}</strong> <ChevronRight size={14}/></button>
  <small>{r.map(x=>x.name).join(', ')}{r.length>1?` · ${r.length} recommendations`:''}{p.travel?` · ${p.travel}`:''}</small></>;
}
// The list to tick through, grouped the way the board will group it: by base, with each place's
// parts straight after it. The first of each base is marked so a heading can go above it.
function reviewOrder(items){
 const tops=items.filter(i=>!i.within),bases=[...new Set(tops.map(i=>i.accessibleFrom))].sort((a,b)=>(!a)-(!b));
 const out=[];
 for(const base of bases)tops.filter(i=>i.accessibleFrom===base).forEach((top,n)=>{
  out.push({...top,first:n===0});
  out.push(...items.filter(i=>i.within&&i.within===top.title));
 });
 // Parts whose place has been renamed or dropped still show, at the end, so nothing goes missing.
 return [...out,...items.filter(i=>i.within&&!tops.some(t=>t.title===i.within))];
}
export default function Recommendations({state,user,mutate,busy,request,canRead,onOpen}){
 const ideas=state.proposals||[],people=recommenderList(ideas),top=recommendedProposals(ideas),parent=user.role==='parent';
 const areas=tripAreas(state),groups=ideasByBase(state,top,japanDate());
 // Something handed over from the inbox or the share sheet opens the form already filled in.
 const [handed]=useState(()=>peekRecommendation());
 const [adding,setAdding]=useState(!!handed),[from,setFrom]=useState(handed?.from||''),[text,setText]=useState(handed?.text||'');
 const [via,setVia]=useState(handed?.via||'message'),[inboxId,setInboxId]=useState(handed?.inboxId||''),[shots,setShots]=useState([]);
 const [items,setItems]=useState(null),[reading,setReading]=useState(false),[error,setError]=useState(''),[saving,setSaving]=useState(false),[done,setDone]=useState(null);
 const picker=useRef(),card=useRef();
 useEffect(()=>{if(!handed)return;clearRecommendation();card.current?.scrollIntoView?.({block:'start',behavior:'smooth'});},[]);
 function review(list){
  setItems(list.map((item,i)=>({within:'',accessibleFrom:'',travel:'',...item,key:i,keep:true})));setError(list.length?'':'Nothing in that looked like a recommendation. Put one on each line, or add them below by hand.');
 }
 async function read(){
  if(!navigator.onLine){setError('Reading it needs a connection. One per line works with no signal.');return;}
  setReading(true);setError('');
  try{review((await request('recommend-read',{text,from,images:shots.length?shots.map(({image,mediaType})=>({image,mediaType})):undefined})).items||[]);}
  catch(e){setError(e.message||'That could not be read. Split it line by line instead.');}
  finally{setReading(false);}
 }
 async function paste(){
  try{const clip=await navigator.clipboard.readText();if(clip?.trim())setText(t=>(t.trim()?`${t.trim()}\n`:'')+clip.trim().slice(0,RECOMMEND_TEXT));else setError('There is nothing copied to paste.');}
  catch{setError('This phone would not hand over what was copied. Press and hold in the box and choose Paste.');}
 }
 async function addShots(files){
  const room=MAX_RECOMMEND_SHOTS-shots.length,chosen=[...files||[]].slice(0,room);
  if(files?.length>room)setError(`Up to ${MAX_RECOMMEND_SHOTS} screenshots at a time.`);
  try{const shrunk=await Promise.all(chosen.map(f=>shrinkPhoto(f,2000,0.8)));setShots(s=>[...s,...shrunk]);setVia('screenshot');}
  catch{setError('That picture could not be opened. Try a screenshot saved to Photos.');}
 }
 const edit=(key,patch)=>setItems(list=>list.map(i=>i.key===key?{...i,...patch}:i));
 async function save(){
  const name=from.trim(),kept=items.filter(i=>i.keep&&i.title.trim());
  // Places before the things in them, so "part of Nikko" finds Nikko already on the board. A part
  // whose place was left unticked stands on its own, reached from wherever its place was.
  const keptTitles=new Set(kept.filter(i=>!i.within).map(i=>i.title.trim()));
  const chosen=[...kept.filter(i=>!i.within),...kept.filter(i=>i.within)].map(i=>i.within&&!keptTitles.has(i.within)&&!matchProposal(ideas,i.within)
   ?{...i,within:'',accessibleFrom:i.accessibleFrom||items.find(x=>x.title===i.within)?.accessibleFrom||''}:i);
  if(!name){setError('Say who recommended these first.');return;}
  setSaving(true);setError('');let added=0,joined=0;
  // One at a time, so a second item matching the first lands on it rather than beside it.
  for(const i of chosen){
   // Matched by name on the server against the board as it is then, not as this screen saw it.
   const match=matchProposal(ideas,i.title);
   const ok=await mutate({type:'proposalRecommend',person:user.name,name,said:i.said,via,title:i.title.trim(),place:i.place,category:i.category,
    within:i.within,accessibleFrom:i.within?'':i.accessibleFrom,travel:i.travel});
   if(!ok)break;
   if(match)joined++;else added++;
  }
  setSaving(false);
  if(added+joined===chosen.length){
   setDone({text:[added&&`${added} new idea${added===1?'':'s'}`,joined&&`${joined} already on the board`].filter(Boolean).join(' · ')+` from ${name}.`,inboxId});
   setItems(null);setText('');setShots([]);setInboxId('');setAdding(false);
  }
 }
 async function clearEmail(id){if(await mutate({type:'inboxDiscard',id}))setDone(d=>({...d,inboxId:''}));}
 const close=()=>{setAdding(false);setItems(null);setError('');setShots([]);setInboxId('');};
 const anything=text.trim()||shots.length;
 return <section ref={card} className="feature-card recommend-card">
  <div className="section-heading"><div><span className="eyebrow">FROM FRIENDS & FAMILY</span><h2>Recommendations</h2></div><MessageSquareQuote size={22}/></div>
  <p>{people.length?`${top.length} idea${top.length===1?'':'s'} from ${people.length} ${people.length===1?'person':'people'} who are not on the trip. Each one is on the board for a vote, with who said so.`:'Every tip anyone sends us, in one place: a text, an email, a screenshot or a phone call.'}</p>
  {done&&<p className="callout">{done.text}{done.inboxId&&parent&&<> <button disabled={busy} onClick={()=>clearEmail(done.inboxId)}><Trash2 size={15}/>Clear the email from the inbox</button></>}</p>}
  {!!top.length&&<div className="recommend-groups">{groups.map(g=>{
   const body=<ul className="recommend-top">{g.items.map(({idea,children})=><li key={idea.id}>
    <Line p={idea} onOpen={onOpen}/>
    {!!children.length&&<ul className="recommend-parts">{children.map(c=><li key={c.id}><Line p={c} onOpen={onOpen}/></li>)}</ul>}
   </li>)}</ul>;
   const label=g.base?`Accessible from ${g.base}`:'Not sure where';
   return g.behind?<details key={g.base||'none'}><summary>{label} · behind us</summary>{body}</details>
    :<div key={g.base||'none'}><h3>{label}</h3>{body}</div>;
  })}</div>}
  {!!people.length&&<div className="row wrap plan-tags">{people.map(r=><button className="tag" key={r.name} onClick={()=>onOpen?.({title:r.name})}>{r.name} · {r.ideas.length}</button>)}</div>}
  {!adding&&<button className="primary" onClick={()=>{setAdding(true);setDone(null);}}><Plus size={16}/>Add recommendations</button>}
  {adding&&<div className="plan-form recommend-form">
   {inboxId&&<p className="inbox-waiting">From the forwarded email. Check who it was from: a forward usually says.</p>}
   <div className="form-row">
    <label>Who recommended it?<input value={from} onChange={e=>setFrom(e.target.value)} maxLength={RECOMMENDER_NAME} list="recommenders" placeholder="Aunty Sue, Tom from work…"/></label>
    <label>How it reached us<select value={via} onChange={e=>setVia(e.target.value)}>{RECOMMEND_VIA.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   </div>
   <datalist id="recommenders">{people.map(r=><option key={r.name} value={r.name}/>)}</datalist>
   {!items&&<>
    <label>What they said<textarea value={text} onChange={e=>setText(e.target.value)} maxLength={RECOMMEND_TEXT} rows={7}
     placeholder={via==='call'?'What they told you, one thing a line, or tap Say it':'Paste their message, or type one recommendation a line:\nIchiran Ramen - get the solo booth\nNishiki Market: go before 10'}/></label>
    <div className="row wrap">
     {!!navigator.clipboard?.readText&&<button type="button" onClick={paste}><ClipboardPaste size={16}/>Paste</button>}
     <Dictate onText={heard=>{setText(t=>(t.trim()?`${t.trim()}\n`:'')+heard);if(via==='message')setVia('call');}} label="Say it" what="what they recommended"/>
     {canRead&&<><button type="button" disabled={shots.length>=MAX_RECOMMEND_SHOTS} onClick={()=>picker.current?.click()}><ImageIcon size={16}/>Screenshots</button>
      <input ref={picker} type="file" accept="image/*" multiple hidden onChange={e=>{addShots(e.target.files);e.target.value='';}}/></>}
    </div>
    {!!shots.length&&<div className="recommend-shots">{shots.map((s,i)=><figure key={i}><img src={s.preview} alt={`Screenshot ${i+1}`}/>
     <button type="button" aria-label={`Take screenshot ${i+1} out`} onClick={()=>setShots(list=>list.filter((_,j)=>j!==i))}><X size={14}/></button></figure>)}</div>}
    <div className="row wrap">
     {canRead&&<button className="primary" disabled={reading||!anything} onClick={read}><Sparkles size={16}/>{reading?'Reading it…':'Read it for me'}</button>}
     <button className={canRead?'':'primary'} disabled={reading||!text.trim()} onClick={()=>review(splitRecommendations(text,areas))}><ListChecks size={16}/>One per line</button>
     <button onClick={()=>review([{title:'',said:'',place:'',category:'place'}])}>Type them in</button>
     <button onClick={close}>Cancel</button>
    </div>
    {canRead&&<small>Read it for me picks the recommendations out of a chatty message or screenshots of a chat, and keeps their tips. It needs a connection and costs a cent or two. One per line works anywhere.</small>}
    <small>From a phone: share a message to the “Japan tip” Shortcut (set it up in Settings → Shortcuts), or on Android share it straight to Japan 2026. Forward an email to the trip address and open it from Forwarded email.</small>
   </>}
   {items&&<>
    <p><strong>Tick what goes on the board.</strong> Anything already there gets {from.trim()||'their'} name added instead of a second copy.</p>
    <ul className="recommend-items">{reviewOrder(items).map(i=>{const match=i.title.trim()&&matchProposal(ideas,i.title),tops=items.filter(x=>!x.within&&x.key!==i.key&&x.title.trim());
     const heading=!i.within&&(i.first?<li className="recommend-heading" aria-hidden="true">{i.accessibleFrom?`Accessible from ${i.accessibleFrom}`:'Not sure where'}</li>:null);
     return <React.Fragment key={i.key}>{heading}<li className={`${i.keep?'':'off'}${i.within?' part':''}`}>
     <input className="recommend-keep" type="checkbox" checked={i.keep} onChange={e=>edit(i.key,{keep:e.target.checked})} aria-label={`Put ${i.title||'this'} on the board`}/>
     <div>
      <input value={i.title} onChange={e=>edit(i.key,{title:e.target.value})} maxLength={250} placeholder="Place, dish or thing to do" aria-label="What they recommended"/>
      <div className="form-row">
       <select value={i.category} onChange={e=>edit(i.key,{category:e.target.value})} aria-label="Kind">{PROPOSAL_KINDS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
       <input value={i.place} onChange={e=>edit(i.key,{place:e.target.value})} maxLength={250} placeholder="Where (optional)" aria-label="Where"/>
      </div>
      <input value={i.said} onChange={e=>edit(i.key,{said:e.target.value})} maxLength={500} placeholder="What they said about it" aria-label="What they said"/>
      <div className="form-row">
       <select value={i.within} onChange={e=>edit(i.key,{within:e.target.value})} aria-label="Part of" disabled={items.some(x=>x.within===i.title&&x.key!==i.key)}>
        <option value="">On its own</option>{tops.map(x=><option key={x.key} value={x.title}>Part of {x.title}</option>)}</select>
       {!i.within&&<select value={i.accessibleFrom} onChange={e=>edit(i.key,{accessibleFrom:e.target.value})} aria-label="Accessible from">
        <option value="">Not sure where</option>{areas.map(a=><option key={a} value={a}>From {a}</option>)}</select>}
      </div>
      {!i.within&&<input value={i.travel} onChange={e=>edit(i.key,{travel:e.target.value})} maxLength={120} placeholder="Getting there (optional): 2 hrs by train" aria-label="Getting there"/>}
      <small>{match?`Already on the board as ${match.title}: adds ${from.trim()||'their'} name to it`:i.within?`New idea, part of ${i.within}`:'New idea on the board'}</small>
     </div>
    </li></React.Fragment>;})}</ul>
    <div className="row wrap">
     <button onClick={()=>setItems(list=>[...list,{key:Date.now(),title:'',said:'',place:'',category:'place',within:'',accessibleFrom:'',travel:'',keep:true}])}><Plus size={16}/>Another</button>
     <button className="primary" disabled={busy||saving||!items.some(i=>i.keep&&i.title.trim())} onClick={save}>{saving?'Adding…':`Add ${items.filter(i=>i.keep&&i.title.trim()).length} to the board`}</button>
     <button onClick={()=>setItems(null)}>Back</button>
     <button onClick={close}><X size={16}/>Cancel</button>
    </div>
   </>}
   {error&&<p className="callout"><AlertCircle size={18}/>{error}</p>}
  </div>}
 </section>;
}
