// After dinner: somewhere for a drink, a nightcap, a night out or a late treat, near tonight's
// hotel, as an option rather than a plan. Each person says what they are after, and the places
// are looked for with that person's own likes in mind. A grown-up sees all four; the boys see the
// late treat, which is the one of them that is theirs. What is found is kept on the day for every
// phone, one search per kind, and a grown-up can put one on the plan as an optional stop that
// the evening can drop without anything else moving.
import {activeSteps} from './timing.js';
import {stayFor} from './stay-data.js';
import {parentsOf} from './people.js';
import {clamp} from './text.js';
export const NIGHT_FROM='18:30',NIGHT_UNTIL='23:30',NIGHT_PER_MOOD=3;
export const NIGHT_MOODS=[
 {id:'nightcap',label:'A quiet nightcap',short:'Nightcap',who:'grown-ups',time:'21:00',minutes:45,walk:5,
  ask:'Somewhere calm to sit for one drink before bed: the hotel’s own bar or lounge first, or a quiet bar a few minutes away. Seats, not standing; conversation, not music.'},
 {id:'drink',label:'A drink nearby',short:'Drinks',who:'grown-ups',time:'20:30',minutes:60,walk:10,
  ask:'A good bar for a drink within about ten minutes’ walk: a cocktail or whisky bar, a sake or craft beer place, a hotel bar with a view. Somewhere a visitor can walk into.'},
 {id:'out',label:'Going out',short:'Night out',who:'grown-ups',time:'20:00',minutes:120,walk:20,
  ask:'Somewhere with a bit of life for an evening out, within about twenty minutes by foot or one short train: an izakaya alley, a yokocho, live music or jazz, a lively bar street, a night view. Places that welcome visitors and do not charge foreigners a cover just for walking in, or that say what the cover is.'},
 {id:'treat',label:'A late treat',short:'Late treat',who:'everyone',time:'19:30',minutes:30,walk:10,
  ask:'A late treat for the whole family, open this evening: dessert, a parfait, ice cream, crepes, a café with hot chocolate, a department-store food hall before it closes. Children welcome, non-smoking.'},
];
export const moodOf=id=>NIGHT_MOODS.find(m=>m.id===id)||null;
// What each person can ask for: the boys get the treat, a grown-up gets the lot.
export const moodsFor=user=>NIGHT_MOODS.filter(m=>user?.role==='parent'||m.who==='everyone');
// Who is coming along changes where is suitable: a drink or a night out with the boys has to be
// somewhere children are allowed and nobody smokes.
export const WHO=[['adults','Just the grown-ups'],['family','With the boys']];
export const whoFor=(mood,who)=>mood==='treat'?'family':mood==='nightcap'?'adults':who==='family'?'family':'adults';
export const VIBES=[['quiet','Quiet'],['relaxed','Relaxed'],['lively','Lively']];
export const PAYS=[['card','Cards taken'],['cash','Cash only'],['unknown','Payment not known']];
// Whether one of these is already on the plan for the evening: then the card says what is
// planned instead of offering more.
export const NIGHT_TITLE=/^(Nightcap|Drinks|Night out|Late treat):/;
export const nightPlanned=(state,day)=>activeSteps(state,day).filter(s=>s.status!=='skipped'&&(s.nightOut||NIGHT_TITLE.test(s.title||'')));
// Where to look: tonight's hotel, or the last stop of the day on a night without one.
export function nightAnchor(state,day){
 const stay=stayFor(state,day);
 if(stay&&!stay.checkingOut)return {id:'hotel',label:stay.hotel,place:stay.address||stay.hotel};
 const last=activeSteps(state,day).filter(s=>s.status!=='skipped'&&(s.place||s.title)).at(-1);
 return last?{id:'last',label:last.title,place:last.place||last.title}:null;
}
export const nightShows=(state,day,today,clock,dismissed=false)=>!dismissed&&day===today&&clock>=NIGHT_FROM&&clock<NIGHT_UNTIL
 &&(state?.days||[]).some(d=>d.date===day)&&!!nightAnchor(state,day);
export const nightOf=(state,day)=>state?.nightOut?.[day]||{};
// What a model sends back, checked the way dinner is: lists the screen knows, links only as the
// search saw them, a rating only with enough votes behind it.
const pick=(v,list,fallback)=>list.some(([id])=>id===v)?v:fallback;
const yesNo=v=>v===true?true:v===false?false:null;
export function cleanNightOption(o,checkLink=u=>u){
 const title=clamp(o?.title,120);if(!title)return null;
 const votes=Number.isInteger(o?.ratingCount)&&o.ratingCount>=0?o.ratingCount:null;
 const rating=Number.isFinite(o?.rating)&&o.rating>=1&&o.rating<=5&&(votes===null||votes>=20)?Math.round(o.rating*10)/10:null;
 return {title,japanese:clamp(o.japanese,120),kind:clamp(o.kind,80),area:clamp(o.area,160),
  walkMinutes:Number.isInteger(o.walkMinutes)&&o.walkMinutes>=0&&o.walkMinutes<=60?o.walkMinutes:null,
  vibe:pick(o.vibe,VIBES,'relaxed'),kidsWelcome:o.kidsWelcome===true,nonSmoking:yesNo(o.nonSmoking),
  inHotel:o.inHotel===true,cover:clamp(o.cover,120),pay:pick(o.pay,PAYS,'unknown'),
  rating,ratingCount:rating===null?null:votes,priceBand:clamp(o.priceBand,10),openNote:clamp(o.openNote,160),why:clamp(o.why,220),
  website:checkLink(o.website)||''};
}
// With the boys along, places that welcome children and are smoke-free come first; then the
// nearest, since this is the end of the day; then the rating.
export function rankNight(list,who){
 const fam=who==='family';
 return [...list].filter(o=>!fam||o.kidsWelcome).sort((a,b)=>(fam?((b.nonSmoking===true)-(a.nonSmoking===true)):0)||((a.walkMinutes??30)-(b.walkMinutes??30))||((b.rating||0)-(a.rating||0)));
}
// The optional stop a grown-up puts on the plan from a place on the card.
export function nightStep(state,day,mood,o,time,who=null){
 const m=moodOf(mood),last=activeSteps(state,day).at(-1);
 return {title:`${m.short}: ${o.title}`,day,time:time||m.time,duration:m.minutes,place:o.area||o.title,japanese:o.japanese||'',kind:'optional',
  // A late treat is not dinner: filed as a café stop so the dinner card still offers a meal.
  category:mood==='treat'?'cafe':'entertainment',
  website:o.website||'',page:state.days.find(d=>d.date===day)?.pages?.[0]||1,participants:whoFor(mood,who)==='family'||!parentsOf(state).length?[...state.members]:parentsOf(state),
  notes:[o.kind,o.why,o.cover?`Cover charge: ${o.cover}`:'',o.pay==='cash'?'Cash only':'',o.openNote,'An option for tonight: skip it if we are tired.'].filter(Boolean).join('\n'),
  ...(last?{order:last.order+1}:{})};
}
