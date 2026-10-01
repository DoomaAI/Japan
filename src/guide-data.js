// One guide, one voice. Ask about our trip, What's near here, the suggestions and the night-before
// check (with its Plan B, the hotel move and the insider notes) were four separate voices that each
// started from nothing. Now they are one named guide: the same way of talking, and the same short
// memory of the trip so far — what landed, what was skipped, what was eaten, and what the family
// last asked — so the evening check can say "after the long walk at Fushimi Inari" and an answer at
// lunch can say "the boys rated the last ramen a 5". The name and the voice are a parent's to set.
import {activeSteps} from './timing.js';
import {stepAverage} from './trip-features.js';
import {FOOD} from './food-data.js';
export const GUIDE_DEFAULT={name:'Tabi',voice:'warm'};
export const GUIDE_VOICES=[
 {id:'warm',label:'Warm',line:'Warm and plain, like a friend who has lived in Japan: short sentences, kind, specific, never gushing.'},
 {id:'brief',label:'Brief',line:'Brief and practical: the answer first, in as few words as will do, no warm-up and no sign-off.'},
 {id:'playful',label:'Playful',line:'Light and a little playful, with the boys in mind: one small joke at most, never at anyone’s expense, and the facts still exact.'}
];
const cut=(s,n)=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?`${s.slice(0,n-1)}…`:s;};
export const cleanGuideName=s=>cut(String(s||'').replace(/[^\p{L}\p{N} '’-]/gu,''),20);
export function guideOf(state){
 const g=state?.guide||{};
 return {name:cleanGuideName(g.name)||GUIDE_DEFAULT.name,voice:GUIDE_VOICES.some(v=>v.id===g.voice)?g.voice:GUIDE_DEFAULT.voice};
}
// The shared memory: the trip's last few days as they went, the food tried, and what was last
// asked. Short on purpose — it goes to every call — and built afresh from the trip each time.
export function guideMemory(state,today,{days:back=3}={}){
 const days=(state?.days||[]).filter(d=>d.date<=today).slice(-back),out=[];
 for(const d of days){
  const steps=activeSteps(state,d.date);
  const rated=steps.map(s=>({s,avg:stepAverage(state,s.id)})).filter(x=>x.avg!=null).sort((a,b)=>b.avg-a.avg);
  const skipped=steps.filter(s=>s.status==='skipped').map(s=>s.title);
  const bits=[];
  if(rated[0])bits.push(`best: ${rated[0].s.title} (${rated[0].avg}★)`);
  if(rated.length>1&&rated.at(-1).avg<=3)bits.push(`least: ${rated.at(-1).s.title} (${rated.at(-1).avg}★)`);
  if(skipped.length)bits.push(`skipped: ${skipped.slice(0,3).join(', ')}`);
  const said=state?.journal?.[d.date];if(said)bits.push(`diary: “${cut(said,120)}”`);
  if(bits.length)out.push(`- ${d.date} ${d.city||''}${d.title?` (${d.title})`:''}: ${bits.join('; ')}`);
 }
 const food=Object.entries(state?.food||{}).filter(([,e])=>Object.keys(e?.ratings||{}).length)
  .map(([id])=>FOOD.find(f=>f.id===id)?.en?.split(' — ')[0]||(state.foodItems||[]).find(f=>f.id===id)?.en).filter(Boolean);
 if(food.length)out.push(`- Eaten so far: ${food.slice(-14).join(', ')}`);
 const asked=(state?.askThread||[]).slice(0,3).map(a=>`“${cut(a.question,90)}”${a.verdict?` → ${cut(a.verdict,90)}`:''}`);
 if(asked.length)out.push(`- Lately they asked you: ${asked.join('; ')}`);
 return out.length?`What you remember of the trip so far (yours to draw on, not to recite):\n${out.join('\n')}`:'';
}
// The block every call that speaks to the family carries, after its own instructions.
export function guidePrompt(state,today){
 const g=guideOf(state),voice=GUIDE_VOICES.find(v=>v.id===g.voice);
 return [`You are ${g.name}, this family's guide for the whole trip: the same guide answers their questions, finds what is near, suggests what to do and checks tomorrow, so speak as one person who has been with them since day one.`,
  `Voice: ${voice.line} Australian English. Use their names (Damien, Lauren, Boston, Nate) where it helps; never call yourself an AI or a human local, and do not sign off with your name — the app shows it.`,
  `Where it is true and useful, connect to what they did and liked (“since Boston loved the train museum…”); never invent a memory that is not below or in what you were given.`,
  guideMemory(state,today)].filter(Boolean).join('\n\n');
}
export const withGuide=(system,state,today)=>`${system}\n\n${guidePrompt(state,today)}`;
