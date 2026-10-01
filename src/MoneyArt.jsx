import React from 'react';
// Our own drawing of what is on the money, not a copy of the money. Nothing here is traced,
// scanned or photographed, and no note is drawn at its real size — these are the same kind of
// pictures as the flower cards: simple enough to read on a phone, accurate about the one thing
// that matters, which is WHAT IS ON EACH SIDE. A child who knows the ten has a temple on it and
// the hundred has cherry blossom can sort a handful of change without reading a word.
// A coin's hole is a hole. Punching it out with a mask rather than filling it with white means
// it stays a hole whatever the card behind it is doing.
const Hole=({id,r,hole})=><mask id={id}><circle cx="50" cy="50" r="48" fill="#fff"/>
 {hole&&<circle cx="50" cy="50" r={r*0.23} fill="#000"/>}</mask>;
// The picture side of each coin: what is actually stamped on it.
const COIN_FRONT={
 'coin-1':c=><g stroke={c} strokeWidth="2.4" fill="none" strokeLinecap="round">
  <path d="M50 64V40"/><path d="M50 44c-7-2-11-7-11-13 6 0 11 4 11 10"/>
  <path d="M50 48c7-3 11-8 11-14-6 0-11 4-11 10"/><path d="M50 40c-4-4-5-9-4-13 4 2 6 7 5 12"/>
 </g>,
 'coin-5':c=><g>
  <g stroke={c} strokeWidth="2" fill="none">{[...Array(16)].map((_,i)=>
   <line key={i} x1="50" y1="26" x2="50" y2="31" transform={`rotate(${i*22.5} 50 50)`}/>)}</g>
  <g stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round">
   <path d="M50 38V22"/>{[-1,1].map(s=><React.Fragment key={s}>
    <path d={`M50 26c${s*5} -2 ${s*7} -5 ${s*7} -8`}/><path d={`M50 32c${s*5} -2 ${s*7} -5 ${s*7} -8`}/>
   </React.Fragment>)}</g>
  <g stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round">
   <path d="M30 70q5-4 10 0t10 0 10 0 10 0"/><path d="M30 77q5-4 10 0t10 0 10 0 10 0"/></g>
 </g>,
 'coin-10':c=><g fill={c}>
  <path d="M26 58h48v4H26z"/><path d="M34 46h32v12H34z" opacity=".55"/>
  <path d="M28 46 50 32l22 14z"/><path d="M20 62h60v3H20z" opacity=".7"/>
  <g opacity=".8">{[38,46,54,62].map(x=><rect key={x} x={x} y="48" width="2.4" height="10"/>)}</g>
  <path d="M50 28v-4" stroke={c} strokeWidth="2"/>
 </g>,
 'coin-50':c=><g fill={c}>{[[50,22],[28,62],[72,62]].map(([x,y])=><g key={x}>
  {[...Array(10)].map((_,i)=><ellipse key={i} cx={x} cy={y-7} rx="1.9" ry="7"
   transform={`rotate(${i*36} ${x} ${y})`}/>)}
  <circle cx={x} cy={y} r="2.6" opacity=".55"/></g>)}</g>,
 'coin-100':c=><g fill={c}>{[[50,28],[31,58],[69,58]].map(([x,y])=><g key={x}>
  {[...Array(5)].map((_,i)=><g key={i} transform={`rotate(${i*72} ${x} ${y})`}>
   <ellipse cx={x} cy={y-8} rx="3.6" ry="6.4"/>
   <path d={`M${x-1.4} ${y-14}l1.4 2.6 1.4-2.6z`} fill="#fff" opacity=".5"/></g>)}
  <circle cx={x} cy={y} r="2.4" fill="#fff" opacity=".55"/></g>)}</g>,
 'coin-500':c=><g>
  <g fill={c}>{[[50,26],[36,32],[64,32]].map(([x,y])=><g key={x}>
   <line x1={x} y1={y} x2={x} y2={y-13} stroke={c} strokeWidth="1.6"/>
   {[0,1,2,3].map(i=><circle key={i} cx={x+(i%2?1.6:-1.6)} cy={y-13+i*4} r="2"/>)}</g>)}</g>
  <g fill={c} opacity=".75">{[[33,56,-26],[50,60,0],[67,56,26]].map(([x,y,a])=><g key={x} transform={`rotate(${a} ${x} ${y})`}>
   <path d={`M${x} ${y-13}c8 6 8 16 0 22-8-6-8-16 0-22z`}/>
   <line x1={x} y1={y-12} x2={x} y2={y+8} stroke="#fff" strokeWidth=".9" opacity=".5"/></g>)}</g>
 </g>
};
// The number side. Everything except the five says how much it is worth in numbers we can read,
// which is exactly why the back of a coin is worth teaching.
const COIN_BACK={
 'coin-5':c=><g stroke={c} strokeWidth="2" fill="none" strokeLinecap="round">
  {[-1,1].map(s=><g key={s}><path d={`M${50+s*22} 74V48`}/>
   <path d={`M${50+s*22} 56c${-s*8} -3 ${-s*11} -9 ${-s*10} -15 7 1 11 8 10 15z`} fill={c} fillOpacity=".35"/>
   <path d={`M${50+s*22} 64c${s*8} -3 ${s*11} -9 ${s*10} -15 -7 1 -11 8 -10 15z`} fill={c} fillOpacity=".25"/>
  </g>)}
 </g>,
 // The evergreen on the back of the ten, which is there because it keeps its leaves all winter.
 'coin-10':c=><g fill={c}>
  <rect x="48.6" y="44" width="2.8" height="8"/>
  <path d="M50 16 40 32h20zM50 26 36 44h28zM50 36 33 54h34z" fillOpacity=".8"/>
 </g>,
 'coin-500':c=><g stroke={c} fill="none" strokeWidth="1.8" strokeLinecap="round">
  <path d="M23 78V22" strokeWidth="2.4"/>
  {[32,50,68].map(y=><path key={y} d={`M19 ${y}h8`} strokeWidth="1.2"/>)}
  {[27,73].map(y=><path key={y} d={`M23 ${y}q8-6 12-1`}/>)}
  <path d="M77 78V30" strokeWidth="2.2"/>
  {[[73,36,-1],[81,46,1],[73,70,-1]].map(([x,y,d])=>
   <ellipse key={y} cx={x} cy={y} rx="6" ry="3.6" fill={c} fillOpacity=".55" stroke="none"
    transform={`rotate(${d*28} ${x} ${y})`}/>)}
 </g>
};
// Where the number and the year sit on the back of each coin. A coin with a hole cannot have a
// number in the middle of it, so on those it goes underneath — which is where it really is.
const BACK_LAYOUT={
 'coin-1':{numeral:[62,32],year:[84,8]},
 'coin-5':{year:[26,8]},
 'coin-10':{numeral:[76,24],year:[90,7]},
 'coin-50':{numeral:[84,24],year:[26,7]},
 'coin-100':{numeral:[62,30],year:[84,8]},
 'coin-500':{numeral:[62,22],year:[84,8]}
};
// The amount as it is written on the coin itself, in the writing that is actually on it.
const KANJI={'coin-1':'一円','coin-5':'五円','coin-10':'十円','coin-50':'五十円','coin-100':'百円','coin-500':'五百円'};
export function CoinFace({coin,side='front',size=104}){
 const r=46*(coin.mm/26.5),motif=side==='front'?COIN_FRONT[coin.id]:COIN_BACK[coin.id];
 const maskId=`hole-${coin.id}-${side}`,ink=shade(coin.rim),layout=BACK_LAYOUT[coin.id];
 return <svg viewBox="0 0 100 100" width={size} height={size} className="coin-face" role="img"
  aria-label={`${coin.name}, the ${side==='front'?'picture':'number'} side`}>
  <g mask={`url(#${maskId})`}>
   <Hole id={maskId} r={r} hole={coin.hole}/>
   <circle cx="50" cy="50" r={r} fill={coin.colour} stroke={coin.rim} strokeWidth="2"/>
   {coin.id==='coin-500'&&<circle cx="50" cy="50" r={r*0.63} fill="#cfd4d8" stroke="#aab0b6" strokeWidth="1.2"/>}
   <circle cx="50" cy="50" r={r-3.5} fill="none" stroke={coin.rim} strokeWidth="1" opacity=".7"/>
   {coin.hole&&<circle cx="50" cy="50" r={r*0.23+1.6} fill="none" stroke={coin.rim} strokeWidth="1.2"/>}
   <g transform={`translate(50 50) scale(${r/46}) translate(-50 -50)`}>
    {motif?.(ink)}
    {side==='front'
     ?<text x="50" y={coin.hole?92:88} textAnchor="middle" fontSize="12" fill={ink} lang="ja">{KANJI[coin.id]}</text>
     :<>{layout.numeral&&<text x="50" y={layout.numeral[0]} textAnchor="middle"
       fontSize={layout.numeral[1]} fontWeight="700" fill={ink}>{coin.yen}</text>}
      <text x="50" y={layout.year[0]} textAnchor="middle" fontSize={layout.year[1]} fill={ink} opacity=".8" lang="ja">令和八年</text></>}
   </g>
  </g>
 </svg>;
}
// A metal's darker cousin, for the stamped design. Real coins have no second colour on them —
// the picture is the same metal, pressed in — so this is a shadow, not paint.
function shade(hex){
 const n=parseInt(String(hex).slice(1),16);
 const mix=v=>Math.max(0,Math.round(v*0.62));
 return `#${[(n>>16)&255,(n>>8)&255,n&255].map(v=>mix(v).toString(16).padStart(2,'0')).join('')}`;
}

