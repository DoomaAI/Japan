// The day map: the day's stops drawn where they are, in the order we do them, from positions the
// trip already holds. It is a sketch rather than a street map — no tiles are fetched, so it is
// there with no signal at all and it asks nothing of anybody's map server. A stop goes where its
// pin or our My Map puts it, or failing that in its neighbourhood, and says which. Stops at the
// same spot share one mark, numbered together.
import {activeSteps} from './timing.js';
import {stepPosition,kmBetween} from './memory-map.js';
import {stepPoint} from './weather-data.js';
export function dayMap(state,day){
 const marks=[],path=[];let n=0;
 for(const s of activeSteps(state,day).filter(s=>s.status!=='skipped')){
  n++;
  const at=stepPosition(state,s),near=at?null:stepPoint(state,s);
  const lat=at?.lat??near?.lat,lng=at?.lng??near?.lon;
  if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
  const same=marks.find(m=>Math.abs(m.lat-lat)<1e-4&&Math.abs(m.lng-lng)<1e-4);
  const stop={n,id:s.id,title:s.title,time:s.time||null,done:s.status==='done'};
  let at_=same?marks.indexOf(same):marks.length;
  if(same){same.stops.push(stop);same.exact=same.exact&&!!at;}
  else marks.push({lat,lng,exact:!!at,stops:[stop]});
  // The route is the order we go in, through the marks: back to the hotel at the end of the day
  // is a leg of its own, even though the hotel is one mark.
  if(path.at(-1)!==at_)path.push(at_);
 }
 const legs=[];
 for(let i=1;i<path.length;i++)legs.push({from:path[i-1],to:path[i],km:kmBetween(marks[path[i-1]],marks[path[i]])});
 return {marks,path,legs,rough:marks.filter(m=>!m.exact).length};
}
// Latitude and longitude onto a w×h box, keeping distances true in both directions (a degree of
// longitude is shorter than a degree of latitude this far north), with room round the edge.
export function project(marks,w,h,pad=28){
 if(!marks.length)return {points:[],kmPerPx:0};
 const lat0=marks.reduce((a,m)=>a+m.lat,0)/marks.length,k=Math.cos(lat0*Math.PI/180);
 const xs=marks.map(m=>m.lng*k),ys=marks.map(m=>m.lat);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const spanX=Math.max(maxX-minX,.002),spanY=Math.max(maxY-minY,.002),scale=Math.min((w-2*pad)/spanX,(h-2*pad)/spanY);
 const offX=(w-spanX*scale)/2,offY=(h-spanY*scale)/2;
 return {points:marks.map((m,i)=>({x:offX+(xs[i]-minX)*scale,y:h-(offY+(ys[i]-minY)*scale)})),kmPerPx:111.2/scale};
}
// A round number of kilometres or metres that fits in about a quarter of the width.
export function scaleBar(kmPerPx,w){
 const target=kmPerPx*w/4,steps=[.05,.1,.2,.25,.5,1,2,5,10,20,50,100,200,500];
 const km=steps.reduce((best,s)=>s<=target?s:best,steps[0]);
 return {km,px:km/kmPerPx,label:km<1?`${Math.round(km*1000)} m`:`${km} km`};
}
