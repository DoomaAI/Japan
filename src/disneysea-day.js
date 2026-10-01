// 1 October at Tokyo DisneySea, as the family's own plan for the day has it ("Our plan – Thur
// 1 Oct"): Happy Entry at 8:45 used on Journey to the Center of the Earth, the Soaring DPA
// bought at the gate for mid-afternoon, the three Vacation Package rides in Fantasy Springs,
// lunch there, then standby through Sindbad, Raging Spirits and 20,000 Leagues, Soaring and
// Toy Story Mania on DPA, Nemo and Mermaid Lagoon to finish, and out by about 5:45.
//
// Journey moves from an afternoon DPA target to the opening standby ride. Little Green
// Dumplings is folded into the day's snacks and goes to Recently deleted, ready to put back.
// Tower of Terror and Indiana Jones are both closed today, so neither is in the plan.
//
// Applied once to the live trip. Each stop keeps its id, so its progress, reviews, photos and
// tickets stay with it. A stop the family has already renamed is left as they have it.
export const DISNEYSEA_SEED=1;
const DAY='2026-10-01',PARK='Tokyo DisneySea',EVERYONE=['Damien','Lauren','Nate','Boston'];
const VP='Vacation Package ticket, already included. No DPA needed.';
const STANDBY='Standby: queue as normal.';
const TALL=cm=>`${cm}cm minimum: check Nate is tall enough before queueing.`;
// `was` is the guide's title for the stop, so a stop still carrying it is known to be untouched.
export const DISNEYSEA_PLAN=[
 {id:'2026-10-01-01',was:'Check out and arrange small bag',title:'Check out / send small suitcase to Hilton Tokyo',time:'07:30',duration:30,order:0,
  notes:'Hotel luggage delivery to Hilton Tokyo. Keep essentials with you.'},
 {id:'2026-10-01-02',was:'Happy Entry queue',title:'Join Happy Entry queue',time:'08:00',duration:45,order:10,
  notes:'Fantasy Springs Entrance. Check today\'s entry time in the Disney app.'},
 {id:'2026-10-01-02-2',title:'Happy Entry: into the park',time:'08:45',duration:5,order:13,notes:''},
 {id:'2026-10-01-03',was:'Enter and check DPA availability',title:'Buy DPA for Soaring: Fantastic Flight',time:'08:45',duration:10,order:16,
  notes:'In the app as soon as we are in. Aim for a mid-afternoon return, about 3:30–4:00.\nToy Story Mania! later on DPA if the timing suits; Raging Spirits only if standby is long.\nNot for the package rides: Peter Pan, Frozen, Rapunzel.'},
 {id:'2026-10-01-11',was:'Journey to the Center of the Earth',title:'Journey to the Center of the Earth',time:'09:00',duration:30,order:20,
  notes:`${STANDBY} Our opening ride, while Happy Entry keeps the queue short. Boston's pick. ${TALL(117)}`},
 {id:'2026-10-01-04',was:'Peter Pan\'s Never Land Adventure',title:'Peter Pan\'s Never Land Adventure',time:'09:30',duration:30,kind:'fixed',locked:true,bookingTime:'09:30',order:30,
  notes:`${VP} Nate's pick. ${TALL(102)}`},
 {id:'2026-10-01-05',was:'Anna and Elsa\'s Frozen Journey',title:'Anna and Elsa\'s Frozen Journey',time:'10:30',duration:30,kind:'fixed',locked:true,bookingTime:'10:30',order:40,notes:`${VP} Nate's pick.`},
 {id:'2026-10-01-06',was:'Rapunzel\'s Lantern Festival',title:'Rapunzel\'s Lantern Festival',time:'11:30',duration:30,kind:'fixed',locked:true,bookingTime:'11:30',order:50,notes:VP},
 {id:'2026-10-01-06-2',title:'Fairy Tinker Bell\'s Busy Buggies',time:'12:00',duration:30,order:55,kind:'optional',
  notes:`${STANDBY} If the wait is reasonable. Nate's pick.`},
 {id:'2026-10-01-07',was:'Lunch in Fantasy Springs',title:'Lunch / snacks in Fantasy Springs',time:'12:30',duration:45,order:60,
  notes:'Keep it flexible and let the standby waits guide the afternoon. Snacks through the day, such as Little Green Dumplings by Toy Story Mania!'},
 {id:'2026-10-01-09',was:'Arabian Coast',title:'Sindbad\'s Storybook Voyage',time:'13:15',duration:30,order:80,notes:`${STANDBY} Relaxed family ride, Arabian Coast.`},
 {id:'2026-10-01-09-2',title:'Raging Spirits',time:'14:00',duration:30,order:85,
  notes:`${STANDBY} Looping coaster, Lost River Delta. Boston's pick. ${TALL(117)} Buy a DPA only if standby is long.`},
 {id:'2026-10-01-09-3',title:'20,000 Leagues Under the Sea',time:'14:45',duration:30,order:90,notes:`${STANDBY} Atmospheric classic, Mysterious Island.`},
 {id:'2026-10-01-12',was:'Soaring: Fantastic Flight',title:'Soaring: Fantastic Flight',time:'15:30',duration:30,order:110,kind:'flexible',
  notes:`DPA bought at 8:45: use the return time in the app (aimed for 3:30–4:00). ${TALL(102)}`},
 {id:'2026-10-01-13',was:'Toy Story Mania! if available',title:'Toy Story Mania! (if available)',time:'16:30',duration:30,order:120,kind:'optional',
  notes:'DPA if one is available at a time that suits; otherwise standby or skip.'},
 {id:'2026-10-01-10',was:'Mermaid Lagoon',title:'Nemo & Friends SeaRider / Mermaid Lagoon / extras',time:'17:15',duration:30,order:125,
  notes:`${STANDBY} Nemo needs 90cm. Mermaid Lagoon is mostly indoors and has no height limits. Nate's pick.`},
 // The two travel stops keep their notes and route; only the leaving time moves.
 {id:'2026-10-01-14',move:true,title:'Begin exit and journey to Hilton',time:'17:45',order:130},
 {id:'2026-10-01-15',move:true,title:'Hilton check-in, dinner and rest',time:'19:00',order:140},
];
export const DISNEYSEA_DROPPED={'2026-10-01-08':'Little Green Dumplings'};
const AT='2026-09-30T21:00:00.000Z';
const fresh=({was,...p})=>({day:DAY,place:PARK,japanese:'',kind:'flexible',locked:false,page:52,group:'',option:'',status:'todo',participants:EVERYONE,bookingTime:null,review:false,...p,originalTime:p.time});
export function disneySeaSeeded(state){
 if((state.disneySeaSeed||0)>=DISNEYSEA_SEED)return state;
 const plan=Object.fromEntries(DISNEYSEA_PLAN.map(p=>[p.id,p])),have=new Set((state.steps||[]).map(s=>s.id)),binned=[];
 const steps=(state.steps||[]).flatMap(s=>{
  if(DISNEYSEA_DROPPED[s.id]===s.title&&s.status==='todo'){binned.push(s);return [];}
  const p=plan[s.id];
  if(!p||s.day!==DAY)return [s];
  if(p.move){if(s.title!==p.title||s.status!=='todo')return [s];const next={...s,time:p.time,order:p.order};if(s.originalTime===s.time)next.originalTime=p.time;return [next];}
  if(s.title!==p.was)return [s];
  const {id,day,status,participants,page,japanese,review,place,...rest}=fresh(p);
  return [{...s,...rest,group:'',option:''}];
 });
 for(const p of DISNEYSEA_PLAN)if(!p.was&&!p.move&&!have.has(p.id))steps.push(fresh(p));
 const bin=[...binned.map(item=>({id:`plan-${item.id}`,op:'remove',kind:'step',title:item.title,item,at:AT,by:'Plan update'})),...(state.bin||[])];
 return {...state,steps,bin,disneySeaSeed:DISNEYSEA_SEED};
}