// Who is on the front of each note, drawn as a person rather than as a portrait of one.
// The two thousand is the odd one out: no person on the front of it, a gate instead.
const GATE=ink=><g stroke={ink} strokeWidth="1.3" fill="none">
 <path d="M-22 -14 0 -24 22 -14z" fill={ink} fillOpacity=".35"/>
 <path d="M-18 -14h36v4h-36z" fill={ink} fillOpacity=".22"/>
 <path d="M-13 -10v26M13 -10v26M-22 16h44" strokeWidth="2"/>
 <rect x="-6" y="-7" width="12" height="7" rx="1" fill={ink} fillOpacity=".28"/>
 <path d="M-9 2h18M-9 8h18" opacity=".5"/>
</g>;
const FACE={
 'note-1000':{hair:'short',moustache:true},
 'note-5000':{hair:'up'},
 'note-10000':{hair:'bald',moustache:true,beard:true},
 'old-1000':{hair:'short'},
 'old-5000':{hair:'up',collar:true},
 'old-10000':{hair:'bald'}
};
const Portrait=({look,ink})=><g>
 <path d="M-16 30c0-10 7-14 16-14s16 4 16 14z" fill={ink} opacity=".2"/>
 <ellipse cx="0" cy="0" rx="11" ry="13.5" fill={ink} opacity=".18"/>
 <ellipse cx="0" cy="0" rx="11" ry="13.5" fill="none" stroke={ink} strokeWidth="1"/>
 {look.hair==='short'&&<path d="M-11 -4c0-9 4-13 11-13s11 4 11 13c-3-6-7-8-11-8s-8 2-11 8z" fill={ink} opacity=".7"/>}
 {look.hair==='up'&&<><path d="M-12 -2c0-10 5-15 12-15s12 5 12 15c-2-8-6-11-12-11s-10 3-12 11z" fill={ink} opacity=".7"/>
  <ellipse cx="0" cy="-15" rx="7" ry="4.5" fill={ink} opacity=".7"/></>}
 {look.hair==='bald'&&<path d="M-11 -2c1-7 4-10 6-11-4 4-5 8-4 11z" fill={ink} opacity=".6"/>}
 <circle cx="-4" cy="-1" r="1.1" fill={ink}/><circle cx="4" cy="-1" r="1.1" fill={ink}/>
 <path d="M0 1v4" stroke={ink} strokeWidth=".9" fill="none"/>
 {look.moustache
  ?<path d="M-5 7q5-3 10 0" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round"/>
  :<path d="M-3.5 8q3.5 2 7 0" stroke={ink} strokeWidth="1" fill="none" strokeLinecap="round"/>}
 {look.beard&&<path d="M-8 6q8 12 16 0q-2 10-8 10t-8-10z" fill={ink} opacity=".55"/>}
 {look.collar&&<path d="M-10 20 0 27 10 20" fill="none" stroke={ink} strokeWidth="1.2"/>}
