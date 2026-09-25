// Ride checklists for the three park days.
//
// `height` is the minimum rider height in centimetres, or null where there is no limit.
// These are a planning aid gathered ahead of the trip, NOT a confirmed source: parks change
// requirements, and a ride can be closed or altered on the day. Every screen that shows a
// height says so and links to the official site. Confirm anything you are planning around,
// especially for Nate.
export const PARKS=[
 {id:'usj',day:'2026-09-25',name:'Universal Studios Japan',short:'Universal',
  site:'https://www.usj.co.jp/web/en/us',app:'https://www.usj.co.jp/web/en/us/service-guide/theme-park-services/official-app',
  mapNote:'The official app carries the live park map, wait times and Express Pass times.',
  rides:[
   {id:'usj-mariokart',name:'Mario Kart: Koopa’s Challenge',land:'Super Nintendo World',height:122,note:'Express Pass. Augmented-reality headset.'},
   {id:'usj-yoshi',name:'Yoshi’s Adventure',land:'Super Nintendo World',height:92,note:'Gentle, outdoors, good views. Under 122cm with an adult.'},
   {id:'usj-minecart',name:'Mine Cart Madness',land:'Donkey Kong Country',height:132,note:'Express Pass. The tallest limit in the land.'},
   {id:'usj-flyingdino',name:'The Flying Dinosaur',land:'Jurassic Park',height:132,note:'Face-down flying coaster. Maximum height 198cm.'},
   {id:'usj-jurassic',name:'Jurassic Park — The Ride',land:'Jurassic Park',height:107,note:'Big drop, you will get wet. Under 122cm with an adult.'},
   {id:'usj-hollywooddream',name:'Hollywood Dream — The Ride',land:'Hollywood',height:132,note:'Choose your own song. Backdrop runs backwards.'},
   {id:'usj-forbidden',name:'Harry Potter and the Forbidden Journey',land:'Wizarding World',height:122,note:'Motion simulator, swoops and spins.'},
   {id:'usj-hippogriff',name:'Flight of the Hippogriff',land:'Wizarding World',height:92,note:'Short family coaster. Under 122cm with an adult.'},
   {id:'usj-jaws',name:'JAWS',land:'Amity Village',height:null,note:'Boat ride, loud bangs and a shark. Better after dark.'},
   {id:'usj-minion',name:'Despicable Me Minion Mayhem',land:'Minion Park',height:102,note:'Motion simulator. Under 122cm with an adult.'},
   {id:'usj-minionblast',name:'Minion Blast',land:'Minion Park',height:null,note:'Walk-through shooting game. Check the pass time.'},
   {id:'usj-spiderman',name:'The Amazing Adventures of Spider-Man',land:'New York',height:102,note:'3D dark ride. Under 122cm with an adult.'},
   {id:'usj-hellokitty',name:'Hello Kitty’s Ribbon Collection',land:'Universal Wonderland',height:null,note:'Walk-through, very gentle.'},
   {id:'usj-snoopy',name:'Snoopy’s Great Race',land:'Universal Wonderland',height:92,note:'Small indoor coaster for little ones.'},
   {id:'usj-elmo',name:'Elmo’s Go-Go Skateboard',land:'Universal Wonderland',height:92,note:'Gentle spinning ride.'}]},
 {id:'tdl',day:'2026-09-30',name:'Tokyo Disneyland',short:'Disneyland',
  site:'https://www.tokyodisneyresort.jp/en/tdl/',app:'https://www.tokyodisneyresort.jp/en/tdr/app.html',
  mapNote:'The Tokyo Disney Resort app has the live map, wait times, DPA and Premier Access.',
  rides:[
   {id:'tdl-pooh',name:'Pooh’s Hunny Hunt',land:'Fantasyland',height:null,note:'Trackless honey pots. Usually the longest queue of the day.'},
   {id:'tdl-peterpan',name:'Peter Pan’s Flight',land:'Fantasyland',height:null,note:'Short, gentle, flying over London.'},
   {id:'tdl-smallworld',name:'It’s a small world',land:'Fantasyland',height:null,note:'Long, cool, sit-down boat ride. Good for a rest.'},
   {id:'tdl-beauty',name:'Enchanted Tale of Beauty and the Beast',land:'Fantasyland',height:null,note:'Package or Premier Access. Dancing teacups.'},
   {id:'tdl-baymax',name:'The Happy Ride with Baymax',land:'Tomorrowland',height:81,note:'Spinning, bouncy and very silly.'},
   {id:'tdl-monsters',name:'Monsters, Inc. Ride & Go Seek!',land:'Tomorrowland',height:null,note:'Torch-shooting dark ride.'},
   {id:'tdl-space',name:'Space Mountain',land:'Tomorrowland',height:102,note:'Indoor coaster in the dark.'},
   {id:'tdl-buzz',name:'Buzz Lightyear’s Astro Blasters',land:'Tomorrowland',height:null,note:'Shooting game, everyone can ride.'},
   {id:'tdl-bigthunder',name:'Big Thunder Mountain',land:'Westernland',height:102,note:'Runaway mine train. A DPA target.'},
   {id:'tdl-splash',name:'Splash Mountain',land:'Critter Country',height:90,note:'Big final drop. You will get wet.'},
   {id:'tdl-haunted',name:'Haunted Mansion',land:'Fantasyland',height:null,note:'Dark but not frightening. Halloween overlay likely.'},
   {id:'tdl-pirates',name:'Pirates of the Caribbean',land:'Adventureland',height:null,note:'Indoor boat ride, one small drop.'},
   {id:'tdl-jungle',name:'Jungle Cruise',land:'Adventureland',height:null,note:'Live skipper, jokes in Japanese.'},
   {id:'tdl-startours',name:'Star Tours: The Adventures Continue',land:'Tomorrowland',height:102,note:'3D motion simulator.'},
   {id:'tdl-railroad',name:'Western River Railroad',land:'Adventureland',height:null,note:'A sit-down loop of the park. Restful.'}]},
 {id:'tds',day:'2026-10-01',name:'Tokyo DisneySea',short:'DisneySea',
  site:'https://www.tokyodisneyresort.jp/en/tds/',app:'https://www.tokyodisneyresort.jp/en/tdr/app.html',
  mapNote:'Same Tokyo Disney Resort app. Fantasy Springs entry may need a separate pass.',
  rides:[
   {id:'tds-peterpan',name:'Peter Pan’s Never Land Adventure',land:'Fantasy Springs',height:90,note:'Newest land. Check DPA the moment you are in.'},
   {id:'tds-frozen',name:'Anna and Elsa’s Frozen Journey',land:'Fantasy Springs',height:102,note:'Boat ride with one backwards drop.'},
   {id:'tds-rapunzel',name:'Rapunzel’s Lantern Festival',land:'Fantasy Springs',height:null,note:'Gentle boat ride. The lanterns are the moment.'},
   {id:'tds-journey',name:'Journey to the Center of the Earth',land:'Mysterious Island',height:117,note:'Fast finish. Nate is likely too small.'},
   {id:'tds-soaring',name:'Soaring: Fantastic Flight',land:'Mediterranean Harbor',height:102,note:'Hang-glider film. Feet dangle.'},
   {id:'tds-toystory',name:'Toy Story Mania!',land:'American Waterfront',height:null,note:'Shooting game. Queue builds fast.'},
   {id:'tds-tower',name:'Tower of Terror',land:'American Waterfront',height:102,note:'Sudden drops in the dark.'},
   {id:'tds-indiana',name:'Indiana Jones Adventure',land:'Lost River Delta',height:117,note:'Jeep ride, jolts and dark.'},
   {id:'tds-raging',name:'Raging Spirits',land:'Lost River Delta',height:117,note:'Looping coaster.'},
   {id:'tds-sindbad',name:'Sindbad’s Storybook Voyage',land:'Arabian Coast',height:null,note:'Calm boat ride, wonderful song, rarely busy.'},
   {id:'tds-carousel',name:'Caravan Carousel',land:'Arabian Coast',height:null,note:'Two-storey carousel.'},
   {id:'tds-flounder',name:'Flounder’s Flying Fish Coaster',land:'Mermaid Lagoon',height:90,note:'Small outdoor coaster.'},
   {id:'tds-jumpinjellyfish',name:'Jumpin’ Jellyfish',land:'Mermaid Lagoon',height:90,note:'Gentle up-and-down drop.'},
   {id:'tds-nemo',name:'Nemo & Friends SeaRider',land:'Port Discovery',height:90,note:'Motion simulator, can be bumpy.'},
   {id:'tds-aquatopia',name:'Aquatopia',land:'Port Discovery',height:90,note:'Trackless water buggies. Short and fun.'},
   {id:'tds-gondola',name:'Venetian Gondolas',land:'Mediterranean Harbor',height:null,note:'Rowed by a singing gondolier.'}]}
];
export const parkForDay=day=>PARKS.find(p=>p.day===day)||null;
export const parkById=id=>PARKS.find(p=>p.id===id)||null;
export const allRides=()=>PARKS.flatMap(p=>p.rides.map(r=>({...r,parkId:p.id,park:p.name})));
export const findRide=id=>allRides().find(r=>r.id===id)||null;
export const parkLands=park=>[...new Set(park.rides.map(r=>r.land))];
// A rough match between a ride and the activities already on that day, so the checklist can
// show what is already planned without the two lists having to be kept in step by hand.
export function ridePlanned(state,park,ride){
 const key=ride.name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(w=>w.length>3);
 return state.steps.some(s=>{
  if(s.day!==park.day)return false;
  const title=s.title.toLowerCase();
  return key.length>0&&key.slice(0,3).every(w=>title.includes(w));
 });
}
// Universal Express Pass 8: Mine Cart & The Flying Dinosaur Special, for 25 September. Each of
// us holds one, so a timed slot is used person by person, and a ☆ choice is picked person by
// person. `stepIds` ties each ride (or the slot itself, for an area entry) to the activity in
// the day that covers it, so the pass can say what is already in the plan without guessing
// from titles.
export const EXPRESS_SEED=1;
export const EXPRESS_TICKET=[
 {id:'usj-x-snw',park:'usj',label:'Super Nintendo World area entry',start:'11:00',end:'12:00',rides:[],stepIds:{'usj-x-snw':'2026-09-25-09'}},
 {id:'usj-x-mariokart',park:'usj',label:'',start:'11:00',end:'11:30',rides:['usj-mariokart'],stepIds:{'usj-mariokart':'2026-09-25-10'}},
 {id:'usj-x-yoshi',park:'usj',label:'',start:'11:30',end:'12:00',rides:['usj-yoshi'],stepIds:{'usj-yoshi':'2026-09-25-11'}},
 {id:'usj-x-minecart',park:'usj',label:'',start:'12:00',end:'12:30',rides:['usj-minecart'],stepIds:{'usj-minecart':'2026-09-25-12'}},
 {id:'usj-x-minionblast',park:'usj',label:'',start:'16:00',end:'16:30',rides:['usj-minionblast'],stepIds:{'usj-minionblast':'2026-09-25-19'}},
 {id:'usj-x-hippogriff',park:'usj',label:'',start:'17:30',end:'18:00',rides:['usj-hippogriff'],stepIds:{'usj-hippogriff':'2026-09-25-21'}},
 {id:'usj-x-forbidden',park:'usj',label:'',start:null,end:null,rides:['usj-forbidden'],stepIds:{'usj-forbidden':'2026-09-25-22'}},
 {id:'usj-x-choice-a',park:'usj',label:'Choice A',start:null,end:null,rides:['usj-flyingdino','usj-hollywooddream','usj-minion'],stepIds:{'usj-flyingdino':'2026-09-25-06','usj-hollywooddream':'2026-09-25-07','usj-minion':'2026-09-25-17'},
  picks:{Damien:'usj-flyingdino',Boston:'usj-flyingdino'},used:{Damien:true,Boston:true}},
 {id:'usj-x-choice-b',park:'usj',label:'Choice B',start:null,end:null,rides:['usj-jaws','usj-jurassic'],stepIds:{'usj-jaws':'2026-09-25-23','usj-jurassic':'2026-09-25-05'}}
];
// How the ticket lands on the day that was planned before it arrived: each window written onto
// the activity it covers, Minion Blast confirmed at 16:00, and the Flying Dinosaur that Damien
// and Boston rode on entry. A step the family has since removed or already re-timed is left as
// they have it.
const EXPRESS_PLAN={
 '2026-09-25-09':{note:'Express Pass: Super Nintendo World area entry 11:00–12:00.'},
 '2026-09-25-10':{note:'Express Pass window 11:00–11:30.'},
 '2026-09-25-11':{note:'Express Pass window 11:30–12:00.',title:['Yoshi\'s Adventure','Yoshi\'s Adventure — Express Pass']},
 '2026-09-25-12':{note:'Express Pass window 12:00–12:30.'},
 '2026-09-25-19':{note:'Express Pass window 16:00–16:30.',when:s=>s.kind==='review',patch:{title:'Minion Blast — Express Pass',kind:'fixed',locked:true,time:'16:00',bookingTime:'16:00',review:false}},
 '2026-09-25-21':{note:'Express Pass window 17:30–18:00.'},
 '2026-09-25-22':{note:'Express Pass — any time today.'},
 '2026-09-25-06':{note:'Express Choice A. Damien and Boston rode it on entry.',title:['Flying Dinosaur / nearby break','The Flying Dinosaur — Express Choice A'],when:s=>s.status==='todo',patch:{participants:['Damien','Boston']}},
 '2026-09-25-07':{note:'Express Choice A option — pick in the Express Pass panel.'},
 '2026-09-25-17':{note:'Express Choice A option — pick in the Express Pass panel.'},
 '2026-09-25-05':{note:'Express Choice B option (or JAWS) — pick in the Express Pass panel.'},
 '2026-09-25-23':{note:'Express Choice B option (or Jurassic Park) — pick in the Express Pass panel.'}
};
export function expressSeeded(state){
 if((state.expressSeed||0)>=EXPRESS_SEED)return {expressSlots:state.expressSlots||[],expressSeed:state.expressSeed};
 const have=new Set((state.expressSlots||[]).map(s=>s.id));
 const steps=(state.steps||[]).map(s=>{
  const fix=EXPRESS_PLAN[s.id];if(!fix)return s;
  const next={...s};
  if(!(s.notes||'').includes(fix.note))next.notes=[s.notes,fix.note].filter(Boolean).join(' ');
  if(fix.title&&s.title===fix.title[0])next.title=fix.title[1];
  if(fix.patch&&(!fix.when||fix.when(s)))Object.assign(next,fix.patch);
  return next;
 });
 return {steps,expressSeed:EXPRESS_SEED,expressSlots:[...(state.expressSlots||[]),...EXPRESS_TICKET.filter(t=>!have.has(t.id)).map(t=>({picks:{},used:{},...structuredClone(t)}))]};
}
export const expressSlotsFor=(state,park)=>(state.expressSlots||[]).filter(s=>s.park===park.id).sort((a,b)=>(a.start||'99').localeCompare(b.start||'99'));
export const slotChoice=slot=>slot.rides.length>1;
export const slotName=slot=>slot.label&&!slotChoice(slot)?slot.label:slot.rides.length===1?findRide(slot.rides[0])?.name||slot.label:slot.label||'Express slot';
// The activity covering one option of a slot: the one it was tied to, while it is still on the
// park's day, else the rough title match the ride checklist already uses.
export function slotStep(state,park,slot,key){
 const linked=state.steps.find(s=>s.id===slot.stepIds?.[key]&&s.day===park.day);
 if(linked)return linked;
 const ride=findRide(key);if(!ride)return null;
 const words=ride.name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(w=>w.length>3).slice(0,2);
 return words.length?state.steps.find(s=>s.day===park.day&&words.every(w=>s.title.toLowerCase().includes(w)))||null:null;
}
