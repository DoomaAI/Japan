import React,{useState} from 'react';
import {CloudSun,RefreshCw,X,ChevronRight,ChevronDown,ChevronUp} from 'lucide-react';
import HourlyChart,{HourlyTable,DayShape} from './WeatherCharts.jsx';
import {pointFor,forecastUrl,parseForecast,parseHourly,forecastFor,forecastAge,ageLabel,describe,advice,morningNeeds,isMorning,hoursFor} from './weather-data.js';
import {japanDate,japanClock} from './timing.js';
import {isOpen,setOpen} from './fold.js';
// The one section that folds away, named here so the phone remembers which one it was.
export const FOLD_ID='weather';
// The morning reminder. It is about the jumper and the umbrella, not the meteorology, it only
// appears while it is still morning in Japan and only for the day we are actually on, and it
// goes away for the day once someone has read it. It reads the forecast already on the phone,
// so it works with no signal.
export function MorningNeeds({state,day,clock,today}){
 const [hidden,setHidden]=useState(()=>{try{return localStorage.getItem(`japan.needs.${day}`)==='seen';}catch{return false;}});
 const needs=morningNeeds(forecastFor(state,day));
 if(!needs||hidden||day!==today||!isMorning(clock))return null;
 const dismiss=()=>{try{localStorage.setItem(`japan.needs.${day}`,'seen');}catch{}setHidden(true);};
 return <div className="morning-needs">
  <span className="morning-icons" aria-hidden="true">{needs.icons}</span>
  <div><strong>Before we go out</strong><p>{needs.summary}</p></div>
  <button type="button" aria-label="Dismiss for today" onClick={dismiss}><X size={16}/></button>
 </div>;
}
// The forecast for the days we are actually here, kept in the trip so one phone's lookup
// serves everyone and the numbers are still on screen with no signal.
export function useForecastCheck({state,day,mutate,notice}){
 const [checking,setChecking]=useState(false);
 async function check(){
  setChecking(true);
  try{
   // One lookup per place, because the trip moves between cities mid-week.
   const wanted=new Map();
   for(const d of state.days.filter(d=>!day||d.date>=day)){
    const point=pointFor(d.city);
    const got=wanted.get(point.name)||{point,dates:[]};got.dates.push(d.date);wanted.set(point.name,got);
   }
   let days={},hours={};
   for(const {point,dates} of wanted.values()){
    const r=await fetch(forecastUrl(point,dates[0],dates[dates.length-1]));
    if(!r.ok)throw new Error(`The weather service answered ${r.status}.`);
    const json=await r.json();
    days={...days,...parseForecast(json,point.name)};hours={...hours,...parseHourly(json)};
   }
   if(!Object.keys(days).length)throw new Error('The weather service sent nothing we could read.');
   if(await mutate({type:'weatherUpdate',days,hours}))notice('Forecast updated for the family, hour by hour.');
  }catch(e){notice(`${e.message||'The forecast could not be fetched.'} The last one we have is still shown.`);}
  finally{setChecking(false);}
 }
 return {check,checking};
}
// The day's hours, opened where they are. Standing in the day, "when does the rain start" is a
// question about the next two hours, not a reason to leave the page you are working from.
// Mounted fresh per day, so the hour somebody tapped on Tuesday is not still selected on Wednesday.
function HourlyPanel({hours,nowHour}){
 const [picked,setPicked]=useState(null);
 return <div className="weather-hours">
  <DayShape hours={hours}/>
  <HourlyChart hours={hours} nowHour={nowHour} picked={picked} onPick={setPicked}/>
  <HourlyTable hours={hours}/>
 </div>;
}
export default function Weather({state,day,mutate,busy,online,notice,dayLabel,go,now}){
 const {check,checking}=useForecastCheck({state,day,mutate,notice});
 const [openHours,setOpenHours]=useState(false);
 // Sixteen days of a trip and the forecast is the same four numbers most mornings. Somebody who
 // has read it wants it out of the way of the day itself, and wants it to stay out of the way
 // tomorrow — so the fold is remembered rather than reset by every reload.
 const [open,setShown]=useState(()=>isOpen(FOLD_ID));
 const fold=()=>setShown(v=>setOpen(FOLD_ID,!v));
 const today=forecastFor(state,day),age=forecastAge(state);
 const hours=hoursFor(state,day);
 // The "now" line belongs on the day we are actually in, and nowhere else.
 const nowHour=now&&japanDate(now)===day?Number(japanClock(now).slice(0,2)):null;
 const ahead=state.days.filter(d=>d.date>day).slice(0,4).map(d=>({...d,entry:forecastFor(state,d.date)}));
 const tip=advice(today);
 // Folded, it still says the one thing it is for: what it is doing outside. A section that
 // collapses to its own name is a row of wasted space with a chevron on it.
 const peek=today?`${describe(today.code)[1]} ${today.max}° / ${today.min}°${today.rain!==null?` · ${today.rain}%`:''}`:'No forecast yet';
 return <section className={`weather${open?'':' folded'}`}>
  <div className="weather-head">
   <h3><button type="button" className="weather-fold" aria-expanded={open} onClick={fold}>
    <CloudSun size={17}/> Weather{!open&&<span className="weather-peek">{peek}</span>}
    {open?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button></h3>
   {open&&<button type="button" disabled={busy||checking||!online} onClick={check}>
    <RefreshCw size={14}/> {checking?'Checking…':online?'Check':'Offline'}</button>}
  </div>
  {open&&<>{today
   ?<><div className="weather-today">
     <span className="weather-icon" aria-hidden="true">{describe(today.code)[1]}</span>
     <div>
      <strong>{today.max}° / {today.min}°</strong>
      <small>{describe(today.code)[0]} · {today.city}{today.rain!==null?` · ${today.rain}% rain`:''}</small>
     </div>
    </div>
    {tip&&<p className="weather-advice">{tip}</p>}</>
   :<p><small>No forecast saved yet.{online?' Tap Check.':' It needs signal once, then it stays on the phone.'}</small></p>}
  {!!ahead.filter(d=>d.entry).length&&<div className="weather-ahead">{ahead.map(d=>
   <button className="weather-day" key={d.date} onClick={()=>go?.('weather',d.date)}>
    <small>{dayLabel(d.date).replace(/,.*/,'')}</small>
    <span aria-hidden="true">{d.entry?describe(d.entry.code)[1]:'·'}</span>
    <strong>{d.entry?`${d.entry.max}°`:'—'}</strong>
   </button>)}</div>}
  {hours&&<button className="weather-more" aria-expanded={openHours} onClick={()=>setOpenHours(v=>!v)}>
   {openHours?'Hide the hours':'Hour by hour'}{openHours?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button>}
  {hours&&openHours&&<HourlyPanel key={day} hours={hours} nowHour={nowHour}/>}
  {go&&<button className="weather-more" onClick={()=>go('weather',day)}>
   All sixteen days<ChevronRight size={16}/></button>}
  <small>{ageLabel(age)}{state.weather?.by?` · by ${state.weather.by}`:''}. A forecast more than a few days out is a guess.</small></>}
 </section>;
}
