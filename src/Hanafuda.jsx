import React,{useState,useEffect,useRef} from 'react';
import {Trophy,RotateCcw} from 'lucide-react';
import {YAKU,HIKARI,TANE,TAN,KASU,deal,step,stop,koikoi,hisMove,heStops,scoreOf,matches,payout,monthOf} from './hanafuda.js';
import HanafudaCard from './HanafudaCard.jsx';
import {bestScore} from './trip-features.js';
import {WinBurst} from './Win.jsx';
const rng=seed=>{let n=seed>>>0||1;return()=>{n^=n<<13;n>>>=0;n^=n>>17;n^=n<<5;n>>>=0;return n/4294967296;};};
const KINDS=[[HIKARI,'Brights'],[TANE,'Animals'],[TAN,'Ribbons'],[KASU,'Plains']];
const Pile=({cards,who})=><div className="fuda-pile">{KINDS.map(([kind,en])=>{
 const got=cards.filter(c=>c.kind===kind);
 if(!got.length)return null;
 return <span key={kind}><small>{en}</small><b>{got.length}</b></span>;
})}{!cards.length&&<em>nothing yet</em>}</div>;
export default function Hanafuda({user,state,mutate,busy}){
 const [game,setGame]=useState(null);
 const rand=useRef(rng(Date.now()%100000)),saved=useRef(null);
 const start=()=>{rand.current=rng(Date.now()%100000);saved.current=null;setGame(deal(rand.current));};
 // His turn, played out a beat at a time so it can be watched rather than just happening.
 useEffect(()=>{
  if(!game||game.over||game.turn!=='them')return;
  const t=setTimeout(()=>setGame(g=>{
   if(!g||g.over||g.turn!=='them')return g;
   if(g.phase==='decide')return heStops(g)?stop(g):koikoi(g);
   if(g.pending)return step(g,{cardId:g.pending.card.id,pickId:g.pending.options[0].id});
   if(!g.hands.them.length)return step(g,{});
   return step(g,hisMove(g,rand.current));
  }),820);
  return ()=>clearTimeout(t);
 },[game]);
 useEffect(()=>{
  if(game?.over?.winner!=='me'||saved.current===game)return;
  saved.current=game;
  mutate({type:'gameScore',person:user.name,game:'hanafuda',score:Math.min(9999,game.over.points)});
 },[game?.over]);
 const mine=game&&game.turn==='me'&&!game.over;
 const deciding=mine&&game.phase==='decide';
 const picking=mine&&game.pending;
 const playable=id=>mine&&!picking&&game.phase==='hand';
 const table=game?.table||[];
 const myScore=game?scoreOf(game.piles.me):{yaku:[],points:0};
 const hisScore=game?scoreOf(game.piles.them):{yaku:[],points:0};
 return <>
  <p>Forty-eight cards, twelve months, four cards a month. <strong>The month is the only thing
   that matters for matching</strong>: play a card and it takes a card of the same month off the
   table. Then one is turned off the deck and does the same. Collect the right sets and you have
   a <em>yaku</em> — then either stop and take it, or say <strong>koi-koi</strong> and go for
   more, which doubles what the round pays and is where the game gets its name.</p>
  {!game
   ?<button className="primary" onClick={start}>Deal</button>
   :<>
    <div className="fuda-side">
     <small>His</small><Pile cards={game.piles.them}/>
     <b>{hisScore.points}</b>
    </div>
    <div className="fuda-table">{table.map(c=>{
     const target=picking&&game.pending.options.some(o=>o.id===c.id);
     return <HanafudaCard key={c.id} card={c} size="small" chosen={target}
      dim={picking&&!target}
      onClick={target?()=>setGame(step(game,{cardId:game.pending.card?.id,pickId:c.id})):undefined}/>;
    })}</div>
    {picking&&<p className="game-status">Your {monthOf(game.pending.card.m).en.toLowerCase()} can take
     either. Tap the one you want.</p>}
    <div className="fuda-hand">{game.hands.me.map(c=>{
     const can=playable()&&matches(c,table).length>0;
     return <HanafudaCard key={c.id} card={c} chosen={can}
      onClick={playable()?()=>setGame(step(game,{cardId:c.id})):undefined}/>;
    })}</div>
    <div className="fuda-side mine">
     <small>Yours</small><Pile cards={game.piles.me}/>
     <b>{myScore.points}</b>
    </div>
    {!!myScore.yaku.length&&<div className="ladder-grid notes fuda-yaku">{myScore.yaku.map(y=>
     <span key={y.id}><b lang="ja">{y.ja}</b><small>{y.romaji}</small><small>{y.en} — {y.points}</small></span>)}</div>}
    {deciding&&<div className="fuda-decide">
     <p>You have <strong>{myScore.points}</strong>. Stop and take it, or keep going?</p>
     <div className="row wrap">
      <button className="primary" onClick={()=>setGame(stop(game))}>Stop — take {payout(myScore.points,game.koi)}</button>
      <button onClick={()=>setGame(koikoi(game))} lang="ja">こいこい</button>
     </div>
     <small>Saying koi-koi banks nothing and doubles what the round finally pays, to whoever stops.</small>
    </div>}
    <WinBurst on={game.over?.winner==='me'} label="The round is yours!" sub={game.over?.winner==='me'?`${game.over.points} points`:''}/>
    <p className="game-status">{
     game.over
      ?game.over.winner==='me'?<><Trophy size={16}/> You stopped on {game.over.raw}{game.koi?`, doubled ${game.koi} time${game.koi>1?'s':''}`:''} — {game.over.points} points.</>
       :game.over.winner==='them'?`He stopped on ${game.over.raw}. ${game.over.points} to him.`
       :'The hands ran out and nobody stopped. Nobody scores.'
     :deciding?'Your call.'
     :picking?'Choose which one to take.'
     :mine?'Your turn. A card with a green edge has a match on the table.'
     :'His turn.'}</p>
    <div className="game-stats cols-4">
     <span><small>In the deck</small><strong>{game.deck.length}</strong></span>
     <span><small>Koi-koi called</small><strong>{game.koi}</strong></span>
     <span><small>Your yaku</small><strong>{myScore.points}</strong></span>
     <span><small>Your best</small><strong>{bestScore(state,user.name,'hanafuda')||'—'}</strong></span>
    </div>
    <button className={game.over?'primary':''} onClick={start}><RotateCcw size={16}/> New deal</button>
   </>}
  <details className="merge-ladder"><summary>What the sets are worth</summary>
   <div className="ladder-grid notes">{YAKU.map(y=>
    <span key={y.id}><b lang="ja">{y.ja}</b><small>{y.romaji}</small>
     <small>{y.en} — {y.points}{y.extra?' and one more for every extra':''}</small></span>)}</div>
  </details>
 </>;
}
