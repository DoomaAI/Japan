import {activeSteps,minutes} from './timing.js';
import {resolveLocation} from './locations.js';
import {stepPin} from './trip-features.js';
// Where each day of the trip actually is, for a forecast. The Disney days are Urayasu, which
// is its own spot on the bay and can be several degrees off central Tokyo on a windy day.
export const CITY_POINTS={
 'Tokyo':{name:'Tokyo',lat:35.6762,lon:139.6503},
 'Kyoto':{name:'Kyoto',lat:35.0116,lon:135.7681},
 'Osaka':{name:'Osaka',lat:34.6937,lon:135.5023},
 'Nara / Kyoto':{name:'Nara',lat:34.6851,lon:135.8048},
 'Disney Resort':{name:'Tokyo Disney Resort',lat:35.6329,lon:139.8804},
 'Disneyland':{name:'Tokyo Disneyland',lat:35.6329,lon:139.8804},
 'DisneySea / Tokyo':{name:'Tokyo DisneySea',lat:35.6267,lon:139.8850}
};
export const pointFor=city=>CITY_POINTS[city]||CITY_POINTS.Tokyo;
// The neighbourhoods the stops are actually in. A city's forecast is a fair guess for a day, but
// Arashiyama sits against the hills west of Kyoto and Kamakura is an hour away on the coast, so a
// stop is forecast for its own patch of the map. Checked in order against the stop's district,
// then its place, then its name; the first match wins, so the narrower names come first.
export const AREA_POINTS=[
 [/haneda/i,{name:'Haneda',lat:35.5494,lon:139.7798}],
 [/disney|maihama|urayasu/i,{name:'Tokyo Disney Resort',lat:35.6329,lon:139.8804}],
 [/kamakura/i,{name:'Kamakura',lat:35.3192,lon:139.5467}],
 [/ginza|yurakucho/i,{name:'Ginza',lat:35.6717,lon:139.765}],
 [/tsukiji/i,{name:'Tsukiji',lat:35.6655,lon:139.7707}],
 [/marunouchi|tokyo station/i,{name:'Tokyo Station',lat:35.6812,lon:139.7671}],
 [/imperial palace|kitanomaru/i,{name:'Imperial Palace',lat:35.6852,lon:139.7528}],
 [/akasaka|toranomon|azabudai/i,{name:'Toranomon',lat:35.6668,lon:139.7497}],
 [/roppongi/i,{name:'Roppongi',lat:35.6628,lon:139.7314}],
 [/harajuku|omotesando|takeshita|cat street|meiji/i,{name:'Harajuku',lat:35.6702,lon:139.7027}],
 [/daikanyama/i,{name:'Daikanyama',lat:35.6486,lon:139.7031}],
 [/ebisu/i,{name:'Ebisu',lat:35.6467,lon:139.7101}],
 [/shibuya|kamiyamacho|miyashita/i,{name:'Shibuya',lat:35.6595,lon:139.7005}],
 [/shinjuku/i,{name:'Shinjuku',lat:35.6938,lon:139.7034}],
 [/shimokitazawa/i,{name:'Shimokitazawa',lat:35.6617,lon:139.668}],
 [/futako|tamagawa/i,{name:'Futako-Tamagawa',lat:35.6114,lon:139.6268}],
 [/setagaya/i,{name:'Setagaya',lat:35.6466,lon:139.6533}],
 [/tokyo dome|korakuen|iidabashi/i,{name:'Tokyo Dome',lat:35.7056,lon:139.7519}],
 [/ueno/i,{name:'Ueno',lat:35.7138,lon:139.7773}],
 [/asakusa/i,{name:'Asakusa',lat:35.7148,lon:139.7967}],
 [/skytree|oshiage/i,{name:'Tokyo Skytree',lat:35.7101,lon:139.8107}],
 [/ryogoku|kokugikan/i,{name:'Ryogoku',lat:35.6962,lon:139.793}],
 [/odaiba|aomi|teamlab/i,{name:'Odaiba',lat:35.627,lon:139.7768}],
 [/arashiyama|sagano|saga/i,{name:'Arashiyama',lat:35.0094,lon:135.6668}],
 [/\buji\b/i,{name:'Uji',lat:34.8843,lon:135.8}],
 [/fushimi|inari/i,{name:'Fushimi Inari',lat:34.9671,lon:135.7727}],
 [/kiyomizu|ninenzaka|sannenzaka/i,{name:'Kiyomizu',lat:34.9949,lon:135.785}],
 [/gion|higashiyama|shirakawa|pontocho/i,{name:'Gion',lat:35.0037,lon:135.7788}],
 [/okazaki|heian/i,{name:'Okazaki',lat:35.0126,lon:135.7824}],
 [/kyoto station|shimogyo/i,{name:'Kyoto Station',lat:34.9858,lon:135.7588}],
 [/nakagyo|shijo|kawaramachi|karasuma|nishiki/i,{name:'Central Kyoto',lat:35.0086,lon:135.765}],
 [/universal|usj/i,{name:'Universal City',lat:34.6654,lon:135.4323}],
 [/umeda|osaka station|tenma|ogimachi/i,{name:'Umeda',lat:34.7025,lon:135.4959}],
 [/shinsaibashi|minamisenba/i,{name:'Shinsaibashi',lat:34.6748,lon:135.5012}],
 [/dotonbori|namba|nipponbashi|minatomachi/i,{name:'Namba',lat:34.6687,lon:135.5013}],
 [/uehonmachi/i,{name:'Uehonmachi',lat:34.6653,lon:135.5207}],
 [/nara park|todaiji|kasuga/i,{name:'Nara Park',lat:34.6851,lon:135.843}],
 [/\bnara\b/i,{name:'Nara',lat:34.6813,lon:135.828}]
];
// Where one stop is, for its forecast: the pin the family dropped standing there, then the
// neighbourhood it is in, then the city the day is in.
export function stepPoint(state,step){
 const pin=stepPin(step);
 if(pin)return {name:'where we pinned it',lat:Math.round(pin.lat*100)/100,lon:Math.round(pin.lng*100)/100};
 const location=resolveLocation(state,step);
 for(const text of [location?.district,step?.place,step?.title,location?.city]){
  const hit=text&&AREA_POINTS.find(([pattern])=>pattern.test(text));
  if(hit)return hit[1];
 }
 return pointFor(state.days?.find(d=>d.date===step?.day)?.city);
}
// The hour a stop happens in. A stop with no time of its own is placed where the plan puts it,
// after the timed stop before it and everything between, and said to be approximate.
export function stepHour(steps,step){
 const at=m=>({h:Math.min(23,Math.max(0,Math.round(m/60)))});
 if(step?.time)return {...at(minutes(step.time)),approx:false};
 const i=steps.findIndex(s=>s.id===step?.id);if(i<0)return null;
 for(let j=i-1,gap=0;j>=0;j--){
  gap+=Number(steps[j].duration)||0;
  if(steps[j].time)return {...at(minutes(steps[j].time)+gap),approx:true};
 }
 const next=steps.slice(i+1).find(s=>s.time);
 return next?{...at(minutes(next.time)),approx:true}:null;
}
// Every stop the forecast can say something about, grouped by the place it is forecast for, so
// one lookup per neighbourhood answers every stop in it.
export function stepTargets(state,fromDay){
 const byPlace=new Map();
 for(const d of state.days.filter(d=>!fromDay||d.date>=fromDay)){
  const list=activeSteps(state,d.date);
  for(const s of list){
   const at=stepHour(list,s);if(!at)continue;
   const point=stepPoint(state,s),key=`${point.lat},${point.lon}`;
   const got=byPlace.get(key)||{point,items:[]};got.items.push({id:s.id,date:d.date,h:at.h});byPlace.set(key,got);
  }
 }
 return [...byPlace.values()];
}
// Sunrise and sunset, which decide whether a stop is in the light, as the clock time Open-Meteo
// gives for the place in Japan time.
export const sunClock=stamp=>{const at=/T(\d{2}:\d{2})/.exec(String(stamp||''));return at?at[1]:null;};
export function isDark(entry,h){
 if(!entry?.sunrise||!entry?.sunset)return false;
 return h*60+30<minutes(entry.sunrise)||h*60+30>minutes(entry.sunset);
}
// Sunrise or sunset worked out from the date and the place, as a clock time in Japan, for when
// the saved forecast does not carry them — one checked before they were asked for, or a day with
// only its hours saved. Good to a minute or two, which is all a moon or a sun needs.
export function sunAt(date,{lat,lon},rising){
 const [y,m,d]=String(date).split('-').map(Number);if(!y||!m||!d)return null;
 const rad=Math.PI/180,n=Math.round((Date.UTC(y,m-1,d)-Date.UTC(y,0,0))/86400000),lng=lon/15;
 const t=n+((rising?6:18)-lng)/24,M=0.9856*t-3.289;
 const L=((M+1.916*Math.sin(M*rad)+0.02*Math.sin(2*M*rad)+282.634)%360+360)%360;
 let ra=((Math.atan(0.91764*Math.tan(L*rad))/rad)%360+360)%360;
 ra=(ra+Math.floor(L/90)*90-Math.floor(ra/90)*90)/15;
 const sinDec=0.39782*Math.sin(L*rad),cosDec=Math.cos(Math.asin(sinDec));
 const cosH=(Math.cos(90.833*rad)-sinDec*Math.sin(lat*rad))/(cosDec*Math.cos(lat*rad));
 if(cosH>1||cosH<-1)return null;
 const H=(rising?360-Math.acos(cosH)/rad:Math.acos(cosH)/rad)/15;
 const at=Math.round(((H+ra-0.06571*t-6.622-lng+9)%24+24)%24*60);
 return `${String(Math.floor(at/60)%24).padStart(2,'0')}:${String(at%60).padStart(2,'0')}`;
}
// The day's forecast with its sunrise and sunset always filled in, from the forecast when it has
// them and worked out for the day's city when it does not.
export function skyFor(state,day){
 const entry=forecastFor(state,day);
 if(entry?.sunrise&&entry?.sunset)return entry;
 const where=pointFor(entry?.city||state.days?.find(d=>d.date===day)?.city);
 return {...entry,sunrise:entry?.sunrise||sunAt(day,where,true),sunset:entry?.sunset||sunAt(day,where,false)};
}
// Where the sun is at a given minute of the day: coming up, going down, down, or up. The hour
// either side of sunrise and sunset counts as the sunrise and the sunset.
export function skyPhase(entry,at){
 if(!entry?.sunrise||!entry?.sunset||!Number.isFinite(at))return 'day';
 const rise=minutes(entry.sunrise),set=minutes(entry.sunset);
 if(Math.abs(at-rise)<=45)return 'sunrise';
 if(Math.abs(at-set)<=45)return 'sunset';
 return at<rise||at>set?'night':'day';
}
// A clear sky looks different at different times of day: a sunrise, a sunset, or a crescent moon
// and stars after dark, rather than a midday sun at every hour. Cloud and rain look the same
// whenever they come. Passing true or false still means night or day.
export function iconAt(code,phase){
 if(phase===true)phase='night';
 if(phase==='night')return [0,1].includes(code)?'🌙✨':code===2?'☁️':describe(code)[1];
 if(phase==='sunrise'&&[0,1,2].includes(code))return '🌅';
 if(phase==='sunset'&&[0,1,2].includes(code))return '🌇';
 return describe(code)[1];
}
// The WMO codes Open-Meteo returns, in words a family would use and an emoji a five-year-old
// can read before he can read the words.
export const WMO={
 0:['Clear','☀️'],1:['Mostly clear','🌤️'],2:['Some cloud','⛅'],3:['Cloudy','☁️'],
 45:['Fog','🌫️'],48:['Freezing fog','🌫️'],
 51:['Light drizzle','🌦️'],53:['Drizzle','🌦️'],55:['Heavy drizzle','🌧️'],
 56:['Freezing drizzle','🌧️'],57:['Freezing drizzle','🌧️'],
 61:['Light rain','🌦️'],63:['Rain','🌧️'],65:['Heavy rain','🌧️'],
 66:['Freezing rain','🌧️'],67:['Freezing rain','🌧️'],
 71:['Light snow','🌨️'],73:['Snow','🌨️'],75:['Heavy snow','❄️'],77:['Snow grains','🌨️'],
 80:['Showers','🌦️'],81:['Showers','🌧️'],82:['Heavy showers','⛈️'],
 85:['Snow showers','🌨️'],86:['Snow showers','🌨️'],
 95:['Thunderstorm','⛈️'],96:['Thunderstorm with hail','⛈️'],99:['Thunderstorm with hail','⛈️']
};
export const describe=code=>WMO[code]||['Unknown','🌡️'];
// Free, no key, no account. Asked for one place at a time because the trip moves about.
export function forecastUrl({lat,lon},start,end){
 const q=new URLSearchParams({latitude:lat,longitude:lon,timezone:'Asia/Tokyo',
  daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
  hourly:'temperature_2m,apparent_temperature,precipitation_probability,weather_code',
  start_date:start,end_date:end});
 return `https://api.open-meteo.com/v1/forecast?${q}`;
}
// The same hours for several neighbourhoods in one request: Open-Meteo takes a list of places
// and answers with a list, in the same order.
export const AREAS_PER_REQUEST=20;
export function areaForecastUrl(points,start,end){
 const q=new URLSearchParams({latitude:points.map(p=>p.lat).join(','),longitude:points.map(p=>p.lon).join(','),
  timezone:'Asia/Tokyo',hourly:'temperature_2m,apparent_temperature,precipitation_probability,weather_code',
  start_date:start,end_date:end});
 return `https://api.open-meteo.com/v1/forecast?${q}`;
}
// One stop's forecast out of the hours for its place: the hour it happens in, and where.
export function stepReadings(targets,hoursByPlace){
 const out={};
 targets.forEach(({point,items},i)=>{
  for(const item of items){
   const hour=hoursByPlace[i]?.[item.date]?.find(x=>x.h===item.h);
   if(hour)out[item.id]={...hour,area:point.name};
  }
 });
 return out;
}
// The same answer, by the hour. This is what makes the difference between "22 degrees" and
// "cold until ten, then fine until the rain at four", which is the thing that changes a day.
export const HOURS_PER_DAY=24;
export function parseHourly(json){
 const h=json?.hourly;
 if(!h||!Array.isArray(h.time))return {};
 const out={};
 h.time.forEach((stamp,i)=>{
  const at=/^(\d{4}-\d{2}-\d{2})T(\d{2}):\d{2}/.exec(stamp);if(!at)return;
  const temp=h.temperature_2m?.[i],feels=h.apparent_temperature?.[i];
  const rain=h.precipitation_probability?.[i],code=h.weather_code?.[i];
  if(!Number.isFinite(temp)||temp<-60||temp>60)return;
  const entry={h:Number(at[2]),temp:Math.round(temp),
   feels:Number.isFinite(feels)&&feels>=-70&&feels<=70?Math.round(feels):null,
   rain:Number.isFinite(rain)&&rain>=0&&rain<=100?Math.round(rain):null,
   code:Number.isInteger(code)?code:null};
  (out[at[1]]??=[]).push(entry);
 });
 for(const date of Object.keys(out))out[date]=out[date].sort((a,b)=>a.h-b.h).slice(0,HOURS_PER_DAY);
 return out;
}
export const hoursFor=(state,day)=>state.weather?.hours?.[day]||null;
// From this hour to the end of the day, which is the only part of it anyone can still act on.
export function hoursAhead(state,day,fromHour=0){
 const hours=hoursFor(state,day);
 return hours?hours.filter(x=>x.h>=fromHour):null;
}
export const hourLabel=h=>`${String(h).padStart(2,'0')}:00`;
// The shape of the day in one line, for the card that has not been opened yet.
export function daySummary(hours){
 if(!hours?.length)return null;
 const temps=hours.map(x=>x.temp),rains=hours.map(x=>x.rain).filter(n=>Number.isFinite(n));
 const wettest=hours.filter(x=>Number.isFinite(x.rain)).sort((a,b)=>b.rain-a.rain)[0]||null;
 return {max:Math.max(...temps),min:Math.min(...temps),
  peakRain:rains.length?Math.max(...rains):null,
  wettestHour:wettest&&wettest.rain>=40?wettest.h:null,
  warmest:hours.reduce((a,b)=>b.temp>a.temp?b:a).h,coldest:hours.reduce((a,b)=>b.temp<a.temp?b:a).h};
}
// Open-Meteo answers in parallel arrays. Turn that into one entry per day, and drop anything
// that is not a complete, believable reading rather than showing a blank or a nonsense.
export function parseForecast(json,city){
 const d=json?.daily;
 if(!d||!Array.isArray(d.time))return {};
 const out={};
 d.time.forEach((date,i)=>{
  const code=d.weather_code?.[i],max=d.temperature_2m_max?.[i],min=d.temperature_2m_min?.[i];
  const rain=d.precipitation_probability_max?.[i];
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
  if(!Number.isFinite(code)||!Number.isFinite(max)||!Number.isFinite(min))return;
  if(max<-50||max>60||min<-60||min>50||min>max)return;
  out[date]={city,code,max:Math.round(max),min:Math.round(min),rain:Number.isFinite(rain)?Math.round(rain):null,
   sunrise:sunClock(d.sunrise?.[i]),sunset:sunClock(d.sunset?.[i])};
 });
 return out;
}
export const forecastFor=(state,day)=>state.weather?.days?.[day]||null;
// The weather for one stop, at its hour and in its neighbourhood. The reading saved for the stop
// is used only while it still describes it — same hour, same place — because a stop moved to the
// afternoon or to another district after the check is not what was forecast. Failing that, the
// city's hour stands in, and says it is the city's.
export function stepWeather(state,step,steps){
 const at=stepHour(steps||activeSteps(state,step.day),step);if(!at)return null;
 const day=forecastFor(state,step.day),sky=skyFor(state,step.day),dark=isDark(sky,at.h),phase=skyPhase(sky,at.h*60+30);
 const saved=state.weather?.steps?.[step.id],place=stepPoint(state,step).name;
 if(saved&&saved.h===at.h&&saved.area===place)return {...saved,approx:at.approx,local:true,dark,phase};
 const hour=hoursFor(state,step.day)?.find(x=>x.h===at.h);
 return hour?{...hour,area:day?.city||pointFor(state.days?.find(d=>d.date===step.day)?.city).name,approx:at.approx,local:false,dark,phase}:null;
}
// A forecast more than a few days out is a guess, and a stale one is worse than none. This is
// what the screen uses to say how much to trust what it is showing.
export function forecastAge(state,now=new Date()){
 const at=state.weather?.at;if(!at)return null;
 const hours=(now.getTime()-new Date(at).getTime())/3600000;
 return Number.isFinite(hours)?hours:null;
}
export const ageLabel=hours=>hours===null?'never checked'
 :hours<1?'checked just now'
 :hours<24?`checked ${Math.round(hours)} hour${Math.round(hours)===1?'':'s'} ago`
 :`checked ${Math.round(hours/24)} day${Math.round(hours/24)===1?'':'s'} ago`;
