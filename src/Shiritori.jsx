import React,{useState,useMemo,useRef,useEffect} from 'react';
import {Trophy,RotateCcw,X} from 'lucide-react';
import {WORDS,OPENER,LEVELS,levelById,optionsFor,phoneReply,shiritoriScore,DEAD} from './shiritori-data.js';
import {bestScore} from './trip-features.js';
import {useKanaVoice} from './SayIt.jsx';
// Shiritori. The chain opens on the word しりとり itself, which is how it is really started,
// and the letter you owe is always the last sound of whatever was just said — so the game
// makes a child look at the end of a word, which is the half of it nobody ever reads.
const rng=seed=>{let n=seed>>>0||1;return()=>{n^=n<<13;n>>>=0;n^=n>>17;n^=n<<5;n>>>=0;return n/4294967296;};};
export default function Shiritori({user,state,mutate,busy}){
 const [levelId,setLevelId]=useState('pictures');
 const [chain,setChain]=useState([OPENER]);
 const [over,setOver]=useState(null),[nudge,setNudge]=useState(null),[seed,setSeed]=useState(()=>Date.now()%100000);
 const rand=useRef(rng(seed));
 const speak=useKanaVoice(false);
 const level=levelById(levelId);
 const game=`shiritori-${level.id}`;
 const last=chain[chain.length-1],letter=last.tail;
 const used=useMemo(()=>chain.map(w=>w.id),[chain]);
 const options=useMemo(()=>over?[]:optionsFor({used,letter,level:level.id,rand:rng(seed+chain.length*97)}),
  [used,letter,level.id,seed,over]);
 function finish(result,extra=[]){
  const full=[...chain,...extra];
  setChain(full);setOver(result);
  if(result.won||result.how==='dry')
   mutate({type:'gameScore',person:user.name,game,score:shiritoriScore(level.id,full.length)});
 }
 function take(word){
  if(over)return;
  speak(word.ja,`shiritori-${word.id}-${chain.length}`);
  // The one rule that matters. Nothing at all starts with ん, so a word that ends on it ends
  // the game, and it ends it for the person who said it.
  if(word.dead)return finish({won:false,how:'dead',word},[word]);
  if(word.head!==letter){
   setNudge(word);setTimeout(()=>setNudge(n=>n===word?null:n),900);
   return;
  }
  const mine=[...chain,word];
  const his=phoneReply({used:mine.map(w=>w.id),letter:word.tail,rand:rand.current});
  setChain(his?[...mine,his]:mine);
  if(his)speak(his.ja,`shiritori-his-${his.id}`);
  else finish({won:true,how:'gaveup'},[]);
 }
 const again=(id=levelId)=>{
  const next=Date.now()%100000;
  setLevelId(id);setSeed(next);rand.current=rng(next+1);
  setChain([OPENER]);setOver(null);setNudge(null);
 };
 // The chain runs out when nothing unused starts with the letter owed. Nobody has lost; the
 // words have simply gone, which is a real way for a game of shiritori to stop.
 useEffect(()=>{if(!over&&!options.length)finish({won:false,how:'dry'});},[options.length,over]);
 const pictures=level.id==='pictures';
 return <>
  <p>Your word has to <strong>start with the last letter of the one before it</strong>. Say a
   word ending in <strong lang="ja">{DEAD}</strong> and you have lost, because nothing in
   Japanese starts with it. No word twice. He gives up when he runs out.</p>
  <div className="segmented game-picker">{LEVELS.map(l=>
   <button key={l.id} className={levelId===l.id?'selected':''} onClick={()=>again(l.id)}>{l.en}</button>)}</div>
  <p><small>{level.how} か and が count as the same letter, which is how children play it.</small></p>
  <div className="shiri-chain">{chain.map((w,i)=>
   <span key={`${w.id}-${i}`} className={`shiri-link${i%2?' his':''}${w.opener?' opener':''}${i===chain.length-1?' latest':''}`}>
    <b aria-hidden="true">{w.icon}</b><small lang="ja">{w.ja}</small></span>)}</div>
  {!over&&<p className="shiri-need">Now a word starting with <strong lang="ja">{letter}</strong></p>}
  {over
   ?<div className={`shiri-over${over.won?' won':''}`}>
     <p className="janken-verdict">{over.won?'He has run out of words. You win.'
      :over.how==='dry'?'The words have run out. Nobody lost — that happens.'
      :<>You said <b lang="ja">{over.word.ja}</b>, and it ends in {DEAD}.</>}</p>
     <p>{chain.length} words long{over.won||over.how==='dry'?` — ${shiritoriScore(level.id,chain.length)} points`:'. A word ending in ん loses, however long the chain was.'}</p>
    </div>
   :<div className={`shiri-options${pictures?' pictures':''}`}>{options.map(w=>
     <button key={w.id} className={`shiri-card${nudge===w?' wrong':''}`} onClick={()=>take(w)}>
      {pictures&&<b aria-hidden="true">{w.icon}</b>}
      <strong lang="ja">{w.ja}</strong><small>{w.romaji}</small>{pictures&&<small>{w.en}</small>}</button>)}</div>}
  {nudge&&<p className="game-status"><X size={15}/> <b lang="ja">{nudge.ja}</b> starts with <b lang="ja">{nudge.head}</b>, not <b lang="ja">{letter}</b>.</p>}
  <div className="game-stats cols-4">
   <span><small>Chain</small><strong>{chain.length}</strong></span>
   <span><small>Letter owed</small><strong lang="ja">{over?'—':letter}</strong></span>
   <span><small>Words left</small><strong>{WORDS.length-used.length+1}</strong></span>
   <span><small>Your best</small><strong>{bestScore(state,user.name,game)||'—'}</strong></span>
  </div>
  <button className={over?'primary':''} onClick={()=>again()}><RotateCcw size={16}/> Start again</button>
 </>;
}
