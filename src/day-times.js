// 28 September came out of the guide with times on only four of its sixteen stops, so the
// day read as a list with no shape: nothing said when to leave Kyoto, when the matcha was, or
// how long the shopping could run before Hozenji at 1:45. These fill it in from the guide's own
// page (arrive Shinsaibashi 9:45–10:00, Hozenji 1:45, free time 2:00, the cruise 3:30, the
// train home 8:00 and the hotel by about 9:15) and its "allow" lengths for each stop.
//
// The guide puts Dotonbori after dark at 4:00, which is nearly two hours before sunset (about
// 5:45), so it follows the gachapon hunt at 5:30 instead, as the dusk the guide is writing about.
//
// Applied once to the live trip. A stop whose time or length the family has already changed is
// left as they have it, and so is a stop that has been renamed.
export const TIMES_SEED=1;
export const DAY_TIMES={
 '2026-09-28-02':{title:'Breakfast',time:'08:00',duration:45},
 '2026-09-28-01':{title:'Forward luggage — confirm destination',time:'08:45',duration:15},
 '2026-09-28-02-2':{title:'Train to Osaka',time:'09:00',duration:60},
 '2026-09-28-03':{title:'CHADO Matcha',time:'10:00',duration:40},
 '2026-09-28-04':{title:'Shinsaibashi shopping',time:'10:40',duration:75},
 '2026-09-28-05':{title:'Amerikamura browsing',time:'11:55',duration:45},
 '2026-09-28-06':{title:'Takoyaki',time:'12:50',duration:25},
 '2026-09-28-06-2':{title:'Glico sign at Ebisubashi',time:'13:20',duration:15},
 '2026-09-28-07':{title:'Hozenji Yokocho',time:'13:45',duration:15},
 '2026-09-28-08':{title:'Free time, snacks and shopping',time:'14:00',duration:90},
 '2026-09-28-09':{title:'Tombori River Cruise',time:'15:30',duration:30},
 '2026-09-28-10':{title:'Gachapon hunt',time:'16:00',duration:60},
 '2026-09-28-11':{title:'Dotonbori after dark',time:'17:30',duration:45},
 '2026-09-28-12':{title:'Okonomiyaki dinner',time:'18:15',duration:75},
 '2026-09-28-13':{title:'Rikuro cheesecake',time:'19:35',duration:15},
 '2026-09-28-14':{title:'Return to Kyoto',time:'20:00',duration:70},
};
// What the guide import gave each stop, so a stop still carrying it is known to be untouched.
export const TIMES_BEFORE={
 '2026-09-28-01':{time:null,duration:30},'2026-09-28-02':{time:null,duration:30},'2026-09-28-02-2':{time:null,duration:30},
 '2026-09-28-03':{time:null,duration:30},'2026-09-28-04':{time:null,duration:30},'2026-09-28-05':{time:null,duration:30},
 '2026-09-28-06':{time:null,duration:20},'2026-09-28-06-2':{time:null,duration:15},'2026-09-28-07':{time:'13:45',duration:30},
 '2026-09-28-08':{time:'14:00',duration:30},'2026-09-28-09':{time:'15:30',duration:30},'2026-09-28-10':{time:null,duration:30},
 '2026-09-28-11':{time:null,duration:30},'2026-09-28-12':{time:null,duration:30},'2026-09-28-13':{time:null,duration:30},
 '2026-09-28-14':{time:'20:00',duration:30},
};
export function timesSeeded(state){
 if((state.timesSeed||0)>=TIMES_SEED)return state;
 const steps=(state.steps||[]).map(s=>{
  const plan=DAY_TIMES[s.id],was=TIMES_BEFORE[s.id];
  if(!plan||s.title!==plan.title)return s;
  const next={...s};
  if((s.time??null)===was.time){next.time=plan.time;if((s.originalTime??null)===was.time)next.originalTime=plan.time;}
  if(s.duration===was.duration)next.duration=plan.duration;
  return next;
 });
 return {...state,steps,timesSeed:TIMES_SEED};
}
