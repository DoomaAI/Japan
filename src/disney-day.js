// 30 September at Tokyo Disneyland, as the family's own plan for the day has it ("Our plan –
// Wed 30 Sept"): Happy Entry at 8:45, the Pooh DPA bought at the gate, Peter Pan and small world
// on standby while the queues are short, then the package rides, the other three DPAs, lunch
// and dinner booked, both parades and Night High Halloween. It replaces the guide's version,
// which left the afternoon as a choice between Big Thunder and Splash first; now both are in.
//
// The four DPAs bought today: Pooh's Hunny Hunt and Big Thunder Mountain ¥1,500, Monsters, Inc.
// and Haunted Mansion Holiday Nightmare ¥1,000. Beauty and the Beast, Baymax, Splash Mountain and
// one more attraction of our choosing are already in the Vacation Package, so no DPA for those.
//
// Applied once to the live trip. Each stop keeps its id, so its progress, reviews, photos and
// tickets stay with it. A stop the family has already renamed is left as they have it. The
// "Splash first" alternative goes to Recently deleted, ready to put back.
export const DISNEY_SEED=1;
const DAY='2026-09-30',PARK='Tokyo Disneyland',EVERYONE=['Damien','Lauren','Nate','Boston'];
const DPA=(price)=>`DPA (¥${price}), bought in the Tokyo Disney Resort app.`;
const VP='Vacation Package ticket, already included. No DPA needed.';
const STANDBY='Standby: queue as normal.';
// `was` is the guide's title for the stop, so a stop still carrying it is known to be untouched.
export const DISNEY_PLAN=[
 {id:'2026-09-30-03',was:'Security and Happy Entry queue',title:'Arrive and join Happy Entry queue',time:'08:05',duration:40,order:20,
  notes:'Main entrance, Special Entrance line. Check today\'s entry time in the Disney app.'},
 {id:'2026-09-30-03-2',title:'Happy Entry: into the park',time:'08:45',duration:5,order:23,notes:''},
 {id:'2026-09-30-04',was:'At entry: check passes and DPA',title:'Buy DPA for Pooh\'s Hunny Hunt',time:'08:45',duration:10,order:30,
  notes:'In the app as soon as we are in. Aim for an early return time, about 9:45. ¥1,500.\nToday\'s DPAs: Pooh\'s Hunny Hunt ¥1,500, Big Thunder Mountain ¥1,500, Monsters, Inc. ¥1,000, Haunted Mansion Holiday Nightmare ¥1,000.\nNot for the package rides: Beauty and the Beast, Baymax, Splash Mountain.'},
 {id:'2026-09-30-06',was:'Peter Pan\'s Flight',title:'Peter Pan\'s Flight',time:'09:00',duration:20,order:40,notes:`${STANDBY} Early morning, while the queue is short.`},
 {id:'2026-09-30-07',was:'It\'s a small world',title:'It\'s a small world',time:'09:20',duration:25,order:50,notes:`${STANDBY} Nate's pick: again later if he loves it.`},
 {id:'2026-09-30-05',was:'Pooh\'s Hunny Hunt',title:'Pooh\'s Hunny Hunt',time:'09:45',duration:30,order:60,notes:'DPA (¥1,500): the return time bought at 8:45.'},
 {id:'2026-09-30-08',was:'Beauty and the Beast — package window',title:'Enchanted Tale of Beauty and the Beast',time:'10:00',duration:60,order:70,kind:'fixed',locked:true,bookingTime:'10:00',
  notes:`${VP} Window 10:00–11:00.`},
 {id:'2026-09-30-09',was:'Baymax — special attraction ticket',title:'Baymax (The Happy Ride)',time:'11:00',duration:20,order:80,notes:`${VP} About 11:00.`},
 {id:'2026-09-30-10',was:'Coffeehouse rest / lunch',title:'Lunch — Center Street Coffeehouse',time:'11:20',duration:60,order:90,kind:'fixed',locked:true,bookingTime:'11:20',
  place:'Center Street Coffeehouse Tokyo Disneyland',notes:'Advance booking. Lauren\'s pick.'},
 {id:'2026-09-30-11',was:'Monsters, Inc. if queue is short',title:'Monsters, Inc. Ride & Go Seek!',time:'12:00',duration:45,order:100,kind:'flexible',notes:DPA('1,000')},
 {id:'2026-09-30-12',was:'Big Thunder Mountain — DPA target',title:'Big Thunder Mountain',time:'13:00',duration:60,order:110,kind:'flexible',notes:`${DPA('1,500')} Boston's pick.`},
 {id:'2026-09-30-13',was:'Splash Mountain — untimed package',title:'Splash Mountain',time:'14:00',duration:30,order:120,notes:`${VP} Any time; about 2:00 planned. You will get wet.`},
 {id:'2026-09-30-15',was:'Haunted Mansion if time',title:'Haunted Mansion Holiday Nightmare',time:'14:30',duration:60,order:140,kind:'flexible',notes:DPA('1,000')},
 {id:'2026-09-30-15-2',title:'Use the last Vacation Package ticket',time:'15:30',duration:30,order:143,notes:'One more package ticket, on any eligible attraction.'},
 {id:'2026-09-30-15-3',title:'Dinner — Blue Bayou Restaurant',time:'16:10',duration:60,order:146,kind:'fixed',locked:true,bookingTime:'16:10',
  place:'Blue Bayou Restaurant Tokyo Disneyland',notes:'Advance booking. Lauren\'s pick. Inside Pirates of the Caribbean, Adventureland.'},
 {id:'2026-09-30-16',was:'Halloween parade — check schedule',title:'Villains\' Halloween parade',time:'16:20',duration:40,order:150,
  notes:'Stand along the route; no ticket needed. Confirm the time in the app. Boston\'s pick.'},
 {id:'2026-09-30-16-2',title:'Pirates of the Caribbean',time:'17:00',duration:30,order:153,notes:`${STANDBY} Evening.`},
 {id:'2026-09-30-16-3',title:'Jungle Cruise',time:'17:30',duration:30,order:156,notes:`${STANDBY} Evening.`},
 {id:'2026-09-30-16-4',title:'Western River Railroad',time:'18:00',duration:30,order:159,
  notes:`${STANDBY} If time allows, also Buzz Lightyear, or a favourite again.`},
 {id:'2026-09-30-17',was:'Electrical Parade — check schedule',title:'Electrical Parade Dreamlights',time:'19:20',duration:40,order:160,
  notes:'Stand along the route; no ticket needed. Confirm the time in the app.'},
 {id:'2026-09-30-18',was:'Night High Halloween — check schedule',title:'Night High Halloween',time:'20:50',duration:20,order:170,kind:'flexible',
  notes:'Castle projection show; no ticket needed. Castle, Halloween decor and evening lights for photos.'},
];
// The guide's alternative afternoon, no longer needed now that both rides are in the plan.
export const DISNEY_DROPPED={'2026-09-30-14':'Splash Mountain first'};
const GROUP='disney-afternoon',AT='2026-09-29T21:00:00.000Z';
const fresh=({was,...p})=>({day:DAY,place:PARK,japanese:'',kind:'flexible',locked:false,page:49,group:'',option:'',status:'todo',participants:EVERYONE,bookingTime:null,review:false,...p,originalTime:p.time});
export function disneySeeded(state){
 if((state.disneySeed||0)>=DISNEY_SEED)return state;
 const plan=Object.fromEntries(DISNEY_PLAN.map(p=>[p.id,p])),have=new Set((state.steps||[]).map(s=>s.id)),binned=[];
 const steps=(state.steps||[]).flatMap(s=>{
  if(DISNEY_DROPPED[s.id]===s.title){binned.push(s);return [];}
  const p=plan[s.id];
  if(!p?.was||s.title!==p.was)return [s];
  const {id,day,status,participants,page,japanese,review,...rest}=fresh(p);
  return [{...s,...rest,group:'',option:''}];
 });
 for(const p of DISNEY_PLAN)if(!p.was&&!have.has(p.id))steps.push(fresh(p));
 const choices={...(state.choices||{})};
 if(!steps.some(s=>s.group===GROUP))delete choices[GROUP];
 const bin=[...binned.map(item=>({id:`plan-${item.id}`,op:'remove',kind:'step',title:item.title,item,at:AT,by:'Plan update'})),...(state.bin||[])];
 return {...state,steps,choices,bin,disneySeed:DISNEY_SEED};
}
