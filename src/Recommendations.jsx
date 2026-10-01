import React,{useState} from 'react';
import {MessageSquareQuote,Plus,Sparkles,ListChecks,ChevronRight,AlertCircle,X} from 'lucide-react';
import {PROPOSAL_KINDS} from './trip-features.js';
import {splitRecommendations,matchProposal,recommenderList,recommendedProposals,recommenders,RECOMMEND_TEXT,RECOMMENDER_NAME} from './recommend-data.js';
// Recommendations from friends and family, gathered in one place on the planning board. Paste
// what somebody sent (a WhatsApp list, an email, a note from a phone call), say who it was from,
// and tick through what it recommends. Each tick goes onto the board as an ordinary idea for the
// family to vote on, or, when the place is already there, adds their name to that idea, so the
// board shows one idea that three people told us about rather than three copies of it.
export default function Recommendations({state,user,mutate,busy,request,canRead,onOpen}){
 const ideas=state.proposals||[],people=recommenderList(ideas),top=recommendedProposals(ideas);
 const [adding,setAdding]=useState(false),[from,setFrom]=useState(''),[text,setText]=useState('');
 const [items,setItems]=useState(null),[reading,setReading]=useState(false),[error,setError]=useState(''),[saving,setSaving]=useState(false),[done,setDone]=useState('');
 function review(list){
  setItems(list.map((item,i)=>({...item,key:i,keep:true})));setError(list.length?'':'Nothing in that looked like a recommendation. Put one on each line, or add them below by hand.');
 }
 async function read(){
  setReading(true);setError('');
  try{review((await request('recommend-read',{text,from})).items||[]);}
  catch(e){setError(e.message||'That could not be read. Split it line by line instead.');}
  finally{setReading(false);}
 }
 const edit=(key,patch)=>setItems(list=>list.map(i=>i.key===key?{...i,...patch}:i));
 async function save(){
  const name=from.trim(),chosen=items.filter(i=>i.keep&&i.title.trim());
  if(!name){setError('Say who recommended these first.');return;}
  setSaving(true);setError('');let added=0,joined=0;
  // One at a time, so a second item matching the first lands on it rather than beside it.
  for(const i of chosen){
   // Matched by name on the server against the board as it is then, not as this screen saw it.
   const match=matchProposal(ideas,i.title);
   const ok=await mutate({type:'proposalRecommend',person:user.name,name,said:i.said,title:i.title.trim(),place:i.place,category:i.category});
   if(!ok)break;
   if(match)joined++;else added++;
  }
  setSaving(false);
  if(added+joined===chosen.length){
   setDone([added&&`${added} new idea${added===1?'':'s'}`,joined&&`${joined} already on the board`].filter(Boolean).join(' · ')+` from ${name}.`);
   setItems(null);setText('');setAdding(false);
  }
 }
 const close=()=>{setAdding(false);setItems(null);setError('');};
 return <section className="feature-card recommend-card">
  <div className="section-heading"><div><span className="eyebrow">FROM FRIENDS & FAMILY</span><h2>Recommendations</h2></div><MessageSquareQuote size={22}/></div>
  <p>{people.length?`${top.length} idea${top.length===1?'':'s'} from ${people.length} ${people.length===1?'person':'people'} who are not on the trip. Each one is on the board for a vote, with who said so.`:'Put every tip anyone has sent us in one place: paste their message and tick what goes on the board.'}</p>
  {done&&<p className="callout">{done}</p>}
  {!!top.length&&<ol className="recommend-top">{top.slice(0,8).map(p=><li key={p.id}>
   <button className="recommend-link" onClick={()=>onOpen?.(p)}><strong>{p.title}</strong> <ChevronRight size={14}/></button>
   <small>{recommenders(p).map(r=>r.name).join(', ')}{recommenders(p).length>1?` · ${recommenders(p).length} recommendations`:''}</small>
  </li>)}</ol>}
  {!!people.length&&<div className="row wrap plan-tags">{people.map(r=><button className="tag" key={r.name} onClick={()=>onOpen?.({title:r.name})}>{r.name} · {r.ideas.length}</button>)}</div>}
  {!adding&&<button className="primary" onClick={()=>{setAdding(true);setDone('');}}><Plus size={16}/>Add recommendations</button>}
  {adding&&<div className="plan-form recommend-form">
   <label>Who recommended it?<input value={from} onChange={e=>setFrom(e.target.value)} maxLength={RECOMMENDER_NAME} list="recommenders" placeholder="Aunty Sue, Tom from work…"/></label>
   <datalist id="recommenders">{people.map(r=><option key={r.name} value={r.name}/>)}</datalist>
   {!items&&<>
    <label>What they sent<textarea value={text} onChange={e=>setText(e.target.value)} maxLength={RECOMMEND_TEXT} rows={7} placeholder={'Paste their message, or type one recommendation a line:\nIchiran Ramen - get the solo booth\nNishiki Market: go before 10'}/></label>
    <div className="row wrap">
     {canRead&&<button className="primary" disabled={reading||!text.trim()} onClick={read}><Sparkles size={16}/>{reading?'Reading it…':'Read it for me'}</button>}
     <button className={canRead?'':'primary'} disabled={reading||!text.trim()} onClick={()=>review(splitRecommendations(text))}><ListChecks size={16}/>One per line</button>
     <button onClick={()=>review([{title:'',said:'',place:'',category:'place'}])}>Type them in</button>
     <button onClick={close}>Cancel</button>
    </div>
    {canRead&&<small>Read it for me picks the recommendations out of a chatty message and keeps their tips. It needs a connection and costs a cent or two. One per line works anywhere.</small>}
   </>}
   {items&&<>
    <p><strong>Tick what goes on the board.</strong> Anything already there gets {from.trim()||'their'} name added instead of a second copy.</p>
    <ul className="recommend-items">{items.map(i=>{const match=i.title.trim()&&matchProposal(ideas,i.title);return <li key={i.key} className={i.keep?'':'off'}>
     <input className="recommend-keep" type="checkbox" checked={i.keep} onChange={e=>edit(i.key,{keep:e.target.checked})} aria-label={`Put ${i.title||'this'} on the board`}/>
     <div>
      <input value={i.title} onChange={e=>edit(i.key,{title:e.target.value})} maxLength={250} placeholder="Place, dish or thing to do" aria-label="What they recommended"/>
      <div className="form-row">
       <select value={i.category} onChange={e=>edit(i.key,{category:e.target.value})} aria-label="Kind">{PROPOSAL_KINDS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
       <input value={i.place} onChange={e=>edit(i.key,{place:e.target.value})} maxLength={250} placeholder="Where (optional)" aria-label="Where"/>
      </div>
      <input value={i.said} onChange={e=>edit(i.key,{said:e.target.value})} maxLength={500} placeholder="What they said about it" aria-label="What they said"/>
      <small>{match?`Already on the board as ${match.title}: adds ${from.trim()||'their'} name to it`:'New idea on the board'}</small>
     </div>
    </li>;})}</ul>
    <div className="row wrap">
     <button onClick={()=>setItems(list=>[...list,{key:Date.now(),title:'',said:'',place:'',category:'place',keep:true}])}><Plus size={16}/>Another</button>
     <button className="primary" disabled={busy||saving||!items.some(i=>i.keep&&i.title.trim())} onClick={save}>{saving?'Adding…':`Add ${items.filter(i=>i.keep&&i.title.trim()).length} to the board`}</button>
     <button onClick={()=>setItems(null)}>Back</button>
     <button onClick={close}><X size={16}/>Cancel</button>
    </div>
   </>}
   {error&&<p className="callout"><AlertCircle size={18}/>{error}</p>}
  </div>}
 </section>;
}
