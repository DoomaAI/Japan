import React,{useEffect,useRef,useState} from 'react';
// What happens the moment a game is won. Nate is five: the number going up in the corner is
// not a reward to him, and the games he finishes are the ones that make a fuss when he does.
//
// Three rules it follows, and all three are why this is one component rather than a bit of
// confetti dropped into twenty files:
//
// 1. It fires once, on the edge. Every game already has a flag for being finished, and that
//    flag stays true while the board sits there — so the burst watches for false becoming
//    true, and a re-render while the winning board is still on screen does not set it off again.
// 2. It says what was won in words, not only in colour, and says it out loud to a screen
//    reader. A burst of paper nobody can see is not an announcement.
// 3. It leaves. It is over the game rather than in it, it takes no taps, and it is gone in
//    under three seconds so the next round is not waiting behind a party.
//
// A game you cannot win does not get one — the snake and the goldfish stall both end in the
// paper tearing, and a fanfare for that teaches the wrong thing.
const PIECES=['🌸','🎌','⭐','🎉','🏮','🍡','🐟','🗻','🍣','✨'];
export const WIN_MS=2600;
export function WinBurst({on,label='You did it!',sub=''}){
 const [going,setGoing]=useState(false);
 const was=useRef(false);
 useEffect(()=>{
  if(!on){was.current=false;return;}
  if(was.current)return;
  was.current=true;setGoing(true);
  const t=setTimeout(()=>setGoing(false),WIN_MS);
  return ()=>clearTimeout(t);
 },[on]);
 if(!going)return null;
 return <div className="win-burst">
  {/* The paper is decoration and is told so; the words underneath are the announcement. */}
  <div className="win-paper" aria-hidden="true">{PIECES.map((piece,i)=>
   <span key={i} style={{left:`${4+i*10.2}%`,animationDelay:`${(i%5)*0.11}s`}}>{piece}</span>)}</div>
  <p className="win-banner" role="status">
   <strong>{label}</strong>{sub&&<small>{sub}</small>}</p>
 </div>;
}
export default WinBurst;
