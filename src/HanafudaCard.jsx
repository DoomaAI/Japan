import React from 'react';
import {HIKARI,TANE,TAN,KASU,monthOf} from './hanafuda.js';
const INK='#2b2119';
// The twelve flowers, one per month, drawn simply enough to tell apart at the size a phone
// shows a card. They are not reproductions of a real deck — nothing here is traced from
// anybody's cards — they are our own drawing of the same twelve plants.
const FLOWERS={
 1:c=><><path d="M20 62 32 38 44 62Z" fill={c}/><path d="M26 74 32 54 38 74Z" fill={c}/><rect x="30" y="70" width="4" height="12" fill="#6b4a2a"/></>,
 2:c=><><circle cx="32" cy="48" r="7" fill={c}/><circle cx="21" cy="58" r="6" fill={c}/><circle cx="43" cy="58" r="6" fill={c}/><path d="M32 62v20" stroke="#6b4a2a" strokeWidth="3"/></>,
 3:c=><><g fill={c}>{[0,72,144,216,288].map(a=><ellipse key={a} cx="32" cy="38" rx="5" ry="9" transform={`rotate(${a} 32 48)`}/>)}</g><circle cx="32" cy="48" r="3.4" fill="#f2d24b"/></>,
 4:c=><><path d="M32 34c-8 6-10 16-6 26 4-4 10-6 12-14Z" fill={c}/><path d="M32 34c8 6 10 16 6 26-4-4-10-6-12-14Z" fill={c} opacity=".75"/><path d="M32 60v22" stroke="#4f6b34" strokeWidth="3"/></>,
 5:c=><><path d="M32 32c-5 10-5 18 0 26 5-8 5-16 0-26Z" fill={c}/><path d="M20 46c6 4 10 9 12 14M44 46c-6 4-10 9-12 14" stroke={c} strokeWidth="5" fill="none" strokeLinecap="round"/><path d="M32 60v22" stroke="#4f6b34" strokeWidth="3"/></>,
 6:c=><><circle cx="32" cy="46" r="13" fill={c}/><circle cx="32" cy="46" r="7" fill="#fff" opacity=".35"/><path d="M32 60v22" stroke="#4f6b34" strokeWidth="3"/></>,
 7:c=><><g fill={c}>{[[22,44],[32,38],[42,44],[26,56],[38,56]].map(([x,y])=><ellipse key={x+'-'+y} cx={x} cy={y} rx="5" ry="4"/>)}</g><path d="M32 60v22" stroke="#4f6b34" strokeWidth="3"/></>,
 8:c=><><path d="M32 82V44M32 48c-8-8-12-6-14-12M32 48c8-8 12-6 14-12M32 58c-7-6-11-5-13-10M32 58c7-6 11-5 13-10" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round"/></>,
 9:c=><><g fill={c}>{[...Array(10)].map((_,i)=><ellipse key={i} cx="32" cy="38" rx="3.4" ry="9" transform={`rotate(${i*36} 32 48)`}/>)}</g><circle cx="32" cy="48" r="4" fill="#e8b23a"/></>,
 10:c=><><path d="M32 30 22 44h6l-8 12h8l-6 10h20l-6-10h8l-8-12h6Z" fill={c}/><path d="M32 66v16" stroke="#6b4a2a" strokeWidth="3"/></>,
 11:c=><><path d="M32 28v54" stroke="#6b4a2a" strokeWidth="3"/><path d="M32 34c-10 6-14 18-12 30M32 40c8 5 12 16 10 26M32 46c-7 4-10 12-9 20" stroke={c} strokeWidth="2.6" fill="none" strokeLinecap="round"/></>,
 12:c=><><path d="M32 82V50" stroke="#6b4a2a" strokeWidth="3"/><g fill={c}><ellipse cx="32" cy="36" rx="7" ry="11"/><ellipse cx="19" cy="46" rx="6" ry="10" transform="rotate(-28 19 46)"/><ellipse cx="45" cy="46" rx="6" ry="10" transform="rotate(28 45 46)"/></g></>
};
// What is painted on the named cards. These are the ones the combinations are made of, so they
// have to be tellable apart at a glance rather than merely present.
const EMBLEMS={
 crane:<g><path d="M32 22c-6 2-9 7-8 12 1 4 5 6 9 5l6 8h6l-7-10c2-4 1-9-2-12Z" fill="#fff" stroke={INK} strokeWidth="1.2"/><circle cx="28" cy="27" r="1.3" fill={INK}/><path d="M26 25 20 23" stroke="#c0392b" strokeWidth="1.6"/></g>,
 curtain:<g><rect x="12" y="18" width="40" height="12" rx="2" fill="#c0392b" stroke={INK} strokeWidth="1.2"/><path d="M12 30h40M20 18v12M32 18v12M44 18v12" stroke={INK} strokeWidth="1"/></g>,
 moon:<circle cx="44" cy="24" r="10" fill="#f6e3a8" stroke={INK} strokeWidth="1.2"/>,
 rainman:<g><path d="M18 30a14 10 0 0 1 28 0Z" fill="#3b4a5a" stroke={INK} strokeWidth="1.2"/><path d="M32 30v14" stroke={INK} strokeWidth="1.6"/><path d="M14 40l-3 8M22 44l-3 8M50 40l3 8" stroke="#6f8aa8" strokeWidth="1.6"/></g>,
 phoenix:<g><path d="M32 18c-8 3-12 9-11 15 5-3 9-3 12 0 3-3 7-3 12 0 1-6-4-12-13-15Z" fill="#d8a13a" stroke={INK} strokeWidth="1.2"/><path d="M32 33l-4 10h8Z" fill="#c0392b"/></g>,
 warbler:<g><ellipse cx="40" cy="26" rx="8" ry="6" fill="#6f8a3a" stroke={INK} strokeWidth="1.1"/><circle cx="45" cy="24" r="1.2" fill={INK}/><path d="M48 25l4-1-4 3Z" fill="#e0a33a"/></g>,
 cuckoo:<g><ellipse cx="40" cy="24" rx="8" ry="6" fill="#4a5a6a" stroke={INK} strokeWidth="1.1"/><circle cx="45" cy="22" r="1.2" fill={INK}/><path d="M32 26l-6 4 8 0Z" fill="#4a5a6a"/></g>,
 bridge:<g><path d="M10 34h44M14 30h16M34 38h16" stroke="#8a5a34" strokeWidth="3" strokeLinecap="round"/></g>,
 butterfly:<g><path d="M32 28c-6-8-14-8-14-1 0 5 6 8 14 5Zm0 0c6-8 14-8 14-1 0 5-6 8-14 5Z" fill="#e0a33a" stroke={INK} strokeWidth="1.1"/><path d="M32 24v10" stroke={INK} strokeWidth="1.4"/></g>,
 boar:<g><ellipse cx="34" cy="28" rx="12" ry="7" fill="#6b5a4a" stroke={INK} strokeWidth="1.1"/><circle cx="43" cy="26" r="1.2" fill={INK}/><path d="M24 33l-2 5M32 33l-2 5M40 33l2 5" stroke={INK} strokeWidth="1.4"/></g>,
 geese:<g>{[[20,22],[32,18],[44,24]].map(([x,y])=><path key={x} d={`M${x-5} ${y+3}q5-5 5 0q0-5 5 0`} stroke={INK} strokeWidth="1.6" fill="none"/>)}</g>,
 sake:<g><path d="M22 20h20l-4 10H26Z" fill="#c9502f" stroke={INK} strokeWidth="1.2"/><path d="M26 30h12v3H26Z" fill="#8a3a22"/></g>,
 deer:<g><ellipse cx="34" cy="30" rx="11" ry="6" fill="#a07a4a" stroke={INK} strokeWidth="1.1"/><path d="M40 24l2-6 3 4M44 24l4-5" stroke={INK} strokeWidth="1.4" fill="none"/><circle cx="42" cy="28" r="1.2" fill={INK}/></g>,
 swallow:<g><path d="M20 24q10-6 22 0-10 2-12 8-2-6-10-8Z" fill="#2f3a4a" stroke={INK} strokeWidth="1.1"/></g>
};
const TINT={1:'#3f6b3a',2:'#c46a86',3:'#e08aa6',4:'#8a6ab5',5:'#7a5fae',6:'#c94a6a',
 7:'#7a5f9e',8:'#b08a4a',9:'#d8a83a',10:'#c05a3a',11:'#4a6a7a',12:'#8a6ab5'};
