import React,{useState} from 'react';
import {Wheat,Maximize2,Minimize2,Pencil,Volume2,AlertCircle} from 'lucide-react';
import {ALLERGENS,allergyCard,allergyOf,allergyPeople} from './allergy-data.js';
// The card a waiter is handed. Japanese large enough to read across a counter, English under it
// for whoever is holding the phone, and a parent's editor under that. Nothing on it is a promise:
// the restaurant confirms, the card only asks the question clearly.
export default function AllergyCard({state,user,mutate,busy,speak}){
 const parent=user.role==='parent',people=state.members||[];
 const [who,setWho]=useState(()=>allergyPeople(state)[0]||(people.includes(user.name)?user.name:people[0]));
 const [edit,setEdit]=useState(false),[large,setLarge]=useState(false);
 const card=allergyCard(state,who),held=allergyOf(state,who);
 async function save(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  if(await mutate({type:'allergySet',person:who,allergens:f.getAll('allergen'),severe:f.get('severe')==='on',note:f.get('note')||''}))setEdit(false);
 }
 return <>
  <p className="eyebrow">TO SHOW THE WAITER</p>
  <h1>Allergy card</h1>
  <div className="segmented game-picker">{people.map(n=><button key={n} className={who===n?'selected':''} onClick={()=>{setWho(n);setEdit(false);}}>{n}{allergyOf(state,n).allergens.length?'':''}</button>)}</div>
  <div className={`meeting-card allergy-card${large?' large':''}`}>
   {card.ja.length?<>
    <p className="japanese" lang="ja">{card.ja.map((line,i)=><span key={i}>{line}<br/></span>)}</p>
    <p className="allergy-english">{card.en.join(' ')}</p>
    <ul className="allergy-list">{card.list.map(([id,en,ja])=><li key={id}><span lang="ja">{ja}</span><small>{en}</small></li>)}</ul>
    {card.note&&<p className="allergy-note"><AlertCircle size={16}/>{card.note}</p>}
   </>:<p>Nothing on {who}’s card yet.{parent?' Add what cannot be eaten below.':''}</p>}
  </div>
  <div className="row wrap">
   {card.ja.length>0&&<button type="button" onClick={()=>setLarge(v=>!v)}>{large?<><Minimize2 size={16}/> Normal size</>:<><Maximize2 size={16}/> Show large</>}</button>}
   {card.ja.length>0&&speak?.read&&<button type="button" onClick={()=>speak.read(`allergy-${who}`,card.ja.join(''),'ja-JP',0.85)}><Volume2 size={16}/> Say it</button>}
   {parent&&<button type="button" onClick={()=>setEdit(v=>!v)}><Pencil size={16}/> {edit?'Close':'Edit the card'}</button>}
  </div>
  {edit&&parent&&<form className="feature-card" key={who} onSubmit={save}>
   <h2>What {who} cannot eat</h2>
   <div className="chips">{ALLERGENS.map(([id,en,ja])=><label className={`chip${held.allergens.includes(id)?' on':''}`} key={id}><input type="checkbox" name="allergen" value={id} defaultChecked={held.allergens.includes(id)}/>{en} <span lang="ja">{ja}</span></label>)}</div>
   <label className="check-row"><input type="checkbox" name="severe" defaultChecked={held.severe}/> A serious allergy: even a trace is dangerous</label>
   <label>Anything else the waiter should know<input name="note" maxLength={500} defaultValue={held.note} placeholder="Cooked egg is fine · carries an EpiPen"/></label>
   <div className="row wrap"><button className="primary" disabled={busy}>Save the card</button><button type="button" onClick={()=>setEdit(false)}>Cancel</button></div>
  </form>}
  <p><small><Wheat size={14}/> The words are the ones on the allergen chart Japanese restaurants keep, so pointing works where English does not. Confirm with the restaurant every time; the card asks the question, it does not answer it.</small></p>
 </>;
}
