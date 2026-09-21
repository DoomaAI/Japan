import React,{useId} from 'react';
import {DEFAULT_MASCOT,paletteFor,describeMascot,mascotFor,mascotReady} from './mascot-data.js';
// The character itself, drawn from the ids the boys chose. Inline SVG and nothing else: no
// image files, no network, no upload — so a character appears beside a name in a tunnel
// under Tokyo exactly as it does at home. Every piece is a small function of the palette and
// of where this shape happens to keep its face, so a robot fox is as drawable as a plain one.
const INK='#16383b',SKIN='#f0cdae',BONE='#f4f1e8';
// Where each shape's face sits: the two eyes, the mouth, and the top of the head for hats.
const FACES={
 fox:{ex:[40,60],ey:48,my:66,top:30},cat:{ex:[40,60],ey:50,my:66,top:31},tanuki:{ex:[39,61],ey:50,my:67,top:30},
 dragon:{ex:[40,60],ey:47,my:68,top:31},kappa:{ex:[40,60],ey:52,my:68,top:31},oni:{ex:[38,62],ey:51,my:69,top:30},
 tengu:{ex:[40,60],ey:48,my:72,top:31},lion:{ex:[41,59],ey:51,my:67,top:28},round:{ex:[40,60],ey:52,my:70,top:30},
 human:{ex:[42,58],ey:53,my:69,top:31},robot:{ex:[40,60],ey:50,my:68,top:32},kaiju:{ex:[40,60],ey:47,my:70,top:29}
};
const ear=(x,y,r,c)=><><circle cx={x} cy={y} r={r} fill={c.base} stroke={INK} strokeWidth="2"/><circle cx={x} cy={y} r={r*0.5} fill={c.trim}/></>;
const SHAPES={
 fox:c=><>
  <path d="M25 47 27 17 48 33Z" fill={c.base} stroke={INK} strokeWidth="2" strokeLinejoin="round"/><path d="M31 41 32 26 41 34Z" fill={c.trim}/>
  <path d="M75 47 73 17 52 33Z" fill={c.base} stroke={INK} strokeWidth="2" strokeLinejoin="round"/><path d="M69 41 68 26 59 34Z" fill={c.trim}/>
  <ellipse cx="50" cy="54" rx="26" ry="23" fill={c.base} stroke={INK} strokeWidth="2"/>
  <ellipse cx="50" cy="66" rx="15" ry="10" fill={c.trim}/><ellipse cx="50" cy="59" rx="3.6" ry="2.8" fill={INK}/></>,
 cat:c=><>
  <path d="M27 44Q26 24 31 21 40 26 47 33Z" fill={c.base} stroke={INK} strokeWidth="2" strokeLinejoin="round"/><path d="M32 39Q31 28 33 27 38 31 41 35Z" fill={c.trim}/>
  <path d="M73 44Q74 24 69 21 60 26 53 33Z" fill={c.base} stroke={INK} strokeWidth="2" strokeLinejoin="round"/><path d="M68 39Q69 28 67 27 62 31 59 35Z" fill={c.trim}/>
  <ellipse cx="50" cy="55" rx="25" ry="23" fill={c.base} stroke={INK} strokeWidth="2"/>
  <ellipse cx="50" cy="66" rx="13" ry="9" fill={c.trim}/><path d="M46 61h8l-4 4Z" fill={INK}/></>,
 tanuki:c=><>{ear(27,33,9,c)}{ear(73,33,9,c)}
  <ellipse cx="50" cy="55" rx="27" ry="24" fill={c.base} stroke={INK} strokeWidth="2"/>
  <ellipse cx="50" cy="67" rx="14" ry="9" fill={c.trim}/><ellipse cx="50" cy="61" rx="4" ry="3" fill={INK}/></>,
 dragon:c=><>
  <g fill="none" strokeLinecap="round"><path d="M38 31 27 17M31 24 21 20M62 31 73 17M69 24 79 20" stroke={INK} strokeWidth="7"/>
   <path d="M38 31 27 17M31 24 21 20M62 31 73 17M69 24 79 20" stroke={c.dark} strokeWidth="3.5"/></g>
  <ellipse cx="50" cy="53" rx="25" ry="22" fill={c.base} stroke={INK} strokeWidth="2"/>
  <rect x="35" y="60" width="30" height="17" rx="8" fill={c.trim} stroke={INK} strokeWidth="2"/>
  <circle cx="43" cy="66" r="1.8" fill={INK}/><circle cx="57" cy="66" r="1.8" fill={INK}/>
  <path d="M27 60Q12 62 8 74M73 60q15 2 19 14" stroke={c.dark} strokeWidth="2.5" fill="none" strokeLinecap="round"/></>,
 kappa:c=><>
  <ellipse cx="50" cy="55" rx="25" ry="23" fill={c.base} stroke={INK} strokeWidth="2"/>
  <path d="M25 55a25 23 0 0 1 50 0Z" fill={c.dark} opacity=".55"/>
  <ellipse cx="50" cy="45" rx="15" ry="9" fill={c.base}/>{ear(24,56,5,c)}{ear(76,56,5,c)}</>,
 oni:c=><>
  <rect x="22" y="31" width="56" height="48" rx="17" fill={c.base} stroke={INK} strokeWidth="2"/>
  <ellipse cx="21" cy="56" rx="4" ry="6" fill={c.trim} stroke={INK} strokeWidth="2"/><ellipse cx="79" cy="56" rx="4" ry="6" fill={c.trim} stroke={INK} strokeWidth="2"/>
  <path d="M30 41q10-5 20 0M50 41q10-5 20 0" stroke={c.dark} strokeWidth="3" fill="none" strokeLinecap="round"/></>,
 tengu:c=><>
  <path d="M30 33 34 18 42 29 50 15 58 29 66 18 70 33Z" fill={c.dark} stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
  <ellipse cx="50" cy="55" rx="24" ry="22" fill={c.base} stroke={INK} strokeWidth="2"/>
  <path d="M44 56q18 3 33 13-15 5-33 7Z" fill={c.base} stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
  <ellipse cx="72" cy="69" rx="5" ry="4" fill={c.dark} opacity=".55"/></>,
 lion:c=>{const mane=[];for(let i=0;i<12;i++){const a=(i/12)*Math.PI*2;mane.push(<circle key={i} cx={50+Math.cos(a)*24} cy={54+Math.sin(a)*23} r="10" fill={c.dark} stroke={INK} strokeWidth="1.5"/>);}
  return <>{mane}<circle cx="50" cy="54" r="21" fill={c.base} stroke={INK} strokeWidth="2"/><ellipse cx="50" cy="65" rx="12" ry="8" fill={c.trim}/><path d="M46 60h8l-4 4Z" fill={INK}/></>;},
 round:c=><>
  <ellipse cx="50" cy="56" rx="27" ry="26" fill={c.base} stroke={INK} strokeWidth="2"/>
  <ellipse cx="50" cy="59" rx="19" ry="20" fill={c.trim} opacity=".6"/></>,
 human:c=><>
  <circle cx="28" cy="56" r="5" fill={SKIN} stroke={INK} strokeWidth="2"/><circle cx="72" cy="56" r="5" fill={SKIN} stroke={INK} strokeWidth="2"/>
  <ellipse cx="50" cy="55" rx="21" ry="23" fill={SKIN} stroke={INK} strokeWidth="2"/>
  <path d="M29 50Q30 27 50 27q20 0 21 23-7-11-21-11t-21 11Z" fill={c.dark} stroke={INK} strokeWidth="2" strokeLinejoin="round"/></>,
 robot:c=><>
  <path d="M50 33V22" stroke={INK} strokeWidth="3" strokeLinecap="round"/><circle cx="50" cy="18" r="5" fill={c.dark} stroke={INK} strokeWidth="2"/>
  <rect x="26" y="33" width="48" height="45" rx="13" fill={c.base} stroke={INK} strokeWidth="2"/>
  <rect x="19" y="49" width="7" height="14" rx="3" fill={c.dark} stroke={INK} strokeWidth="2"/><rect x="74" y="49" width="7" height="14" rx="3" fill={c.dark} stroke={INK} strokeWidth="2"/>
  <rect x="59" y="62" width="11" height="8" rx="2" fill={c.trim} stroke={INK} strokeWidth="1.5"/></>,
 kaiju:c=><>
  <path d="M28 36 34 20 40 33 48 16 56 33 63 21 70 36Z" fill={c.dark} stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
  <ellipse cx="50" cy="55" rx="26" ry="23" fill={c.base} stroke={INK} strokeWidth="2"/>
  <ellipse cx="50" cy="67" rx="16" ry="10" fill={c.trim}/><circle cx="44" cy="63" r="1.8" fill={INK}/><circle cx="56" cy="63" r="1.8" fill={INK}/></>
};
const MARKINGS={
 none:()=>null,
 blush:(c,f)=><g fill="#e0736a" opacity=".45"><ellipse cx={f.ex[0]-7} cy={f.ey+10} rx="7" ry="4.5"/><ellipse cx={f.ex[1]+7} cy={f.ey+10} rx="7" ry="4.5"/></g>,
 whiskers:(c,f)=><g stroke={INK} strokeWidth="1.6" strokeLinecap="round" opacity=".75">
  <path d={`M32 ${f.my-6}H16M32 ${f.my-1}H15M32 ${f.my+4}H17`} fill="none"/><path d={`M68 ${f.my-6}h16M68 ${f.my-1}h17M68 ${f.my+4}h15`} fill="none"/></g>,
 mask:(c,f)=><g fill={c.dark}><ellipse cx={f.ex[0]} cy={f.ey} rx="12" ry="10"/><ellipse cx={f.ex[1]} cy={f.ey} rx="12" ry="10"/></g>,
 swirl:(c,f)=><g stroke={c.dark} strokeWidth="2" fill="none" strokeLinecap="round">
  <path d={`M${f.ex[0]-8} ${f.ey+11}a4.5 4.5 0 1 1-4-4.5 2.4 2.4 0 1 0 2 2`}/><path d={`M${f.ex[1]+8} ${f.ey+11}a4.5 4.5 0 1 0 4-4.5 2.4 2.4 0 1 1-2 2`}/></g>,
 scar:(c,f)=><g stroke={c.dark} strokeWidth="2.2" strokeLinecap="round"><path d={`M${f.ex[0]-4} ${f.ey-14}l-6 12`}/><path d={`M${f.ex[0]-10} ${f.ey-10}l6 3M${f.ex[0]-12} ${f.ey-5}l6 3`}/></g>,
 stars:(c,f)=><g fill={c.dark}>{[[f.ex[0]-9,f.ey+10],[f.ex[1]+9,f.ey+10]].map(([x,y],i)=>
  <path key={i} d={`M${x} ${y-5}q1 4 5 5-4 1-5 5-1-4-5-5 4-1 5-5Z`}/>)}</g>,
 scales:(c,f)=><g stroke={c.dark} strokeWidth="1.8" fill="none" opacity=".8">
  <path d={`M38 ${f.ey-13}a6 6 0 0 1 12 0M50 ${f.ey-13}a6 6 0 0 1 12 0M44 ${f.ey-19}a6 6 0 0 1 12 0`}/></g>
};
const white=(x,y,rx,ry)=><ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#fff" stroke={INK} strokeWidth="1.6"/>;
const pupil=(x,y,r=4)=><><circle cx={x} cy={y} r={r} fill={INK}/><circle cx={x+1.6} cy={y-2} r="1.5" fill="#fff"/></>;
const EYES={
 bright:(c,f)=><>{f.ex.map(x=><React.Fragment key={x}>{white(x,f.ey,6.5,7)}{pupil(x,f.ey)}</React.Fragment>)}</>,
 sparkle:(c,f)=><>{f.ex.map(x=><React.Fragment key={x}>{white(x,f.ey,6.5,7)}{pupil(x,f.ey,4.5)}
  <path d={`M${x-3} ${f.ey+3}q.8 2.4 3 3-2.2.6-3 3-.8-2.4-3-3 2.2-.6 3-3Z`} fill="#fff"/></React.Fragment>)}</>,
 sleepy:(c,f)=><g stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round">{f.ex.map(x=><path key={x} d={`M${x-7} ${f.ey+2}q7-8 14 0`}/>)}</g>,
 fierce:(c,f)=><>{f.ex.map(x=><React.Fragment key={x}>{white(x,f.ey+1,6,4.5)}{pupil(x,f.ey+1,3)}</React.Fragment>)}
  <g stroke={INK} strokeWidth="3" strokeLinecap="round"><path d={`M${f.ex[0]-8} ${f.ey-10}l13 5`}/><path d={`M${f.ex[1]+8} ${f.ey-10}l-13 5`}/></g></>,
 wink:(c,f)=><>{white(f.ex[0],f.ey,6.5,7)}{pupil(f.ex[0],f.ey)}
  <path d={`M${f.ex[1]-7} ${f.ey+2}q7-8 14 0`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round"/></>,
 visor:(c,f)=><><rect x={f.ex[0]-13} y={f.ey-8} width={f.ex[1]-f.ex[0]+26} height="16" rx="8" fill={INK}/>
  <rect x={f.ex[0]-7} y={f.ey-2.5} width={f.ex[1]-f.ex[0]+14} height="5" rx="2.5" fill="#79e0d4"/></>
};
const MOUTHS={
 smile:(c,f)=><path d={`M41 ${f.my-3}q9 9 18 0`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round"/>,
 grin:(c,f)=><><path d={`M39 ${f.my-4}q11 12 22 0Z`} fill="#8c3b3b" stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
  <path d={`M42 ${f.my-4}l3 5 3-5ZM52 ${f.my-4}l3 5 3-5Z`} fill="#fff"/></>,
 calm:(c,f)=><path d={`M45 ${f.my}h10`} stroke={INK} strokeWidth="3" strokeLinecap="round"/>,
 tongue:(c,f)=><><path d={`M42 ${f.my-3}q8 7 16 0Z`} fill="#8c3b3b" stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
  <ellipse cx="53" cy={f.my+4} rx="5" ry="4" fill="#e2798a" stroke={INK} strokeWidth="1.5"/></>,
 beak:(c,f)=><path d={`M40 ${f.my-5}h20l-10 11Z`} fill="#e8b64a" stroke={INK} strokeWidth="2" strokeLinejoin="round"/>,
 roar:(c,f)=><><ellipse cx="50" cy={f.my+1} rx="13" ry="10" fill="#8c3b3b" stroke={INK} strokeWidth="2"/>
  <path d={`M38 ${f.my-4}l4 5 4-5 4 5 4-5 4 5 3-5Z`} fill="#fff"/></>
};
const HEADWEAR={
 none:()=>null,
 hachimaki:(c,f)=><><path d={`M76 ${f.top+8}l16-6v15Z`} fill={BONE} stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
  <rect x="21" y={f.top+3} width="58" height="10" rx="4" fill={BONE} stroke={INK} strokeWidth="2"/><circle cx="50" cy={f.top+8} r="4" fill="#d9503f"/></>,
 kasa:(c,f)=><><path d={`M7 ${f.top+9}q43-36 86 0Z`} fill="#e0c07a" stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
  <path d={`M7 ${f.top+9}h86`} stroke={INK} strokeWidth="2"/><path d={`M50 ${f.top-7}v16M30 ${f.top-1}l4 10M70 ${f.top-1}l-4 10`} stroke="#b9954f" strokeWidth="1.5"/></>,
 kabuto:(c,f)=><><path d={`M18 ${f.top+11}q32-28 64 0q-32-11-64 0Z`} fill={c.dark} stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
  <path d={`M36 ${f.top-2}q14-15 28 0-14-8-28 0Z`} fill="#d7a63c" stroke={INK} strokeWidth="2" strokeLinejoin="round"/></>,
 dish:(c,f)=><><ellipse cx="50" cy={f.top+2} rx="21" ry="8" fill="#cfe8ee" stroke={INK} strokeWidth="2"/>
  <ellipse cx="50" cy={f.top} rx="16" ry="5" fill="#eaf7f9"/></>,
 horns:(c,f)=><g fill="#f2e8d5" stroke={INK} strokeWidth="2" strokeLinejoin="round">
  <path d={`M32 ${f.top+6}q-5-17 3-23 6 9 8 21Z`}/><path d={`M68 ${f.top+6}q5-17-3-23-6 9-8 21Z`}/></g>,
 flame:(c,f)=><><path d={`M78 ${f.top-2}q-9-5-5-14 2 4 5 3 3-4 1-9 10 8 6 18-3 4-7 2Z`} fill="#f0a44a" stroke={INK} strokeWidth="1.8" strokeLinejoin="round"/>
  <path d={`M77 ${f.top-5}q-4-3-2-7 3 4 4 1 1 4-2 6Z`} fill="#fbe3c6"/></>,
 hood:(c,f)=><><path d={`M21 ${f.top+20}q0-28 29-28t29 28q-11-9-29-9t-29 9Z`} fill={c.dark} stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
  <path d={`M21 ${f.top+16}v18q0 8 7 8V${f.top+20}ZM79 ${f.top+16}v18q0 8-7 8V${f.top+20}Z`} fill={c.dark} stroke={INK} strokeWidth="2" strokeLinejoin="round"/></>
};
const ITEMS={
 none:()=>null,
 fan:()=><><path d="M80 86v11" stroke={INK} strokeWidth="3" strokeLinecap="round"/><circle cx="80" cy="76" r="11" fill={BONE} stroke={INK} strokeWidth="2"/><circle cx="80" cy="76" r="4.5" fill="#d9503f"/></>,
 katana:()=><><path d="M67 97 90 66" stroke="#c9d3d8" strokeWidth="4" strokeLinecap="round"/><path d="M87 62 92 69" stroke={INK} strokeWidth="3" strokeLinecap="round"/><path d="M69 90 76 95" stroke={INK} strokeWidth="4" strokeLinecap="round"/></>,
 lantern:()=><><path d="M80 63v4M80 92v4" stroke={INK} strokeWidth="3"/><rect x="69" y="66" width="22" height="26" rx="10" fill="#e9605a" stroke={INK} strokeWidth="2"/>
  <path d="M70 74h20M70 84h20" stroke="#f7e3d8" strokeWidth="2"/></>,
 onigiri:()=><><path d="M80 64 93 90H67Z" fill="#f7f4ec" stroke={INK} strokeWidth="2" strokeLinejoin="round"/><path d="M72 80h16v9H72Z" fill="#2f3b3f"/></>,
 bell:()=><><path d="M80 64v4" stroke={INK} strokeWidth="2.5"/><circle cx="80" cy="79" r="11" fill="#d7a63c" stroke={INK} strokeWidth="2"/><path d="M72 83h16" stroke={INK} strokeWidth="2"/><circle cx="80" cy="86" r="2.4" fill={INK}/></>,
 cucumber:()=><g transform="rotate(22 79 79)"><rect x="72" y="64" width="14" height="30" rx="7" fill="#6f9a55" stroke={INK} strokeWidth="2"/><path d="M76 70v18" stroke="#9cc07e" strokeWidth="2" strokeLinecap="round"/></g>,
 umbrella:()=><><path d="M80 78v18" stroke={INK} strokeWidth="3" strokeLinecap="round"/><path d="M60 78q20-24 40 0Z" fill="#d9503f" stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
  <path d="M80 78V60M67 78q7-10 13-10M93 78q-7-10-13-10" stroke={INK} strokeWidth="1.2" fill="none" opacity=".6"/></>
};
// The background: a family crest rather than a picture, so it reads at the size of an avatar.
const PATTERNS={
 plain:()=>null,
 seigaiha:c=><g stroke={c.base} strokeWidth="2" fill="none" opacity=".3">{[0,1,2].map(r=><g key={r}>{[0,1,2,3,4].map(i=>
  <path key={i} d={`M${i*24-8} ${20+r*30}a14 14 0 0 1 28 0`}/>)}</g>)}</g>,
 asanoha:c=><g stroke={c.base} strokeWidth="1.6" fill="none" opacity=".3">
  <path d="M0 0 100 100M100 0 0 100M50 0v100M0 50h100M0 100 50 0 100 100"/></g>,
 sakura:c=><g fill={c.base} opacity=".3">{[[14,18],[84,26],[22,82],[80,80],[50,8]].map(([x,y],i)=>
  <g key={i}>{[0,1,2,3,4].map(p=><ellipse key={p} cx={x} cy={y-5} rx="2.6" ry="4.5" transform={`rotate(${p*72} ${x} ${y})`}/>)}</g>)}</g>,
 asahi:c=><g fill={c.base} opacity=".28">{[0,1,2,3,4,5,6,7].map(i=>
  <path key={i} d={`M50 100 ${i*15-6} -10 ${i*15+3} -10Z`}/>)}</g>,
 kumo:c=><g fill={c.base} opacity=".28">{[[18,20,11],[30,24,8],[82,34,12],[70,38,8],[16,78,10],[86,76,9]].map(([x,y,r],i)=>
  <ellipse key={i} cx={x} cy={y} rx={r} ry={r*0.7}/>)}</g>
};
export default function Mascot({mascot,size=96,label,className=''}){
 const m={...DEFAULT_MASCOT,...(mascot||{})},c=paletteFor(m.palette),f=FACES[m.shape]||FACES.round,id=useId().replace(/:/g,'');
 const draw=(set,key)=>(set[key]||set[Object.keys(set)[0]])(c,f);
 return <svg className={`mascot ${className}`.trim()} viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={label||describeMascot(m)}>
  <clipPath id={`m${id}`}><rect x="2" y="2" width="96" height="96" rx="22"/></clipPath>
  <g clipPath={`url(#m${id})`}>
   <rect x="2" y="2" width="96" height="96" rx="22" fill={c.trim}/>
   {draw(PATTERNS,m.pattern)}
   <path d="M4 100q0-19 46-19t46 19Z" fill={c.dark} stroke={INK} strokeWidth="2"/>
   {draw(SHAPES,m.shape)}
   {draw(MARKINGS,m.marking)}
   {draw(EYES,m.eyes)}
   {draw(MOUTHS,m.mouth)}
   {draw(HEADWEAR,m.headwear)}
   {draw(ITEMS,m.item)}
  </g>
  <rect x="2" y="2" width="96" height="96" rx="22" fill="none" stroke={INK} strokeWidth="2"/>
 </svg>;
}
// Somebody's character wherever their name appears. Until they have made one it stays the
// letter it always was, so nothing looks broken for the family members who never bother.
export function MascotBadge({state,person,size=34,className=''}){
 const m=mascotFor(state,person);
 if(!mascotReady(m))return <span className={`mascot-letter ${className}`.trim()} style={{width:size,height:size}} aria-hidden="true">{(person||'?')[0]}</span>;
 return <Mascot mascot={m} size={size} className={className} label={`${person}’s character, ${m.name}`}/>;
}
