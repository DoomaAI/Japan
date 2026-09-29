import {BOYS,party,personProfile,interestLabel,paceLabel,partyInterests,partyLikes} from './trip-features.js';
import {allergyOf,allergenById} from './allergy-data.js';
import {PRIORITIES,PRIORITY_LEVELS} from './decide-data.js';
// A trip as a Claude Project: a set of knowledge files, taken from the trip as it stands, and the
// instructions that make Claude treat them as the primary source. Everything is read off the
// trip itself — its name, days, people and places — so a second trip makes its own project.
// What stays out: the inbox, expenses, documents and the vault, contacts, trackers and the Ask
// thread. A project is shared with whoever it is shared with; none of that belongs in it.
// A pack is for the whole party, or for one person: then it is their project, their profile
// leads, their steps are marked, and every recommendation is for them first.
export const PROJECT_FILES=['00-project-instructions.md','01-trip-overview.md','02-itinerary.md','03-traveller-profiles.md','04-places.md','05-ideas-and-feedback.md'];
const line=value=>String(value??'').replace(/\s+/g,' ').trim();
const list=values=>values.filter(Boolean).join(', ');
const dayLabel=date=>new Date(`${date}T12:00:00Z`).toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
export const projectSlug=state=>line(state.tripName||'trip').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'trip';
const stepsFor=(state,date)=>(state.steps||[]).filter(s=>s.day===date).sort((a,b)=>(a.order??0)-(b.order??0));
const cities=state=>[...new Set((state.days||[]).map(d=>d.city).filter(Boolean))];
// Whose stars went where, per person, best first — what each of them has actually enjoyed so far.
function ratingsBy(state,name){
 const out=[];
 for(const [id,entry] of Object.entries(state.stepReviews||{})){
  const step=(state.steps||[]).find(s=>s.id===id);if(!step)continue;
  const rating=entry.ratings?.[name],thought=entry.thoughts?.[name]?.text;
  if(rating||thought)out.push({title:step.title,day:step.day,rating:rating||null,thought:thought||''});
 }
 return out.sort((a,b)=>(b.rating??0)-(a.rating??0)||a.day.localeCompare(b.day));
}
function instructions(state,person){
 const name=line(state.tripName)||'this trip',days=state.days||[];
 const span=days.length?`${dayLabel(days[0].date)} to ${dayLabel(days.at(-1).date)}`:'dates not set';
 return `# Project instructions: ${name}${person?` — ${person}`:''}

Paste this into the Project's custom instructions. Upload the other files as project knowledge.

You are ${person?`${person}’s own`:'the'} planning companion for ${name} (${span}; ${list(cities(state))||'destinations not set'}). The travellers are ${list(state.members||[])||'not listed yet'}.${person?focus(state,person):''}

## Sources, in order
1. **The project knowledge files are the primary source.** The itinerary, bookings, places and traveller profiles in them are the family's own plan and override anything general you know or find.
2. Say which file and which day an answer rests on (for example "Itinerary, Thu 24 Sep").
3. When the files do not answer the question, say so plainly, then use web search or general knowledge, and label that part as coming from outside the plan.
4. Never contradict a step marked **locked** or **booked**. If something outside the plan suggests it is wrong (a closure, a changed time), flag it as a check rather than a change.
5. The files are a snapshot, dated at the top of each. If a question depends on something that may have moved since, say so.

## Recommendations
- Tailor every suggestion to the traveller profiles: interests, own likes, what each would rather avoid, age, pace and budget.
- Name who a suggestion is for, and why, from their profile (for example "for Boston — trains, Shinkansen").
- Treat allergies and dietary notes as hard constraints, not preferences.
- Use the ratings and thoughts in the ideas and feedback file: more like what scored well, less like what did not.
- Prefer places already in the places file and near that day's hotel and steps; give the local-language name and address where the file has one.
- Keep suggestions realistic for the day's existing plan and the party's pace.
`;
}
// Who the project belongs to, said up front: their age sets the register, their profile sets
// the recommendations, and the rest of the party is context for the days they share.
function focus(state,person){
 // A profile's age decides it; until one is given, the trip's own list of children does.
 const me=personProfile(state,person),child=me.age!=null&&me.age!==''?Number(me.age)<13:BOYS.includes(person);
 return `

## Whose project this is
- This project belongs to **${person}**${me.age!=null?`, aged ${me.age}`:''}. Speak to ${person} directly${child?', in short, plain sentences a young child can read, with no scary or grown-up detail':''}.
- Recommend for ${person} first: their profile in the traveller profiles file (listed first, marked “you”) and what they rated highly.
- Steps flagged **not you** in the itinerary are ones ${person} is not on; do not plan around ${person} being there.
- On days shared with the others, a suggestion must still work for the whole party; say who else it suits.
${child?`- Anything involving money, bookings or going somewhere alone: suggest asking a parent.`:''}`.trimEnd();
}
function overview(state,at){
 const p=party(state),days=state.days||[];
 const hotels=[];for(const d of days){const last=hotels.at(-1);if(last&&last.hotel===d.hotel){last.to=d.date;if(d.city&&!last.cities.includes(d.city))last.cities.push(d.city);}else hotels.push({hotel:d.hotel,cities:d.city?[d.city]:[],from:d.date,to:d.date});}
 const shared=partyInterests(state).filter(i=>i.who.length>1);
 return `# Trip overview: ${line(state.tripName)}

Snapshot taken ${at}.

- **Dates:** ${days.length?`${dayLabel(days[0].date)} – ${dayLabel(days.at(-1).date)} (${days.length} days)`:'not set'}
- **Where:** ${list(cities(state))||'not set'}
- **Travellers:** ${list(state.members||[])||'not listed'}
- **Pace:** ${paceLabel(p.pace)}
- **Budget:** ${p.budget?`about ¥${Number(p.budget).toLocaleString('en-AU')} a day for the party`:'not set'}
${p.notes?`- **Worth knowing:** ${line(p.notes)}\n`:''}
## Where we stay
| From | To | Hotel | Days in |
|---|---|---|---|
${hotels.map(h=>`| ${dayLabel(h.from)} | ${dayLabel(h.to)} | ${line(h.hotel)||'not set'} | ${h.cities.join(', ')} |`).join('\n')}

## Shared interests
${shared.length?shared.map(i=>`- ${i.label}: ${i.who.join(', ')}`).join('\n'):'- None shared by more than one person yet.'}
`;
}
function itinerary(state,person){
 const out=[`# Itinerary: ${line(state.tripName)}`,'',`Each step: time · title · place. Flags: **locked** (fixed, do not move), **booked**, **done**, **skipped**${person?`, **not you** (${person} is not on it)`:''}.`];
 for(const d of state.days||[]){
  out.push('',`## ${dayLabel(d.date)} — ${line(d.title)}`,`${line(d.city)} · stay: ${line(d.hotel)||'not set'}`,'');
  const steps=stepsFor(state,d.date);
  if(!steps.length){out.push('- Nothing planned yet.');continue;}
  for(const s of steps){
   const flags=[s.locked&&'locked',s.bookingTime&&`booked ${s.bookingTime}`,s.status==='done'&&'done',s.status==='skipped'&&'skipped',s.option&&`option: ${line(s.option)}`].filter(Boolean);
   const who=(s.participants||[]).length&&(s.participants||[]).length<(state.members||[]).length?` — ${s.participants.join(', ')}`:'';
   if(person&&(s.participants||[]).length&&!s.participants.includes(person))flags.push('not you');
   out.push(`- ${s.time||'any time'} · ${line(s.title)}${s.place?` · ${line(s.place)}`:''}${s.japanese?` (${line(s.japanese)})`:''}${flags.length?` **[${flags.join(', ')}]**`:''}${who}`);
   if(s.notes)out.push(`  - ${line(s.notes)}`);
  }
 }
 return out.join('\n')+'\n';
}
function profiles(state,person){
 const p=party(state),out=[`# Traveller profiles: ${line(state.tripName)}`,'','Written by each traveller in the app. A blank means nothing said yet, not no preference.'];
 const order=person?[person,...(state.members||[]).filter(n=>n!==person)]:state.members||[];
 for(const name of order){
  const me=personProfile(state,name),allergy=allergyOf(state,name),rated=ratingsBy(state,name),weights=p.priorities?.[name]?.weights;
  out.push('',`## ${name}${me.age?` (${me.age})`:''}${name===person?' — you':''}`,'');
  out.push(`- **Interests:** ${me.interests.map(interestLabel).join(', ')||'—'}`);
  out.push(`- **Own likes:** ${me.likes.join(', ')||'—'}`);
  out.push(`- **Loves:** ${line(me.loves)||'—'}`);
  out.push(`- **Would rather avoid:** ${line(me.avoid)||'—'}`);
  out.push(`- **Food:** ${line(me.dietary)||'—'}`);
  if(allergy.allergens.length||allergy.note)out.push(`- **Allergies and diet (hard constraint${allergy.severe?', severe':''}):** ${list(allergy.allergens.map(id=>allergenById(id)?.[1]))||'—'}${allergy.note?` — ${line(allergy.note)}`:''}`);
  if(me.notes)out.push(`- **Notes:** ${line(me.notes)}`);
  if(weights)out.push(`- **What matters when choosing:** ${PRIORITIES.map(([id,label])=>`${label}: ${(PRIORITY_LEVELS.find(([n])=>n===weights[id])||[,'—'])[1]}`).join('; ')}`);
  if(rated.length){
   out.push('- **Rated so far:**');
   for(const r of rated.slice(0,15))out.push(`  - ${r.title}${r.rating?` — ${r.rating}★`:''}${r.thought?`: “${line(r.thought)}”`:''}`);
  }
 }
 const likes=partyLikes(state).filter(l=>l.who.length>1);
 if(likes.length)out.push('','## Likes in common','',...likes.map(l=>`- ${l.tag}: ${l.who.join(', ')}`));
 return out.join('\n')+'\n';
}
function places(state){
 const rows=(state.locations||[]).filter(l=>!l.referenceOnly);
 const out=[`# Places: ${line(state.tripName)}`,'',`${rows.length} places the family has saved, by city. Local name and address where known.`];
 const byCity=new Map();for(const l of rows){const c=l.city||'Other';byCity.set(c,[...(byCity.get(c)||[]),l]);}
 for(const [city,items] of [...byCity.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){
  out.push('',`## ${city}`,'');
  for(const l of items.sort((a,b)=>a.name.localeCompare(b.name))){
   const bits=[l.category,l.district,l.japanese,l.address,l.tripDays?.length&&`on the plan: ${l.tripDays.map(dayLabel).join(', ')}`,l.notes&&line(l.notes)].filter(Boolean);
   out.push(`- **${line(l.name)}** — ${bits.join(' · ')}`);
  }
 }
 return out.join('\n')+'\n';
}
function ideas(state){
 const board=(state.proposals||[]).filter(p=>!p.stepId),out=[`# Ideas and feedback: ${line(state.tripName)}`,'','## Ideas on the planning board',''];
 if(!board.length)out.push('- None open.');
 for(const p of board){
  const yes=Object.entries(p.votes||{}).filter(([,v])=>v>0).map(([n])=>n),no=Object.entries(p.votes||{}).filter(([,v])=>v<0).map(([n])=>n),musts=Object.keys(p.musts||{}).filter(n=>p.musts[n]);
  out.push(`- **${line(p.title)}**${p.parked?' (parked)':''}${p.place?` · ${line(p.place)}`:''}${p.day?` · ${dayLabel(p.day)}`:''}${p.cost!=null?` · ¥${Number(p.cost).toLocaleString('en-AU')}`:''} — yes: ${yes.join(', ')||'—'}; no: ${no.join(', ')||'—'}${musts.length?`; must-do for ${musts.join(', ')}`:''}`);
  if(p.notes)out.push(`  - ${line(p.notes)}`);
 }
 out.push('','## How the steps so far were rated','');
 const rated=Object.entries(state.stepReviews||{}).map(([id,e])=>({step:(state.steps||[]).find(s=>s.id===id),e})).filter(r=>r.step&&(Object.keys(r.e.ratings||{}).length||Object.keys(r.e.thoughts||{}).length)).sort((a,b)=>a.step.day.localeCompare(b.step.day));
 if(!rated.length)out.push('- Nothing rated yet.');
 for(const {step,e} of rated){
  const stars=Object.values(e.ratings||{}),avg=stars.length?(stars.reduce((a,b)=>a+b,0)/stars.length).toFixed(1):null;
  out.push(`- ${dayLabel(step.day)} · **${line(step.title)}**${avg?` — ${avg}★ (${Object.entries(e.ratings).map(([n,r])=>`${n} ${r}`).join(', ')})`:''}`);
  for(const [n,t] of Object.entries(e.thoughts||{}))out.push(`  - ${n}: “${line(t.text)}”`);
 }
 return out.join('\n')+'\n';
}
// Whose pack a signed-in person may take: their own, always; anyone else's, or the whole party's
// (asked as "party"), only as a parent. Returns the person, or null for the party.
export function packPerson(user,asked,members){
 const who=asked||user.name;
 if(who!==user.name&&user.role!=='parent')return {error:'A parent can do this.',status:403};
 if(who==='party')return {person:null};
 if(!members.includes(who))return {error:'Choose a family member.',status:404};
 return {person:who};
}
export function projectPack(state,now=new Date(),person=null){
 if(person&&!(state.members||[]).includes(person))throw new Error(`${person} is not on this trip.`);
 const at=now.toISOString().slice(0,16).replace('T',' ')+' UTC',stamp=`> Snapshot of ${line(state.tripName)} taken ${at}. The app is the live source; this file is as of then.\n\n`;
 const files={
  '00-project-instructions.md':instructions(state,person),
  '01-trip-overview.md':overview(state,at),
  '02-itinerary.md':stamp+itinerary(state,person),
  '03-traveller-profiles.md':stamp+profiles(state,person),
  '04-places.md':stamp+places(state),
  '05-ideas-and-feedback.md':stamp+ideas(state)
 };
 const trip=line(state.tripName)||'Trip';
 return {slug:person?`${projectSlug(state)}-${projectSlug({tripName:person})}`:projectSlug(state),name:person?`${trip} — ${person}`:trip,person,at,files};
}
