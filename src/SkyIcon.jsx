import React,{useId} from 'react';
// The weather icons with no emoji of their own, drawn to sit beside the emoji sun at the same size
// and in the same warm yellow: a crescent moon holding its stars, and half a sun on the horizon for
// sunrise and sunset. Everything else is the emoji it always was.
const RAYS=[180,144,108,72,36,0].map(a=>{const r=a*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
 return [16+c*13,24-s*13,16+c*16.5,24-s*16.5].map(n=>+n.toFixed(2));});
function HalfSun({setting}){
 const id=useId();
 return <svg className="sky-icon" viewBox="0 0 32 32" width="1.2em" height="1.2em" aria-hidden="true">
  <defs><radialGradient id={id} cx="50%" cy="75%" r="60%">
   <stop offset="0" stopColor={setting?'#FFC94A':'#FFEB7A'}/><stop offset="1" stopColor={setting?'#F5822A':'#FFB020'}/></radialGradient></defs>
  {RAYS.map(([x1,y1,x2,y2],i)=><line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={setting?'#F28C28':'#FFB020'} strokeWidth="2.8" strokeLinecap="round"/>)}
  <path d="M5.5 24a10.5 10.5 0 0 1 21 0z" fill={`url(#${id})`}/>
  <line x1="2" y1="24.8" x2="30" y2="24.8" stroke={setting?'#E0772A':'#F2A33A'} strokeWidth="2.2" strokeLinecap="round"/>
 </svg>;
}
const star=(x,y,r)=>`M${x} ${y-r}Q${x} ${y} ${x+r} ${y}Q${x} ${y} ${x} ${y+r}Q${x} ${y} ${x-r} ${y}Q${x} ${y} ${x} ${y-r}Z`;
function Moon(){
 const id=useId(),cut=`${id}c`;
 return <svg className="sky-icon" viewBox="0 0 32 32" width="1.2em" height="1.2em" aria-hidden="true">
  <defs>
   <radialGradient id={id} cx="35%" cy="40%" r="75%"><stop offset="0" stopColor="#FFEB7A"/><stop offset="1" stopColor="#FFB020"/></radialGradient>
   <mask id={cut}><rect width="32" height="32" fill="#fff"/><circle cx="21" cy="12" r="10" fill="#000"/></mask>
  </defs>
  <circle cx="15" cy="16.5" r="12.5" fill={`url(#${id})`} mask={`url(#${cut})`}/>
  <path d={star(22,16,4.2)} fill="#FFC83A"/>
  <path d={star(25.5,7,3)} fill="#FFC83A"/>
  <path d={star(17.5,9,2.2)} fill="#FFC83A"/>
 </svg>;
}
export default function SkyIcon({icon}){
 if(icon==='🌙✨')return <Moon/>;
 if(icon==='🌅')return <HalfSun/>;
 if(icon==='🌇')return <HalfSun setting/>;
 return icon;
}
