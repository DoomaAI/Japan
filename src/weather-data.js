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
  daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
  start_date:start,end_date:end});
 return `https://api.open-meteo.com/v1/forecast?${q}`;
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
  out[date]={city,code,max:Math.round(max),min:Math.round(min),rain:Number.isFinite(rain)?Math.round(rain):null};
 });
 return out;
}
export const forecastFor=(state,day)=>state.weather?.days?.[day]||null;
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
