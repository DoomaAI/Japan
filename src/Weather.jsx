import React,{useState} from 'react';
import {CloudSun,RefreshCw} from 'lucide-react';
import {pointFor,forecastUrl,parseForecast,forecastFor,forecastAge,ageLabel,describe,advice} from './weather-data.js';
// The forecast for the days we are actually here, kept in the trip so one phone's lookup
// serves everyone and the numbers are still on screen with no signal.
export default function Weather({state,day,mutate,busy,online,notice,dayLabel}){
 const [checking,setChecking]=useState(false);
 const today=forecastFor(state,day),age=forecastAge(state);
 const ahead=state.days.filter(d=>d.date>day).slice(0,4).map(d=>({...d,entry:forecastFor(state,d.date)}));
 const tip=advice(today);
 async function check(){
  setChecking(true);
  try{
   // One lookup per place, because the trip moves between cities mid-week.
   const wanted=new Map();
   for(const d of state.days.filter(d=>d.date>=day)){
    const point=pointFor(d.city);
    const got=wanted.get(point.name)||{point,dates:[]};got.dates.push(d.date);wanted.set(point.name,got);
   }
   let days={};
   for(const {point,dates} of wanted.values()){
    const r=await fetch(forecastUrl(point,dates[0],dates[dates.length-1]));
    if(!r.ok)throw new Error(`The weather service answered ${r.status}.`);
    days={...days,...parseForecast(await r.json(),point.name)};
   }
   if(!Object.keys(days).length)throw new Error('The weather service sent nothing we could read.');
   if(await mutate({type:'weatherUpdate',days}))notice('Forecast updated for the family.');
  }catch(e){notice(`${e.message||'The forecast could not be fetched.'} The last one we have is still shown.`);}
  finally{setChecking(false);}
 }
 return <section className="weather">
  <div className="weather-head">
   <h3><CloudSun size={17}/> Weather</h3>
   <button type="button" disabled={busy||checking||!online} onClick={check}>
    <RefreshCw size={14}/> {checking?'Checking…':online?'Check':'Offline'}</button>
  </div>
  {today
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
   <div className="weather-day" key={d.date}>
    <small>{dayLabel(d.date).replace(/,.*/,'')}</small>
    <span aria-hidden="true">{d.entry?describe(d.entry.code)[1]:'·'}</span>
    <strong>{d.entry?`${d.entry.max}°`:'—'}</strong>
   </div>)}</div>}
  <small>{ageLabel(age)}{state.weather?.by?` · by ${state.weather.by}`:''}. A forecast more than a few days out is a guess.</small>
 </section>;
}
