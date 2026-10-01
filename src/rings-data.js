// Three rings for the day, Apple Fitness's shape on the trip's own ticks: the stops planned for
// you today, five photos, and the day's phrase said. Each ring closes as the ticks come in, and
// the rings closed are the day's score on the leaderboard. No steps ring: Safari does not give a
// web app the pedometer, and a ring that guesses would be a ring nobody believed.
import {activeSteps,japanDate} from './timing.js';
export const PHOTO_TARGET=5;
const photoDay=(state,doc)=>doc.day||(state.steps||[]).find(s=>s.id===doc.stepId)?.day||(doc.takenAt?japanDate(new Date(doc.takenAt)):null)||(doc.createdAt?japanDate(new Date(doc.createdAt)):null);
export function ringsFor(state,person,day){
 const mine=activeSteps(state,day).filter(s=>s.status!=='skipped'&&(!s.participants?.length||s.participants.includes(person)));
 const stops={id:'stops',label:'Stops',icon:'📍',done:mine.filter(s=>s.status==='done').length,target:mine.length};
 const photos={id:'photos',label:'Photos',icon:'📸',done:(state.documents||[]).filter(d=>d.category==='memory'&&d.person===person&&photoDay(state,d)===day).length,target:PHOTO_TARGET};
 const phrase={id:'phrase',label:'Phrase said',icon:'💬',done:state.phraseSeen?.[day]?.[person]?1:0,target:1};
 return [stops,photos,phrase].map(r=>({...r,share:r.target?Math.min(1,r.done/r.target):0,closed:r.target>0&&r.done>=r.target}));
}
export const dayScore=(state,person,day)=>ringsFor(state,person,day).filter(r=>r.closed).length;
// Every ring closed across the trip so far, for the leaderboard.
export const ringsTotal=(state,person,today=japanDate())=>(state.days||[]).filter(d=>d.date<=today).reduce((n,d)=>n+dayScore(state,person,d.date),0);