// What to actually do about it, which is the only reason to look at a forecast on a trip.
export function advice(entry){
 if(!entry)return '';
 const [label]=describe(entry.code);
 if(/thunder/i.test(label))return 'Storms about. Have an indoor option ready.';
 if(/heavy rain|heavy showers/i.test(label))return 'Take the umbrellas — the good ones, not the hotel ones.';
 if(/rain|showers|drizzle/i.test(label))return 'Umbrellas. Convenience stores sell them for about ¥600 if we forget.';
 if(/snow/i.test(label))return 'Snow. Proper shoes for the boys.';
 if(entry.max>=30)return 'Hot. Water bottles, hats, and a plan for the middle of the day.';
 if(entry.max<=12)return 'Cold. Layers, and something warm for Nate.';
 if((entry.rain??0)>=40)return 'A good chance of rain. Pack an umbrella anyway.';
 return '';
}
// The morning nudge. A forecast is only useful if it changes what you put in the bag, so this
// answers one question — what do we need today — and says nothing when the answer is nothing.
// It is deliberately about the jumper and the umbrella rather than the meteorology.
export function morningNeeds(entry){
 if(!entry)return null;
 const [label]=describe(entry.code),needs=[];
 const wet=/rain|shower|drizzle|thunder/i.test(label)||(entry.rain??0)>=50;
 const cold=entry.min<=13||entry.max<=16;
 if(wet)needs.push({id:'umbrella',icon:'☂️',text:'Umbrellas today.'});
 if(cold)needs.push({id:'jumper',icon:'🧥',text:entry.min<=8?'Cold — coats, and something warm for Nate.':'Jumpers — it is cool, especially first thing and after dark.'});
 if(entry.max>=30)needs.push({id:'water',icon:'💧',text:'Hot — water bottles and hats, and take the middle of the day slowly.'});
 if(/snow/i.test(label))needs.push({id:'snow',icon:'❄️',text:'Snow. Proper shoes for the boys.'});
 if(!needs.length)return null;
 return {needs,summary:needs.map(n=>n.text).join(' '),icons:needs.map(n=>n.icon).join(' ')};
}
// Morning in Japan, which is when a reminder about a jumper is any use. After the middle of
// the day everyone already knows what the weather is doing.
export const isMorning=(clock,until=11)=>{
 // A missing clock is not midnight. Without a real time we say nothing rather than
 // deciding it is the morning.
 const match=/^(\d{2}):\d{2}/.exec(String(clock||''));
 return !!match&&Number(match[1])<until;
};
