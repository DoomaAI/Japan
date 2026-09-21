import React,{useState,useMemo,useEffect,useRef} from 'react';
import {Trophy,RotateCcw,Check,X,Wifi,WifiOff} from 'lucide-react';
import {KANA,HIRAGANA,KATAKANA,LOANWORDS,THROWS,findThrow,shuffled,MERGE_SIZE,emptyBoard,addTile,slide,canMove,bestTile,mergeTile,MERGE_LADDER,SIGHTS,ELEMENTS,elementById,startingElements,combine,discoverable} from './kana-data.js';
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
 const pairs=8;
 const cards=useMemo(()=>{
  const chosen=shuffled(SIGHTS,seed).slice(0,pairs);
  return shuffled(chosen.flatMap(s=>[{key:`${s.id}-a`,pair:s.id,sight:s},{key:`${s.id}-b`,pair:s.id,sight:s}]),seed+9);
 },[seed]);
 const finished=done.length===pairs;
 useEffect(()=>{if(finished)mutate({type:'gameScore',person:user.name,game:'sights',score:Math.max(1,pairs*2*3-taps)});},[finished]);
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
  <div className="sight-grid">{cards.map(c=>{
   const matched=done.includes(c.pair),up=matched||picked.some(p=>p.key===c.key);
   return <button key={c.key} className={`sight-card${matched?' matched':''}${up?' up':''}`} disabled={matched} onClick={()=>tap(c)}>
    {up?<><span aria-hidden="true">{c.sight.icon}</span><small>{c.sight.en}<b lang="ja">{c.sight.ja}</b></small></>:<span className="sight-back" aria-hidden="true">🎴</span>}</button>;})}</div>
  <p className="game-status">{finished?<><Trophy size={16}/> All {pairs} in {taps} taps.</>:`${done.length} of ${pairs} found`}
   {bestScore(state,user.name,'sights')>0?` · your best ${bestScore(state,user.name,'sights')}`:''}</p>
  <button className="primary" onClick={()=>{setSeed(Date.now()%100000);setPicked([]);setDone([]);setTaps(0);}}><RotateCcw size={16}/> New board</button>
 </>;
}
// Two things make a third. Tap one, tap another, and find out what you have made.
function Kitchen({user,state,mutate,busy}){
 const [found,setFound]=useState(()=>startingElements());
 const [first,setFirst]=useState(null),[last,setLast]=useState(null),[tried,setTried]=useState(0);
 const total=ELEMENTS.length;
 function tap(id){
  if(!first)return setFirst(id);
  if(first===id)return setFirst(null);
  setTried(t=>t+1);
  const made=combine(first,id);
  setFirst(null);
  if(!made)return setLast({fail:true,a:first,b:id});
  const isNew=!found.includes(made);
  if(isNew){
   const next=[...found,made];setFound(next);
   mutate({type:'gameScore',person:user.name,game:'kitchen',score:next.length});
  }
  setLast({made:elementById(made),isNew,a:first,b:id});
 }
 const left=total-found.length;
 return <>
  <p>Two things make a third. Tap one, then another, and see what you have made. There are {discoverable().length} to find.</p>
  {last&&<div className={`kitchen-result${last.fail?' nothing':''}`}>
   <span aria-hidden="true">{elementById(last.a)?.icon}{elementById(last.b)?.icon}</span>
   {last.fail?<p>Those two do not make anything. Try another pair.</p>
    :<p>{last.isNew?'New! ':''}<strong>{last.made.icon} {last.made.en}</strong> <small lang="ja">{last.made.ja}</small></p>}
  </div>}
  <div className="kitchen-grid">{ELEMENTS.filter(e=>found.includes(e.id)).map(e=>
   <button key={e.id} className={`kitchen-item${first===e.id?' chosen':''}`} onClick={()=>tap(e.id)}>
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
  },SNAKE_TICK);
  return ()=>clearInterval(tick);
 },[running,over,food]);
 const again=()=>{setBody(SNAKE_START.map(p=>({...p})));setFood({x:8,y:6});setDir({x:1,y:0});setScore(0);setOver(false);setRunning(true);};
 return <>
  <p>Eat the sushi. Do not bite yourself, and mind the walls.</p>
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
// Sumo. Tap faster than the other one and push him out of the ring. A win against a faster
// opponent is worth more, so the best score says who you beat rather than how long it took.
const SUMO_RATE={nate:900,boston:650,dad:480},SUMO_WORTH={nate:10,boston:20,dad:30};
// Sumo. Tap faster than the other one and push him out of the ring.
function Sumo({user,state,mutate,busy}){
 const [push,setPush]=useState(0),[playing,setPlaying]=useState(false),[result,setResult]=useState(''),[level,setLevel]=useState('nate');
 const pushRef=useRef(0);
 const rate=SUMO_RATE[level];
 // One place decides where the pair has moved to and whether the bout is over, so nothing
 // has to reach out of a state updater to save a score.
 const shift=delta=>{
  const next=Math.max(-10,Math.min(10,pushRef.current+delta));
  pushRef.current=next;setPush(next);
  if(next>=10){setPlaying(false);setResult('won');mutate({type:'gameScore',person:user.name,game:'sumo',score:SUMO_WORTH[level]});}
  else if(next<=-10){setPlaying(false);setResult('lost');}
 };
 useEffect(()=>{
  if(!playing)return;
  const tick=setInterval(()=>shift(-1),rate);
  return ()=>clearInterval(tick);
 },[playing,rate,level]);
 const shove=()=>{if(playing)shift(1);};
 const start=()=>{pushRef.current=0;setPush(0);setResult('');setPlaying(true);};
 const position=50-push*4.5;
 return <>
  <p>Tap as fast as you can and push him out of the ring. Call it properly: <strong>nokotta, nokotta!</strong></p>
  <div className="segmented">{[['nate','Nate-speed'],['boston','Boston-speed'],['dad','Dad-speed']].map(([id,label])=>
   <button key={id} className={level===id?'selected':''} disabled={playing} onClick={()=>setLevel(id)}>{label}</button>)}</div>
  <div className="sumo-ring">
   <div className="sumo-pair" style={{left:`${Math.max(4,Math.min(96,position))}%`}}>
    <span aria-hidden="true">🤼</span>
   </div>
  </div>
  <button className="primary sumo-push" disabled={!playing} onClick={shove}>{playing?'PUSH!':'Ready'}</button>
  <p className="game-status">{result==='won'?<><Trophy size={16}/> Out of the ring — you win.</>:result==='lost'?'Pushed out. Again?':playing?`${push>0?'Winning':push<0?'Losing':'Even'}`:'Pick a speed and start.'}
   {bestScore(state,user.name,'sumo')>0?` · best win worth ${bestScore(state,user.name,'sumo')}`:''}</p>
  <button onClick={start}>{playing?'Restart':'Start the bout'}</button>
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
