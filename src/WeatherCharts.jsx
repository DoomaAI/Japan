import React,{useState} from 'react';
import {describe,hourLabel} from './weather-data.js';
// Two charts, one above the other, sharing an x-axis of hours. Deliberately not one chart with
// two scales: degrees and per-cent have nothing to do with each other, and a second axis is the
// quickest way to make a graph that reads well and says something untrue.
// One series each, so neither needs a legend — the heading over each says what it is.
const TEMP='#da684f',RAIN='#1f7da6',SURFACE='#ffffff';
const W=680,PAD_L=26,PAD_R=14,TEMP_H=104,RAIN_H=62,GAP=26,AXIS=18;
const H=TEMP_H+GAP+RAIN_H+AXIS;
const band=hours=>(W-PAD_L-PAD_R)/Math.max(hours.length,1);
const xOf=(hours,i)=>PAD_L+band(hours)*(i+0.5);
export default function HourlyChart({hours,nowHour=null,onPick,picked}){
 const [hover,setHover]=useState(null);
 if(!hours?.length)return null;
 const temps=hours.map(x=>x.temp);
 // Round the scale outwards to whole degrees so the gridline labels are numbers a person reads.
 const lo=Math.floor(Math.min(...temps)/2)*2-1,hi=Math.ceil(Math.max(...temps)/2)*2+1;
 const span=Math.max(hi-lo,1);
 const yOf=t=>TEMP_H-((t-lo)/span)*(TEMP_H-14)-7;
 const line=hours.map((x,i)=>`${i?'L':'M'}${xOf(hours,i).toFixed(1)},${yOf(x.temp).toFixed(1)}`).join(' ');
 const warmest=hours.reduce((a,b)=>b.temp>a.temp?b:a),coldest=hours.reduce((a,b)=>b.temp<a.temp?b:a);
 const rainTop=TEMP_H+GAP,barW=Math.min(24,band(hours)-2);
 const active=picked??hover;
 const ticks=[lo+Math.round(span/4),lo+Math.round(span*3/4)];
 const label=(x,i)=>{
  const at=xOf(hours,i);
  return <text key={`t${x.h}`} className="chart-label" x={at} y={yOf(x.temp)-9} textAnchor={i===0?'start':i===hours.length-1?'end':'middle'}>{x.temp}°</text>;
 };
 return <figure className="hourly-figure">
  <svg viewBox={`0 0 ${W} ${H}`} className="hourly-chart" role="img"
   aria-label={`Hour by hour: ${hours[0].temp} degrees at ${hourLabel(hours[0].h)}, ${warmest.temp} at ${hourLabel(warmest.h)}, ${hours.at(-1).temp} at ${hourLabel(hours.at(-1).h)}.`}>
   {/* Recessive hairline gridlines, one step off the surface, behind everything. */}
   {ticks.map(t=><g key={t}>
    <line className="chart-grid" x1={PAD_L} x2={W-PAD_R} y1={yOf(t)} y2={yOf(t)}/>
    <text className="chart-axis" x={PAD_L-6} y={yOf(t)+4} textAnchor="end">{t}°</text>
   </g>)}
   <path className="chart-line" d={line} fill="none" stroke={TEMP} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
   {/* Label the extremes and the ends only. A number on every point is chaos and goes unread. */}
   {hours.map((x,i)=>x===warmest||x===coldest?label(x,i):null)}
   {[warmest,coldest].map(x=>{
    const i=hours.indexOf(x);
    return <circle key={`m${x.h}`} cx={xOf(hours,i)} cy={yOf(x.temp)} r="4.5" fill={TEMP} stroke={SURFACE} strokeWidth="2"/>;
   })}
   {/* Rain, on its own baseline underneath, with the bar caps rounded and the baseline square. */}
   <line className="chart-grid" x1={PAD_L} x2={W-PAD_R} y1={rainTop+RAIN_H} y2={rainTop+RAIN_H}/>
   <text className="chart-axis" x={PAD_L-6} y={rainTop+10} textAnchor="end">100%</text>
   {hours.map((x,i)=>{
    const p=Number.isFinite(x.rain)?x.rain:0,h=Math.max((p/100)*(RAIN_H-6),p?2:0);
    if(!h)return null;
    return <rect key={`r${x.h}`} x={xOf(hours,i)-barW/2} y={rainTop+RAIN_H-h} width={barW} height={h}
     rx={Math.min(4,h/2)} fill={RAIN}/>;
   })}
   {/* Where we are in the day, so the graph says "now" without a second colour doing it. */}
   {nowHour!==null&&hours.some(x=>x.h===nowHour)&&
    <line className="chart-now" x1={xOf(hours,hours.findIndex(x=>x.h===nowHour))} x2={xOf(hours,hours.findIndex(x=>x.h===nowHour))} y1="0" y2={rainTop+RAIN_H}/>}
   {active!==null&&hours[active]&&
    <line className="chart-crosshair" x1={xOf(hours,active)} x2={xOf(hours,active)} y1="0" y2={rainTop+RAIN_H}/>}
   {hours.map((x,i)=><text key={`x${x.h}`} className="chart-axis" x={xOf(hours,i)} y={H-4} textAnchor="middle">
    {hours.length<=12||x.h%3===0?String(x.h).padStart(2,'0'):''}</text>)}
   {/* Hit targets the width of the whole column, which is what a thumb actually lands on. */}
   {hours.map((x,i)=><rect key={`h${x.h}`} className="chart-hit" x={PAD_L+band(hours)*i} y="0"
    width={band(hours)} height={rainTop+RAIN_H} tabIndex={0} role="button"
    aria-label={`${hourLabel(x.h)}, ${x.temp} degrees${Number.isFinite(x.rain)?`, ${x.rain} per cent chance of rain`:''}`}
    onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}
    onFocus={()=>setHover(i)} onBlur={()=>setHover(null)}
    onClick={()=>onPick?.(picked===i?null:i)}/>)}
  </svg>
  <figcaption>
   {active!==null&&hours[active]
    ?<><strong>{hourLabel(hours[active].h)}</strong> · {hours[active].temp}°
      {hours[active].feels!==null&&hours[active].feels!==hours[active].temp?` (feels ${hours[active].feels}°)`:''}
      {Number.isFinite(hours[active].rain)?` · ${hours[active].rain}% rain`:''}
      {hours[active].code!==null?` · ${describe(hours[active].code)[0]}`:''}</>
    :<>Temperature in <span className="key temp"/> degrees, chance of rain in <span className="key rain"/> per cent. Tap an hour.</>}
  </figcaption>
 </figure>;
}
// Everything the chart draws, as a table, so nothing is gated behind being able to see it.
export function HourlyTable({hours}){
 if(!hours?.length)return null;
 return <details className="hourly-table"><summary>Hour by hour, as numbers</summary>
  <table><thead><tr><th>Hour</th><th>Temp</th><th>Feels</th><th>Rain</th><th>Sky</th></tr></thead>
   <tbody>{hours.map(x=><tr key={x.h}>
    <th scope="row">{hourLabel(x.h)}</th><td>{x.temp}°</td><td>{x.feels===null?'—':`${x.feels}°`}</td>
    <td>{Number.isFinite(x.rain)?`${x.rain}%`:'—'}</td><td>{x.code===null?'—':describe(x.code)[0]}</td>
   </tr>)}</tbody></table>
 </details>;
}
