import React,{useState,useMemo,useEffect,useRef} from 'react';
import {Trophy,RotateCcw,Check,X,Wifi,WifiOff} from 'lucide-react';
import {KANA,HIRAGANA,KATAKANA,LOANWORDS,THROWS,findThrow,shuffled,MERGE_SIZE,emptyBoard,addTile,slide,canMove,bestTile,mergeTile,MERGE_LADDER,SIGHTS,ELEMENTS,elementById,startingElements,combine,discoverable,SUMO_RANKS,rankAt,TOP_RANK,STABLE_SIZE,emptyStable,recruit,promote,bestRank,stableFull,oddsOf,bout,challengerFor,SUMO_RITUALS,STOMPS,STOMP_WINDOW,stompScore,SALT_BAND,saltScore,MATTA,chargeScore,leadUpEffect,ceremonyScore,KIMARITE,kimariteById,SUMO_TICK,SURGE_TICKS,theirWeight,startBout,sumoAction} from './kana-data.js';
import {BOYS,bestScore,jankenRound,jankenScores,roundComplete} from './trip-features.js';
import {useReadAloud} from './AdventurePages.jsx';
import {useJapaneseVoice} from './SayIt.jsx';
import {canOffer,speechRate} from './speech.js';
const PAIRS=6;
// Dragging one tile onto another, with a tap still meaning what it meant. Pointer events
// cover a finger and a mouse alike; the target is found from where the finger actually
// lifted rather than from what the drag started on.
function useDragTiles(onDrop){
 const drag=useRef(null),[over,setOver]=useState(null);
 const tileAt=(x,y)=>{
  const el=typeof document!=='undefined'?document.elementFromPoint(x,y)?.closest('[data-tile]'):null;
  return el?Number(el.dataset.tile):null;
 };
 return {
  over,
  down:i=>e=>{drag.current={i,x:e.clientX,y:e.clientY,moved:false};},
  move:e=>{
   const d=drag.current;if(!d)return;
   if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>10)d.moved=true;
   if(d.moved)setOver(tileAt(e.clientX,e.clientY));
  },
  up:e=>{
   const d=drag.current;drag.current=null;setOver(null);
   if(!d)return null;
   if(!d.moved)return d.i;
   const to=tileAt(e.clientX,e.clientY);
   if(to!==null&&to!==d.i)onDrop(d.i,to);
   return null;
  },
  cancel:()=>{drag.current=null;setOver(null);}
 };
}
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
 const [set,setSet]=useState('hiragana'),[seed,setSeed]=useState(()=>Date.now()%100000),[pairs,setPairs]=useState(PAIRS);
 const [picked,setPicked]=useState([]),[done,setDone]=useState([]),[taps,setTaps]=useState(0);
 const speak=useKanaVoice();
 const source=set==='hiragana'?HIRAGANA:KATAKANA;
 const cards=useMemo(()=>{
  const chosen=shuffled(source,seed).slice(0,pairs);
  return shuffled(chosen.flatMap(k=>[{key:`${k.kana}-ja`,pair:k.kana,face:k.kana,ja:true},{key:`${k.kana}-en`,pair:k.kana,face:k.romaji,ja:false}]),seed+7);
 },[set,seed,pairs]);
 const finished=done.length===pairs;
 useEffect(()=>{
  if(!finished||!BOYS.includes(user.name)&&user.role!=='parent')return;
  // Fewer taps is better, so the score is what is left of a perfect round.
  const score=Math.max(1,pairs*2*3-taps);
  mutate({type:'gameScore',person:user.name,game:`kana-${set}-${pairs}`,score});
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
  <div className="segmented game-picker">{[4,6,8,10].map(n=>
   <button key={n} className={pairs===n?'selected':''} onClick={()=>{setPairs(n);again();}}>{n} pairs</button>)}</div>
  <p>Tap a Japanese letter, then the sound it makes. {set==='katakana'?'Katakana is the one on menus and signs.':'Hiragana is the everyday one.'}</p>
  <div className="kana-grid">{cards.map(c=>{
   const matched=done.includes(c.pair),up=matched||picked.some(p=>p.key===c.key);
   return <button key={c.key} className={`kana-card${matched?' matched':''}${up?' up':''}${c.ja?' ja':''}`}
    disabled={matched} onClick={()=>tap(c)} lang={c.ja?'ja':undefined}>{c.face}</button>;
  })}</div>
  <p className="game-status">{finished?<><Trophy size={16}/> All {pairs} matched in {taps} taps.</>:`${done.length} of ${pairs} matched`}</p>
  <div className="row wrap">
   <button className="primary" onClick={again}><RotateCcw size={16}/> New board</button>
   {bestScore(state,user.name,`kana-${set}-${pairs}`)>0&&<span>Your best: {bestScore(state,user.name,`kana-${set}-${pairs}`)}</span>}
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
// Two of the same become the next one up, from a rice ball to Fuji. Swipe, or use the keys.
function Merge({user,mutate,busy,state}){
 const [board,setBoard]=useState(()=>addTile(addTile(emptyBoard(),Date.now()),Date.now()+1));
 const [score,setScore]=useState(0),[over,setOver]=useState(false);
 const touch=useRef(null);
 const move=direction=>{
  if(over)return;
  const {board:next,gained,changed}=slide(board,direction);
  if(!changed)return;
  const grown=addTile(next,Date.now()+gained);
  setBoard(grown);
  const total=score+gained;setScore(total);
  if(!canMove(grown)){setOver(true);if(total)mutate({type:'gameScore',person:user.name,game:'merge',score:Math.min(9999,total)});}
 };
 useEffect(()=>{
  const onKey=e=>{const d={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[e.key];if(d){e.preventDefault();move(d);}};
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 });
 const again=()=>{setBoard(addTile(addTile(emptyBoard(),Date.now()),Date.now()+1));setScore(0);setOver(false);};
 const top=mergeTile(bestTile(board));
 return <>
  <p>Two of the same become the next one up. Swipe the board. It starts at a rice ball and ends at Fuji.</p>
  <div className="merge-board"
   onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}}
   onTouchEnd={e=>{
    if(!touch.current)return;
    const dx=e.changedTouches[0].clientX-touch.current.x,dy=e.changedTouches[0].clientY-touch.current.y;
    if(Math.max(Math.abs(dx),Math.abs(dy))>28)move(Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down'));
    touch.current=null;
   }}>
   {board.map((v,i)=>{const tile=mergeTile(v);
    return <div className={`merge-tile${v?' filled':''}`} key={i}>{tile&&<><span aria-hidden="true">{tile.icon}</span><small>{tile.en}</small></>}</div>;})}
  </div>
  <div className="row wrap merge-keys">
   {[['up','↑'],['left','←'],['down','↓'],['right','→']].map(([d,a])=>
    <button key={d} type="button" aria-label={`Slide ${d}`} disabled={over} onClick={()=>move(d)}>{a}</button>)}
  </div>
  <p className="game-status">{over?<><Trophy size={16}/> No moves left — {score}.</>:`${score}`}{top?` · best so far ${top.en} ${top.icon}`:''}
   {bestScore(state,user.name,'merge')>0?` · your best ${bestScore(state,user.name,'merge')}`:''}</p>
  <button className="primary" onClick={again}><RotateCcw size={16}/> New game</button>
  <details className="merge-ladder"><summary>What turns into what</summary>
   {MERGE_LADDER.map(t=><span key={t.value}>{t.icon} {t.en} <small lang="ja">{t.ja}</small></span>)}
  </details>
 </>;
}
// Pairs made from the trip itself: the thing we did, and the day we did it.
function Remember({user,state,mutate,busy,dayLabel}){
 const [seed,setSeed]=useState(()=>Date.now()%100000);
 const [picked,setPicked]=useState([]),[done,setDone]=useState([]),[taps,setTaps]=useState(0);
 const doneSteps=state.steps.filter(s=>s.status==='done'&&s.day);
 const pairs=Math.min(6,doneSteps.length);
 const cards=useMemo(()=>{
  const chosen=shuffled(doneSteps,seed).slice(0,pairs);
  return shuffled(chosen.flatMap(s=>[
   {key:`${s.id}-what`,pair:s.id,face:s.title,kind:'what'},
   {key:`${s.id}-when`,pair:s.id,face:`${dayLabel(s.day).replace(/,.*/,'')} · ${state.days.find(d=>d.date===s.day)?.city||''}`,kind:'when'}
  ]),seed+5);
 },[seed,pairs,doneSteps.length]);
 const finished=pairs>0&&done.length===pairs;
 useEffect(()=>{if(finished)mutate({type:'gameScore',person:user.name,game:'remember',score:Math.max(1,pairs*2*3-taps)});},[finished]);
 function tap(card){
  if(done.includes(card.pair)||picked.some(p=>p.key===card.key))return;
  const next=[...picked,card];setTaps(t=>t+1);
  if(next.length<2){setPicked(next);return;}
  setPicked(next);
  const hit=next[0].pair===next[1].pair&&next[0].kind!==next[1].kind;
  setTimeout(()=>{if(hit)setDone(d=>[...d,next[0].pair]);setPicked([]);},hit?350:800);
 }
 if(pairs<2)return <><p>This one is built out of the trip itself — match the thing we did to the day we did it.</p>
  <p className="callout">Once we have finished a few activities, they show up here. {doneSteps.length?`Only ${doneSteps.length} so far.`:'None ticked off yet.'}</p></>;
 return <>
  <p>Match the thing we did to the day we did it. It grows as the trip does.</p>
  <div className="remember-grid">{cards.map(c=>{
   const matched=done.includes(c.pair),up=matched||picked.some(p=>p.key===c.key);
   return <button key={c.key} className={`remember-card${matched?' matched':''}${up?' up':''}`} disabled={matched} onClick={()=>tap(c)}>
    <span>{up?c.face:'?'}</span></button>;})}</div>
  <p className="game-status">{finished?<><Trophy size={16}/> All {pairs} in {taps} taps.</>:`${done.length} of ${pairs} matched`}
   {bestScore(state,user.name,'remember')>0?` · your best ${bestScore(state,user.name,'remember')}`:''}</p>
  <button className="primary" onClick={()=>{setSeed(Date.now()%100000);setPicked([]);setDone([]);setTaps(0);}}><RotateCcw size={16}/> New board</button>
 </>;
}
// Picture pairs. The same game as the kana one, but for a boy who would rather match a torii
// gate than a letter — and each pair tells him what the thing is called.
function Sights({user,state,mutate,busy}){
 const [seed,setSeed]=useState(()=>Date.now()%100000);
 const [picked,setPicked]=useState([]),[done,setDone]=useState([]),[taps,setTaps]=useState(0);
 // How many to find. Four is a board Nate can clear; eighteen is everything we have.
 const [pairs,setPairs]=useState(8);
 const cards=useMemo(()=>{
  const chosen=shuffled(SIGHTS,seed).slice(0,pairs);
  return shuffled(chosen.flatMap(s=>[{key:`${s.id}-a`,pair:s.id,sight:s},{key:`${s.id}-b`,pair:s.id,sight:s}]),seed+9);
 },[seed,pairs]);
 const finished=done.length===pairs;
 useEffect(()=>{if(finished)mutate({type:'gameScore',person:user.name,game:`sights-${pairs}`,score:Math.max(1,pairs*2*3-taps)});},[finished]);
 function tap(card){
  if(done.includes(card.pair)||picked.some(p=>p.key===card.key))return;
  const next=[...picked,card];setTaps(t=>t+1);
  if(next.length<2){setPicked(next);return;}
  setPicked(next);
  const hit=next[0].pair===next[1].pair;
  setTimeout(()=>{if(hit)setDone(d=>[...d,next[0].pair]);setPicked([]);},hit?350:700);
 }
 return <>
  <p>Find the pairs. Every one is something we will actually see.</p>
  <div className="segmented game-picker">{[4,6,8,12,18].map(n=>
   <button key={n} className={pairs===n?'selected':''} onClick={()=>{setPairs(n);setSeed(Date.now()%100000);setPicked([]);setDone([]);setTaps(0);}}>{n} pairs</button>)}</div>
  <div className="sight-grid">{cards.map(c=>{
   const matched=done.includes(c.pair),up=matched||picked.some(p=>p.key===c.key);
   return <button key={c.key} className={`sight-card${matched?' matched':''}${up?' up':''}`} disabled={matched} onClick={()=>tap(c)}>
    {up?<><span aria-hidden="true">{c.sight.icon}</span><small>{c.sight.en}<b lang="ja">{c.sight.ja}</b></small></>:<span className="sight-back" aria-hidden="true">🎴</span>}</button>;})}</div>
  <p className="game-status">{finished?<><Trophy size={16}/> All {pairs} in {taps} taps.</>:`${done.length} of ${pairs} found`}
   {bestScore(state,user.name,`sights-${pairs}`)>0?` · your best at ${pairs} ${bestScore(state,user.name,`sights-${pairs}`)}`:''}</p>
  <button className="primary" onClick={()=>{setSeed(Date.now()%100000);setPicked([]);setDone([]);setTaps(0);}}><RotateCcw size={16}/> New board</button>
 </>;
}
// Two things make a third. Tap one, tap another, and find out what you have made.
function Kitchen({user,state,mutate,busy}){
 const [found,setFound]=useState(()=>startingElements());
 const [first,setFirst]=useState(null),[last,setLast]=useState(null),[tried,setTried]=useState(0);
 const total=ELEMENTS.length;
 function mix(a,bId){
  setTried(t=>t+1);
  const made=combine(a,bId);
  setFirst(null);
  if(!made)return setLast({fail:true,a,b:bId});
  const isNew=!found.includes(made);
  if(isNew){
   const next=[...found,made];setFound(next);
   mutate({type:'gameScore',person:user.name,game:'kitchen',score:next.length});
  }
  setLast({made:elementById(made),isNew,a,b:bId});
 }
 const shown=ELEMENTS.filter(e=>found.includes(e.id));
 const drag=useDragTiles((a,b)=>{if(shown[a]&&shown[b])mix(shown[a].id,shown[b].id);setFirst(null);});
 function tap(id){
  if(!first)return setFirst(id);
  if(first===id)return setFirst(null);
  mix(first,id);
 }
 const left=total-found.length;
 return <>
  <p>Two things make a third. Drag one onto another, or tap them one after the other, and see what you have made. There are {discoverable().length} to find.</p>
  {last&&<div className={`kitchen-result${last.fail?' nothing':''}`}>
   <span aria-hidden="true">{elementById(last.a)?.icon}{elementById(last.b)?.icon}</span>
   {last.fail?<p>Those two do not make anything. Try another pair.</p>
    :<p>{last.isNew?'New! ':''}<strong>{last.made.icon} {last.made.en}</strong> <small lang="ja">{last.made.ja}</small></p>}
  </div>}
  <div className="kitchen-grid" onPointerMove={drag.move} onPointerUp={e=>{const i=drag.up(e);if(i!==null&&shown[i])tap(shown[i].id);}} onPointerCancel={drag.cancel}>
   {shown.map((e,i)=>
   <button key={e.id} data-tile={i} className={`kitchen-item${first===e.id?' chosen':''}${drag.over===i?' over':''}`} onPointerDown={drag.down(i)}>
    <span aria-hidden="true">{e.icon}</span><small>{e.en}</small></button>)}</div>
  <p className="game-status">{found.length} of {total} found{left?` · ${left} to go`:' · everything!'}
   {bestScore(state,user.name,'kitchen')>0?` · your best ${bestScore(state,user.name,'kitchen')}`:''}</p>
  <button onClick={()=>{setFound(startingElements());setFirst(null);setLast(null);setTried(0);}}><RotateCcw size={16}/> Start again</button>
 </>;
}
// Snake, with sushi. Swipe or use the arrows; the walls are not your friend.
const SNAKE_SIZE=12;
// It starts at the near wall rather than the middle, and moves at a pace a five-year-old can
// steer: from here there are ten cells of room before the far wall, about two and a half
// seconds, instead of the second and a bit a mid-board start gives you.
const SNAKE_START=[{x:2,y:6},{x:1,y:6},{x:0,y:6}];
const SNAKE_TICK=260;
// Quicker with every piece eaten, down to a floor that is still steerable by a five-year-old.
export const snakeTick=eaten=>Math.max(110,SNAKE_TICK-eaten*12);
function Snake({user,state,mutate,busy}){
 const [body,setBody]=useState(()=>SNAKE_START.map(p=>({...p})));
 const [food,setFood]=useState({x:8,y:6});
 const [dir,setDir]=useState({x:1,y:0}),[running,setRunning]=useState(false),[over,setOver]=useState(false),[score,setScore]=useState(0);
 const dirRef=useRef(dir),bodyRef=useRef(body),scoreRef=useRef(score),touch=useRef(null);
 dirRef.current=dir;bodyRef.current=body;scoreRef.current=score;
 const steer=(x,y)=>{const d=dirRef.current;if(d.x===-x&&d.y===-y)return;setDir({x,y});};
 useEffect(()=>{
  const onKey=e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
   if(d){e.preventDefault();steer(...d);}};
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 },[]);
 useEffect(()=>{
  if(!running||over)return;
  const tick=setInterval(()=>{
   const d=dirRef.current,old=bodyRef.current;
   const head={x:old[0].x+d.x,y:old[0].y+d.y};
   if(head.x<0||head.y<0||head.x>=SNAKE_SIZE||head.y>=SNAKE_SIZE||old.some(p=>p.x===head.x&&p.y===head.y)){
    setOver(true);setRunning(false);
    // The score is read from a ref rather than from inside a state updater, because
    // reaching out of an updater to save it is the thing React warns about.
    if(scoreRef.current)mutate({type:'gameScore',person:user.name,game:'snake',score:scoreRef.current});
    return;
   }
   const ate=head.x===food.x&&head.y===food.y;
   const next=[head,...(ate?old:old.slice(0,-1))];
   setBody(next);
   if(ate){
    setScore(s=>s+1);
    const free=[];for(let y=0;y<SNAKE_SIZE;y++)for(let x=0;x<SNAKE_SIZE;x++)if(!next.some(p=>p.x===x&&p.y===y))free.push({x,y});
    setFood(free[Math.floor(Math.random()*free.length)]||food);
   }
  },snakeTick(scoreRef.current));
  return ()=>clearInterval(tick);
 },[running,over,food,score]);
 const again=()=>{setBody(SNAKE_START.map(p=>({...p})));setFood({x:8,y:6});setDir({x:1,y:0});setScore(0);setOver(false);setRunning(true);};
 return <>
  <p>Eat the sushi. It gets faster with every piece, so mind the walls — and yourself.</p>
  <div className="snake-board" style={{gridTemplateColumns:`repeat(${SNAKE_SIZE},1fr)`}}
   onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}}
   onTouchEnd={e=>{
    if(!touch.current)return;
    const dx=e.changedTouches[0].clientX-touch.current.x,dy=e.changedTouches[0].clientY-touch.current.y;
    if(Math.max(Math.abs(dx),Math.abs(dy))>24)Math.abs(dx)>Math.abs(dy)?steer(dx<0?-1:1,0):steer(0,dy<0?-1:1);
    touch.current=null;
   }}>
   {Array.from({length:SNAKE_SIZE*SNAKE_SIZE},(_,i)=>{
    const x=i%SNAKE_SIZE,y=Math.floor(i/SNAKE_SIZE);
    const head=body[0].x===x&&body[0].y===y,part=body.some(p=>p.x===x&&p.y===y);
    return <div key={i} className={`snake-cell${part?' body':''}${head?' head':''}`}>{food.x===x&&food.y===y?'🍣':''}</div>;
   })}
  </div>
  <div className="row wrap merge-keys">
   {[['up',0,-1,'↑'],['left',-1,0,'←'],['down',0,1,'↓'],['right',1,0,'→']].map(([n,x,y,a])=>
    <button key={n} type="button" aria-label={`Go ${n}`} onClick={()=>steer(x,y)}>{a}</button>)}
  </div>
  <p className="game-status">{over?<><Trophy size={16}/> {score} eaten.</>:`${score} eaten`}
   {bestScore(state,user.name,'snake')>0?` · your best ${bestScore(state,user.name,'snake')}`:''}</p>
  <button className="primary" onClick={again}>{over?'Again':running?'Restart':'Start'}</button>
 </>;
}
// Sumo, the whole thing: the stamps, the salt, the stare, and then a bout that is not just
// tapping. A win against a faster opponent is worth more, so the best score says who you
// beat rather than how long it took — and a clean ceremony pays on top of it.
const SUMO_LEVELS=[
 ['jonokuchi','Beginner',1100,5],
 ['nate','Nate-speed',900,10],
 ['boston','Boston-speed',650,20],
 ['mum','Mum-speed',540,25],
 ['dad','Dad-speed',480,30],
 ['ozeki','Ozeki',400,45],
 ['yokozuna','Yokozuna',330,60]
];
const SUMO_RATE=Object.fromEntries(SUMO_LEVELS.map(([id,,rate])=>[id,rate]));
const SUMO_WORTH=Object.fromEntries(SUMO_LEVELS.map(([id,,,worth])=>[id,worth]));
const SUMO_BEAT=820;                 // the drum the stamps are timed to
const SALT_TICK=40;                  // how often the salt sweep moves
const SURGE_CHANCE=0.09,OPEN_CHANCE=0.08;
const STOMP_FEET=['Left','Right'];
// Sumo, in order: stamp on the beat, throw the salt, hold the crouch until the gyoji calls,
// and only then the bout. In the ring there are three things to do rather than one — shove,
// brace when he gathers himself, and take the opening when you can read the tell — so the
// game asks for timing, patience and nerve instead of a fast finger.
function Sumo({user,state,mutate,busy}){
 const [level,setLevel]=useState('nate'),[phase,setPhase]=useState('ready');
 const [scores,setScores]=useState({}),[stomps,setStomps]=useState([]),[foot,setFoot]=useState(0);
 const [sweep,setSweep]=useState(0),[salt,setSalt]=useState(null);
 const [call,setCall]=useState(false),[holding,setHolding]=useState(false);
 const [match,setMatch]=useState(null),[done,setDone]=useState(null);
 const rate=SUMO_RATE[level],worth=SUMO_WORTH[level];
 // The two slowest speeds name the move as well as the tell, because Nate is five.
 const named=SUMO_LEVELS.findIndex(([id])=>id===level)<2;
 const sheet=useRef({}),stompRef=useRef([]),footRef=useRef(0),beatAt=useRef(0);
 const sweepRef=useRef(0),wayRef=useRef(1),targetRef=useRef(50);
 const callAt=useRef(0),holdTimer=useRef(null),nextStep=useRef(null);
 const matchRef=useRef(null),plan=useRef({surge:0,open:0});
 stompRef.current=stomps;footRef.current=foot;
 const after=(ms,fn)=>{clearTimeout(nextStep.current);nextStep.current=setTimeout(fn,ms);};
 const mark=(id,value)=>{sheet.current={...sheet.current,[id]:value};setScores(sheet.current);};
 useEffect(()=>()=>{clearTimeout(nextStep.current);clearTimeout(holdTimer.current);},[]);
 // The stamps. A beat nobody stamped is a beat missed, and it is recorded as one, so the
 // score is out of four however few of them you hit.
 useEffect(()=>{
  if(phase!=='shiko')return;
  let beats=0;
  stompRef.current=[];setStomps([]);footRef.current=0;setFoot(0);beatAt.current=Date.now();
  const tick=setInterval(()=>{
   if(stompRef.current.length<=beats){const missed=[...stompRef.current,STOMP_WINDOW*2];stompRef.current=missed;setStomps(missed);}
   beats+=1;
   if(beats>=STOMPS){clearInterval(tick);mark('shiko',stompScore(stompRef.current));after(800,()=>setPhase('shio'));return;}
   beatAt.current=Date.now();footRef.current=beats;setFoot(beats);
  },SUMO_BEAT);
  return ()=>clearInterval(tick);
 },[phase]);
 const stamp=()=>{
  if(phase!=='shiko'||stompRef.current.length>footRef.current)return;
  const next=[...stompRef.current,Date.now()-beatAt.current];
  stompRef.current=next;setStomps(next);
 };
 // The salt. A marker sweeps the ring and a faster opponent sweeps it faster.
 useEffect(()=>{
  if(phase!=='shio'||salt!==null)return;
  targetRef.current=22+Math.random()*56;
  sweepRef.current=0;wayRef.current=1;setSweep(0);
  const step=Math.min(5,1.6+(1100-rate)/170);
  const tick=setInterval(()=>{
   let at=sweepRef.current+wayRef.current*step;
   if(at>=100){at=100;wayRef.current=-1;}else if(at<=0){at=0;wayRef.current=1;}
   sweepRef.current=at;setSweep(at);
  },SALT_TICK);
  return ()=>clearInterval(tick);
 },[phase,salt,rate]);
 const throwSalt=()=>{
  if(phase!=='shio'||salt!==null)return;
  const thrown=saltScore(sweepRef.current,targetRef.current);
  setSalt(thrown);mark('shio',thrown);
  after(1000,()=>setPhase('tachiai'));
 };
 // The charge. Hold the crouch; the gyoji calls when he feels like it, and letting go first
 // is a matta. Nobody is timed until they are down, so there is nothing to guess at.
 useEffect(()=>{if(phase==='tachiai'){setCall(false);setHolding(false);}},[phase]);
 const charge=()=>{
  if(phase!=='tachiai'||sheet.current.charge!==undefined||(!holding&&!call))return;
  clearTimeout(holdTimer.current);setHolding(false);
  mark('charge',call?chargeScore(Date.now()-callAt.current):MATTA);
  after(1100,()=>setPhase('bout'));
 };
 const crouch=()=>{
  if(phase!=='tachiai'||sheet.current.charge!==undefined||holding)return;
  if(call)return charge();          // the crouch was broken by something; the call still counts
  setHolding(true);
  holdTimer.current=setTimeout(()=>{callAt.current=Date.now();setCall(true);},1100+Math.random()*2300);
 };
 const letGo=()=>{clearTimeout(holdTimer.current);setHolding(false);};
 // The bout. One timer: he leans on you, he gathers himself for a surge, and now and then
 // he leaves something open. Everything the two of them do goes through the one reducer.
 const land=next=>{
  matchRef.current=next;setMatch(next);
  if(!next.over)return;
  setPhase('over');setDone(next);
  if(next.over==='won')mutate({type:'gameScore',person:user.name,game:'sumo',
   score:worth+Math.round(worth*0.5*ceremonyScore(sheet.current))});
 };
 useEffect(()=>{
  if(phase!=='bout')return;
  const effect=leadUpEffect(sheet.current),theirs=theirWeight(rate);
  const openTicks=Math.max(2,Math.round(effect.opening/SUMO_TICK));
  const start=startBout(effect);
  matchRef.current=start;setMatch(start);plan.current={surge:0,open:0};
  const tick=setInterval(()=>{
   let next=matchRef.current;
   if(!next||next.over)return;
   next=sumoAction(next,{type:'tick',their:theirs,rest:effect.rest});
   const on=plan.current;
   if(on.surge>0){on.surge-=1;if(!on.surge)next=sumoAction(next,{type:'surge',on:false});}
   else if(!next.opening&&Math.random()<SURGE_CHANCE){on.surge=SURGE_TICKS;next=sumoAction(next,{type:'surge',on:true});}
   if(on.open>0){on.open-=1;if(!on.open)next=sumoAction(next,{type:'open',id:null});}
   else if(!next.surge&&Math.random()<OPEN_CHANCE){
    on.open=openTicks;next=sumoAction(next,{type:'open',id:KIMARITE[Math.floor(Math.random()*KIMARITE.length)].id});}
   land(next);
  },SUMO_TICK);
  return ()=>clearInterval(tick);
 },[phase,rate]);
 const act=action=>{if(phase==='bout'&&matchRef.current&&!matchRef.current.over)land(sumoAction(matchRef.current,action));};
 const begin=()=>{
  clearTimeout(nextStep.current);clearTimeout(holdTimer.current);
  sheet.current={};setScores({});setSalt(null);setDone(null);setMatch(null);matchRef.current=null;
  setPhase('shiko');
 };
 const ceremony=Math.round(ceremonyScore(scores)*100);
 const shown=match||done;
 const opening=shown?kimariteById(shown.opening):null;
 const best=bestScore(state,user.name,'sumo');
 const band=Math.max(0,Math.min(100-SALT_BAND*2,targetRef.current-SALT_BAND));
 return <>
  {phase==='ready'&&<>
   <p>The bout is the short part. First you stamp, then you throw the salt, then you crouch and wait — and none of it is for show: each one buys you something in the ring.</p>
   <div className="segmented game-picker">{SUMO_LEVELS.map(([id,label])=>
    <button key={id} className={level===id?'selected':''} onClick={()=>setLevel(id)}>{label}</button>)}</div>
   <div className="sumo-rituals">{SUMO_RITUALS.map((r,i)=>
    <div key={r.id}><b>{i+1}. {r.en} <small lang="ja">{r.ja} · {r.romaji}</small></b><p>{r.how}</p><small>{r.buys}</small></div>)}</div>
   <button className="primary sumo-push" onClick={begin}>Enter the ring</button>
  </>}
  {phase==='shiko'&&<>
   <p>Stamp on the beat — <strong lang="ja">四股</strong> shiko, driving the bad spirits out of the ring.</p>
   <div className="sumo-beat" aria-hidden="true">{Array.from({length:STOMPS},(_,i)=>{
    const landed=stomps[i];
    return <span key={i} className={`sumo-foot${i%2?' right':''}${i===foot&&landed===undefined?' now':''}${landed===undefined?'':landed<=STOMP_WINDOW?' hit':' missed'}`}>🦶</span>;})}</div>
   <p className="game-status" aria-live="polite">{STOMP_FEET[foot%2]} foot{stomps.length>foot?' — stamped':''}</p>
   <button className="primary sumo-push" onClick={stamp}>STAMP</button>
  </>}
  {phase==='shio'&&<>
   <p>A handful of salt to purify the ring — <strong lang="ja">塩まき</strong> shio-maki. Stop the sweep on the light band.</p>
   <div className="salt-bar">
    <i className="salt-band" style={{left:`${band}%`,width:`${SALT_BAND*2}%`}}/>
    <i className="salt-mark" style={{left:`${sweep}%`}}/>
   </div>
   <p className="game-status" aria-live="polite">{salt===null?'Throw it high.':salt>0.75?'🧂 Straight up — the crowd saw that.':salt>0.3?'🧂 A fair handful.':'Half of it went on your foot.'}</p>
   <button className="primary sumo-push" disabled={salt!==null} onClick={throwSalt}>THROW THE SALT</button>
  </>}
  {phase==='tachiai'&&<>
   <p>Crouch, fists down, and hold. Nobody moves until the gyoji calls — go first and it is a <strong>matta</strong>, a false start.</p>
   <div className={`sumo-call${call?' now':''}`} aria-live="assertive">
    {sheet.current.charge===MATTA?'MATTA — you went early.':sheet.current.charge>=0?'Away you go.':call?'HAKKEYOI! — go!':holding?'Hold it…':'Press and hold to crouch.'}</div>
   <button className="primary sumo-push" onPointerDown={crouch} onPointerUp={charge} onPointerCancel={letGo} onPointerLeave={letGo}>
    {holding?'HOLD':'CROUCH'}</button>
  </>}
  {(phase==='bout'||phase==='over')&&shown&&<>
   <p>Push him out — <strong>nokotta, nokotta!</strong> Brace when he gathers himself, and when he leaves something open, read the tell and take it.</p>
   <div className={`sumo-ring${shown.surge?' surge':''}${shown.opening?' open':''}`}>
    <div className="sumo-pair" style={{left:`${Math.max(4,Math.min(96,50-shown.push*4.5))}%`}}><span aria-hidden="true">🤼</span></div>
   </div>
   <div className={`sumo-stamina${shown.stamina<shown.max*0.25?' low':''}`}><i style={{width:`${Math.max(0,shown.stamina/shown.max*100)}%`}}/></div>
   <div className={`sumo-call${shown.surge?' surge':''}${shown.opening?' open':''}`} aria-live="assertive">
    {shown.surge?'HE IS DRIVING IN — BRACE!':opening?`Opening: ${opening.tell}${named?` — ${opening.en}`:''}`:shown.note||(shown.push>0?'You have the ground.':shown.push<0?'He has the ground.':'Even.')}</div>
   <div className="row wrap sumo-hands">
    <button className="primary sumo-push" disabled={phase!=='bout'} onClick={()=>act({type:'push'})}>PUSH</button>
    <button className="sumo-push" disabled={phase!=='bout'} onClick={()=>act({type:'brace'})}>BRACE</button>
   </div>
   <div className="sumo-moves">{KIMARITE.map(k=>
    <button key={k.id} className={`sumo-move${named&&opening?.id===k.id?' open':''}`} disabled={phase!=='bout'} onClick={()=>act({type:'technique',id:k.id})}>
     <span aria-hidden="true">{k.icon}</span><strong>{k.en}</strong><small lang="ja">{k.ja}</small></button>)}</div>
  </>}
  {phase==='over'&&done&&<p className="game-status">{done.over==='won'
   ?<><Trophy size={16}/> Out of the ring{done.won?<> — by <strong lang="ja">{kimariteById(done.won).ja}</strong> {kimariteById(done.won).romaji}</>:''}. Worth {worth+Math.round(worth*0.5*ceremonyScore(scores))}.</>
   :'Pushed out. The ceremony decides more than you think — again?'}</p>}
  {phase!=='ready'&&<p className="game-status">{Object.keys(scores).length?`Ceremony ${ceremony}%`:'The ceremony first.'}{scores.charge===MATTA?' · matta':''}
   {best>0?` · best win worth ${best}`:''}</p>}
  {phase!=='ready'&&<div className="row wrap">
   <button className={phase==='over'?'primary':''} onClick={begin}><RotateCcw size={16}/> Again</button>
   <button onClick={()=>setPhase('ready')}>Change speed</button>
  </div>}
  {phase==='ready'&&<details className="merge-ladder"><summary>The moves, and the tell that calls for them</summary>
   {KIMARITE.map(k=><span key={k.id}>{k.icon} {k.en} <small lang="ja">{k.ja} · {k.romaji}</small> <small>{k.tell}</small></span>)}
  </details>}
 </>;
}
// Merge two wrestlers of the same rank and one of them is promoted. Build one big enough to
// win a bout, then send him out. The ladder is the real one, bottom to top.
function Stable({user,state,mutate,busy}){
 const [stable,setStable]=useState(()=>recruit(recruit(emptyStable(),Date.now()),Date.now()+3)||emptyStable());
 const [picked,setPicked]=useState(null),[score,setScore]=useState(0),[cleared,setCleared]=useState(0);
 const [last,setLast]=useState(null),[fighting,setFighting]=useState(false);
 const best=bestRank(stable),full=stableFull(stable);
 const challenger=challengerFor(best,cleared);
 const odds=best?oddsOf(best,challenger):0;
 function join(a,b){
  const merged=promote(stable,a,b);
  if(!merged){setLast({note:stable[a]&&stable[a]===stable[b]?'That one is already at the top.':'Two of the same rank only.'});return;}
  setStable(merged.stable);
  setLast({promoted:rankAt(merged.level)});
 }
 const drag=useDragTiles((a,b)=>{if(!fighting)join(a,b);setPicked(null);});
 function tap(i){
  if(fighting)return;
  if(picked===null)return setPicked(stable[i]?i:null);
  if(picked===i)return setPicked(null);
  setPicked(null);join(picked,i);
 }
 function add(){
  const next=recruit(stable,Date.now()+score);
  if(!next)return setLast({note:'The stable is full. Merge some of them, or send one out.'});
  setStable(next);setLast(null);
 }
 function fight(){
  if(!best)return;
  setFighting(true);
  const result=bout(best,challenger,Math.random());
  setTimeout(()=>{
   const index=stable.lastIndexOf(best);
   const next=[...stable];next[index]=result.won?0:Math.max(0,best-1);
   setStable(next);
   if(result.won){
    const total=score+result.reward;setScore(total);setCleared(c=>c+1);
    mutate({type:'gameScore',person:user.name,game:'stable',score:Math.min(9999,total)});
   }
   setLast({bout:result,against:rankAt(challenger),mine:rankAt(best)});
   setFighting(false);
  },700);
 }
 const again=()=>{setStable(recruit(recruit(emptyStable(),Date.now()),Date.now()+3)||emptyStable());
  setPicked(null);setScore(0);setCleared(0);setLast(null);};
 return <>
  <p>Drag one wrestler onto another of the same rank — or tap them one after the other — and one of them is promoted. Build one big enough, then send him out to fight.</p>
  <div className="stable-grid" onPointerMove={drag.move} onPointerUp={e=>{const tapped=drag.up(e);if(tapped!==null)tap(tapped);}} onPointerCancel={drag.cancel}>
   {stable.map((level,i)=>{
   const rank=rankAt(level);
   return <button key={i} data-tile={i} className={`stable-cell${level?' filled':''}${picked===i?' picked':''}${drag.over===i?' over':''}${level===TOP_RANK?' top':''}`}
    disabled={fighting} onPointerDown={drag.down(i)}>
    {rank&&<><span aria-hidden="true">{rank.icon}</span><small>{rank.en}</small></>}</button>;})}</div>
  <div className="row wrap">
   <button type="button" onClick={add} disabled={fighting||full}>+ New recruit</button>
   <button type="button" className="primary" disabled={fighting||!best} onClick={fight}>
    Fight {rankAt(challenger)?.icon} {rankAt(challenger)?.en}</button>
  </div>
  {best>0&&<p className="game-status">Your best: {rankAt(best).icon} {rankAt(best).en} <small lang="ja">{rankAt(best).ja}</small> · {Math.round(odds*100)}% against this one</p>}
  {last?.promoted&&<p className="callout">Promoted to <strong>{last.promoted.icon} {last.promoted.en}</strong> <small lang="ja">{last.promoted.ja} · {last.promoted.romaji}</small></p>}
  {last?.note&&<p className="callout">{last.note}</p>}
  {last?.bout&&<div className={`stable-bout${last.bout.won?' won':''}`}>
   <p><strong>{last.mine.icon} {last.mine.en}</strong> v <strong>{last.against.icon} {last.against.en}</strong></p>
   <p className="janken-verdict">{last.bout.won?`Won — ${last.bout.reward} points.`:'Beaten, and demoted a rank.'}</p>
  </div>}
  <p className="game-status">{score} points · {cleared} bout{cleared===1?'':'s'} won
   {bestScore(state,user.name,'stable')>0?` · your best ${bestScore(state,user.name,'stable')}`:''}</p>
  <button onClick={again}><RotateCcw size={16}/> New stable</button>
  <details className="merge-ladder"><summary>The ranks</summary>
   {SUMO_RANKS.map(r=><span key={r.level}>{r.icon} {r.en} <small lang="ja">{r.ja}</small></span>)}
  </details>
 </>;
}
const GAMES=[
 {id:'match',title:'Match the letters',offline:true,Component:KanaMatch},
 {id:'decode',title:'Read the sign',offline:true,Component:Decoder},
 {id:'merge',title:'Onigiri to Fuji',offline:true,Component:Merge},
 {id:'remember',title:'What we did',offline:true,Component:Remember},
 {id:'sights',title:'Japan pairs',offline:true,Component:Sights},
 {id:'kitchen',title:'Make it',offline:true,Component:Kitchen},
 {id:'snake',title:'Sushi snake',offline:true,Component:Snake},
 {id:'stable',title:'Sumo stable',offline:true,Component:Stable},
 {id:'sumo',title:'Sumo',offline:true,Component:Sumo},
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
