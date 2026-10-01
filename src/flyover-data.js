// The flyover: Relive's camera flight over the trip, day by day, the photos rising from the ground
// as the camera passes them. It is the replay's own frames (memory-map.js) drawn on a canvas rather
// than over map tiles, because a canvas with someone else's tiles on it cannot be recorded; what is
// drawn is ours, so the phone can record it to a video without anything leaving the private store.
//
// This file is the arithmetic: where the camera is at any moment, how far out it is, and how long
// each leg takes. The drawing is in Flyover.jsx.
import {kmBetween} from './memory-map.js';
export const NEAR_SECONDS=0.7,FAR_SECONDS=2.4,DAY_PAUSE=1.6,FAR_KM=25;
// Every leg of the flight with when it starts and ends: a walk across town is quick, a Shinkansen
// is a long glide pulled out wide, and a new day holds for a moment for its photo to rise.
export function flightPlan(frames){
 const legs=[];let t=0;
 frames.forEach((f,i)=>{
  const prev=frames[i-1];
  if(!prev){legs.push({from:f,to:f,start:0,end:DAY_PAUSE,far:false,newDay:true});t=DAY_PAUSE;return;}
  const far=kmBetween(prev,f)>FAR_KM,newDay=prev.day!==f.day,len=(far?FAR_SECONDS:NEAR_SECONDS)+(newDay?DAY_PAUSE:0);
  legs.push({from:prev,to:f,start:t,end:t+len,far,newDay});t+=len;
 });
 return {legs,duration:t};
}
const ease=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
// Where the camera is at time t, how wide it is looking (km across), and which frame it is on.
export function cameraAt(plan,t){
 const {legs}=plan;if(!legs.length)return null;
 const found=legs.findIndex(l=>t<l.end),leg=found===-1?legs.at(-1):legs[found];
 const span=Math.max(0.001,leg.end-leg.start),moving=leg.newDay&&leg.from!==leg.to?Math.max(0.001,span-DAY_PAUSE):span;
 const p=ease(Math.min(1,Math.max(0,(t-leg.start)/moving)));
 const lat=leg.from.lat+(leg.to.lat-leg.from.lat)*p,lng=leg.from.lng+(leg.to.lng-leg.from.lng)*p;
 const dist=kmBetween(leg.from,leg.to);
 // Out wide in the middle of a long hop, close in on a walk.
 const width=leg.far?6+Math.sin(Math.PI*p)*Math.min(400,dist*1.1):6;
 return {lat,lng,width,index:legs.indexOf(leg),frame:p>.5||leg.from===leg.to?leg.to:leg.from,leg,progress:p};
}
// A point on the ground, in km east and north of the camera.
export function offsetKm(cam,pt){
 const kx=111.32*Math.cos(cam.lat*Math.PI/180);
 return {x:(pt.lng-cam.lng)*kx,y:(pt.lat-cam.lat)*110.57};
}
// The ground seen at a slant: a point further north (ahead) is higher on the screen and smaller.
// Returns null for a point behind the camera's view.
export function project(off,{width,w,h,tilt=0.55}){
 const s=w/width,horizon=h*0.18,base=h*0.78;
 const depth=off.y*s*tilt;
 const scale=1/(1+Math.max(-0.6,depth/(h*0.9)));
 const y=base-depth*scale;
 if(y<horizon)return null;
 return {x:w/2+off.x*s*scale,y,scale};
}
// Which recording format this browser can write: MP4 on Safari, WebM elsewhere.
export function recordingType(can=t=>typeof MediaRecorder!=='undefined'&&MediaRecorder.isTypeSupported?.(t)){
 for(const t of ['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9','video/webm'])if(can(t))return t;
 return null;
}
