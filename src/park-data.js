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
