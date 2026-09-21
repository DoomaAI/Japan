import React,{useState,useMemo,useEffect} from 'react';
import {Trophy,RotateCcw,Check,X,Wifi,WifiOff} from 'lucide-react';
import {KANA,HIRAGANA,KATAKANA,LOANWORDS,THROWS,findThrow,shuffled} from './kana-data.js';
import {BOYS,bestScore,jankenRound,jankenScores,roundComplete} from './trip-features.js';
import {useReadAloud} from './AdventurePages.jsx';
import {useJapaneseVoice} from './SayIt.jsx';
import {canOffer,speechRate} from './speech.js';
const PAIRS=6;
// Say the kana aloud where the phone can, because a five-year-old matching shapes learns
// more if the shape has a sound. Silence is fine; the game does not depend on it.
function useKanaVoice(){
 const {supported,read}=useReadAloud();
 const japanese=useJapaneseVoice();
 const can=canOffer(supported,japanese);
 return (kana,id)=>{if(can)read(id,kana,'ja-JP',speechRate('ja',true));};
}
// Tap the Japanese letter, then the sound it makes. Nate's game.
function KanaMatch({user,mutate,busy,state}){
 const [set,setSet]=useState('hiragana'),[seed,setSeed]=useState(()=>Date.now()%100000);
 const [picked,setPicked]=useState([]),[done,setDone]=useState([]),[taps,setTaps]=useState(0);
 const speak=useKanaVoice();
 const source=set==='hiragana'?HIRAGANA:KATAKANA;
 const cards=useMemo(()=>{
  const chosen=shuffled(source,seed).slice(0,PAIRS);
  return shuffled(chosen.flatMap(k=>[{key:`${k.kana}-ja`,pair:k.kana,face:k.kana,ja:true},{key:`${k.kana}-en`,pair:k.kana,face:k.romaji,ja:false}]),seed+7);
 },[set,seed]);
 const finished=done.length===PAIRS;
 useEffect(()=>{
  if(!finished||!BOYS.includes(user.name)&&user.role!=='parent')return;
  // Fewer taps is better, so the score is what is left of a perfect round.
  const score=Math.max(1,PAIRS*2*3-taps);
  mutate({type:'gameScore',person:user.name,game:`kana-${set}`,score});
 },[finished]);
 function tap(card){
  if(done.includes(card.pair)||picked.some(p=>p.key===card.key))return;
  if(card.ja)speak(card.face,card.key);
  const next=[...picked,card];setTaps(t=>t+1);
  if(next.length<2){setPicked(next);return;}
  setPicked(next);
  const hit=next[0].pair===next[1].pair&&next[0].ja!==next[1].ja;
  setTimeout(()=>{if(hit)setDone(d=>[...d,next[0].pair]);setPicked([]);},hit?350:700);
 }
 const again=()=>{setSeed(Date.now()%100000);setPicked([]);setDone([]);setTaps(0);};
 return <>
  <div className="segmented">
   <button className={set==='hiragana'?'selected':''} onClick={()=>{setSet('hiragana');again();}}>ひらがな</button>
   <button className={set==='katakana'?'selected':''} onClick={()=>{setSet('katakana');again();}}>カタカナ</button>
  </div>
  <p>Tap a Japanese letter, then the sound it makes. {set==='katakana'?'Katakana is the one on menus and signs.':'Hiragana is the everyday one.'}</p>
  <div className="kana-grid">{cards.map(c=>{
   const matched=done.includes(c.pair),up=matched||picked.some(p=>p.key===c.key);
   return <button key={c.key} className={`kana-card${matched?' matched':''}${up?' up':''}${c.ja?' ja':''}`}
    disabled={matched} onClick={()=>tap(c)} lang={c.ja?'ja':undefined}>{c.face}</button>;
  })}</div>
  <p className="game-status">{finished?<><Trophy size={16}/> All {PAIRS} matched in {taps} taps.</>:`${done.length} of ${PAIRS} matched`}</p>
  <div className="row wrap">
   <button className="primary" onClick={again}><RotateCcw size={16}/> New board</button>
   {bestScore(state,user.name,`kana-${set}`)>0&&<span>Your best: {bestScore(state,user.name,`kana-${set}`)}</span>}
  </div>
 </>;
}
// Read the katakana, pick the English. Boston's game, and the one that pays off on a menu.
function Decoder({user,mutate,busy,state}){
 const [seed,setSeed]=useState(()=>Date.now()%100000),[answer,setAnswer]=useState(null),[score,setScore]=useState(0),[asked,setAsked]=useState(0);
 const speak=useKanaVoice();
 const word=useMemo(()=>shuffled(LOANWORDS,seed)[0],[seed]);
 const options=useMemo(()=>shuffled([word,...shuffled(LOANWORDS.filter(w=>w.en!==word.en),seed+3).slice(0,3)],seed+11),[seed]);
 function choose(option){
  if(answer)return;
  const right=option.en===word.en;
  setAnswer({option,right});setAsked(a=>a+1);
  if(right){const next=score+1;setScore(next);mutate({type:'gameScore',person:user.name,game:'katakana-decoder',score:next});}
  else setScore(0);
  speak(word.ja,`decode-${word.ja}`);
 }
 const next=()=>{setSeed(s=>(s+137)%100000);setAnswer(null);};
 return <>
  <p>Every foreign word in Japanese is written in katakana. Sound it out and you can read it — this is how you order in a café.</p>
  <div className="decoder-word"><span lang="ja">{word.ja}</span>{answer&&<small>{word.romaji}</small>}</div>
  <div className="decoder-options">{options.map(o=>{
   const state_=!answer?'':o.en===word.en?' right':answer.option.en===o.en?' wrong':'';
   return <button key={o.en} className={`decoder-option${state_}`} disabled={!!answer} onClick={()=>choose(o)}>
    {o.en}{answer&&o.en===word.en&&<Check size={16}/>}{answer&&!answer.right&&answer.option.en===o.en&&<X size={16}/>}</button>;
  })}</div>
  {answer&&<p className="callout">{answer.right?'Yes — ':'It was '}<strong>{word.en}</strong>. {word.where}</p>}
  <p className="game-status">{score} in a row · {asked} tried{bestScore(state,user.name,'katakana-decoder')>0?` · best ${bestScore(state,user.name,'katakana-decoder')}`:''}</p>
  <button className="primary" onClick={next}>{answer?'Next word':'Skip this one'}</button>
 </>;
}
// Janken, across two phones. Neither hand is sent to the other phone until both are thrown.
function Janken({user,state,mutate,busy,online,refresh}){
 const round=jankenRound(state),scores=jankenScores(state);
 const others=state.members.filter(n=>n!==user.name);
 // A boy is nearly always playing his brother, so start there rather than at whoever
 // happens to be first in the family list.
 const [against,setAgainst]=useState(()=>others.find(n=>BOYS.includes(n)&&BOYS.includes(user.name))||others[0]||'');
 const players=useMemo(()=>[user.name,against].sort(),[user.name,against]);
 const mine=round&&round.players?.includes(user.name)?round.throws?.[user.name]:null;
 const thisRound=round&&players.every(p=>round.players?.includes(p));
 const waiting=thisRound&&mine&&!round.done;
 // While a hand is out there unanswered, look a little more often than the usual poll.
 useEffect(()=>{if(!waiting||!online)return;const t=setInterval(()=>refresh().catch(()=>{}),5000);return()=>clearInterval(t);},[waiting,online]);
 const throwHand=choice=>mutate({type:'jankenThrow',person:user.name,choice,players});
 const theirs=thisRound&&round.done?round.throws[against]:null;
 return <>
  <p>Japan settles everything with janken. Call it as you throw: <strong>saisho wa guu — jan-ken-pon!</strong></p>
  <label>Against<select value={against} onChange={e=>setAgainst(e.target.value)} disabled={!!waiting}>
   {others.map(n=><option key={n}>{n}</option>)}</select></label>
  {!online&&<p className="callout"><WifiOff size={15}/> This one needs both phones online. Everything else in Games works without signal.</p>}
  <div className="janken-hands">{THROWS.map(t=>
   <button key={t.id} className={`janken-hand${mine===t.id?' chosen':''}`} disabled={busy||!!mine||!online} onClick={()=>throwHand(t.id)}>
    <span aria-hidden="true">{t.icon}</span><strong lang="ja">{t.ja}</strong><small>{t.say}</small></button>)}</div>
  {thisRound&&round.done
   ?<div className="janken-result">
     <p><strong>{findThrow(round.throws[user.name])?.icon} you</strong> · <strong>{findThrow(theirs)?.icon} {against}</strong></p>
     <p className="janken-verdict">{round.winner===null?'A draw — あいこでしょ! Throw again.':round.winner===user.name?'You win.':`${round.winner} wins.`}</p>
     <button className="primary" disabled={busy} onClick={()=>mutate({type:'jankenNewRound'})}><RotateCcw size={16}/> Again</button>
    </div>
   :waiting?<p className="game-status"><Wifi size={15}/> Thrown. Waiting for {against} — their hand stays hidden until then.</p>
   :thisRound&&round.throws?.[against]?<p className="game-status">{against} has thrown. Your turn.</p>:null}
  {!!Object.keys(scores).length&&<p className="game-status"><Trophy size={15}/> {Object.entries(scores).map(([n,s])=>`${n} ${s}`).join(' · ')}</p>}
  {user.role==='parent'&&!!Object.keys(scores).length&&<button onClick={()=>{if(confirm('Clear the janken scores?'))mutate({type:'jankenReset'});}}>Clear scores</button>}
 </>;
}
const GAMES=[
 {id:'match',title:'Match the letters',offline:true,Component:KanaMatch},
 {id:'decode',title:'Read the sign',offline:true,Component:Decoder},
 {id:'janken',title:'Janken',offline:false,Component:Janken}
];
export default function Games(props){
 const [game,setGame]=useState('match');
 const current=GAMES.find(g=>g.id===game)||GAMES[0];
 return <>
  <p className="eyebrow">SOMETHING TO DO IN A QUEUE</p><h1>Games</h1>
  <div className="segmented game-picker">{GAMES.map(g=>
   <button key={g.id} className={game===g.id?'selected':''} onClick={()=>setGame(g.id)}>{g.title}</button>)}</div>
  <p><small>{current.offline?'Works with no signal at all.':'Needs both phones online.'}</small></p>
  <current.Component {...props}/>
 </>;
}