const RIBBON={poetry:'#c0392b',red:'#c0392b',blue:'#3a5a9a',plain:'#c9b98a'};
// One card. Its month is the only thing that matters for matching, so the month is the biggest
// thing on it after the flower.
export default function HanafudaCard({card,size='',chosen,dim,onClick,label}){
 const month=monthOf(card.m);
 const tint=TINT[card.m];
 return <button type="button" className={`fuda ${size}${chosen?' chosen':''}${dim?' dim':''}${onClick?'':' still'}`}
  onClick={onClick} disabled={!onClick} lang="ja"
  aria-label={label||`${month.en}, month ${card.m}${card.en?`, ${card.en}`:''}`}>
  <svg viewBox="0 0 64 96" aria-hidden="true">
   <rect x="1" y="1" width="62" height="94" rx="6" fill="#f6efdf" stroke={INK} strokeWidth="1.6"/>
   {card.kind===HIKARI&&<rect x="4" y="4" width="56" height="88" rx="4" fill="none" stroke="#c8a44a" strokeWidth="2"/>}
   {FLOWERS[card.m]?.(tint)}
   {card.tag&&RIBBON[card.tag]&&<g><rect x="42" y="14" width="10" height="40" rx="3" fill={RIBBON[card.tag]} stroke={INK} strokeWidth="1.1"/>
    {card.tag==='poetry'&&<path d="M45 22h4M45 28h4M45 34h4" stroke="#f6efdf" strokeWidth="1.2"/>}</g>}
   {card.tag&&EMBLEMS[card.tag]}
   <text x="7" y="90" fontSize="9" fill={INK} fontWeight="700">{card.m}</text>
   <text x="57" y="90" fontSize="8" fill={INK} textAnchor="end">{month.ja}</text>
  </svg>
 </button>;
}
