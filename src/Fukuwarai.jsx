import React,{useState,useRef} from 'react';
import {Trophy,RotateCcw,Eye,EyeOff} from 'lucide-react';
import {FACES,faceById,PARTS,targetFor,fukuwaraiScore,verdictOf,PERFECT} from './fukuwarai-data.js';
import {bestScore} from './trip-features.js';
const INK='#16383b';
// The faces, drawn rather than photographed, on the same hundred by a hundred square the rest
// of the app draws on. Only the head is here: the eyebrows, eyes, nose and mouth are what you
// are putting on, so they are never part of the picture until the blindfold comes off.
const blank={
 otafuku:f=><>
  <path d="M22 44a28 30 0 0 1 56 0v6a28 32 0 0 1-56 0Z" fill={f.skin} stroke={INK} strokeWidth="2"/>
  <path d="M22 45a28 30 0 0 1 56 0q-6-12-28-12T22 45Z" fill={f.hair}/>
  <path d="M50 14c-16 0-22 10-22 18 4-8 12-11 22-11s18 3 22 11c0-8-6-18-22-18Z" fill={f.hair}/>
  <ellipse cx="31" cy="60" rx="5" ry="3.4" fill={f.blush} opacity=".75"/>
  <ellipse cx="69" cy="60" rx="5" ry="3.4" fill={f.blush} opacity=".75"/></>,
 hyottoko:f=><>
  <path d="M24 44a26 30 0 0 1 52 0v5a26 31 0 0 1-52 0Z" fill={f.skin} stroke={INK} strokeWidth="2"/>
  <path d="M21 30h58l-3 9H24Z" fill="#cf4b3f" stroke={INK} strokeWidth="1.6" strokeLinejoin="round"/>
  <path d="M74 31l9-5-2 10Z" fill="#cf4b3f" stroke={INK} strokeWidth="1.6" strokeLinejoin="round"/>
  <ellipse cx="32" cy="58" rx="4.6" ry="3" fill={f.blush} opacity=".7"/>
  <ellipse cx="68" cy="58" rx="4.6" ry="3" fill={f.blush} opacity=".7"/></>
};
// And the pieces somebody hands you, one at a time.
const piece={
 otafuku:{
  'brow-l':<path d="M-8 2q8-7 16 0" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" opacity=".85"/>,
  'brow-r':<path d="M8 2q-8-7-16 0" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" opacity=".85"/>,
  'eye-l':<path d="M-5.5 0q5.5-4 11 0q-5.5 2-11 0Z" fill={INK}/>,
  'eye-r':<path d="M5.5 0q-5.5-4-11 0q5.5 2 11 0Z" fill={INK}/>,
  nose:<path d="M0-4q4 6 0 8" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round"/>,
  mouth:<path d="M-6 0q6 6 12 0q-6 2-12 0Z" fill="#c1503f" stroke={INK} strokeWidth="1.6"/>},
 hyottoko:{
  'brow-l':<path d="M-7 2q7-6 13 0" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round"/>,
  'brow-r':<path d="M7 2q-7-6-13 0" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round"/>,
  'eye-l':<circle r="3.4" fill={INK}/>,
  'eye-r':<ellipse rx="4.4" ry="3" fill="none" stroke={INK} strokeWidth="2.2"/>,
  nose:<path d="M0-4q5 6 1 8" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round"/>,
  mouth:<><ellipse rx="6" ry="4.6" fill="#b8473a" stroke={INK} strokeWidth="1.8"/><ellipse rx="2.4" ry="1.8" fill="#6e2018"/></>}
};
export default function Fukuwarai({user,state,mutate,busy}){
 const [faceId,setFaceId]=useState('otafuku');
 // Three states, and they are the three a person is actually in: looking at the board, wearing
 // the blindfold, and looking at what they have done. The middle one is the game.
 const [phase,setPhase]=useState('look');
 const [placed,setPlaced]=useState({});
 const board=useRef(null);
 const face=faceById(faceId);
 const blind=phase==='blind',revealed=phase==='off';
 const done=PARTS.filter(p=>placed[p.id]).length;
 const next=PARTS[done]||null;
 const result=fukuwaraiScore(faceId,placed);
 const game=`fukuwarai-${faceId}`;
 // Where the finger landed, turned into a spot on the hundred-square. The board is square, so
 // one number does for both, and a tap on the very edge is still on the picture.
 function put(e){
  if(!next||!blind)return;
  const box=board.current?.getBoundingClientRect();
  if(!box)return;
  const x=Math.max(0,Math.min(100,((e.clientX-box.left)/box.width)*100));
  const y=Math.max(0,Math.min(100,((e.clientY-box.top)/box.height)*100));
  setPlaced(p=>({...p,[next.id]:[x,y]}));
 }
 function reveal(){
  setPhase('off');
  mutate({type:'gameScore',person:user.name,game,score:Math.max(1,result.total)});
 }
 const again=(id=faceId)=>{setFaceId(id);setPlaced({});setPhase('look');};
 return <>
  <p>Look at the face. Then the blindfold goes on and <strong>the face goes with it</strong> —
   somebody hands you an eyebrow and you put it where you remember the face being. Six pieces,
   one at a time, no going back, and nothing to look at until it is all over.</p>
  <div className="segmented game-picker">{FACES.map(f=>
   <button key={f.id} className={faceId===f.id?'selected':''} onClick={()=>again(f.id)} lang="ja">{f.ja}</button>)}</div>
  <p><small>{face.who}</small></p>
  <div className={`fuku-board${blind?' blind':''}`} ref={board} onPointerDown={put}>
   <svg viewBox="0 0 100 100" role="img"
    aria-label={blind?'The blindfold is on. Tap where you think the piece goes.'
     :revealed?`${face.romaji}, with the pieces where you put them`:`${face.romaji}, a blank face`}>
    {/* The blindfold takes the face with it, the way it does at a table: what is left is the
        edge of the board, which you could feel with your other hand. */}
    {!blind&&blank[faceId](face)}
    {/* Where it belongs, shown only once it is too late to matter. */}
    {revealed&&result.parts.map(p=>
     <circle key={`t-${p.id}`} cx={p.target[0]} cy={p.target[1]} r="3" fill="none"
      stroke={INK} strokeWidth=".6" strokeDasharray="1.6 1.6" opacity=".55"/>)}
    {PARTS.map((part,i)=>{
     const spot=placed[part.id];
     if(!spot)return null;
     // Blindfolded, a piece leaves nothing but the knowledge that you put it somewhere. The
     // numbered mark is the hand you can still feel where you last put it — it says a tap
     // landed and roughly where, which is what you get at a table, and nothing more.
     return revealed
      ?<g key={part.id} transform={`translate(${spot[0]} ${spot[1]})`}>{piece[faceId][part.id]}</g>
      :<g key={part.id} transform={`translate(${spot[0]} ${spot[1]})`} opacity=".3">
        <circle r="3.4" fill="none" stroke={INK} strokeWidth=".8"/>
        <text y="1.4" textAnchor="middle" fontSize="4" fill={INK}>{i+1}</text></g>;
    })}
   </svg>
  </div>
  {phase==='look'
   ?<div className="fuku-ready">
     <p>Have a good look at where everything goes. Once the blindfold is on, this is gone.</p>
     <button className="primary" onClick={()=>setPhase('blind')}><EyeOff size={16}/> Blindfold on</button>
    </div>
   :revealed
   ?<>
     <p className="game-status"><Trophy size={16}/> {result.total} out of {PERFECT}. {verdictOf(result.total)}</p>
     <div className="ladder-grid notes fuku-marks">{result.parts.map(p=>
      <span key={p.id}><b>{p.en}</b><small lang="ja">{p.ja}</small>
       <small>{p.away===null?'never placed'
        :p.away<4?'right where it belongs'
        :`${Math.round(p.away)} away — ${p.points} point${p.points===1?'':'s'}`}</small></span>)}</div>
    </>
   :next
    ?<p className="game-status fuku-next">Now the <strong>{next.en.toLowerCase()}</strong>
      <small lang="ja">{next.ja}</small><small>{done} of {PARTS.length} on</small></p>
    :<p className="game-status">All six on. Nobody has looked yet.</p>}
  <div className="row wrap game-actions">
   {blind&&<button className="primary" disabled={!!next} onClick={reveal}><Eye size={16}/> Take the blindfold off</button>}
   <button onClick={()=>again()}><RotateCcw size={16}/> Another go</button>
  </div>
  <p className="game-status">Your best on {face.romaji}: {bestScore(state,user.name,game)||'—'}</p>
 </>;
}
