import React,{useId} from 'react';
import {purseLevels} from './trip-features.js';
// The purse drawn as the thing money actually goes into. A bar answers a grown-up's question —
// what share of the budget has gone — and a five-year-old asks three simpler ones: how much is
// in there, where did it come from, and where did it go. So the money box is a lucky cat, coins
// go in on one side and out on the other, and the gold inside is what is still his. The dashed
// line is the one thing no figure on the page says out loud: where the level lands if he buys
// everything still on his list. It is the beckoning cat from Gōtokuji, whose raised right paw is
// the one that calls in money, and it is drawn here in inline SVG like every other picture in
// the app — no image file, no network, so it is the same in a shop with no signal.
const INK='#16383b',GOLD='#d7a63c',DEEP='#a57a1e',BOX='#f4f1e8',PALE='#f7ddd5',SHORT='#a0342d';
const BOX_TOP=74,BOX_BOTTOM=132,BOX_LEFT=62,BOX_WIDTH=76;
const coin=(cx,cy,r,key)=><ellipse key={key} cx={cx} cy={cy} rx={r} ry={r*0.72} fill={GOLD} stroke={INK} strokeWidth="2"/>;
export default function PurseCat({money,inText,outText,leftText,person}){
 const {level,after,shortfall,short,empty}=purseLevels(money);
 const id=useId().replace(/:/g,'');
 const at=share=>BOX_TOP+(BOX_BOTTOM-BOX_TOP)*(1-share);
 const levelY=at(level),afterY=at(after);
 const wentIn=(money.paidIn||0)>0,wentOut=(money.spent||0)>0,toBuy=(money.planned||0)>0;
 // Said in full for a screen reader and for a parent reading it out, because the drawing is the
 // whole point for the boy and no use at all to somebody who cannot see it.
 const alt=`${person}’s money box. ${wentIn?`${inText} has gone in`:'Nothing has gone in yet'}`
  +`${wentOut?`, ${outText} has been spent`:''}, and ${leftText} is left`
  +`${toBuy?short?'. Everything still on the list costs more than that.':'. The dashed line is where it lands if everything still on the list is bought.':''}`;
 return <div className="purse-figure">
  <svg className="purse-cat" viewBox="0 0 200 152" role="img" aria-label={alt}>
   <defs>
    <clipPath id={`box${id}`}><rect x={BOX_LEFT} y={BOX_TOP} width={BOX_WIDTH} height={BOX_BOTTOM-BOX_TOP} rx="24"/></clipPath>
    {/* What is still promised to the list is striped rather than solid: it is his until he buys
        it. What the list wants and the box has not got is striped in red above the money line. */}
    <pattern id={`plan${id}`} width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
     <rect width="11" height="11" fill="none"/><rect width="5.5" height="11" fill="#fff" opacity=".65"/>
    </pattern>
    <pattern id={`gap${id}`} width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
     <rect width="11" height="11" fill="#fae6e0"/><rect width="5.5" height="11" fill={SHORT} opacity=".4"/>
    </pattern>
   </defs>
   <ellipse cx="100" cy="140" rx="52" ry="6" fill="#e7efe9"/>
   {/* The raised right paw — the one that calls in money — waving while there is any to call. */}
   <g className={empty?'paw':'paw waving'}>
    <path d="M70 84q-16-6-17-26" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round"/>
    <circle cx="53" cy="52" r="11" fill="#fff" stroke={INK} strokeWidth="3"/>
    <path d="M48 47v6M53 45v8M58 47v6" stroke={INK} strokeWidth="1.6" strokeLinecap="round"/>
   </g>
   {/* The body, filled to the level of what is left. */}
   <g clipPath={`url(#box${id})`}>
    <rect x={BOX_LEFT} y={BOX_TOP} width={BOX_WIDTH} height={BOX_BOTTOM-BOX_TOP} fill={BOX}/>
    {level>0&&<rect x={BOX_LEFT} y={levelY} width={BOX_WIDTH} height={BOX_BOTTOM-levelY} fill={GOLD} opacity=".85"/>}
    {toBuy&&<rect x={BOX_LEFT} y={levelY} width={BOX_WIDTH} height={Math.max(0,afterY-levelY)} fill={`url(#plan${id})`}/>}
    {short&&<rect x={BOX_LEFT} y={levelY-(BOX_BOTTOM-BOX_TOP)*shortfall} width={BOX_WIDTH}
     height={(BOX_BOTTOM-BOX_TOP)*shortfall} fill={`url(#gap${id})`}/>}
    {toBuy&&<path d={`M${BOX_LEFT} ${short?levelY-(BOX_BOTTOM-BOX_TOP)*shortfall:afterY}h${BOX_WIDTH}`}
     stroke={short?SHORT:DEEP} strokeWidth="2.5" strokeDasharray="7 5"/>}
   </g>
   <rect x={BOX_LEFT} y={BOX_TOP} width={BOX_WIDTH} height={BOX_BOTTOM-BOX_TOP} rx="24" fill="none" stroke={INK} strokeWidth="3"/>
   {/* Head, ears and the slot a coin goes through, because that is what makes it a money box. */}
   <path d="M76 34 70 8 96 24Z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round"/>
   <path d="M124 34 130 8 104 24Z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round"/>
   <path d="M80 30 76 16 90 24Z" fill={PALE}/><path d="M120 30 124 16 110 24Z" fill={PALE}/>
   <circle cx="100" cy="50" r="28" fill="#fff" stroke={INK} strokeWidth="3"/>
   <g><rect x="89" y="17" width="22" height="9" rx="4.5" fill="#fff" stroke={INK} strokeWidth="2.5"/>
    <rect x="93" y="20" width="14" height="3" rx="1.5" fill={INK}/></g>
   <g fill={INK}><circle cx="90" cy="48" r="3"/><circle cx="110" cy="48" r="3"/></g>
   <g fill="#e2a3a3" opacity=".6"><ellipse cx="80" cy="57" rx="6" ry="4"/><ellipse cx="120" cy="57" rx="6" ry="4"/></g>
   <path d="M97 56h6l-3 4Z" fill={INK}/>
   <g stroke={INK} strokeWidth="1.5" strokeLinecap="round" opacity=".7">
    <path d="M74 54h-13M74 60h-12M126 54h13M126 60h12"/></g>
   {/* Collar and bell, and a gold coin held while there is still something to hold. */}
   <path d="M79 70q21 13 42 0" fill="none" stroke="#da684f" strokeWidth="5" strokeLinecap="round"/>
   <circle cx="100" cy="76" r="6" fill={GOLD} stroke={INK} strokeWidth="2"/><circle cx="100" cy="78" r="1.8" fill={INK}/>
   {!empty&&<g><circle cx="141" cy="107" r="10" fill="#fff" stroke={INK} strokeWidth="3"/>
    <ellipse cx="154" cy="101" rx="13" ry="8" fill={GOLD} stroke={INK} strokeWidth="2" transform="rotate(-18 154 101)"/>
    <path d="M150 99h8" stroke={DEEP} strokeWidth="1.6" strokeLinecap="round"/></g>}
   {/* Money in, climbing to the slot. Nothing is drawn when nothing has gone in. */}
   {wentIn&&<g>
    <path d="M20 118Q26 50 82 24" fill="none" stroke={GOLD} strokeWidth="3" strokeDasharray="7 6" strokeLinecap="round"/>
    <path d="M84 22 72 24l7 8Z" fill={GOLD}/>
    {[[16,124,9],[25,105,8],[38,86,7]].map(([x,y,r],i)=>coin(x,y,r,i))}
   </g>}
   {/* And money out, falling away from the box. */}
   {wentOut&&<g>
    <path d="M142 126q24 8 40 18" fill="none" stroke="#9fb3ad" strokeWidth="3" strokeDasharray="7 6" strokeLinecap="round"/>
    <path d="M184 145 178 133l-3 10Z" fill="#9fb3ad"/>
    {[[160,131,7],[176,140,8]].map(([x,y,r],i)=>coin(x,y,r,i))}
   </g>}
  </svg>
  <p className="purse-flows">
   <span className="flow-in">{wentIn?`${inText} in`:'Nothing in yet'}</span>
   <span className="flow-out">{wentOut?`${outText} out`:'Nothing spent yet'}</span>
  </p>
 </div>;
}
