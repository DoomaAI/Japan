import {BOYS,party,personProfile,interestLabel,paceLabel,partyInterests,partyLikes} from './trip-features.js';
import {allergyOf,allergenById} from './allergy-data.js';
import {PRIORITIES,PRIORITY_LEVELS} from './decide-data.js';
import {localBrief} from './local-data.js';
import {learnedBrief} from './taste-data.js';
import {isChild,levelsBrief} from './child-levels.js';
// Each person's project: everything Claude knows about the trip besides the day-by-day plan,
// built live from the trip as it stands every time somebody asks, and centred on whoever is
// asking. Nothing is exported or kept: change a profile, rate a stop or save a place and the
// very next answer knows it. All of it is read off the trip itself — its name, days, people and
// places — so a second trip is its own project. The plan and the forecast go with each question
// (server/ask.mjs); this is the rest: whose project it is, the stays, every profile with theirs
// first, what has been rated and voted on, and the saved places. Only what the asker's phone may
// already see is passed in, so the inbox, the money and the vault never reach it.
const line=value=>String(value??'').replace(/\s+/g,' ').trim();
const list=values=>values.filter(Boolean).join(', ');
const cut=(value,max)=>{const s=line(value);return s.length>max?`${s.slice(0,max-1)}…`:s;};
const dayLabel=date=>new Date(`${date}T12:00:00Z`).toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
const cities=state=>[...new Set((state.days||[]).map(d=>d.city).filter(Boolean))];
// Who counts as a child, and what each is ready for, live in child-levels.js.
export {isChild};
// Whose stars went where, per person, best first — what each of them has actually enjoyed so far.
function ratingsBy(state,name){
 const out=[];
 for(const [id,entry] of Object.entries(state.stepReviews||{})){
  const step=(state.steps||[]).find(s=>s.id===id);if(!step)continue;
  const rating=entry.ratings?.[name],thought=entry.thoughts?.[name]?.text,nextTime=entry.nextTime?.[name]?.text;
  if(rating||thought||nextTime)out.push({title:step.title,day:step.day,rating:rating||null,thought:thought||'',nextTime:nextTime||''});
 }
 return out.sort((a,b)=>(b.rating??0)-(a.rating??0)||a.day.localeCompare(b.day));
}
// Who the project belongs to, said first: their age sets the register, their profile sets the
// recommendations, and the rest of the party is context for the days they share.
function whose(state,person){
 const me=personProfile(state,person),child=isChild(state,person),out=['# Whose project this is',''];
 if(!person)return [...out,'- The whole party. Recommend for the group, and say who each suggestion suits.'].join('\n');
 out.push(`- This is **${person}**’s project${me.age?`; ${person} is ${me.age}`:''}. Speak to ${person} directly${child?', in short, plain sentences a young child can follow, with nothing scary or grown-up':''}.`);
 out.push(`- Recommend for ${person} first, from their profile below (marked “you”) and what they rated highly. Say why, from the profile.`);
 out.push(`- Stops marked “not you” in the plan are ones ${person} is not on; do not plan around ${person} being there.`);
 out.push('- On days shared with the others, a suggestion must still work for everyone there; say who else it suits.');
 if(child)out.push('- Anything to do with money, bookings or going somewhere alone: say to ask a parent.');
 // How the words should reach a child, and how much of the trip's machinery to mention, from the dials a parent set.
 if(child)out.push(`- ${levelsBrief(state,person)}`);
 return out.join('\n');
}
function overview(state){
 const p=party(state),days=state.days||[];
 const stays=[];for(const d of days){const last=stays.at(-1);if(last&&last.hotel===d.hotel){last.to=d.date;if(d.city&&!last.cities.includes(d.city))last.cities.push(d.city);}else stays.push({hotel:d.hotel,cities:d.city?[d.city]:[],from:d.date,to:d.date});}
 const shared=partyInterests(state).filter(i=>i.who.length>1);
 return [`# The trip: ${line(state.tripName)}`,'',
  `- Dates: ${days.length?`${dayLabel(days[0].date)} – ${dayLabel(days.at(-1).date)} (${days.length} days)`:'not set'}`,
  `- Where: ${list(cities(state))||'not set'}`,
  `- Travellers: ${list(state.members||[])||'not listed'}`,
  `- Pace: ${paceLabel(p.pace)}`,
  `- Budget: ${p.budget?`about ¥${Number(p.budget).toLocaleString('en-AU')} a day for the party`:'not set'}`,
  ...(p.notes?[`- Worth knowing: ${line(p.notes)}`]:[]),
  '','Where they stay:',...stays.map(h=>`- ${dayLabel(h.from)}–${dayLabel(h.to)}: ${line(h.hotel)||'not set'} (${h.cities.join(', ')})`),
  '','Interests more than one of them share:',...(shared.length?shared.map(i=>`- ${i.label}: ${i.who.join(', ')}`):['- None yet.'])
 ].join('\n');
}
function profiles(state,person){
 const p=party(state),out=['# Traveller profiles','','Written by each traveller in the app. A blank means nothing said yet, not no preference.'];
 const order=person?[person,...(state.members||[]).filter(n=>n!==person)]:state.members||[];
 for(const name of order){
  const me=personProfile(state,name),allergy=allergyOf(state,name),rated=ratingsBy(state,name),weights=p.priorities?.[name]?.weights;
  out.push('',`## ${name}${me.age?` (${me.age})`:''}${name===person?' — you':''}`);
  out.push(`- Interests: ${me.interests.map(interestLabel).join(', ')||'—'}`);
  out.push(`- Own likes: ${me.likes.join(', ')||'—'}`);
  out.push(`- Loves: ${line(me.loves)||'—'}`);
  out.push(`- Would rather avoid: ${line(me.avoid)||'—'}`);
  out.push(`- Food: ${line(me.dietary)||'—'}`);
  if(allergy.allergens.length||allergy.note)out.push(`- Allergies and diet, a hard limit${allergy.severe?', severe':''}: ${list(allergy.allergens.map(id=>allergenById(id)?.[1]))||'—'}${allergy.note?` — ${line(allergy.note)}`:''}`);
  if(me.notes)out.push(`- Notes: ${line(me.notes)}`);
  if(weights)out.push(`- What matters when choosing: ${PRIORITIES.map(([id,label])=>`${label}: ${(PRIORITY_LEVELS.find(([n])=>n===weights[id])||[,'—'])[1]}`).join('; ')}`);
  if(rated.length){
   out.push('- Rated so far:');
   for(const r of rated.slice(0,15))out.push(`  - ${r.title}${r.rating?` — ${r.rating}★`:''}${r.thought?`: “${cut(r.thought,200)}”`:''}${r.nextTime?` Next time: ${cut(r.nextTime,120)}`:''}`);
  }
 }
 const likes=partyLikes(state).filter(l=>l.who.length>1);
 if(likes.length)out.push('','Likes in common:',...likes.map(l=>`- ${l.tag}: ${l.who.join(', ')}`));
 return out.join('\n');
}
function feedback(state){
 const board=(state.proposals||[]).filter(p=>!p.stepId&&!p.parked),out=['# Ideas and feedback','','On the planning board, with votes:'];
 if(!board.length)out.push('- Nothing open.');
 for(const p of board.slice(0,40)){
  const by=v=>Object.entries(p.votes||{}).filter(([,x])=>x===v).map(([n])=>n),musts=Object.keys(p.musts||{}).filter(n=>p.musts[n]);
  out.push(`- ${line(p.title)}${p.place?` · ${line(p.place)}`:''} — yes: ${by(1).join(', ')||'—'}; no: ${by(-1).join(', ')||'—'}${musts.length?`; a must for ${musts.join(', ')}`:''}`);
 }
 const learned=learnedBrief(state);if(learned)out.push('',learned);
 out.push('','How the stops so far were rated:');
 const rated=Object.entries(state.stepReviews||{}).map(([id,e])=>({step:(state.steps||[]).find(s=>s.id===id),e}))
  .filter(r=>r.step&&Object.keys(r.e.ratings||{}).length).sort((a,b)=>a.step.day.localeCompare(b.step.day));
 if(!rated.length)out.push('- Nothing rated yet.');
 for(const {step,e} of rated){
  const stars=Object.values(e.ratings),avg=(stars.reduce((a,b)=>a+b,0)/stars.length).toFixed(1);
  out.push(`- ${dayLabel(step.day)} · ${line(step.title)} — ${avg}★ (${Object.entries(e.ratings).map(([n,r])=>`${n} ${r}`).join(', ')})`);
 }
 return out.join('\n');
}
// The family's own saved places, one line each, so a recommendation can name one they already
// know about before reaching for anywhere new. Kept short: name, kind, area, the Japanese.
function places(state){
 const rows=(state.locations||[]).filter(l=>!l.referenceOnly),out=['# Saved places','',`${rows.length} places the family has saved, by city. Prefer these when they fit.`];
 const byCity=new Map();for(const l of rows){const c=l.city||'Other';byCity.set(c,[...(byCity.get(c)||[]),l]);}
 for(const [city,items] of [...byCity.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){
  out.push('',`## ${city}`);
  for(const l of items.sort((a,b)=>a.name.localeCompare(b.name)))
   out.push(`- ${line(l.name)} — ${[l.category,l.district,l.japanese,l.tripDays?.length&&`on the plan ${l.tripDays.map(dayLabel).join(', ')}`,l.notes&&cut(l.notes,120)].filter(Boolean).join(' · ')}`);
 }
 return out.join('\n');
}
// The project for one person (or the party, with no one named), in two parts so the model does
// not start from scratch on every question. The shared part — the saved places and the stays,
// most of the length — is the same for everyone and changes only when the trip does, so it is
// cached once for all of them. The personal part is small: whose project it is, every profile
// with theirs first, and the votes and ratings, which move most. Built fresh on every call and
// never stored; the cache only saves re-reading what is byte-for-byte the same as last time.
export function tripProject(state,person=null){
 if(person&&!(state.members||[]).includes(person))person=null;
 return {shared:[overview(state),places(state),localBrief(state)].filter(Boolean).join('\n\n'),personal:[whose(state,person),profiles(state,person),feedback(state)].join('\n\n')};
}
// Stops a person is not on, so "not you" can be marked on the plan beside the question.
export const notOn=(step,person)=>!!person&&Array.isArray(step.participants)&&step.participants.length>0&&!step.participants.includes(person);
