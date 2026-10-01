// Readiness at breakfast, the way WHOOP and Oura ask it: feet, sleep and mood as one number from
// one to five, tapped once each. It is not a health record; it is the family saying how the day
// should go before it starts. Under three for anyone and the day in brief says so, and puts the
// shorter version of the day one tap away instead of waiting for somebody to be in tears at
// four o'clock.
export const READINESS=[
 {level:1,face:'😩',word:'Flat'},
 {level:2,face:'😕',word:'Low'},
 {level:3,face:'🙂',word:'Okay'},
 {level:4,face:'😄',word:'Good'},
 {level:5,face:'🤩',word:'Raring'}
];
export const LOW_READINESS=3;
export const readinessState=state=>state.readiness||{};
export const readinessFor=(state,day)=>readinessState(state)[day]||{};
export const readinessOf=(state,day,person)=>readinessFor(state,day)[person]?.level??null;
export const faceOf=level=>READINESS.find(r=>r.level===level)?.face||'';
// Whoever is lowest, when anyone is under three; else nothing to say.
export function lowest(state,day){
 const rows=Object.entries(readinessFor(state,day)).map(([person,r])=>({person,level:r.level})).filter(r=>Number.isInteger(r.level)).sort((a,b)=>a.level-b.level);
 return rows.length&&rows[0].level<LOW_READINESS?rows[0]:null;
}
export const answered=(state,day,members)=>members.filter(p=>Number.isInteger(readinessOf(state,day,p)));
