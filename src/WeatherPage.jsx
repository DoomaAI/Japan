import React,{useState} from 'react';
import {CloudSun,RefreshCw,ChevronRight,ChevronDown} from 'lucide-react';
import {dayLabel} from './AdventurePages.jsx';
import HourlyChart,{HourlyTable,DayShape} from './WeatherCharts.jsx';
import {SunTimes} from './Weather.jsx';
import {forecastFor,forecastAge,ageLabel,describe,advice,hoursFor,iconAt,skyPhase,skyFor} from './weather-data.js';
import {japanDate,japanClock} from './timing.js';
// One day, opened up: the hour-by-hour graph, what it means, and the same numbers as a table.
export function DayWeather({state,day,nowHour}){
 const [picked,setPicked]=useState(null);
 const entry=forecastFor(state,day),hours=hoursFor(state,day);
 if(!entry&&!hours)return <p><small>No forecast saved for this day yet.</small></p>;
 return <div className="day-weather">
  {entry&&<div className="weather-today">
   <span className="weather-icon" aria-hidden="true">{nowHour===null||nowHour===undefined?describe(entry.code)[1]:iconAt(entry.code,skyPhase(skyFor(state,day),nowHour*60+30))}</span>
   <div><strong>{entry.max}° / {entry.min}°</strong>
    <small>{describe(entry.code)[0]} · {entry.city}{entry.rain!==null?` · ${entry.rain}% rain at its worst`:''}</small></div>
  </div>}
  <SunTimes entry={entry}/>
  <DayShape hours={hours}/>
  {hours
   ?<><HourlyChart hours={hours} nowHour={nowHour} picked={picked} onPick={setPicked}/><HourlyTable hours={hours}/></>
   :<p><small>Only the day’s high and low are saved for this one. Check the forecast again to fill in the hours.</small></p>}
  {advice(entry)&&<p className="weather-advice">{advice(entry)}</p>}
 </div>;
}
// The whole trip's weather in one screen, a day at a time. Tap a day to open it up.
export default function WeatherPage({state,day,now,check,checking,busy,online}){
 const today=japanDate(now),nowHour=Number(japanClock(now).slice(0,2));
 // Open the day you came in on. Failing that today, and failing that the first day we actually
 // have something for — an empty row opened by default looks like the whole thing is broken.
 const has=date=>!!(hoursFor(state,date)||forecastFor(state,date));
 const [open,setOpen]=useState(()=>
  [day,today,...state.days.map(d=>d.date)].find(date=>date&&state.days.some(d=>d.date===date)&&has(date))
  ||(state.days.some(d=>d.date===day)?day:state.days[0]?.date));
 const age=forecastAge(state);
 return <><p className="eyebrow">WHAT THE SKY IS DOING</p><h1>Weather</h1>
 <p>Every day of the trip, and every hour of each day. It is kept in the trip, so one person checking it puts it on everybody’s phone and it is still here with no signal.</p>
 <div className="row wrap">
  <button className="primary" disabled={busy||checking||!online} onClick={check}>
   <RefreshCw size={16}/>{checking?'Checking…':online?'Check the forecast':'Offline — showing what we have'}</button>
 </div>
 <p><small>{ageLabel(age)}{state.weather?.by?` · by ${state.weather.by}`:''}. A forecast more than a few days out is a guess, and the hours further out are a guess about a guess.</small></p>
 <div className="weather-list">{state.days.map(d=>{
   const entry=forecastFor(state,d.date),hours=hoursFor(state,d.date),isOpen=open===d.date;
   return <section className={`weather-row ${isOpen?'open':''}`} key={d.date}>
    <button className="weather-row-head" aria-expanded={isOpen} onClick={()=>setOpen(isOpen?null:d.date)}>
     <span className="weather-row-day"><strong>{dayLabel(d.date)}</strong><small>{d.city}{d.date===today?' · today':''}</small></span>
     <span className="weather-row-icon" aria-hidden="true">{entry?describe(entry.code)[1]:'·'}</span>
     <span className="weather-row-temp">{entry?<><strong>{entry.max}°</strong><small>{entry.min}°</small></>:<small>—</small>}</span>
     {entry?.rain!==null&&entry?.rain!==undefined&&entry.rain>0&&<span className="weather-row-rain">{entry.rain}%</span>}
     {isOpen?<ChevronDown size={18}/>:<ChevronRight size={18}/>}
    </button>
    {isOpen&&<div className="weather-row-body">
     <DayWeather state={state} day={d.date} nowHour={d.date===today?nowHour:null}/>
     {!hours&&!entry&&<p><small>Nothing saved for this day.</small></p>}
    </div>}
   </section>;})}
 </div>
 <p className="callout"><CloudSun size={18}/>From <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">Open-Meteo</a>, which is free and needs no account. Asked once per place the trip visits, not once per day.</p>
 </>;
}
