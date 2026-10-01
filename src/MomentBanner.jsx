import React,{useEffect} from 'react';
import {inMoment,momentFor} from './film-data.js';
// The moment, while it is open: one line across Home on every phone at the same minute, and a
// small buzz the first time this phone sees it. Two minutes, then it is gone.
export default function MomentBanner({day,now,go}){
 const open=inMoment(day,+now),m=momentFor(day);
 useEffect(()=>{if(!open)return;const key=`japan.moment.${day}`;try{if(localStorage.getItem(key))return;localStorage.setItem(key,'1');}catch{}try{navigator.vibrate?.([120,60,120]);}catch{}},[open,day]);
 if(!open)return null;
 return <button type="button" className="moment-banner" onClick={()=>go('photos',day)}>⏱ <span><b>It’s the moment · {m.clock}</b><small>Two minutes, every phone at once: a photo of whatever you are doing right now.</small></span></button>;
}
