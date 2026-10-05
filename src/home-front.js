// The house while we are away, and the first day back. A trip app stops at the arrivals hall;
// the list that actually decides how the first evening home goes is the one nobody writes
// down: who has the bins, whether there is milk, where the car park receipt went. Two short
// lists, each line one tap from the family to-do list, so the ticking happens where every
// other job is ticked and both parents see it.
//
// And the clocks. Daylight saving starts at home on the first Sunday of October, in the middle
// of this trip, so the gap between here and home changes while nobody is watching: the call
// to the grandparents, the flight's landing time, the first alarm back. Worked out from the
// zones rather than written in, so a trip in March or a family in Perth gets the right answer.
export const HOME_ZONE='Australia/Sydney',AWAY_ZONE='Asia/Tokyo';
// A zone's offset from UTC, in hours, at a given moment.
export function zoneOffset(at,zone){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(at).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
 return (Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute)-at.getTime())/3600000;
}
// The gap between home and away on a date: positive when home is ahead.
export const homeAhead=(date,home=HOME_ZONE,away=AWAY_ZONE)=>{const at=new Date(`${date}T03:00:00Z`);return zoneOffset(at,home)-zoneOffset(at,away);};
// The first day of the trip on which the gap is not what it was on day one, if there is one.
export function clockShift(days,home=HOME_ZONE,away=AWAY_ZONE){
 const dates=(days||[]).map(d=>d.date).filter(Boolean);
 if(!dates.length)return null;
 const before=homeAhead(dates[0],home,away);
 for(const date of dates.slice(1)){const after=homeAhead(date,home,away);if(after!==before)return {day:date,before,after,home,away};}
 return null;
}
const hours=n=>`${Math.abs(n)===1?'one hour':`${Math.abs(n)} hours`}`;
const dayName=date=>new Date(`${date}T12:00:00Z`).toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});
// What to say about it on a day: nothing before the change, a heads-up the day before, then
// the new gap for the rest of the trip.
export function clockNotice(state,day,home=HOME_ZONE,away=AWAY_ZONE){
 const shift=clockShift(state?.days,home,away);
 if(!shift||!day)return null;
 const gap=n=>n===0?'the same time as here':`${hours(n)} ${n>0?'ahead of':'behind'} here`;
 const prev=(state.days||[]).find((d,i,all)=>all[i+1]?.date===shift.day)?.date;
 if(day===prev)return {when:'tomorrow',text:`Clocks at home change tomorrow, ${dayName(shift.day)}: from then on home is ${gap(shift.after)}, not ${hours(shift.before)}.`};
 if(day>=shift.day)return {when:day===shift.day?'today':'since',text:`Clocks at home ${day===shift.day?'changed today':`changed on ${dayName(shift.day)}`}: home is now ${gap(shift.after)}, not ${hours(shift.before)}. Flight times on the ticket are already right; the call home and the first alarm back are not.`};
 return null;
}
// The house while we are away. Who is a name or a note; the lines are ours to change.
export const AWAY_LIST=[
 {id:'bins',title:'Bins out on bin night',note:'Which night, and who is putting them out and bringing them in.'},
 {id:'pets',title:'Who is feeding the animals',note:'How much, how often, and the vet’s number left with them.'},
 {id:'mail',title:'Mail and parcels',note:'A hold at the post office, or a neighbour collecting from the box so it does not overflow.'},
 {id:'plants',title:'Plants and the garden',note:'Pots inside on a tray, or a neighbour with the hose once a week.'},
 {id:'fridge',title:'The fridge and the bin',note:'Nothing left to turn into a smell for two weeks; the kitchen bin emptied before the taxi.'},
 {id:'power',title:'Hot water, lights and the heater',note:'Hot water on vacation or off, one lamp on a timer, the heater and the iron definitely off.'},
 {id:'keys',title:'A key with somebody',note:'A neighbour or a friend who can get in, with the alarm code and our numbers.'},
 {id:'car',title:'The car',note:'Where it is (the airport car park receipt, or the driveway) and when the rego and insurance fall due.'}
];
// The first day home, before anyone has slept.
export const LANDING_LIST=[
 {id:'carpark',title:'Find the car park receipt',note:'It is in the app’s Bookings if a photo was taken; otherwise the glovebox or the bag it was paid from.'},
 {id:'milk',title:'Milk, bread and something for dinner',note:'On the way from the airport, or ordered for the morning before the flight.'},
 {id:'unpack',title:'Unpack what was declared first',note:'Anything Border Force looked at goes in the pantry or the freezer straight away, and the biosecurity bin is not the kitchen bin.'},
 {id:'wash',title:'The first wash on before bed',note:'Two weeks of clothes; the boys’ school things first.'},
 {id:'clocks',title:'Check the clocks and the alarms',note:'Phones change themselves; the oven, the car and the boys’ bedside clocks do not.'},
 {id:'school',title:'School and work on the first day back',note:'Uniforms, lunch boxes, the show-and-tell page from the app, and the bags packed the night before.'},
 {id:'jetlag',title:'Bedtimes back where they were',note:'Japan is only an hour or two off, so one normal day does it: daylight, an ordinary dinner time, and no naps after four.'},
 {id:'thanks',title:'Thank whoever minded the house',note:'A small thing from the Trip shop or the omiyage bag, handed over with the key.'}
];
// Whether a line is already on the family to-do list, by its title.
export const onTodoList=(state,item)=>(state?.todos||[]).find(t=>t.title===item.title)||null;