</g>;
// The back of each note, which is the side worth looking at.
const NOTE_BACK={
 // Not Hokusai's print — our own wave, drawn from the same idea: one huge curl, foam fingers,
 // little boats underneath and the mountain small and calm a long way behind it.
 'note-1000':ink=><g fill="none" stroke={ink} strokeWidth="1.4" strokeLinecap="round">
  <path d="M6 30 20 18l6 5 7-5 8 7" opacity=".5"/>
  <path d="M2 44c10-24 30-32 46-20 8 6 10 16 4 22-4 4-11 4-14-1 5 2 9 0 9-4 0-6-7-9-14-6-9 4-14 14-15 22" fill={ink} fillOpacity=".16"/>
  <path d="M14 26q6-6 12-2M24 20q5-4 10-1M34 18q4-3 8-1" opacity=".7"/>
  <path d="M2 52q10 6 20 0t20 0 20 0" opacity=".6"/>
  <path d="M26 56q6 4 12 0M8 60q6 4 12 0" opacity=".5"/>
 </g>,
 'note-2000':ink=><g stroke={ink} strokeWidth="1.3" fill="none">
  <path d="M6 24 32 14l26 10z" fill={ink} fillOpacity=".3"/>
  <path d="M10 24h44v4H10z" fill={ink} fillOpacity=".2"/>
  <path d="M16 28v28M48 28v28M6 56h52" strokeWidth="2"/>
  <rect x="26" y="30" width="12" height="7" rx="1" fill={ink} fillOpacity=".25"/>
  <path d="M20 40h24M20 46h24" opacity=".5"/>
 </g>,
 'note-5000':ink=><g stroke={ink} strokeWidth="1.2" fill="none">
  <path d="M4 12q26 4 56 2" strokeWidth="1.6"/>
  {[12,24,36,48].map((x,i)=><g key={x}>
   <path d={`M${x} ${14+i%2*2}v${22+i%3*6}`} opacity=".7"/>
   {[...Array(5)].map((_,j)=><circle key={j} cx={x+(j%2?2.4:-2.4)} cy={18+i%2*2+j*6} r="2.6"
    fill={ink} fillOpacity={.45-j*0.05} stroke="none"/>)}
  </g>)}
 </g>,
 // The red brick front of Tokyo Station: two domes, a long low middle, arched windows.
 'note-10000':ink=><g stroke={ink} strokeWidth="1.2" fill="none">
  <path d="M4 58h60" strokeWidth="1.8"/>
  <rect x="8" y="34" width="48" height="24" fill={ink} fillOpacity=".18"/>
  {[14,50].map(x=><g key={x}><rect x={x-7} y="28" width="14" height="30" fill={ink} fillOpacity=".26"/>
   <path d={`M${x-8} 28q8-12 16 0z`} fill={ink} fillOpacity=".4"/>
   <path d={`M${x} 16v-4`} strokeWidth="1"/></g>)}
  <rect x="26" y="26" width="12" height="32" fill={ink} fillOpacity=".24"/>
  {[12,20,28,36,44,52].map(x=><path key={x} d={`M${x-2} 52v-8q2-3 4 0v8z`} opacity=".7"/>)}
 </g>,
 'old-1000':ink=><g stroke={ink} strokeWidth="1.3" fill="none">
  <path d="M6 46 30 18l24 28z" fill={ink} fillOpacity=".18"/>
  <path d="M22 28h16l4 5H18z" fill={ink} fillOpacity=".4" stroke="none"/>
  <path d="M4 48h60" strokeWidth="1.6"/>
  <path d="M12 50 30 70l18-20z" fill={ink} fillOpacity=".08" stroke="none"/>
  <path d="M8 56q8 3 16 0t16 0 16 0" opacity=".3"/>
  {[[12,16],[52,20],[46,12]].map(([x,y])=><g key={x} fill={ink} fillOpacity=".45" stroke="none">
   {[...Array(5)].map((_,i)=><ellipse key={i} cx={x} cy={y-3.5} rx="1.5" ry="3"
    transform={`rotate(${i*72} ${x} ${y})`}/>)}</g>)}
 </g>,
 'old-5000':ink=><g stroke={ink} strokeWidth="1.2" fill="none">
  {[10,24,38,52].map((x,i)=><g key={x}>
   <path d={`M${x} 58V${26+i%2*4}`}/>
   <path d={`M${x} ${28+i%2*4}c-6-2-8-7-7-12 5 1 8 6 7 12z`} fill={ink} fillOpacity=".4"/>
   <path d={`M${x} ${30+i%2*4}c6-2 8-7 7-12-5 1-8 6-7 12z`} fill={ink} fillOpacity=".3"/>
   <path d={`M${x-6} ${40+i%2*3}q6 6 12 0`} opacity=".5"/>
  </g>)}
  <path d="M4 58h60" strokeWidth="1.5"/>
 </g>,
 'old-10000':ink=><g stroke={ink} strokeWidth="1.2" fill="none">
  <ellipse cx="30" cy="34" rx="9" ry="7" fill={ink} fillOpacity=".4"/>
  <circle cx="24" cy="25" r="4.4" fill={ink} fillOpacity=".4"/>
  <path d="M21 21q2-6 6-4M24 21q1-5 4-4" strokeWidth="1"/>
  <path d="M20 25h-4l3 2z" fill={ink} fillOpacity=".5"/>
  <path d="M30 28c6-8 14-11 20-9-5 3-8 7-9 12" fill={ink} fillOpacity=".25"/>
  <path d="M28 30c-6-7-13-9-18-7 4 3 7 6 8 10" fill={ink} fillOpacity=".2"/>
  <path d="M38 36q12 4 20 16M38 39q12 6 17 17M38 42q10 7 13 16" opacity=".7"/>
  <path d="M28 41v8M14 58h32" strokeWidth="1.6"/>
 </g>
};
// The front of a note: whoever is on it, the amount twice — once in the writing that is on the
// note and once in numbers a five-year-old can read — and the little shape in the corner that is
// there to be felt rather than seen, for somebody who cannot see the note at all.
export function NoteFace({note,side='front',height=86}){
 const w=note.mm*0.95,h=68,x=(170-w)/2,ink=note.ink,back=NOTE_BACK[note.id];
 return <svg viewBox="0 0 170 86" height={height} className="note-face" role="img"
  aria-label={`${note.name}, the ${side==='front'?'front':'back'}`}>
  <rect x={x} y="9" width={w} height={h} rx="3" fill={note.colour} stroke={ink} strokeWidth="1.1"/>
  <rect x={x+4} y="13" width={w-8} height={h-8} rx="2" fill="none" stroke={ink} strokeWidth=".6" opacity=".45"/>
  <g opacity=".22" stroke={ink} strokeWidth=".5" fill="none">
   {[...Array(7)].map((_,i)=><path key={i} d={`M${x+6} ${20+i*7}q${w/2-6} ${i%2?6:-6} ${w-12} 0`}/>)}
  </g>
  {side==='front'
   ?<><g transform={`translate(${x+w-34} 40)`}>
     {FACE[note.id]?<Portrait look={FACE[note.id]} ink={ink}/>:GATE(ink)}</g>
    <rect x={x+w-52} y="52" width="11" height="15" rx="1.5" fill={ink} opacity=".2"/>
    <path d={`M${x+w-50} 56h7M${x+w-50} 60h7M${x+w-50} 64h7`} stroke={ink} strokeWidth=".7" opacity=".5"/>
    <text x={x+10} y="34" fontSize="9" fill={ink} lang="ja">日本銀行券</text>
    <text x={x+10} y="58" fontSize="20" fontWeight="700" fill={ink}>{note.yen.toLocaleString('en-AU')}</text>
    <text x={x+10} y="70" fontSize="7" fill={ink} opacity=".75">YEN</text>
    <circle cx={x+w-12} cy="70" r="3" fill="none" stroke={ink} strokeWidth="1.4"/>
    <circle cx={x+12} cy="16" r="2.2" fill="none" stroke={ink} strokeWidth="1.2"/></>
   :<><g transform={`translate(${x+8} 4)`}>{back?.(ink)}</g>
    <text x={x+w-10} y="66" fontSize="18" fontWeight="700" fill={ink} textAnchor="end">{note.yen.toLocaleString('en-AU')}</text>
    <text x={x+w-10} y="24" fontSize="8" fill={ink} textAnchor="end" lang="ja">{note.ja}</text></>}
 </svg>;
}
