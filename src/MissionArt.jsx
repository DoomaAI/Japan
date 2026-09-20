import React from 'react';
// Simple line drawings for the missions where the shape is the point, so Nate can see what
// he is looking for before anyone reads him the words. Inline SVG: no files, no network,
// and it works offline like the rest of the app.
const ink='#16383b',accent='#da684f',soft='#e7eeeb';
const art={
 torii:<><path d="M14 30h72M18 22h64l-6 8H24z" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M28 30v42M72 30v42M22 42h56" stroke={ink} strokeWidth="4" strokeLinecap="round"/></>,
 crossing:<><rect x="6" y="8" width="88" height="64" rx="6" fill={soft}/><path d="M18 20v40M32 20v40M46 20v40M60 20v40M74 20v40" stroke="#fff" strokeWidth="7" strokeLinecap="round"/><circle cx="34" cy="34" r="6" fill={accent}/><circle cx="62" cy="50" r="6" fill={ink}/></>,
 bamboo:<><path d="M40 78V14a8 8 0 0 1 16 0v64" stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round"/><path d="M40 28h16M40 44h16M40 60h16" stroke={accent} strokeWidth="4" strokeLinecap="round"/><path d="M56 34c10-2 16-8 18-14M40 50c-10-2-16-8-18-14" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round"/></>,
 arch:<><path d="M6 66h88" stroke={ink} strokeWidth="4" strokeLinecap="round"/><path d="M14 66a14 14 0 0 1 28 0M42 66a14 14 0 0 1 28 0M70 66a12 12 0 0 1 24 0" stroke={accent} strokeWidth="4" fill="none"/><path d="M6 52h88" stroke={ink} strokeWidth="5" strokeLinecap="round"/><path d="M14 66v12M42 66v12M70 66v12" stroke={ink} strokeWidth="3" strokeLinecap="round"/></>,
 scoreboard:<><rect x="8" y="14" width="84" height="52" rx="6" fill={ink}/><text x="28" y="48" fill="#fff" fontSize="24" fontWeight="700" textAnchor="middle" fontFamily="monospace">3</text><text x="50" y="46" fill={soft} fontSize="16" textAnchor="middle">–</text><text x="72" y="48" fill={accent} fontSize="24" fontWeight="700" textAnchor="middle" fontFamily="monospace">5</text><path d="M30 66v12M70 66v12M20 78h60" stroke={ink} strokeWidth="4" strokeLinecap="round"/></>,
 top:<><path d="M50 16v14" stroke={ink} strokeWidth="4" strokeLinecap="round"/><path d="M22 40h56l-28 34z" fill={soft} stroke={ink} strokeWidth="4" strokeLinejoin="round"/><path d="M22 40h56" stroke={accent} strokeWidth="5" strokeLinecap="round"/><path d="M74 22c6 4 8 10 6 16M26 22c-6 4-8 10-6 16" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round"/></>,
 paw:<><path d="M30 78c0-18 8-30 20-30s20 12 20 30z" fill={soft} stroke={ink} strokeWidth="4" strokeLinejoin="round"/><circle cx="50" cy="30" r="16" fill="#fff" stroke={ink} strokeWidth="4"/><path d="M38 18l-4-10 12 4M62 18l4-10-12 4" fill="#fff" stroke={ink} strokeWidth="4" strokeLinejoin="round"/><path d="M70 48c6-6 6-16 0-22" stroke={accent} strokeWidth="5" fill="none" strokeLinecap="round"/><circle cx="44" cy="30" r="2.5" fill={ink}/><circle cx="56" cy="30" r="2.5" fill={ink}/></>
};
export const hasMissionArt=name=>!!art[name];
export default function MissionArt({name,title}){
 if(!art[name])return null;
 return <svg className="mission-art" viewBox="0 0 100 88" role="img" aria-label={`Picture clue for ${title}`}>{art[name]}</svg>;
}
