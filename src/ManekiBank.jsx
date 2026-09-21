import React from 'react';
// 招き猫の貯金箱 — the beckoning-cat money box you find in every Japanese souvenir shop, drawn
// rather than photographed so it can hold the balance. Japan's piggy bank is a chokinbako, and
// the maneki-neko one is the shape a five-year-old will recognise on a shelf in Asakusa a week
// later. Its chest is the window: coins fill it as the money goes in and drain as it is spent.
//
// It is a gauge before it is a picture. The fill is left ÷ paid in, and the darker band at the
// bottom is the part already promised to something — money still in the bank with a name on it.
// You reach in from the top, so what your hand meets first is the money that is genuinely free.
const money=n=>`¥${Math.round(n||0).toLocaleString('en-AU')}`;
// Where a boy's eye goes first. Everything else on the page is words; this is the number.
export default function ManekiBank({total=0,spent=0,aside=0,left=0,phase='',amount=0,size=210}){
 const scale=Math.max(total,1);
 const clamp=n=>Math.max(0,Math.min(1,n/scale));
 // The window runs 130 → 176 in the drawing, 46 high.
 const TOP=130,HEIGHT=46;
 const fill=clamp(left),held=clamp(Math.min(aside,left));
 const fillY=TOP+HEIGHT*(1-fill),asideY=TOP+HEIGHT*(1-held);
 const empty=left<=0||total<=0;
 const label=total>0
  ? `A maneki-neko money box holding ${money(left)} of the ${money(total)} that has gone in${aside>0?`, ${money(aside)} of it put aside`:''}.`
  : 'An empty maneki-neko money box. Nothing has gone in yet.';
 return <div className={`maneki${phase?` maneki-${phase}`:''}${empty?' maneki-empty':''}`}
  style={{width:size}} role="img" aria-label={label}>
  <svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
   <defs>
    <clipPath id="maneki-window"><rect x="74" y="130" width="52" height="46" rx="13"/></clipPath>
    <linearGradient id="maneki-gold" x1="0" y1="0" x2="0" y2="1">
     <stop offset="0" stopColor="#f0cc6a"/><stop offset="1" stopColor="#d9a233"/>
    </linearGradient>
    <pattern id="maneki-held" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
     <rect width="8" height="8" fill="#c8902a"/><rect width="4" height="8" fill="#b57f1f"/>
    </pattern>
   </defs>
   <ellipse className="maneki-shadow" cx="100" cy="206" rx="60" ry="8"/>
   {/* body */}
   <path className="maneki-body" d="M100 104 C60 104 44 132 44 176 C44 194 54 200 70 200 L130 200 C146 200 156 194 156 176 C156 132 140 104 100 104 Z"/>
   {/* the chest window, and the coins behind it */}
   <g clipPath="url(#maneki-window)">
    <rect x="74" y="130" width="52" height="46" className="maneki-glass"/>
    <rect x="74" y={fillY} width="52" height={TOP+HEIGHT-fillY} fill="url(#maneki-gold)" className="maneki-fill"/>
    {held>0&&<rect x="74" y={asideY} width="52" height={TOP+HEIGHT-asideY} fill="url(#maneki-held)" className="maneki-aside"/>}
    {fill>0&&<g className="maneki-coins">
     <ellipse cx="88" cy={fillY+4} rx="7" ry="3"/><ellipse cx="107" cy={fillY+3} rx="8" ry="3.2"/>
     <ellipse cx="118" cy={fillY+7} rx="6" ry="2.6"/>
    </g>}
   </g>
   <rect x="74" y="130" width="52" height="46" rx="13" className="maneki-window-edge"/>
   {/* the koban at its feet, and the left paw resting on it */}
   <g className="maneki-koban">
    <ellipse cx="102" cy="188" rx="32" ry="12"/>
    <ellipse cx="102" cy="188" rx="24" ry="6" className="maneki-koban-inner"/>
   </g>
   <ellipse cx="62" cy="180" rx="15" ry="11" className="maneki-body"/>
   <path d="M55 176v7M62 175v9M69 176v7" className="maneki-toes"/>
   {/* collar and bell */}
   <path className="maneki-collar" d="M70 101 C80 116 120 116 130 101"/>
   <circle cx="100" cy="121" r="8" className="maneki-bell"/>
   <path d="M100 114v14M93 121h14" className="maneki-bell-line"/>
   {/* head */}
   <path className="maneki-body" d="M66 52 L60 20 L94 42 Z"/>
   <path className="maneki-body" d="M134 52 L140 20 L106 42 Z"/>
   <path className="maneki-ear-inner" d="M71 50 L68 31 L87 44 Z"/>
   <path className="maneki-ear-inner" d="M129 50 L132 31 L113 44 Z"/>
   <circle cx="100" cy="72" r="40" className="maneki-body"/>
   {/* the slot it all goes in through */}
   <rect x="85" y="30" width="30" height="6" rx="3" className="maneki-slot"/>
   {/* a face that is pleased about the money */}
   <path className="maneki-whisker" d="M62 72h16M62 80h16M122 72h16M122 80h16"/>
   <path className="maneki-eye" d="M82 70 C85 64 92 64 95 70"/>
   <path className="maneki-eye" d="M105 70 C108 64 115 64 118 70"/>
   <ellipse cx="100" cy="80" rx="4.5" ry="3.2" className="maneki-nose"/>
   <path className="maneki-mouth" d="M100 84 C100 90 93 91 90 86 M100 84 C100 90 107 91 110 86"/>
   {/* the raised paw, last, because the beckoning one is the whole point of the cat and it
       belongs in front of the shoulder rather than behind it */}
   <g className="maneki-paw">
    <path d="M138 128 C156 124 166 100 161 74" className="maneki-limb-edge"/>
    <path d="M138 128 C156 124 166 100 161 74" className="maneki-limb"/>
    <ellipse cx="159" cy="60" rx="15" ry="16" className="maneki-body"/>
    <path d="M152 53v10M159 51v12M166 53v10" className="maneki-toes"/>
   </g>
  </svg>
  {/* coins going in, and coins coming back out, drawn over the top of the cat */}
  <div className="maneki-flight" aria-hidden="true">
   {[0,1,2,3].map(i=><span key={i} className={`maneki-coin c${i}`}/>)}
  </div>
  {!!phase&&<p className={`maneki-flash ${phase}`}>{phase==='in'?'+':'−'}{money(amount)}</p>}
 </div>;
}
