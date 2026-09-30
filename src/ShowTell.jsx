import React,{useEffect,useState} from 'react';
import {Printer,Camera,Trophy,Eye,MessageSquare,Star} from 'lucide-react';
import {showTellFor,showTellSpeech} from './show-tell.js';
import {readingHelp,isChild} from './child-levels.js';
import {photoUrl} from './PhotoDay.jsx';
import {useReadAloud,ReadAloudButton,dayLabel} from './AdventurePages.jsx';
// One page per boy for the first day back at school, printed or read from the phone.
export default function ShowTell({state,user}){
 const boys=(state.members||[]).filter(n=>isChild(state,n));
 const [boy,setBoy]=useState(boys.includes(user.name)?user.name:boys[0]||'');
 const pack=boy?showTellFor(state,boy):null,speech=showTellSpeech(pack);
 const {supported:canRead,reading,read}=useReadAloud(),help=readingHelp(state,boy);
 useEffect(()=>{document.body.classList.add('print-showtell');return()=>document.body.classList.remove('print-showtell');},[]);
 if(!boys.length)return <><h1>Show and tell</h1><p>Nobody on the trip is at school.</p></>;
 return <>
  <p className="eyebrow">FOR THE FIRST DAY BACK</p><h1>Show and tell</h1>
  <p>What I did in the holidays, on one page, out of the missions, the photos, the noticings and the phrases already in the app. Print it for the bag, or read it from the phone with Read to me first.</p>
  {boys.length>1&&<div className="segmented">{boys.map(n=><button key={n} className={boy===n?'selected':''} onClick={()=>setBoy(n)}>{n}</button>)}</div>}
  {pack&&<article className="show-tell">
   <h2>{pack.boy} went to Japan</h2>
   <p className="show-tell-speech">{speech}</p>
   {canRead&&<ReadAloudButton id={`showtell-${boy}`} text={speech} reading={reading} read={read} what="page" rate={help.rate} className={help.young?'young':''}/>}
   {!!pack.photos.length&&<div className="show-tell-photos">{pack.photos.map(p=><img key={p.id} src={photoUrl(p)} alt={`A photo by ${pack.boy}`}/>)}</div>}
   <div className="show-tell-grid">
    <section><h3><Trophy size={16}/> Missions I did</h3>{pack.missions.length?<ul>{pack.missions.slice(0,8).map(m=><li key={m.id}>{m.icon} {m.title}</li>)}</ul>:<p>None ticked yet.</p>}</section>
    <section><h3><Star size={16}/> My favourite</h3><p>{pack.favourite?`${pack.favourite.title} · ${dayLabel(pack.favourite.day)}`:'No stars yet.'}</p><p>{pack.stops} stops, {pack.days} days, {pack.cities.join(', ')}.</p></section>
    <section><h3><Eye size={16}/> I noticed</h3><p>{pack.noticed?.text||'Nothing written yet.'}</p></section>
    <section><h3><MessageSquare size={16}/> I can say</h3>{pack.phrase?<p><span lang="ja">{pack.phrase.ja}</span> · {pack.phrase.en}</p>:<p>No phrase yet.</p>}</section>
   </div>
  </article>}
  <button type="button" onClick={()=>window.print()}><Printer size={16}/> Print this page</button>
 </>;
}
