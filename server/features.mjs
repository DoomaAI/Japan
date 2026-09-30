import {randomUUID} from 'node:crypto';
import {findRide} from '../src/park-data.js';
import {FOOD,FOOD_KINDS} from '../src/food-data.js';
import {ALL_PHRASES,findPhrase} from '../src/phrasebook-data.js';
import {ALL_FACTS,findFact} from '../src/fact-data.js';
import {THROWS,jankenWinner} from '../src/kana-data.js';
const JANKEN_THROWS=THROWS.map(t=>t.id);
import {PRIORITIES,validPriorities} from '../src/decide-data.js';
import {SUMO_DIVISIONS,sumo,wrestlerKey,BOYS,SHORTLIST_STATUS,SHORTLIST_STARS,isStarRating,validPin,delayForDay,initialThankYou,generatedMissions,nextExtraMission,GENERATED_PER_DAY,EYE_SPY,isTrainLeg,eyeSpyKey,THANK_YOU_FROM,THANK_YOU_FOR,normaliseThankYou,PROPOSAL_KINDS,PROPOSAL_TIMING,INTERESTS,PACES,MAX_LIKES,MAX_LIKE_LENGTH,cleanLikes,party,personProfile,proposalDraft,proposalPlacement,proposalStepNotes,packItem} from '../src/trip-features.js';
import {IC_MAX,RECEIPT_TYPES} from '../src/ledger-data.js';
import {ASK_LIMIT,SHARED_KEEP} from '../src/ask-thread.js';
import {PACK_CATEGORIES} from '../src/packing-data.js';
import {EXPENSE_CATEGORIES,PAY_METHODS,PAYERS,expenseFields} from '../src/trip-features.js';
import {PAY_KINDS,PAY_HOLDERS,FEE_FIELDS,MAX_PAY_METHODS} from '../src/pay-advice.js';
import {HUNTS,MAX_CUSTOM_HUNTS,MAX_HUNT_ENTRIES,huntEntryFields} from '../src/hunt-data.js';
import {allergenById} from '../src/allergy-data.js';
import {MAX_NOTICED,NOTICED_TEXT,noticedFields} from '../src/noticed-data.js';
import {findReportKind} from '../src/report-data.js';
import {CHOICE_FIELDS,TEXT_FIELDS,validChoice} from '../src/mascot-data.js';
import {findRule} from '../src/booking-window-data.js';
import {findShopItem,SHOP_VERDICTS,SHOP_NOTE_MAX} from '../src/shop-data.js';
import {cleanStay} from '../src/stay-data.js';
import {PREDICTION_MAX,findPrediction,predictionPhase} from '../src/prediction-data.js';
import {japanDate,japanClock} from '../src/timing.js';
import {CHECKIN_AHEAD_HOURS} from '../src/checkin-data.js';
import {READINESS} from '../src/readiness-data.js';
import {findSquare,validCard} from '../src/bingo-data.js';
import {TRACKER_KINDS,MAX_TRACKERS,trackerItem,validShareUrl} from '../src/trackers.js';
const MAX_PROPOSALS=300;
// A shortlist is a list you can still read. Past a couple of hundred finds it is an archive of
// shops, and the answer to that is to decide on some rather than to keep adding.
const MAX_SHORTLIST=200;
const https=v=>{try{return new URL(v).protocol==='https:';}catch{return false;}};
const string=(v,max)=>typeof v==='string'&&v.length<=max;
export function extraOperation(state,op,user,fail,now){
 const parent=user.role==='parent',dayOK=day=>day===null||state.days.some(d=>d.date===day);
 const requireText=(v,max,label)=>{if(!string(v,max))fail(`Invalid ${label}.`);};
 const dayCheck=day=>{if(!dayOK(day))fail('Choose a trip day or Whole trip.');};
 // What somebody cannot eat, for the card handed to a waiter. A parent writes it; every allergen
 // has to be one Japan has a word for, because the card is only worth having in Japanese.
 // Squaring up between the parents: a hand-over of yen from one to the other, recorded so the
 // balance card comes back to even. Parents only, like the ledger it sits under.
 if(op.type==='settleUp'){
  if(!parent)fail('Squaring up is for Mum and Dad.',403);
  if(!PAYERS.includes(op.from)||!PAYERS.includes(op.to)||op.from===op.to)fail('Say who handed the money to whom.');
  if(!Number.isInteger(op.yen)||op.yen<1||op.yen>10000000)fail('Enter the amount as whole yen.');
  state.settlements=[...(state.settlements||[]),{id:randomUUID(),from:op.from,to:op.to,yen:op.yen,at:now,by:user.name}];
  return {summary:null,important:false,title:`${op.from} squared up ¥${op.yen.toLocaleString()} with ${op.to}`};
 }
 // The balance left on somebody's IC card, read off the gate or the machine and typed in.
 if(op.type==='icBalance'){
  if(!parent)fail('A parent keeps the card balances.',403);
  if(!state.members.includes(op.person))fail('Choose a family member.');
  if(!Number.isInteger(op.yen)||op.yen<0||op.yen>IC_MAX)fail(`Enter the balance as whole yen, up to ¥${IC_MAX.toLocaleString()}.`);
  state.icCards={...(state.icCards||{}),[op.person]:{yen:op.yen,at:now,by:user.name}};
  return {summary:null,important:false,title:`${op.person}’s IC card: ¥${op.yen.toLocaleString()}`};
 }
 // A parent's question and its answer, kept in the trip for the other parent. The item arrives
 // from the phone that asked, so every field is cut to size and every day and link checked; the
 // model's own blocks were never in it. Newest first, a couple of dozen kept.
 if(op.type==='askKeep'){
  if(!parent)fail('The shared questions are the parents’.',403);
  const it=op.item;if(!it||typeof it!=='object'||!string(it.id,60)||!it.id||!string(it.question,ASK_LIMIT)||!it.question.trim())fail('Nothing to keep.');
  const cut=(v,max)=>String(v??'').trim().slice(0,max);
  const at=Number.isFinite(Date.parse(it.at))?new Date(it.at).toISOString():now;
  if(it.about!==null&&it.about!==undefined)dayCheck(it.about);
  if(it.step&&!state.steps.some(s=>s.id===it.step))fail('That stop is no longer on the plan.');
  const https=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:null;}catch{return null;}};
  const item={id:it.id,at,by:user.name,question:cut(it.question,ASK_LIMIT),verdict:cut(it.verdict,240),answer:cut(it.answer,4000),
   because:(Array.isArray(it.because)?it.because:[]).map(l=>cut(l,400)).filter(Boolean).slice(0,6),
   days:[...new Set((Array.isArray(it.days)?it.days:[]).filter(d=>state.days.some(x=>x.date===d)))].slice(0,8),
   checkFirst:cut(it.checkFirst,800),
   sources:(Array.isArray(it.sources)?it.sources:[]).map(x=>({title:cut(x?.title,200),url:https(x?.url)||''})).filter(x=>x.url).slice(0,6),
   about:it.about||null,step:it.step||null,searches:Number.isInteger(it.searches)&&it.searches>=0?it.searches:0};
  state.askThread=[item,...(state.askThread||[]).filter(x=>x.id!==item.id)].slice(0,SHARED_KEEP);
  return {summary:null,important:false,title:item.question};
 }
 if(op.type==='askForget'){
  if(!parent)fail('The shared questions are the parents’.',403);
  const ids=Array.isArray(op.ids)?op.ids.map(String):[];if(!ids.length)fail('Nothing to clear.');
  state.askThread=(state.askThread||[]).filter(x=>!ids.includes(x.id));
  return {summary:null,important:false,title:`${ids.length} question${ids.length>1?'s':''} cleared`};
 }
 if(op.type==='allergySet'){
  if(!parent)fail('A parent keeps the allergy cards.',403);
  if(!state.members.includes(op.person))fail('Choose a family member.');
  if(!Array.isArray(op.allergens)||op.allergens.length>40||op.allergens.some(id=>!allergenById(id)))fail('Choose from the allergens on the list.');
  requireText(op.note||'',500,'note');
  state.allergies={...(state.allergies||{}),[op.person]:{allergens:[...new Set(op.allergens)],severe:!!op.severe,note:(op.note||'').trim()}};
  return {summary:null,important:false,title:`${op.person}’s allergy card`};
 }
 if(op.type==='challengeAdd'||op.type==='challengeEdit'){
  if(!string(op.title,250)||!op.title.trim())fail('Add a challenge title.');dayCheck(op.day??null);
  if(!Array.isArray(op.participants)||!op.participants.length||op.participants.some(n=>!BOYS.includes(n)))fail('Choose Nate, Boston or both.');
  const values={title:op.title.trim(),day:op.day??null,participants:[...new Set(op.participants)],notes:op.notes||'',icon:(op.icon||'').trim()};requireText(values.notes,2000,'notes');
  if([...values.icon].length>2)fail('Use one or two emoji for the picture.');
  if(op.type==='challengeAdd')state.challenges.push({id:randomUUID(),...values,diagram:'',completions:{},responses:{},skips:{}});
  else{const c=state.challenges.find(c=>c.id===op.id);if(!c)fail('Challenge not found.',404);Object.assign(c,values);}
 }else if(op.type==='challengeSkip'){
  const c=state.challenges.find(c=>c.id===op.id);if(!c)fail('Challenge not found.',404);
  if(!c.participants.includes(op.person)||(!parent&&op.person!==user.name))fail('Skip only your own missions.',403);
  if(typeof op.done!=='boolean')fail('Invalid skip.');
  let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid skip time.');at=new Date(op.at).toISOString();}
  c.skips={...(c.skips||{})};
  if(op.done){c.skips[op.person]=c.skips[op.person]||at;delete c.completions[op.person];}else delete c.skips[op.person];
 }else if(op.type==='challengeNew'){
  // Draws the next reserve mission rather than inventing one, so it works offline-first and
  // the boys can swap a mission themselves without a parent writing one.
  if(!BOYS.includes(op.person)||(!parent&&op.person!==user.name))fail('Choose your own missions.',403);
  if(!op.day||!state.days.some(d=>d.date===op.day))fail('Choose a trip day.');
  if(generatedMissions(state,op.day,op.person).length>=GENERATED_PER_DAY)fail(`That is ${GENERATED_PER_DAY} new missions for this day already. Try finishing one first.`);
  const next=nextExtraMission(state,op.day,op.person);if(!next)fail('No more missions are available.',404);
  const [title,notes,icon='']=next;
  state.challenges.push({id:randomUUID(),title,notes,icon,diagram:'',day:op.day,participants:[op.person],completions:{},responses:{},skips:{},generated:true,createdBy:user.name,createdAt:now});
 }else if(typeof op.type==='string'&&op.type.startsWith('food')){
  const custom=()=>state.foodItems.find(i=>i.id===op.id);
  const known=id=>FOOD.some(i=>i.id===id)||state.foodItems.some(i=>i.id===id);
  if(op.type==='foodTried'||op.type==='foodRating'){
   if(!known(op.itemId))fail('Unknown food.',404);
   if(!state.members.includes(op.person))fail('Choose a family member.');
   if(!parent&&op.person!==user.name)fail('Tick and rate only for yourself.',403);
   const entry=state.food[op.itemId]||{};
   if(op.type==='foodTried'){
    if(typeof op.done!=='boolean')fail('Invalid food tick.');
    let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid tasting time.');at=new Date(op.at).toISOString();}
    const tried={...(entry.tried||{})};
    if(op.done)tried[op.person]=tried[op.person]||at;else delete tried[op.person];
    state.food={...state.food,[op.itemId]:{...entry,tried}};
   }else{
    if(op.rating!==0&&!isStarRating(op.rating))fail('Rate it from 0.1 to 5 stars.');
    const ratings={...(entry.ratings||{})},tried={...(entry.tried||{})};
    if(op.rating){ratings[op.person]=op.rating;tried[op.person]=tried[op.person]||now;}else delete ratings[op.person];
    state.food={...state.food,[op.itemId]:{...entry,ratings,tried}};
   }
  }else if(op.type==='foodAdd'||op.type==='foodEdit'){
   if(!parent)fail('A parent can change the food list.',403);
   const values={en:(op.en||'').trim(),ja:(op.ja||'').trim(),romaji:(op.romaji||'').trim(),say:(op.say||'').trim(),kind:op.kind||'meal',note:op.note||''};
   if(!values.en)fail('Add the English name.');
   for(const [k,v] of Object.entries(values))requireText(v,k==='note'?2000:200,k);
   if(!FOOD_KINDS.some(([k])=>k===values.kind))fail('Choose a food group.');
   if(op.type==='foodAdd')state.foodItems.push({id:randomUUID(),...values,addedBy:user.name,createdAt:now});
   else{const item=custom();if(!item)fail('That is one of the built-in dishes. Add your own version instead.',404);Object.assign(item,values);}
  }else if(op.type==='foodRemove'){
   if(!parent)fail('A parent can change the food list.',403);
   if(!custom())fail('That is one of the built-in dishes and cannot be removed.',404);
   state.foodItems=state.foodItems.filter(i=>i.id!==op.id);
  }else fail('Unknown food action.');
 }else if(typeof op.type==='string'&&op.type.startsWith('proposal')){
  // The planning board. Everyone adds and votes; only a parent moves an idea onto a day,
  // because that is the one action here that reshapes the itinerary.
  const board=state.proposals,found=()=>{const p=board.find(p=>p.id===op.id);if(!p)fail('That idea is no longer on the planning board.',404);return p;};
  const ownVote=person=>{if(!state.members.includes(person))fail('Choose a family member.');if(!parent&&person!==user.name)fail('Vote as yourself.',403);};
  const when=label=>{if(!op.at)return now;if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail(`Invalid ${label} time.`);return new Date(op.at).toISOString();};
  if(op.type==='proposalAdd'||op.type==='proposalEdit'){
   const draft=proposalDraft(op);
   if(!draft.title)fail('Give the idea a name.');
   for(const [key,max] of [['title',250],['place',250],['japanese',250],['costNote',250],['availability',250],['notes',4000],['website',2000],['ticketUrl',2000],['mapUrl',2000]])if(!string(draft[key],max))fail(`Keep the ${key} under ${max} characters.`);
   for(const key of ['website','ticketUrl','mapUrl'])if(draft[key]&&!https(draft[key]))fail('Use an HTTPS link.');
   if(!PROPOSAL_KINDS.some(([id])=>id===draft.category))fail('Choose what kind of idea this is.');
   if(!PROPOSAL_TIMING.some(([id])=>id===draft.timing))fail('Say whether it is flexible, only at certain times, or a fixed time.');
   if(draft.day!==null&&!state.days.some(d=>d.date===draft.day))fail('Choose a trip day, or leave the day open.');
   if(draft.time!==null&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time))fail('Use a valid time.');
   if(!Number.isInteger(draft.duration)||draft.duration<0||draft.duration>1440)fail('How long it takes must be 0–1440 minutes.');
   if(draft.cost!==null&&(!Number.isFinite(draft.cost)||draft.cost<0||draft.cost>10000000))fail('Enter a cost in yen.');
   if(draft.suitableFor.some(n=>!state.members.includes(n)))fail('Choose family members.');
   if(draft.tags.length>20||draft.tags.some(t=>!string(t,50)))fail('Use up to 20 tags, each under 50 characters.');
   if(op.type==='proposalAdd'){
    if(board.length>=MAX_PROPOSALS)fail(`That is ${MAX_PROPOSALS} ideas already. Schedule or park a few first.`);
    board.push({id:randomUUID(),...draft,addedBy:user.name,createdAt:when('idea'),votes:{},musts:{},parked:false,stepId:null,scheduledBy:null,scheduledAt:null});
    return {summary:`${user.name} added ${draft.title} to the planning board`,important:true,title:draft.title};
   }
   const p=found();
   if(!parent&&p.addedBy!==user.name)fail('You can change the ideas you added.',403);
   Object.assign(p,draft);
   return {summary:null,important:false,title:draft.title};
  }
  if(op.type==='proposalVote'){
   const p=found();ownVote(op.person);
   if(![1,-1,0].includes(op.vote))fail('Vote yes, no, or clear your vote.');
   const votes={...(p.votes||{})};
   if(op.vote===0)delete votes[op.person];else votes[op.person]=op.vote;
   p.votes=votes;
   return {summary:null,important:false,title:`Planning · ${p.title}`};
  }
  if(op.type==='proposalMust'){
   const p=found();ownVote(op.person);
   if(typeof op.must!=='boolean')fail('Invalid must-do.');
   const musts={...(p.musts||{})},at=when('must-do');
   if(op.must)musts[op.person]=musts[op.person]||at;else delete musts[op.person];
   p.musts=musts;
   return {summary:null,important:false,title:`Planning · ${p.title}`};
  }
  if(op.type==='proposalPark'){
   const p=found();
   if(!parent&&p.addedBy!==user.name)fail('You can park the ideas you added.',403);
   if(typeof op.parked!=='boolean')fail('Invalid park.');
   if(op.parked&&proposalPlacement(state,p).step)fail('Take this off the itinerary before parking it.');
   p.parked=op.parked;
   return {summary:null,important:false,title:`Planning · ${p.title}`};
  }
  if(op.type==='proposalRemove'){
   const p=found();
   if(!parent&&p.addedBy!==user.name)fail('You can remove the ideas you added.',403);
   if(proposalPlacement(state,p).step)fail('This idea is on the itinerary. Remove the activity first.');
   state.proposals=board.filter(x=>x.id!==p.id);
   return {summary:null,important:false,title:p.title};
  }
  // A board idea becomes a step on a day. One shape whether it goes on a day of its own or as the
  // other lane of a split, so the two cannot drift apart.
  const stepFromProposal=(p,{day,time,kind,locked,participants,group,option,order})=>{
   state.steps.push({id:randomUUID(),title:p.title,day,time,originalTime:time,duration:p.duration||30,
    notes:proposalStepNotes(p),place:p.place,japanese:p.japanese,website:p.ticketUrl||p.website,phone:'',
    page:state.days.find(d=>d.date===day)?.pages?.[0]||1,kind,group,option,participants,order,
    travelMinutes:20,arrivalBuffer:15,locationId:null,locked,bookingTime:locked?time:null,status:'todo',
    fromProposalId:p.id});
   Object.assign(p,{stepId:state.steps.at(-1).id,scheduledBy:user.name,scheduledAt:now,parked:false});
  };
  if(op.type==='proposalSchedule'){
   if(!parent)fail('A parent adds an idea to the itinerary.',403);
   const p=found();
   if(proposalPlacement(state,p).step)fail('This idea is already on the itinerary. Move it instead.');
   if(!state.days.some(d=>d.date===op.day))fail('Choose a trip day.');
   const time=op.time||null;
   if(time!==null&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))fail('Use a valid time.');
   const kind=['fixed','flexible','optional','review'].includes(op.kind)?op.kind:(p.timing==='fixed'?'fixed':'flexible');
   const locked=kind==='fixed'||op.locked===true;
   if(locked&&!time)fail('A locked time needs a time.');
   const participants=p.suitableFor.length?[...p.suitableFor]:[...state.members];
   stepFromProposal(p,{day:op.day,time,kind,locked,participants,group:'',option:'',
    order:Math.max(0,...state.steps.filter(s=>s.day===op.day).map(s=>s.order))+10});
   return {summary:`${p.title} added to ${op.day}${time?` at ${time}`:''} from the planning board`,important:true,title:p.title};
  }
  if(op.type==='proposalInstead'){
   // Somebody would rather not do a stop that is on the plan. The idea they would do instead goes
   // on the day beside it, at the same time, and the two become a split: the ones sitting it out
   // on the new lane, everyone else on the planned one, meeting back up at the next shared stop.
   if(!parent)fail('A parent splits the day.',403);
   const p=found();
   if(proposalPlacement(state,p).step)fail('This idea is already on the itinerary. Move it instead.');
   const step=state.steps.find(s=>s.id===op.stepId);
   if(!step?.day)fail('Choose a stop on the plan.');
   if(step.group)fail('That stop is already one of a set of alternatives.');
   if(['done','skipped'].includes(step.status))fail('That stop is already finished.');
   const who=[...new Set(Array.isArray(op.who)?op.who:[])];
   if(!who.length||who.some(n=>!step.participants.includes(n)))fail('Choose who would rather not go.');
   const staying=step.participants.filter(n=>!who.includes(n));
   if(!staying.length)fail('If nobody is going, swap the stop instead of splitting the day.');
   const taken=new Set(state.steps.map(s=>s.group).filter(Boolean));
   let group=`${step.title} or ${p.title}`.slice(0,120);
   for(let n=2;taken.has(group);n++)group=`${`${step.title} or ${p.title}`.slice(0,110)} (${n})`;
   const option=step.title.slice(0,250);
   const after=state.steps.filter(s=>s.day===step.day&&s.order>step.order).map(s=>s.order);
   Object.assign(step,{group,option,participants:staying});
   const locked=p.timing==='fixed'&&!!step.time;
   stepFromProposal(p,{day:step.day,time:step.time||null,kind:locked?'fixed':'flexible',locked,participants:who,group,option:p.title.slice(0,250),
    order:after.length?(step.order+Math.min(...after))/2:step.order+5});
   state.choices[group]=option;
   state.groupModes[group]='split';
   return {summary:`${who.join(' and ')}: ${p.title} instead of ${step.title}`,important:true,title:p.title};
  }
  fail('Unknown planning action.');
 }else if(op.type==='partyPriorities'){
  // How much the weather, the cost, what we like and the votes matter to one person when we
  // choose between ideas. Everyone sets their own; a parent can set a boy's with him.
  if(!state.members.includes(op.name))fail('Choose a family member.');
  if(!parent&&op.name!==user.name)fail('You can set your own.',403);
  const current=party(state),priorities={...(current.priorities||{})};
  if(op.weights===null)delete priorities[op.name];
  else{
   const weights={...Object.fromEntries(PRIORITIES.map(([id])=>[id,2])),...(current.priorities?.[op.name]?.weights||{}),...(op.weights||{})};
   if(!validPriorities(op.weights)||!validPriorities(weights))fail('Say how much each one matters, from not fussed to matters most.');
   priorities[op.name]={weights,by:user.name,at:now};
  }
  state.party={...current,priorities};
  return {summary:null,important:false,title:`What matters to ${op.name}`};
 }else if(op.type==='partyPerson'||op.type==='partyTrip'){
  // Who is going and what they are each after. Everyone keeps their own; a parent keeps the
  // ones the five-year-old will not be filling in himself, and the trip-wide pace and budget.
  const current=party(state);
  if(op.type==='partyPerson'){
   if(!state.members.includes(op.name))fail('Choose a family member.');
   if(!parent&&op.name!==user.name)fail('You can fill in your own.',403);
   const me=personProfile(state,op.name);
   const values={age:op.age===undefined?me.age:(op.age===null||op.age===''?null:Number(op.age)),
    interests:[...new Set(Array.isArray(op.interests)?op.interests:[])],
    likes:op.likes===undefined?me.likes:cleanLikes(op.likes),
    loves:(op.loves??me.loves??'').trim(),avoid:(op.avoid??me.avoid??'').trim(),
    dietary:(op.dietary??me.dietary??'').trim(),notes:(op.notes??me.notes??'').trim()};
   if(values.age!==null&&(!Number.isInteger(values.age)||values.age<0||values.age>120))fail('Enter an age between 0 and 120.');
   if(values.interests.some(id=>!INTERESTS.some(([key])=>key===id)))fail('Choose interests from the list.');
   if(values.interests.length>INTERESTS.length)fail('Choose interests from the list.');
   if(op.likes!==undefined&&!Array.isArray(op.likes))fail('Add likes as a list of tags.');
   if(values.likes.length>MAX_LIKES)fail(`Keep it to ${MAX_LIKES} likes.`);
   if(values.likes.some(t=>t.length>MAX_LIKE_LENGTH))fail(`Keep each like under ${MAX_LIKE_LENGTH} characters.`);
   for(const key of ['loves','avoid','dietary','notes'])requireText(values[key],500,key);
   state.party={...current,people:{...current.people,[op.name]:{...values,by:user.name,at:now}}};
   return {summary:null,important:false,title:`${op.name}’s travel profile`};
  }
  if(!parent)fail('A parent sets the pace and the budget.',403);
  const pace=PACES.some(([id])=>id===op.pace)?op.pace:fail('Choose how full the days should be.');
  const budget=op.budget===null||op.budget===undefined||op.budget===''?null:Number(op.budget);
  if(budget!==null&&(!Number.isFinite(budget)||budget<0||budget>10000000))fail('Enter a daily budget in yen.');
  const notes=(op.notes??current.notes??'').trim();requireText(notes,2000,'notes');
  state.party={...current,pace,budget:budget===null?null:Math.round(budget),notes};
  return {summary:null,important:false,title:'How we want the days to go'};
 }else if(op.type==='phraseSeen'){
  // Everyone gets the phrase of the day, and each person marks off their own.
  if(!state.members.includes(op.person))fail('Choose a family member.');
  if(!parent&&op.person!==user.name)fail('Mark your own phrase as seen.',403);
  if(op.day!==null&&op.day!==undefined&&!state.days.some(d=>d.date===op.day))fail('Choose a trip day.');
  if(!op.day&&!op.phraseIds?.length)fail('Choose a trip day.');
  let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid phrase time.');at=new Date(op.at).toISOString();}
  if(op.day){
   const seen={...(state.phraseSeen[op.day]||{})};
   seen[op.person]=seen[op.person]||at;
   state.phraseSeen={...state.phraseSeen,[op.day]:seen};
  }
  // Every phrase actually put in front of someone goes in their own log, once.
  if(op.phraseIds!==undefined){
   if(!Array.isArray(op.phraseIds)||op.phraseIds.length>ALL_PHRASES().length)fail('Invalid phrase list.');
   const log={...(state.phraseLog[op.person]||{})};
   for(const id of op.phraseIds){
    if(!findPhrase(id))fail('Unknown phrase.',404);
    log[id]=log[id]||at;
   }
   state.phraseLog={...state.phraseLog,[op.person]:log};
  }
 }else if(op.type==='factSeen'){
  // The fun fact works exactly like the phrase: everyone gets the day's one, and each person
  // marks off their own, so the boys are not tied to their parents' pace.
  if(!state.members.includes(op.person))fail('Choose a family member.');
  if(!parent&&op.person!==user.name)fail('Mark your own fact as seen.',403);
  if(op.day!==null&&op.day!==undefined&&!state.days.some(d=>d.date===op.day))fail('Choose a trip day.');
  if(!op.day&&!op.factIds?.length)fail('Choose a trip day.');
  let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid fact time.');at=new Date(op.at).toISOString();}
  if(op.day){
   const seen={...(state.factSeen[op.day]||{})};
   seen[op.person]=seen[op.person]||at;
   state.factSeen={...state.factSeen,[op.day]:seen};
  }
  // Every fact actually put in front of someone goes in their own log, once.
  if(op.factIds!==undefined){
   if(!Array.isArray(op.factIds)||op.factIds.length>ALL_FACTS().length)fail('Invalid fact list.');
   const log={...(state.factLog[op.person]||{})};
   for(const id of op.factIds){
    if(!findFact(id))fail('Unknown fact.',404);
    log[id]=log[id]||at;
   }
   state.factLog={...state.factLog,[op.person]:log};
  }
 }else if(op.type==='weatherUpdate'){
  // A cache of what a free forecast service said, kept in the trip so one phone's lookup
  // serves the whole family and the numbers are still there with no signal.
  if(!op.days||typeof op.days!=='object'||Array.isArray(op.days))fail('Invalid forecast.');
  const entries=Object.entries(op.days);
  if(entries.length>40)fail('Invalid forecast.');
  const days={...state.weather.days};
  for(const [date,e] of entries){
   if(!state.days.some(d=>d.date===date))continue;
   if(!e||!Number.isInteger(e.code)||!Number.isInteger(e.max)||!Number.isInteger(e.min))fail('Invalid forecast.');
   if(e.max<-50||e.max>60||e.min<-60||e.min>50||e.min>e.max)fail('Invalid forecast.');
   if(e.rain!==null&&!(Number.isInteger(e.rain)&&e.rain>=0&&e.rain<=100))fail('Invalid forecast.');
   if(!string(e.city,80))fail('Invalid forecast.');
   // Sunrise and sunset are a clock time or nothing; an older phone sends neither.
   for(const k of ['sunrise','sunset'])if(e[k]!==null&&e[k]!==undefined&&!(typeof e[k]==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(e[k])))fail('Invalid forecast.');
   days[date]={city:e.city,code:e.code,max:e.max,min:e.min,rain:e.rain??null,sunrise:e.sunrise??null,sunset:e.sunset??null};
  }
  // The same forecast by the hour, kept beside it. Checked as hard as the daily numbers,
  // because a graph drawn from nonsense is a more convincing kind of wrong.
  const hourReading=(x,message='Invalid hourly forecast.')=>{
   if(!x||!Number.isInteger(x.h)||x.h<0||x.h>23)fail(message);
   if(!Number.isInteger(x.temp)||x.temp<-60||x.temp>60)fail(message);
   if(x.feels!==null&&x.feels!==undefined&&(!Number.isInteger(x.feels)||x.feels<-70||x.feels>70))fail(message);
   if(x.rain!==null&&x.rain!==undefined&&(!Number.isInteger(x.rain)||x.rain<0||x.rain>100))fail(message);
   if(x.code!==null&&x.code!==undefined&&!Number.isInteger(x.code))fail(message);
   return {h:x.h,temp:x.temp,feels:x.feels??null,rain:x.rain??null,code:x.code??null};
  };
  const hours={...(state.weather.hours||{})};
  if(op.hours!==undefined){
   if(!op.hours||typeof op.hours!=='object'||Array.isArray(op.hours))fail('Invalid forecast.');
   const byDay=Object.entries(op.hours);
   if(byDay.length>40)fail('Invalid forecast.');
   for(const [date,list] of byDay){
    if(!state.days.some(d=>d.date===date))continue;
    if(!Array.isArray(list)||!list.length||list.length>24)fail('Invalid hourly forecast.');
    hours[date]=list.map(x=>hourReading(x)).sort((a,b)=>a.h-b.h);
   }
  }
  // Each stop's own hour in its own neighbourhood, kept by stop so the card can say what it will
  // be like there and then. Stops that are no longer in the plan are simply not kept.
  const steps={...(state.weather.steps||{})};
  if(op.steps!==undefined){
   if(!op.steps||typeof op.steps!=='object'||Array.isArray(op.steps))fail('Invalid forecast.');
   const byStep=Object.entries(op.steps);
   if(byStep.length>600)fail('Invalid forecast.');
   for(const [id,x] of byStep){
    if(!state.steps.some(s=>s.id===id))continue;
    if(!string(x?.area,80))fail('Invalid stop forecast.');
    steps[id]={...hourReading(x,'Invalid stop forecast.'),area:x.area};
   }
  }
  state.weather={at:now,by:user.name,days,hours,steps};
 }else if(op.type==='photoVote'){
  // One vote each per day, and you can change your mind. Voting for your own is allowed —
  // they are brothers, they will vote for their own, and everyone can see who voted.
  if(!state.members.includes(op.person))fail('Choose a family member.');
  if(!parent&&op.person!==user.name)fail('Vote for yourself, not for someone else.',403);
  if(!op.day||!state.days.some(d=>d.date===op.day))fail('Choose a trip day.');
  const entry=state.photos.find(p=>p.id===op.id&&p.day===op.day);
  if(op.id!==null&&!entry)fail('Photo not found.',404);
  const votes={...(state.photoVotes[op.day]||{})};
  if(op.id===null)delete votes[op.person];else votes[op.person]=op.id;
  state.photoVotes={...state.photoVotes,[op.day]:votes};
 }else if(op.type==='photoRemove'){
  const entry=state.photos.find(p=>p.id===op.id);if(!entry)fail('Photo not found.',404);
  // Yours to remove if it is your photo or you are the one who put it on.
  if(!parent&&entry.by!==user.name&&(entry.for||entry.by)!==user.name)fail('You can only remove your own photos.',403);
  state.photos=state.photos.filter(p=>p.id!==op.id);
  const votes={...(state.photoVotes[entry.day]||{})};
  for(const [who,id] of Object.entries(votes))if(id===op.id)delete votes[who];
  state.photoVotes={...state.photoVotes,[entry.day]:votes};
 }else if(op.type==='drawingRemove'){
  const entry=state.drawings.find(d=>d.id===op.id);if(!entry)fail('Drawing not found.',404);
  // Yours to remove if you drew it or you are the one who sent it. A drawing is somebody's
  // own work, so nobody else takes it down.
  if(!parent&&entry.by!==user.name&&(entry.for||entry.by)!==user.name)fail('You can only remove your own drawings.',403);
  state.drawings=state.drawings.filter(d=>d.id!==op.id);
 }else if(op.type==='photoAssign'){
  // Handing a photo to whoever it belongs to, after the fact — because the answer to "whose
  // is this?" is usually worked out once everyone has seen it.
  const entry=state.photos.find(p=>p.id===op.id);if(!entry)fail('Photo not found.',404);
  if(!state.members.includes(op.person))fail('Choose a family member.');
  if(!parent&&entry.by!==user.name)fail('Only a parent can hand someone else\u2019s photo over.',403);
  state.photos=state.photos.map(p=>p.id===op.id?{...p,for:op.person}:p);
 }else if(op.type==='gameScore'){
  // Only ever your own, and only ever upwards: a best score is a best score.
  if(!state.members.includes(op.person))fail('Choose a family member.');
  if(!parent&&op.person!==user.name)fail('Keep your own score.',403);
  if(!string(op.game,40)||!op.game)fail('Unknown game.');
  if(!Number.isInteger(op.score)||op.score<0||op.score>9999)fail('Invalid score.');
  const mine={...(state.games.scores[op.person]||{})};
  mine[op.game]=Math.max(mine[op.game]||0,op.score);
  state.games={...state.games,scores:{...state.games.scores,[op.person]:mine}};
 }else if(op.type==='jankenThrow'){
  // Both hands land in the same round, and neither is sent to the other phone until both
  // are in — see server/visibility.mjs. Changing a thrown hand is not a thing.
  if(!state.members.includes(op.person))fail('Choose a family member.');
  if(!parent&&op.person!==user.name)fail('Throw your own hand.',403);
  if(!JANKEN_THROWS.includes(op.choice))fail('Choose rock, paper or scissors.');
  if(!Array.isArray(op.players)||op.players.length!==2||op.players.some(p=>!state.members.includes(p))||op.players[0]===op.players[1])fail('Choose two players.');
  if(!op.players.includes(op.person))fail('You are not in this round.',403);
  const current=state.games.janken.round;
  const same=current&&!current.done&&current.players.length===op.players.length&&current.players.every(p=>op.players.includes(p));
  const round=same?{...current,throws:{...current.throws}}:{id:randomUUID(),players:[...op.players],throws:{},at:now};
  if(round.throws[op.person])fail('You have already thrown this round.');
  round.throws[op.person]=op.choice;
  const [a,b]=round.players;
  if(round.throws[a]&&round.throws[b]){
   const winner=jankenWinner(round.throws[a],round.throws[b]);
   round.done=true;round.at=now;
   round.winner=winner===null?null:winner==='a'?a:b;
   if(round.winner){
    const scores={...state.games.janken.scores};
    scores[round.winner]=(scores[round.winner]||0)+1;
    state.games={...state.games,janken:{...state.games.janken,scores}};
   }
  }
  state.games={...state.games,janken:{...state.games.janken,round}};
 }else if(op.type==='jankenNewRound'){
  if(!parent&&!BOYS.includes(user.name))fail('Play your own game.',403);
  state.games={...state.games,janken:{...state.games.janken,round:null}};
 }else if(op.type==='jankenReset'){
  if(!parent)fail('A parent can clear the scores.',403);
  state.games={...state.games,janken:{round:null,scores:{}}};
 }else if(op.type==='phraseAdd'||op.type==='phraseEdit'){
  // A phrase the family wanted and the book did not have. Typed or translated, it is checked
  // here either way — nothing is trusted because a model produced it.
  if(!parent)fail('A parent can add phrases.',403);
  const values={en:(op.en||'').trim(),ja:(op.ja||'').trim(),romaji:(op.romaji||'').trim(),say:(op.say||'').trim(),note:(op.note||'').trim()};
  if(!values.en)fail('Add the English.');
  if(!values.ja)fail('Add the Japanese.');
  for(const [k,v] of Object.entries(values))if(!string(v,k==='note'?500:200))fail(`Invalid ${k}.`);
  if(!/[぀-ヿ一-龯]/.test(values.ja))fail('The Japanese needs to be in Japanese.');
  if(op.type==='phraseAdd'){
   if(state.customPhrases.length>=100)fail('That is a hundred of our own phrases already.');
   state.customPhrases=[...state.customPhrases,{id:randomUUID(),...values,by:user.name,at:now,source:op.source==='translated'?'translated':'typed'}];
  }else{
   const item=state.customPhrases.find(p=>p.id===op.id);if(!item)fail('Phrase not found.',404);
   Object.assign(item,values);
  }
 }else if(op.type==='phraseRemove'){
  if(!parent)fail('A parent can remove phrases.',403);
  if(!state.customPhrases.some(p=>p.id===op.id))fail('Phrase not found.',404);
  state.customPhrases=state.customPhrases.filter(p=>p.id!==op.id);
 }else if(op.type==='voiceNoteRemove'){
  // Your own voice is yours to take back; a parent can remove any of them.
  const note=state.voiceNotes.find(v=>v.id===op.id);if(!note)fail('Voice note not found.',404);
  if(!parent&&note.by!==user.name)fail('You can only remove your own voice notes.',403);
  state.voiceNotes=state.voiceNotes.filter(v=>v.id!==op.id);
 }else if(op.type==='voiceNoteLabel'){
  const note=state.voiceNotes.find(v=>v.id===op.id);if(!note)fail('Voice note not found.',404);
  if(!parent&&note.by!==user.name)fail('You can only label your own voice notes.',403);
  if(typeof op.title!=='string'||op.title.length>200)fail('Keep the label short.');
  note.title=op.title.trim();
 }else if(op.type==='voiceNoteWords'){
  // The words of a voice note, added or corrected afterwards by whoever recorded it, or a parent.
  const note=state.voiceNotes.find(v=>v.id===op.id);if(!note)fail('Voice note not found.',404);
  if(!parent&&note.by!==user.name)fail('You can only write down your own voice notes.',403);
  if(typeof op.transcript!=='string'||op.transcript.length>6000)fail('The words are too long to keep.');
  const words=op.transcript.trim();if(words)note.transcript=words;else delete note.transcript;
  return {summary:null,important:false,title:note.title||'Voice note'};
 }else if(op.type==='exchangeRate'){
  if(!parent)fail('A parent can set the rate.',403);
  if(!Number.isFinite(op.perAud)||op.perAud<1||op.perAud>1000)fail('Enter how many yen one Australian dollar buys.');
  state.rates={perAud:Math.round(op.perAud*100)/100,at:now,by:user.name,source:op.source==='live'?'live':'manual'};
 }else if(op.type==='parkRide'){
  const ride=findRide(op.rideId);if(!ride)fail('Unknown ride.',404);
  if(!state.members.includes(op.person))fail('Choose a family member.');
  if(!parent&&op.person!==user.name)fail('Tick only your own rides.',403);
  if(typeof op.done!=='boolean')fail('Invalid ride tick.');
  let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid ride time.');at=new Date(op.at).toISOString();}
  const entry=state.parkRides[op.rideId]||{},ridden={...(entry.ridden||{})};
  if(op.done)ridden[op.person]=ridden[op.person]||at;else delete ridden[op.person];
  state.parkRides={...state.parkRides,[op.rideId]:{...entry,ridden}};
 }else if(op.type==='parkMust'){
  const ride=findRide(op.rideId);if(!ride)fail('Unknown ride.',404);
  if(typeof op.must!=='boolean')fail('Invalid must-do.');
  const entry=state.parkRides[op.rideId]||{};
  state.parkRides={...state.parkRides,[op.rideId]:{...entry,must:op.must}};
 }else if(op.type==='familyHeights'){
  const next={};
  for(const name of BOYS){
   const value=op.heights?.[name];
   if(value===null||value===undefined||value==='')continue;
   if(!Number.isInteger(value)||value<50||value>220)fail('Enter a height between 50cm and 220cm.');
   next[name]=value;
  }
  state.heights=next;
 }else if(op.type==='eyeSpy'){
  const leg=state.steps.find(s=>s.id===op.stepId);
  if(!leg||!isTrainLeg(leg))fail('That is not a train leg.',404);
  if(!EYE_SPY.some(i=>i.id===op.item))fail('Unknown thing to spot.',404);
  if(!BOYS.includes(op.person)||(!parent&&op.person!==user.name))fail('Tick only your own list.',403);
  if(typeof op.done!=='boolean')fail('Invalid spot.');
  let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid spot time.');at=new Date(op.at).toISOString();}
  const key=eyeSpyKey(op.stepId,op.item),found={...(state.eyeSpy[key]||{})};
  if(op.done)found[op.person]=found[op.person]||at;else delete found[op.person];
  state.eyeSpy={...state.eyeSpy,[key]:found};
  if(!Object.keys(found).length)delete state.eyeSpy[key];
 }else if(op.type==='bingoTick'){
  // A bingo square, or one part of a set such as one coin of the six. Anyone in the family plays;
  // a child ticks only their own card.
  if(!state.members.includes(op.person))fail('Choose a family member.');
  if(!parent&&op.person!==user.name)fail('Tick only your own card.',403);
  const square=findSquare(op.square);if(!square)fail('Unknown bingo square.',404);
  if(square.parts?!square.parts.some(p=>p.id===op.part):op.part!=null)fail('Unknown part of that square.');
  if(typeof op.done!=='boolean')fail('Invalid tick.');
  let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid tick time.');at=new Date(op.at).toISOString();}
  const mine={round:1,card:null,...(state.bingo[op.person]||{})},done={...(mine.done||{})},key=square.parts?`${square.id}:${op.part}`:square.id;
  if(op.done)done[key]=done[key]||at;else delete done[key];
  state.bingo={...state.bingo,[op.person]:{...mine,done}};
 }else if(op.type==='bingoCard'){
  // A fresh card, dealt on the phone from the squares not done yet. The round only goes up, so
  // two phones dealing the same next card at once land on the same card.
  if(!state.members.includes(op.person))fail('Choose a family member.');
  if(!parent&&op.person!==user.name)fail('Deal only your own card.',403);
  if(!validCard(op.card))fail('That is not a bingo card.');
  const mine={round:1,card:null,done:{},...(state.bingo[op.person]||{})};
  if(!Number.isInteger(op.round)||op.round<2||op.round>999)fail('Invalid card number.');
  if(op.round>(mine.round||1))state.bingo={...state.bingo,[op.person]:{...mine,round:op.round,card:[...op.card]}};
 }else if(op.type==='challengeRemove'){
  state.challenges=state.challenges.filter(c=>c.id!==op.id);
 }else if(op.type==='challengeStatus'){
  const c=state.challenges.find(c=>c.id===op.id);if(!c)fail('Challenge not found.',404);
  if(!c.participants.includes(op.person)||(!parent&&op.person!==user.name))fail('Tick only your own challenges.',403);
  if(typeof op.done!=='boolean')fail('Invalid completion.');
  let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid completion time.');at=new Date(op.at).toISOString();}
  if(op.response!==undefined){requireText(op.response,2000,'challenge notes');c.responses={...(c.responses||{}),[op.person]:op.response};}
  if(op.done)c.completions[op.person]=c.completions[op.person]||at;else delete c.completions[op.person];
 }else if(op.type==='shoppingAdd'||op.type==='shoppingEdit'){
  if(!string(op.title,250)||!op.title.trim())fail('Add an item name.');dayCheck(op.day??null);
  const item={title:op.title.trim(),day:op.day??null,person:op.person||'Family',store:op.store||'',notes:op.notes||'',url:op.url||'',quantity:op.quantity??1,budget:op.budget??null,taxFree:op.taxFree===true};
  if(!['Family',...state.members].includes(item.person))fail('Choose a family member.');
  for(const key of ['store','notes','url'])requireText(item[key],key==='notes'?2000:2000,key);
  if(item.url){try{if(new URL(item.url).protocol!=='https:')fail('Use an HTTPS shopping link.');}catch{fail('Use an HTTPS shopping link.');}}
  if(!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>999)fail('Quantity must be 1–999.');
  if(item.budget!==null&&(!Number.isFinite(item.budget)||item.budget<0||item.budget>10000000))fail('Enter a valid yen budget.');
  if(op.type==='shoppingAdd')state.shopping.push({id:randomUUID(),...item,createdBy:user.name,createdAt:now,boughtAt:null});
  else{const found=state.shopping.find(s=>s.id===op.id);if(!found)fail('Shopping item not found.',404);Object.assign(found,item);}
 }else if(op.type==='shoppingStatus'){
  const item=state.shopping.find(s=>s.id===op.id);if(!item)fail('Shopping item not found.',404);if(typeof op.done!=='boolean')fail('Invalid shopping status.');
  item.boughtAt=op.done?now:null;item.boughtBy=op.done?user.name:null;
 }else if(op.type==='shoppingRemove'){
  state.shopping=state.shopping.filter(s=>s.id!==op.id);
 }else if(typeof op.type==='string'&&op.type.startsWith('shortlist')){
  // The purchase shortlist: something seen in a shop and not bought. Anyone puts one on and
  // anyone says where the family got to on it, because a boy standing in front of the thing with
  // his own money in his pocket is exactly who found it and exactly who is deciding. Rewriting
  // somebody else's find or taking it off the list stays with whoever added it and with a parent,
  // the same rule the planning board runs on.
  const found=()=>{const entry=state.shortlist.find(s=>s.id===op.id);if(!entry)fail('That is no longer on the shortlist.',404);return entry;};
  const when=label=>{if(!op.at)return now;if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail(`Invalid ${label} time.`);return new Date(op.at).toISOString();};
  if(op.type==='shortlistAdd'||op.type==='shortlistEdit'){
   if(!string(op.title,250)||!op.title.trim())fail('Say what it is.');
   dayCheck(op.day??null);
   const item={title:op.title.trim(),shop:(op.shop||'').trim(),place:(op.place||'').trim(),
    notes:(op.notes||'').trim(),person:op.person||'Family',day:op.day??null,
    price:op.price===undefined||op.price===''?null:op.price,
    stepId:op.stepId||null,locationId:op.locationId||null,
    pin:op.pin??null,rating:op.rating===undefined||op.rating===''||op.rating===0?null:op.rating,
    tags:[...new Set((Array.isArray(op.tags)?op.tags:[]).map(t=>String(t).trim()).filter(Boolean))],taxFree:op.taxFree===true};
   if(!['Family',...state.members].includes(item.person))fail('Choose a family member.');
   for(const [key,max] of [['shop',250],['place',250],['notes',2000]])requireText(item[key],max,key);
   // Where it was, pinned to the trip itself rather than only described. One anchor, not two: a
   // place off the map and an activity on the timeline are two answers to the same question, and
   // a card carrying both is a card that can disagree with itself.
   if(item.locationId&&item.stepId)fail('Pin a find to a place or to an activity, not both.');
   if(item.locationId&&!(state.locations||[]).some(l=>l.id===item.locationId))fail('Choose a place from the map list.');
   if(item.stepId&&!state.steps.some(s=>s.id===item.stepId))fail('Activity not found.',404);
   // An activity already knows which day it is on, so a find pinned to one takes its day from it
   // rather than keeping a second day that can drift away from it.
   if(item.stepId)item.day=null;
   // The price is what the ticket said, in yen, and a ticket does not say 1200.5.
   if(item.price!==null&&(!Number.isInteger(item.price)||item.price<0||item.price>10000000))fail('Enter the price in whole yen.');
   // How much we want it, which a price cannot answer. Nought is nobody having said, which is
   // stored as nothing rather than as a bad score.
   if(item.rating!==null&&!(Number.isInteger(item.rating)&&item.rating>=1&&item.rating<=SHORTLIST_STARS))fail(`Rate it from 1 to ${SHORTLIST_STARS} stars.`);
   // Where the phone was standing when it photographed the thing. Stored exactly as it was read
   // or not at all: half a pair is a bug, not a place.
   if(!validPin(item.pin))fail('A pinned position needs a latitude and a longitude.');
   if(item.tags.length>20||item.tags.some(t=>!string(t,50)))fail('Use up to 20 tags, each under 50 characters.');
   if(op.type==='shortlistAdd'){
    if(state.shortlist.length>=MAX_SHORTLIST)fail(`That is ${MAX_SHORTLIST} things on the shortlist already. Decide on a few first.`);
    state.shortlist.push({id:randomUUID(),...item,status:'thinking',photo:null,shoppingId:null,
     addedBy:user.name,createdAt:when('shortlist'),decidedBy:null,decidedAt:null});
    return {summary:null,important:false,title:item.title};
   }
   const entry=found();
   if(!parent&&entry.addedBy!==user.name)fail('You can change the things you added.',403);
   Object.assign(entry,item);
   return {summary:null,important:false,title:item.title};
  }
  // Saying how much we want it is the same kind of act as saying whether we are getting it —
  // anyone does it, from the card, standing in front of the thing — so it is its own small
  // operation rather than a round trip through the whole form.
  if(op.type==='shortlistRating'){
   const entry=found();
   if(op.rating!==0&&!(Number.isInteger(op.rating)&&op.rating>=1&&op.rating<=SHORTLIST_STARS))fail(`Rate it from 1 to ${SHORTLIST_STARS} stars.`);
   entry.rating=op.rating===0?null:op.rating;
   return {summary:null,important:false,title:entry.title};
  }
  if(op.type==='shortlistStatus'){
   const entry=found();
   if(!SHORTLIST_STATUS.some(([id])=>id===op.status))fail('Say whether we are getting it, passing on it, or still deciding.');
   // Back to undecided is the decision being taken back, so who decided goes with it rather
   // than leaving a name against an answer nobody is giving any more.
   const at=when('decision');
   Object.assign(entry,{status:op.status,decidedBy:op.status==='thinking'?null:user.name,decidedAt:op.status==='thinking'?null:at});
   return {summary:null,important:false,title:entry.title};
  }
  // Deciding to get something is the moment it stops being a shortlist question and becomes
  // shopping, so it can be handed straight to the shopping list — which is the page with the
  // budget, the quantity and the tick — carrying its shop, its price and its notes across, and
  // linked both ways so neither page has to be told about it twice. Offered once: a find already
  // over there is not offered again, the same as a thing to buy already moved to a boy's purse.
  if(op.type==='shortlistShop'){
   const entry=found();
   if(entry.shoppingId&&state.shopping.some(s=>s.id===entry.shoppingId))fail('That is already on the shopping list.');
   if(!['yes','bought'].includes(entry.status))fail('Say we are getting it first, then it can go on the shopping list.');
   const day=entry.stepId?(state.steps.find(s=>s.id===entry.stepId)?.day??null):entry.day;
   extraOperation(state,{type:'shoppingAdd',title:entry.title,person:entry.person,day,quantity:1,
    budget:entry.price??null,store:[entry.shop,entry.place].filter(Boolean).join(' · '),url:'',
    notes:entry.notes,taxFree:!!entry.taxFree},user,fail,now);
   const created=state.shopping.at(-1);
   created.shortlistId=entry.id;
   entry.shoppingId=created.id;
   return {summary:null,important:false,title:entry.title};
  }
  if(op.type==='shortlistRemove'){
   const entry=found();
   if(!parent&&entry.addedBy!==user.name)fail('You can take off the things you added.',403);
   // Whatever went to the shopping list stays there — it is a thing to buy now, not a question
   // any more — but it stops claiming to have come from a find that no longer exists.
   for(const item of state.shopping)if(item.shortlistId===entry.id)item.shortlistId=null;
   state.shortlist=state.shortlist.filter(s=>s.id!==entry.id);
   return {summary:null,important:false,title:entry.title};
  }
  fail('Unknown shortlist action.');
 }else if(op.type==='noticedAdd'||op.type==='noticedEdit'||op.type==='noticedRemove'){
  // Things we noticed. Anyone adds one, the boys included; changing or removing one is for
  // whoever said it, or a parent.
  const list=state.noticed;
  const found=()=>{const n=list.find(n=>n.id===op.id);if(!n)fail('That one is no longer there.',404);
   if(!parent&&n.by!==user.name)fail('Only whoever said it, or a parent, can change it.',403);return n;};
  if(op.type==='noticedRemove'){const n=found();state.noticed=list.filter(x=>x.id!==n.id);return {summary:null,important:false,title:'Something we noticed'};}
  if(!string(op.text,NOTICED_TEXT)||!op.text.trim())fail('Say what you noticed.');
  dayCheck(op.day??null);
  if(op.stepId&&op.locationId)fail('Tag it to a stop or to a place, not both.');
  if(op.stepId&&!state.steps.some(s=>s.id===op.stepId))fail('Activity not found.',404);
  if(op.locationId&&!(state.locations||[]).some(l=>l.id===op.locationId))fail('Choose a place from the map list.');
  if(!validPin(op.pin??null))fail('That position could not be read.');
  // A report is a noticing with a kind on it; the kind has to be one of ours, and the minutes
  // only mean something on a queue.
  if(op.report!=null&&(typeof op.report!=='object'||!findReportKind(op.report.kind)||(op.report.minutes!=null&&!(Number.isInteger(op.report.minutes)&&op.report.minutes>0&&op.report.minutes<=600))))fail('That is not a report we know.');
  if(op.item!=null){
   const kinds={hunt:()=>(state.hunts?.entries||[]).some(e=>e.id===op.item.id),find:()=>(state.shortlist||[]).some(f=>f.id===op.item.id),voice:()=>(state.voiceNotes||[]).some(v=>v.id===op.item.id)};
   if(typeof op.item!=='object'||!kinds[op.item.kind]||typeof op.item.id!=='string'||!kinds[op.item.kind]())fail('That item is no longer on its list.');
  }
  const fields=noticedFields(op);
  if(op.type==='noticedEdit'){const n=found();Object.assign(n,fields,{spoken:n.spoken||fields.spoken});return {summary:null,important:false,title:'Something we noticed'};}
  if(list.length>=MAX_NOTICED)fail(`That is ${MAX_NOTICED} already.`);
  let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid time.');at=new Date(op.at).toISOString();}
  state.noticed=[...list,{id:randomUUID(),...fields,by:user.name,at}];
  return {summary:null,important:false,title:'Something we noticed'};
 }else if(typeof op.type==='string'&&op.type.startsWith('hunt')){
  // The hunts. Anyone adds a find and anyone starts a new hunt, the boys included; everyone
  // rates for themselves; changing or removing a find is for whoever added it, or a parent.
  const hunts=state.hunts;hunts.rankings=hunts.rankings||{};
  const findHuntTitle=id=>[...HUNTS,...hunts.custom].find(h=>h.id===id)?.title||'';
  const known=id=>HUNTS.some(h=>h.id===id)||hunts.custom.some(h=>h.id===id);
  const found=()=>{const e=hunts.entries.find(e=>e.id===op.id);if(!e)fail('That one is no longer on the list.',404);return e;};
  const stamp=()=>{if(!op.at)return now;if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid time.');return new Date(op.at).toISOString();};
  const rating=v=>{if(v!==0&&!isStarRating(v))fail('Rate it from 0.1 to 5 stars.');return v;};
  const check=o=>{
   if(!known(o.hunt))fail('Choose a hunt.');
   if(!string(o.title,120)||!o.title.trim())fail('Say what it was.');
   requireText(o.place||'',200,'place');requireText(o.note||'',1000,'note');
   dayCheck(o.day??null);
   if(o.yen!=null&&!(Number.isInteger(o.yen)&&o.yen>=0&&o.yen<=1000000))fail('Enter the price as whole yen.');
   // Where it was: a stop on the plan or a place off our map, not both, and optionally where the
   // phone was standing, stored as read, the same as a shop find.
   if(o.stepId&&o.locationId)fail('Tag it to a stop or to a place, not both.');
   if(o.stepId&&!state.steps.some(s=>s.id===o.stepId))fail('Activity not found.',404);
   if(o.locationId&&!(state.locations||[]).some(l=>l.id===o.locationId))fail('Choose a place from the map list.');
   if(!validPin(o.pin??null))fail('That position could not be read.');
   if(o.status!=null&&!['want','tried'].includes(o.status))fail('Choose tried or want to try.');
  };
  if(op.type==='huntPick'){
   if(!state.members.includes(op.person))fail('Choose a family member.');
   if(!parent&&op.person!==user.name)fail('Pick your own hunts.',403);
   if(!known(op.hunt))fail('Choose a hunt.');
   if(typeof op.picked!=='boolean')fail('Invalid pick.');
   const picks={...(hunts.picks||{})},mine={...(picks[op.person]||{})};
   if(op.picked)mine[op.hunt]=mine[op.hunt]||stamp();else delete mine[op.hunt];
   hunts.picks={...picks,[op.person]:mine};
   return {summary:null,important:false,title:findHuntTitle(op.hunt)};
  }
  if(op.type==='huntNew'){
   if(!string(op.title,60)||!op.title.trim())fail('Name the hunt, such as “Melon pan”.');
   if(!string(op.icon||'',16))fail('Invalid icon.');
   if(hunts.custom.length>=MAX_CUSTOM_HUNTS)fail(`That is ${MAX_CUSTOM_HUNTS} hunts already.`);
   const title=op.title.trim();
   if([...HUNTS,...hunts.custom].some(h=>h.title.toLowerCase()===title.toLowerCase()))fail('There is already a hunt with that name.');
   if(!string(op.hint||'',200))fail('Keep the description short.');
   hunts.custom=[...hunts.custom,{id:randomUUID(),title,icon:(op.icon||'').trim()||'⭐',hint:(op.hint||'').trim(),by:user.name,at:now}];
   return {summary:null,important:false,title};
  }
  if(op.type==='huntAdd'){
   check(op);
   if(hunts.entries.length>=MAX_HUNT_ENTRIES)fail('That is a thousand finds already.');
   // Something bought off the shortlist, going in to be rated: once only, and it has to exist.
   if(op.shortlistId!=null){
    if(!(state.shortlist||[]).some(f=>f.id===op.shortlistId))fail('That shop find is no longer on the shortlist.',404);
    if(hunts.entries.some(e=>e.shortlistId===op.shortlistId))fail('That one is already in a list.');
   }
   const ratings={};if(op.status!=='want'&&op.rating!==undefined&&rating(op.rating))ratings[user.name]=op.rating;
   const at=stamp(),fields=huntEntryFields(op);
   hunts.entries=[...hunts.entries,{id:randomUUID(),...fields,ratings,by:user.name,at,...(fields.status==='tried'?{triedAt:at,triedBy:user.name}:{})}];
   return {summary:null,important:false,title:op.title.trim()};
  }
  if(op.type==='huntEdit'){
   const e=found();
   if(!parent&&e.by!==user.name)fail('Only whoever added it, or a parent, can change it.',403);
   check({...op,hunt:e.hunt,status:undefined});
   Object.assign(e,{...huntEntryFields({...op,hunt:e.hunt,status:e.status,shortlistId:e.shortlistId})});
   return {summary:null,important:false,title:e.title};
  }
  if(op.type==='huntRate'){
   const e=found();
   if(!state.members.includes(op.person))fail('Choose a family member.');
   if(!parent&&op.person!==user.name)fail('Rate only for yourself.',403);
   const ratings={...(e.ratings||{})};
   if(rating(op.rating))ratings[op.person]=op.rating;else delete ratings[op.person];
   e.ratings=ratings;
   // Giving it stars is saying we have had it.
   if(op.rating&&e.status==='want')Object.assign(e,{status:'tried',triedAt:now,triedBy:user.name});
   return {summary:null,important:false,title:e.title};
  }
  if(op.type==='huntRemove'){
   const e=found();
   if(!parent&&e.by!==user.name)fail('Only whoever added it, or a parent, can take it off.',403);
   hunts.entries=hunts.entries.filter(x=>x.id!==e.id);
   const lists=hunts.rankings[e.hunt]||{};
   hunts.rankings={...hunts.rankings,[e.hunt]:Object.fromEntries(Object.entries(lists).map(([n,ids])=>[n,ids.filter(id=>id!==e.id)]))};
   return {summary:null,important:false,title:e.title};
  }
  // Found it and tried it — or, taken back, still to find. Anyone ticks it, like the to-do list.
  // Going back to "want to try" takes it out of everybody's order until it is tried again.
  if(op.type==='huntTried'){
   const e=found();
   if(typeof op.done!=='boolean')fail('Invalid tick.');
   if(op.done)Object.assign(e,{status:'tried',triedAt:stamp(),triedBy:user.name});
   else{
    Object.assign(e,{status:'want',triedAt:null,triedBy:null});
    const lists=hunts.rankings[e.hunt]||{};
    hunts.rankings={...hunts.rankings,[e.hunt]:Object.fromEntries(Object.entries(lists).map(([n,ids])=>[n,ids.filter(id=>id!==e.id)]))};
   }
   return {summary:null,important:false,title:e.title};
  }
  // Each person's own order, dragged into place. Only finds from that hunt, each once; a boy
  // orders his own list and nobody else's.
  if(op.type==='huntRank'){
   if(!known(op.hunt))fail('Choose a hunt.');
   if(!state.members.includes(op.person))fail('Choose a family member.');
   if(!parent&&op.person!==user.name)fail('Put only your own list in order.',403);
   const ids=hunts.entries.filter(e=>e.hunt===op.hunt&&e.status!=='want').map(e=>e.id);
   if(!Array.isArray(op.order)||op.order.length>ids.length||new Set(op.order).size!==op.order.length||op.order.some(id=>!ids.includes(id)))fail('That order does not match the list.');
   hunts.rankings={...hunts.rankings,[op.hunt]:{...(hunts.rankings[op.hunt]||{}),[op.person]:op.order}};
   return {summary:null,important:false,title:findHuntTitle(op.hunt)};
  }
  // A list of our own can be renamed or taken away by whoever started it, or a parent. The
  // built-in ones stay.
  if(op.type==='huntListEdit'||op.type==='huntListRemove'){
   const list=hunts.custom.find(h=>h.id===op.id);
   if(!list)fail(HUNTS.some(h=>h.id===op.id)?'The built-in hunts stay. Start a list of your own instead.':'That list is no longer there.',404);
   if(!parent&&list.by!==user.name)fail('Only whoever started it, or a parent, can change it.',403);
   if(op.type==='huntListRemove'){
    hunts.custom=hunts.custom.filter(h=>h.id!==list.id);
    hunts.entries=hunts.entries.filter(e=>e.hunt!==list.id);
    const {[list.id]:gone,...rest}=hunts.rankings;hunts.rankings=rest;
    return {summary:null,important:false,title:list.title};
   }
   if(!string(op.title,60)||!op.title.trim())fail('Name the list.');
   if(!string(op.icon||'',16)||!string(op.hint||'',200))fail('Keep it short.');
   const title=op.title.trim();
   if([...HUNTS,...hunts.custom.filter(h=>h.id!==list.id)].some(h=>h.title.toLowerCase()===title.toLowerCase()))fail('There is already a list with that name.');
   Object.assign(list,{title,icon:(op.icon||'').trim()||'⭐',hint:(op.hint||'').trim()});
   return {summary:null,important:false,title};
  }
  fail('Unknown hunt action.');
 }else if(typeof op.type==='string'&&op.type.startsWith('payMethod')){
  // The cards and cash the family carries, and what each charges. Parents only, and removed
  // from the boys' copy of the trip, like the ledger.
  if(!parent)fail('Which card to use is for Mum and Dad.',403);
  const found=()=>{const m=state.payMethods.find(m=>m.id===op.id);if(!m)fail('That card is no longer in the list.',404);return m;};
  if(op.type==='payMethodAdd'||op.type==='payMethodEdit'){
   if(!string(op.name,120)||!op.name.trim())fail('Name the card, such as “CBA Mastercard” or “Wise”.');
   if(!PAY_KINDS.some(([k])=>k===op.kind))fail('Choose what kind of card it is.');
   if(!PAY_HOLDERS.includes(op.holder))fail('Choose whose it is.');
   const values={name:op.name.trim(),kind:op.kind,holder:op.holder};
   for(const [field,label,,min,max] of FEE_FIELDS){
    const v=op[field]??null;
    if(v!==null&&(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max))fail(`${label} must be between ${min} and ${max}, or left blank.`);
    values[field]=v===null?null:Math.round(v*100)/100;
   }
   requireText(op.notes||'',1000,'notes');values.notes=(op.notes||'').trim();
   if(op.researched!==undefined){
    const r=op.researched;
    if(r!==null){
     if(typeof r!=='object'||!Array.isArray(r.sources)||r.sources.length>8||!string(r.checkFirst||'',1000)||!string(r.summary||'',1000))fail('Invalid research.');
     const sources=r.sources.map(x=>{let u=null;try{u=new URL(x?.url);}catch{}if(!u||u.protocol!=='https:'||!string(x?.title||'',200))fail('Invalid source.');return {title:x.title||u.hostname,url:u.href};});
     values.researched={at:now,by:user.name,summary:r.summary||'',checkFirst:r.checkFirst||'',sources};
    }else values.researched=null;
   }
   if(op.type==='payMethodEdit'){Object.assign(found(),values);return {summary:null,important:false,title:values.name};}
   if(state.payMethods.length>=MAX_PAY_METHODS)fail(`That is ${MAX_PAY_METHODS} cards already.`);
   state.payMethods.push({id:randomUUID(),researched:null,...values,createdBy:user.name,createdAt:now});
   return {summary:null,important:false,title:values.name};
  }
  if(op.type==='payMethodRemove'){
   const m=found();
   state.payMethods=state.payMethods.filter(x=>x.id!==m.id);
   return {summary:null,important:false,title:m.name};
  }
  fail('Unknown card action.');
 }else if(typeof op.type==='string'&&op.type.startsWith('expense')){
  // The family ledger. Parents only: the boys have their own purses, and this is the parents'
  // money. Entered in yen, whole numbers, the way the receipt reads.
  if(!parent)fail('The family spending is for Mum and Dad. Your own money is under Spending money.',403);
  const found=()=>{const e=state.expenses.find(e=>e.id===op.id);if(!e)fail('That payment is no longer in the list.',404);return e;};
  if(op.type==='expenseAdd'||op.type==='expenseEdit'){
   if(!string(op.title,200)||!op.title.trim())fail('Say what it was for.');
   if(!Number.isInteger(op.yen)||op.yen<1||op.yen>10000000)fail('Enter the amount as whole yen, up to 10,000,000.');
   if(!EXPENSE_CATEGORIES.some(([k])=>k===op.category))fail('Choose a category.');
   if(!PAY_METHODS.some(([k])=>k===op.method))fail('Choose how it was paid.');
   if(!PAYERS.includes(op.paidBy))fail('Choose who paid.');
   dayCheck(op.day??null);
   requireText(op.notes||'',1000,'notes');
   const values=expenseFields(op);
   // A receipt is a file the parent already put in the family's private storage; the ledger only
   // keeps where it is. A file of the wrong kind, or from anywhere else, is refused.
   if(op.receipt!==undefined){
    const r=op.receipt;
    if(r!==null&&(typeof r!=='object'||!string(r.pathname,300)||!r.pathname.startsWith('receipts/')||r.pathname.includes('..')||!RECEIPT_TYPES.includes(r.type)))fail('That receipt file could not be used.');
    values.receipt=r?{pathname:r.pathname,type:r.type}:null;
   }else if(op.type==='expenseAdd')values.receipt=null;
   if(op.type==='expenseEdit'){Object.assign(found(),values);return {summary:null,important:false,title:values.title};}
   if(state.expenses.length>=2000)fail('That is two thousand payments already.');
   let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid time.');at=new Date(op.at).toISOString();}
   state.expenses.push({id:randomUUID(),...values,createdBy:user.name,createdAt:at});
   return {summary:null,important:false,title:values.title};
  }
  if(op.type==='expenseRemove'){
   const item=found();
   state.expenses=state.expenses.filter(e=>e.id!==item.id);
   return {summary:null,important:false,title:item.title};
  }
  fail('Unknown spending action.');
 }else if(typeof op.type==='string'&&op.type.startsWith('todo')){
  // The to-do list. Anyone adds one and anyone ticks it off, the way the shopping list works;
  // changing somebody else's wording or removing it is a parent's.
  const found=()=>{const t=state.todos.find(t=>t.id===op.id);if(!t)fail('That job is no longer on the list.',404);return t;};
  if(op.type==='todoAdd'||op.type==='todoEdit'){
   if(op.type==='todoEdit'&&!parent)fail('A parent can change the wording. Tick it off or add your own.',403);
   if(!string(op.title,250)||!op.title.trim())fail('Write down what needs doing.');
   dayCheck(op.day??null);
   const item={title:op.title.trim(),kind:op.kind==='buy'?'buy':'do',day:op.day??null,
    person:op.person||'Family',notes:(op.notes||'').trim()};
   if(!['Family',...state.members].includes(item.person))fail('Choose a family member.');
   requireText(item.notes,2000,'notes');
   if(op.type==='todoAdd'){
    if(state.todos.length>=300)fail('That is three hundred jobs already. Tick some off first.');
    let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid time.');at=new Date(op.at).toISOString();}
    state.todos.push({id:randomUUID(),...item,createdBy:user.name,createdAt:at,doneAt:null,doneBy:null});
   }else Object.assign(found(),item);
   return {summary:null,important:false,title:item.title};
  }
  if(op.type==='todoStatus'){
   const item=found();
   if(typeof op.done!=='boolean')fail('Invalid tick.');
   let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid time.');at=new Date(op.at).toISOString();}
   item.doneAt=op.done?at:null;item.doneBy=op.done?user.name:null;
   return {summary:null,important:false,title:item.title};
  }
  if(op.type==='todoRemove'){
   if(!parent)fail('A parent can take something off the list.',403);
   const item=found();
   state.todos=state.todos.filter(t=>t.id!==item.id);
   return {summary:null,important:false,title:item.title};
  }
  fail('Unknown to-do action.');
 }else if(typeof op.type==='string'&&op.type.startsWith('pack')){
  // The packing list. Anyone adds, ticks and turns a suggestion down, because the boys pack their
  // own bags; changing or removing an item is for whoever added it, or a parent. Starting the
  // next pack-up unticks the lot, and that is a parent's.
  const list=state.packing,found=()=>{const i=list.items.find(i=>i.id===op.id);if(!i)fail('That is no longer on the packing list.',404);return i;};
  const clean=o=>{
   if(!string(o?.title,200)||!o.title.trim())fail('Say what to pack.');
   if(!PACK_CATEGORIES.some(([id])=>id===o.category))fail('Choose a category.');
   if(!['Family',...state.members].includes(o.person||'Family'))fail('Choose a family member.');
   if(o.qty!==undefined&&(!Number.isInteger(o.qty)||o.qty<1||o.qty>99))fail('Enter how many, from 1 to 99.');
   requireText(o.notes||'',1000,'notes');
   if(o.suggestionId!=null&&(!string(o.suggestionId,80)||!o.suggestionId))fail('Invalid suggestion.');
   return o;
  };
  const stamp=()=>{if(!op.at)return now;if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid time.');return new Date(op.at).toISOString();};
  if(op.type==='packAdd'||op.type==='packAddAll'){
   const incoming=op.type==='packAdd'?[op]:op.items;
   if(!Array.isArray(incoming)||!incoming.length||incoming.length>100)fail('Choose what to add.');
   incoming.forEach(clean);
   // A suggestion added twice — two phones, one train — is on the list once.
   const fresh=incoming.filter((o,i)=>!o.suggestionId||(!list.items.some(x=>x.suggestionId===o.suggestionId)&&incoming.findIndex(x=>x.suggestionId===o.suggestionId)===i));
   if(list.items.length+fresh.length>400)fail('That is four hundred things to pack already. Take some off first.');
   const at=stamp();
   list.items.push(...fresh.map(o=>({...packItem(o,randomUUID()),createdBy:user.name,createdAt:at,packedAt:null,packedBy:null})));
   return {summary:null,important:false,title:fresh.length===1?fresh[0].title.trim():`${fresh.length} things to pack`};
  }
  if(op.type==='packEdit'||op.type==='packRemove'){
   const item=found();
   if(!parent&&item.createdBy!==user.name)fail('You can change the things you added. Tick it, or ask Mum or Dad.',403);
   if(op.type==='packRemove'){list.items=list.items.filter(i=>i.id!==item.id);return {summary:null,important:false,title:item.title};}
   clean(op);
   Object.assign(item,{...packItem(op,item.id),suggestionId:item.suggestionId});
   return {summary:null,important:false,title:item.title};
  }
  if(op.type==='packStatus'){
   const item=found();
   if(typeof op.packed!=='boolean')fail('Invalid tick.');
   item.packedAt=op.packed?stamp():null;item.packedBy=op.packed?user.name:null;
   return {summary:null,important:false,title:item.title};
  }
  if(op.type==='packDismiss'){
   if(!string(op.suggestionId,80)||!op.suggestionId)fail('Invalid suggestion.');
   if(typeof op.dismissed!=='boolean')fail('Invalid choice.');
   const dismissed={...list.dismissed};
   if(op.dismissed){if(Object.keys(dismissed).length>=300)fail('That is a lot turned down already.');dismissed[op.suggestionId]={by:user.name,at:stamp()};}
   else delete dismissed[op.suggestionId];
   list.dismissed=dismissed;
   return {summary:null,important:false,title:'Packing suggestion'};
  }
  if(op.type==='packReset'){
   if(!parent)fail('A parent starts the next pack-up.',403);
   for(const item of list.items){item.packedAt=null;item.packedBy=null;}
   return {summary:null,important:false,title:'Packing list'};
  }
  fail('Unknown packing action.');
 }else if(typeof op.type==='string'&&op.type.startsWith('spend')){
  // Spending money, which is Nate's and Boston's. Money only ever goes in on a parent's say-so —
  // either by hand or as an amount a day — and everything a boy does is about his own purse:
  // writing down what he wants, saying what it actually cost, and taking his own entry off again.
  const purse=state.spending,yen=(v,label)=>{if(!Number.isInteger(v)||v<0||v>10000000)fail(`Enter ${label} as whole yen, up to 10,000,000.`);};
  const boy=person=>{if(!BOYS.includes(person))fail('Spending money belongs to Nate and Boston.');
   if(!parent&&person!==user.name)fail('That is somebody else\u2019s spending money.',403);};
  const item=()=>{const found=purse.items.find(i=>i.id===op.id);if(!found)fail('That is no longer on the spending list.',404);boy(found.person);return found;};
  if(op.type==='spendAllowance'){
   if(!parent)fail('A parent sets how much a day.',403);
   boy(op.person);
   const perDay=op.yenPerDay??0;yen(perDay,'how much a day');
   const from=op.from??null,to=op.to??null;dayCheck(from);dayCheck(to);
   if(perDay&&!from)fail('Choose the day the spending money starts.');
   if(from&&to&&to<from)fail('The last day cannot come before the first.');
   const allowance={...purse.allowance};
   // Zero a day is how an amount a day is stopped, rather than a separate way of undoing it.
   if(perDay)allowance[op.person]={yenPerDay:perDay,from,to,by:user.name,at:now};
   else delete allowance[op.person];
   purse.allowance=allowance;
   return {summary:null,important:false,title:`${op.person}\u2019s spending money`};
  }
  if(op.type==='spendTopUp'){
   if(!parent)fail('A parent puts money in.',403);
   boy(op.person);
   const amount=op.yen;yen(amount,'an amount');if(!amount)fail('Enter how much is going in.');
   const note=(op.note||'').trim();requireText(note,250,'note');
   if(purse.topUps.length>=500)fail('That is five hundred top-ups already.');
   let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid time.');at=new Date(op.at).toISOString();}
   purse.topUps=[...purse.topUps,{id:randomUUID(),person:op.person,yen:amount,note,at,by:user.name}];
   return {summary:`${op.person} has \u00a5${amount.toLocaleString('en-AU')} more spending money${note?` \u00b7 ${note}`:''}`,important:true,title:`${op.person}\u2019s spending money`};
  }
  if(op.type==='spendTopUpRemove'){
   if(!parent)fail('A parent can take a top-up back off.',403);
   const found=purse.topUps.find(t=>t.id===op.id);if(!found)fail('That top-up is no longer there.',404);
   purse.topUps=purse.topUps.filter(t=>t.id!==op.id);
   return {summary:null,important:false,title:`${found.person}\u2019s spending money`};
  }
  if(op.type==='spendAdd'||op.type==='spendEdit'){
   const target=op.type==='spendEdit'?item():null;
   const person=op.type==='spendEdit'?target.person:(op.person||user.name);
   boy(person);
   if(!string(op.title,250)||!op.title.trim())fail('Write down what you want to buy.');
   dayCheck(op.day??null);
   const estimate=op.estimate??null;
   if(estimate!==null)yen(estimate,'roughly what it costs');
   const values={title:op.title.trim(),estimate,day:op.day??null,notes:(op.notes||'').trim()};
   requireText(values.notes,2000,'notes');
   if(op.type==='spendEdit'){Object.assign(target,values);return {summary:null,important:false,title:values.title};}
   if(purse.items.length>=300)fail('That is three hundred things already. Buy some of them first.');
   // A job off the to-do list can be handed over once. Handing the same one over twice would
   // count the same jumper against the purse in two places.
   let todoId=op.todoId??null;
   if(todoId){
    if(!state.todos.some(t=>t.id===todoId))fail('That job is no longer on the to-do list.',404);
    if(purse.items.some(i=>i.todoId===todoId))fail('That one is already on the spending list.');
   }
   let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid time.');at=new Date(op.at).toISOString();}
   purse.items=[...purse.items,{id:randomUUID(),person,...values,spent:null,todoId,
    createdBy:user.name,createdAt:at,boughtAt:null,boughtBy:null}];
   return {summary:null,important:false,title:values.title};
  }
  if(op.type==='spendBought'){
   const found=item();
   if(typeof op.done!=='boolean')fail('Invalid tick.');
   let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid time.');at=new Date(op.at).toISOString();}
   if(op.spent!==undefined&&op.spent!==null)yen(op.spent,'what it cost');
   found.boughtAt=op.done?at:null;found.boughtBy=op.done?user.name:null;
   // What it actually cost, which is what the balance is built from. Left alone it falls back to
   // the guess; putting it back on the list clears it, so an old price cannot haunt a new one.
   found.spent=op.done?(op.spent??found.spent??null):null;
   // Buying the thing finishes the job it came from, so the same jumper is not still waiting to
   // be bought on the day's screen. Putting it back on the list does not un-tick that job: it may
   // have been ticked for reasons of its own.
   if(op.done&&found.todoId){const job=state.todos.find(t=>t.id===found.todoId);if(job&&!job.doneAt){job.doneAt=at;job.doneBy=user.name;}}
   return {summary:null,important:false,title:found.title};
  }
  if(op.type==='spendRequest'){
   // The only way a boy's balance moves in his favour. He asks; a parent answers.
   boy(op.person||user.name);
   const person=op.person||user.name,amount=op.yen;
   yen(amount,'how much you are asking for');if(!amount)fail('Ask for an amount.');
   const reason=(op.reason||'').trim();requireText(reason,500,'reason');
   if(purse.requests.filter(r=>r.person===person&&r.status==='open').length>=10)
    fail('There are ten asks waiting on an answer already. Wait for one of those first.');
   let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid time.');at=new Date(op.at).toISOString();}
   purse.requests=[...purse.requests,{id:randomUUID(),person,yen:amount,reason,at,by:user.name,
    status:'open',decidedBy:null,decidedAt:null,approvedYen:null,reply:''}];
   // A parent can write an ask down for a boy — the ask he made out loud at the counter — and the
   // news says who typed it, because "Nate is asking" would be putting words in his mouth. It is
   // still his ask and still unanswered: writing it down is not the same as saying yes to it.
   return {summary:user.name===person
    ?`${person} is asking for \u00a5${amount.toLocaleString('en-AU')} more spending money${reason?` \u00b7 ${reason}`:''}`
    :`${user.name} put in an ask for ${person}: \u00a5${amount.toLocaleString('en-AU')} more spending money${reason?` \u00b7 ${reason}`:''}`,
    important:true,title:`${person}\u2019s spending money`};
  }
  if(op.type==='spendRequestDecide'){
   if(!parent)fail('Mum or Dad answers this one.',403);
   const ask=purse.requests.find(r=>r.id===op.id);if(!ask)fail('That ask is no longer there.',404);
   if(ask.status!=='open')fail('That one has already been answered.');
   if(typeof op.approve!=='boolean')fail('Say yes or no.');
   const reply=(op.reply||'').trim();requireText(reply,500,'reply');
   // A parent can say yes to a different figure, because "you can have half of that" is a real
   // answer. Left out, it is the amount that was asked for.
   const amount=op.approve?(op.yen??ask.yen):null;
   if(op.approve){yen(amount,'how much you are approving');if(!amount)fail('Approve an amount, or say no.');}
   Object.assign(ask,{status:op.approve?'approved':'declined',decidedBy:user.name,decidedAt:now,
    approvedYen:amount,reply});
   // Saying yes is what actually moves the money, so there is never an approval with no top-up
   // behind it, and the top-up carries the approval rather than looking like a bare gift.
   if(op.approve){
    const topUp={id:randomUUID(),person:ask.person,yen:amount,note:reply||ask.reason,at:now,by:user.name,
     approvedBy:user.name,requestId:ask.id};
    purse.topUps=[...purse.topUps,topUp];
    ask.topUpId=topUp.id;
   }
   return {summary:op.approve
    ?`${user.name} approved \u00a5${amount.toLocaleString('en-AU')} more spending money for ${ask.person}`
    :`${user.name} said not this time to ${ask.person}\u2019s ask for \u00a5${ask.yen.toLocaleString('en-AU')}`,
    important:true,title:`${ask.person}\u2019s spending money`};
  }
  if(op.type==='spendRequestCancel'){
   const ask=purse.requests.find(r=>r.id===op.id);if(!ask)fail('That ask is no longer there.',404);
   boy(ask.person);
   // Once it has been answered it is a record of what happened, and a record is not undone.
   if(ask.status!=='open')fail('That one has been answered already.');
   purse.requests=purse.requests.filter(r=>r.id!==ask.id);
   return {summary:null,important:false,title:`${ask.person}\u2019s spending money`};
  }
  if(op.type==='spendRemove'){
   const found=item();
   purse.items=purse.items.filter(i=>i.id!==found.id);
   return {summary:null,important:false,title:found.title};
  }
  fail('Unknown spending action.');
 }else if(op.type==='stepRating'||op.type==='stepThought'){
  // Four opinions about a thing that has happened. Kept per person, because an average is only
  // worth reading if you can see whose stars made it. Not the step's own notes, which are the plan.
  const step=state.steps.find(s=>s.id===op.id);if(!step)fail('Activity not found.',404);
  if(!state.members.includes(op.person))fail('Choose a family member.');
  if(!parent&&op.person!==user.name)fail('Rate it for yourself.',403);
  let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid time.');at=new Date(op.at).toISOString();}
  const entry={...(state.stepReviews[op.id]||{})};
  if(op.type==='stepRating'){
   if(op.rating!==0&&!isStarRating(op.rating))fail('Rate it from 0.1 to 5 stars.');
   const ratings={...(entry.ratings||{})};
   if(op.rating)ratings[op.person]=op.rating;else delete ratings[op.person];
   entry.ratings=ratings;
  }else{
   const text=(op.thought??'').trim();requireText(text,2000,'what you thought');
   const thoughts={...(entry.thoughts||{})};
   if(text)thoughts[op.person]={text,at};else delete thoughts[op.person];
   entry.thoughts=thoughts;
  }
  state.stepReviews={...state.stepReviews,[op.id]:entry};
  return {summary:null,important:false,title:step.title};
 }else if(typeof op.type==='string'&&op.type.startsWith('sumo')){
  // The day's card, kept in the trip. The arena is a basement full of phones, so what one
  // person fetched has to still be on screen for everyone when the signal is not.
  const current=sumo(state);
  if(op.type==='sumoUpdate'){
   if(!parent)fail('A parent fetches the card.',403);
   if(!Array.isArray(op.bouts)||!op.bouts.length||op.bouts.length>60)fail('That is not a day of sumo.');
   const seen=new Set();
   const bouts=op.bouts.map(b=>{
    if(!SUMO_DIVISIONS.some(([id])=>id===b?.division))fail('Unknown division.');
    if(!Number.isInteger(b?.order)||b.order<1||b.order>999)fail('Invalid running order.');
    if(b.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time))fail('Invalid bout time.');
    if(!string(b?.id,60)||!b.id||seen.has(b.id))fail('Invalid bout.');
    seen.add(b.id);
    const side=p=>{if(!string(p?.name,80)||!p.name.trim())fail('A bout needs two names.');
     requireText(p.rank??'',80,'rank');requireText(p.stable??'',80,'stable');
     return {name:p.name.trim(),rank:(p.rank||'').trim(),stable:(p.stable||'').trim()};};
    return {id:b.id,division:b.division,order:b.order,time:b.time||'',east:side(b.east),west:side(b.west)};
   });
   for(const [key,max] of [['basho',120],['venue',120],['notes',2000],['doorsOpen',5]])requireText(op[key]??'',max,key);
   if(op.doorsOpen&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(op.doorsOpen))fail('Invalid opening time.');
   if(op.date&&!state.days.some(d=>d.date===op.date))fail('Choose a trip day.');
   if(op.dayNumber!==null&&op.dayNumber!==undefined&&(!Number.isInteger(op.dayNumber)||op.dayNumber<1||op.dayNumber>15))fail('A basho is fifteen days.');
   const sources=(Array.isArray(op.sources)?op.sources:[]).slice(0,6).map(x=>{
    requireText(x?.title??'',200,'source');
    try{if(new URL(x?.url).protocol!=='https:')fail('Use an HTTPS source.');}catch{fail('Use an HTTPS source.');}
    return {title:(x.title||'').trim(),url:x.url};});
   // Results recorded in the arena survive a re-fetch, as long as the bout is still on the card.
   const results=Object.fromEntries(Object.entries(current.results).filter(([id])=>seen.has(id)));
   const predictions=Object.fromEntries(Object.entries(current.predictions).filter(([id])=>seen.has(id)));
   state.sumo={...current,basho:op.basho||'',dayNumber:op.dayNumber??null,venue:op.venue||'',
    date:op.date||null,doorsOpen:op.doorsOpen||'',notes:op.notes||'',bouts,sources,results,predictions,at:now,by:user.name};
   return {summary:`${user.name} loaded the sumo card for ${op.date||'the day'} — ${bouts.length} bouts`,important:true,title:'Sumo card'};
  }
  if(op.type==='sumoWrestler'){
   if(!parent)fail('A parent looks a wrestler up.',403);
   const p=op.profile;
   if(!p||typeof p!=='object'||!string(p.name,80)||!p.name.trim())fail('Nothing to save about him.');
   for(const [key,max] of [['name',80],['japanese',80],['rank',80],['stable',80],['hometown',120],['record',120],['about',2000]])requireText(p[key]??'',max,key);
   const size=(v,lo,hi)=>v===null||v===undefined?null:(Number.isInteger(v)&&v>=lo&&v<=hi?v:fail('That is not a believable size.'));
   const wrestlers={...current.wrestlers};
   if(Object.keys(wrestlers).length>=80)fail('That is eighty wrestlers already.');
   wrestlers[wrestlerKey(p.name)]={name:p.name.trim(),japanese:p.japanese||'',rank:p.rank||'',stable:p.stable||'',
    hometown:p.hometown||'',heightCm:size(p.heightCm,120,250),weightKg:size(p.weightKg,50,400),
    record:p.record||'',about:p.about||'',sources:(Array.isArray(p.sources)?p.sources:[]).slice(0,6),at:now,by:user.name};
   state.sumo={...current,wrestlers};
   return {summary:null,important:false,title:`Sumo · ${p.name.trim()}`};
  }
  if(op.type==='sumoPredict'){
   // Whoever is holding the phone enters everybody's pick, because in the arena there is one
   // phone out and four people shouting at it. That is why this one is not "your own only".
   const bout=current.bouts.find(b=>b.id===op.id);if(!bout)fail('That bout is not on the card.',404);
   if(!state.members.includes(op.person))fail('Choose a family member.');
   if(current.results[op.id])fail('That one has been watched. Clear the result if you want to reopen the picks.');
   if(op.winner!==null&&op.winner!==bout.east.name&&op.winner!==bout.west.name)fail('One of the two, or nobody.');
   const predictions={...current.predictions},forBout={...(predictions[op.id]||{})};
   if(op.winner)forBout[op.person]=op.winner;else delete forBout[op.person];
   if(Object.keys(forBout).length)predictions[op.id]=forBout;else delete predictions[op.id];
   state.sumo={...current,predictions};
   return {summary:null,important:false,title:`Sumo · ${bout.east.name} v ${bout.west.name}`};
  }
  if(op.type==='sumoResult'){
   const bout=current.bouts.find(b=>b.id===op.id);if(!bout)fail('That bout is not on the card.',404);
   if(op.winner!==null&&op.winner!==bout.east.name&&op.winner!==bout.west.name)fail('One of the two, or nobody.');
   let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid time.');at=new Date(op.at).toISOString();}
   const results={...current.results};
   if(op.winner)results[op.id]={winner:op.winner,by:user.name,at};else delete results[op.id];
   state.sumo={...current,results};
   return {summary:null,important:false,title:`Sumo · ${bout.east.name} v ${bout.west.name}`};
  }
  if(op.type==='sumoResults'){
   // The winners as the official site has them, fetched by a parent's phone. The site is the
   // record, so where it and a tap in the arena disagree, the site wins; a bout it has not
   // decided yet is left as it was, whatever somebody tapped.
   if(!parent)fail('A parent fetches the official results.',403);
   if(!Array.isArray(op.results)||op.results.length>60)fail('That is not a day of results.');
   requireText(op.note??'',300,'note');
   const results={...current.results},seen=new Set();let changed=0;
   for(const r of op.results){
    const bout=current.bouts.find(b=>b.id===r?.id);if(!bout)fail('That bout is not on the card.',404);
    if(seen.has(r.id))fail('One result per bout.');seen.add(r.id);
    if(r.winner!==bout.east.name&&r.winner!==bout.west.name)fail('One of the two, or nobody.');
    requireText(r.kimarite??'',60,'winning technique');
    const before=results[r.id];
    if(before?.official&&before.winner===r.winner&&(before.kimarite||'')===(r.kimarite||'').trim())continue;
    results[r.id]={winner:r.winner,by:'Official results',at:now,official:true,kimarite:(r.kimarite||'').trim()};
    changed++;
   }
   state.sumo={...current,results,resultsAt:now,resultsNote:(op.note||'').trim()};
   return {summary:changed?`${changed} sumo ${changed===1?'winner':'winners'} in from the official results`:null,important:false,title:'Sumo results'};
  }
  fail('Unknown sumo action.');
 }else if(typeof op.type==='string'&&op.type.startsWith('tracker')){
  // Tracker tags are a parent's: they sit on a parent's Apple Account, and the link to where a
  // bag is belongs with whoever can act on it. Everyone can read the list.
  if(!parent)fail('A parent looks after the tracker tags.',403);
  const list=state.trackers,found=()=>{const t=list.find(t=>t.id===op.id);if(!t)fail('That tracker is no longer on the list.',404);return t;};
  const stamp=()=>{if(!op.at)return now;if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid time.');return new Date(op.at).toISOString();};
  if(op.type==='trackerAdd'||op.type==='trackerEdit'){
   if(!string(op.label,120)||!op.label.trim())fail('Say what the tracker is in.');
   if(op.kind!==undefined&&!TRACKER_KINDS.some(([k])=>k===op.kind))fail('Choose what kind of thing it is in.');
   if(!['Family',...state.members].includes(op.person||'Family'))fail('Choose a family member.');
   if(op.owner&&!state.members.includes(op.owner))fail('Choose whose Apple Account it is on.');
   if(op.forwarded!==undefined&&typeof op.forwarded!=='boolean')fail('Invalid choice.');
   requireText(op.notes||'',1000,'notes');
   if(op.type==='trackerAdd'){
    if(list.length>=MAX_TRACKERS)fail('That is a lot of trackers already. Take one off first.');
    list.push({...trackerItem(op,randomUUID()),checks:{shared:false,alerts:false},shareUrl:null,shareUrlAt:null,shareUrlBy:null,createdBy:user.name,createdAt:stamp()});
   }else{const t=found();Object.assign(t,trackerItem(op,t.id));}
   return {summary:null,important:false,title:op.label.trim()};
  }
  if(op.type==='trackerCheck'){
   const t=found();
   if(!['shared','alerts'].includes(op.check)||typeof op.done!=='boolean')fail('Invalid tick.');
   t.checks={...t.checks,[op.check]:op.done};
   return {summary:null,important:false,title:t.label};
  }
  if(op.type==='trackerLink'){
   // The link itself is never written into the history: the title is the bag, not the URL.
   const t=found();
   if(op.url===null||op.url===''){Object.assign(t,{shareUrl:null,shareUrlAt:null,shareUrlBy:null});return {summary:null,important:false,title:t.label};}
   if(!validShareUrl(op.url))fail('Paste the https link from Find My → Share Item Location.');
   Object.assign(t,{shareUrl:op.url,shareUrlAt:stamp(),shareUrlBy:user.name});
   return {summary:null,important:false,title:t.label};
  }
  if(op.type==='trackerRemove'){
   const t=found();
   state.trackers=list.filter(x=>x.id!==t.id);
   return {summary:null,important:false,title:t.label};
  }
  fail('Unknown tracker action.');
 }else if(typeof op.type==='string'&&op.type.startsWith('bookingWindow')){
  // Booking windows: when a booking opens, kept for the parents to act on. A parent's list.
  if(!parent)fail('A parent keeps the booking windows.',403);
  const list=state.bookingWindows=state.bookingWindows||[];
  const found=()=>{const w=list.find(w=>w.id===op.id);if(!w)fail('That booking window is no longer on the list.',404);return w;};
  if(op.type==='bookingWindowAdd'||op.type==='bookingWindowEdit'){
   const title=String(op.title||'').trim();if(!title)fail('Say what the booking is for.');requireText(title,200,'title');
   if(!Number.isFinite(Date.parse(op.opensAt)))fail('Choose when the booking opens.');
   const url=String(op.url||'').trim();if(url&&!https(url))fail('The booking link must start with https://.');
   requireText(op.notes||'',2000,'notes');
   if(op.stepId&&!state.steps.some(s=>s.id===op.stepId))fail('Activity not found.',404);
   dayCheck(op.day??null);
   if(op.ruleId!=null&&!findRule(op.ruleId))fail('Unknown booking rule.');
   if(op.key!=null&&!string(op.key,160))fail('Invalid booking window.');
   const values={title,opensAt:new Date(op.opensAt).toISOString(),url,notes:String(op.notes||'').trim(),stepId:op.stepId||null,day:op.day??null};
   if(op.type==='bookingWindowEdit'){Object.assign(found(),values);return {summary:null,important:false,title};}
   if(list.length>=200)fail('The booking windows list is full. Remove some that are done.');
   if(op.key&&list.some(w=>w.key===op.key))fail('That booking window is already on the list.');
   list.push({id:randomUUID(),...values,key:op.key||null,ruleId:op.ruleId||null,bookedAt:null,by:user.name,createdAt:now});
   return {summary:null,important:false,title};
  }
  if(op.type==='bookingWindowBooked'){
   if(typeof op.booked!=='boolean')fail('Invalid booking.');
   const w=found();w.bookedAt=op.booked?now:null;return {summary:null,important:false,title:w.title};
  }
  if(op.type==='bookingWindowRemove'){const w=found();state.bookingWindows=list.filter(x=>x.id!==w.id);return {summary:null,important:false,title:w.title};}
  fail('Unknown booking window change.');
 }else if(op.type==='shopLog'){
  // The trip shop log: sorted, worth it or not, and a line for next time. A parent's, like the
  // spending it is about. Each field is changed only when it is sent, so a tick keeps the note.
  if(!parent)fail('A parent can make this change.',403);
  const item=findShopItem(op.id);if(!item)fail('Unknown trip shop item.',404);
  const next={...(state.shopLog?.[op.id]||{})};
  if(op.sorted!==undefined){if(typeof op.sorted!=='boolean')fail('Invalid tick.');next.sortedAt=op.sorted?now:null;}
  if(op.verdict!==undefined){if(!SHOP_VERDICTS.includes(op.verdict))fail('Choose worth it or not.');next.verdict=op.verdict||null;}
  if(op.note!==undefined){const note=String(op.note??'').trim();requireText(note,SHOP_NOTE_MAX,'note');next.note=note;}
  next.by=user.name;next.at=now;
  state.shopLog={...(state.shopLog||{}),[op.id]:next};
  return {summary:null,important:false,title:item.title};
 }else if(op.type==='stayEdit'){
  // What a hotel's own app would know and the plan cannot: the confirmation number, the front
  // desk's phone, agreed check-in and check-out times, a note. A parent's, kept per hotel.
  if(!parent)fail('A parent can make this change.',403);
  if(!state.days.some(d=>d.hotel===op.hotel))fail('Unknown hotel.',404);
  const {value,error}=cleanStay(op.patch);if(error)fail(error);
  state.stays={...(state.stays||{}),[op.hotel]:{...(state.stays?.[op.hotel]||{}),...value,by:user.name,at:now}};
  return {summary:null,important:false,title:op.hotel};
 }else if(op.type==='predictionSet'){
  // A sealed prediction: your own, or a parent's for anyone, and only until we land.
  if(!state.members.includes(op.person))fail('Choose a family member.');
  if(!parent&&op.person!==user.name)fail('Make your own predictions.',403);
  if(!findPrediction(op.id))fail('Unknown prediction.',404);
  if(predictionPhase(state.days,japanDate(new Date(now)))!=='open')fail('The predictions were sealed when the trip began.',409);
  const text=(op.text??'').trim();requireText(text,PREDICTION_MAX,'prediction');
  const mine={...(state.predictions?.[op.person]||{})};
  if(text)mine[op.id]={text,at:now};else delete mine[op.id];
  state.predictions={...(state.predictions||{}),[op.person]:mine};
  return {summary:null,important:false,title:'A sealed prediction'};
 }else if(op.type==='meeting'){
  dayCheck(op.day);if(!op.day)fail('Choose a day.');
  const m={place:op.place||'',japanese:op.japanese||'',time:op.time||'',notes:op.notes||'',hotelJapanese:op.hotelJapanese||'',hotelAddress:op.hotelAddress||''};
  for(const [k,v]of Object.entries(m))requireText(v,k==='notes'?2000:500,k);
  if(!m.place.trim())fail('Choose a meeting point.');if(m.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(m.time))fail('Choose a valid meeting time.');
  state.meetings[op.day]=m;
  if(op.contacts){for(const n of ['Damien','Lauren']){requireText(op.contacts[n],80,'phone number');if(op.contacts[n]&&!/^\+?[\d\s()\-]+$/.test(op.contacts[n]))fail('Use a phone number including country code.');}state.contacts={Damien:op.contacts.Damien,Lauren:op.contacts.Lauren};}
 }else if(op.type==='acknowledge'){
  const alert=state.alerts.find(a=>a.id===op.id);if(!alert)fail('Update not found.',404);alert.seenBy={...(alert.seenBy||{}),[user.name]:now};
 }else if(op.type==='journal'){
  dayCheck(op.day);if(!op.day)fail('Choose a day.');requireText(op.notes,8000,'diary notes');state.journal[op.day]=op.notes;
 }else if(typeof op.type==='string'&&op.type.startsWith('thankYou')){
  // Private notes from Damien, one list for each of the others. Only Damien writes them; only
  // the person a note is for marks it read.
  state.thankYou=normaliseThankYou(state.thankYou);
  const to=op.type==='thankYouSeen'?user.name:(op.to??'Lauren');
  if(op.type!=='thankYouSeen'&&!THANK_YOU_FOR.includes(to))fail('Choose who the note is for.');
  const list=state.thankYou.lists[to],notes=list?.messages;
  if(op.type==='thankYouSeen'){
   if(!THANK_YOU_FOR.includes(user.name))fail(`These notes are from ${THANK_YOU_FROM}.`,403);
   if(!op.day||!state.days.some(d=>d.date===op.day))fail('Choose a trip day.');
   list.seen={...list.seen,[op.day]:now};
  }else{
   if(user.name!==THANK_YOU_FROM)fail('Only Damien can change these notes.',403);
   if(op.type==='thankYouAdd'||op.type==='thankYouEdit'){
    const value=(op.text||'').trim(),day=op.day??null;
    if(!string(value,1200)||!value)fail('Write a note of 1–1200 characters.');
    if(day!==null){
     if(!state.days.some(d=>d.date===day))fail('Choose a trip day.');
     if(notes.some(m=>m.day===day&&m.id!==op.id))fail('That day already has a note pinned to it. Free the other note first.');
    }
    if(op.type==='thankYouAdd')notes.push({id:randomUUID(),text:value,day,order:Math.max(0,...notes.map(m=>m.order))+10});
    else{const note=notes.find(m=>m.id===op.id);if(!note)fail('Note not found.',404);Object.assign(note,{text:value,day});}
   }else if(op.type==='thankYouRemove'){
    if(!notes.some(m=>m.id===op.id))fail('Note not found.',404);
    list.messages=notes.filter(m=>m.id!==op.id);
   }else if(op.type==='thankYouReorder'){
    if(!Array.isArray(op.ids)||op.ids.length!==notes.length||new Set(op.ids).size!==notes.length||op.ids.some(id=>!notes.some(m=>m.id===id)))fail('The notes changed. Reload before reordering them.');
    const slots=notes.map(m=>m.order).sort((a,b)=>a-b);op.ids.forEach((id,i)=>{notes.find(m=>m.id===id).order=slots[i];});
   }else fail('Unknown note action.');
  }
  return {summary:null,important:false,private:true};
 }else if(op.type==='readinessSet'){
 // How each of us is at breakfast, one to five. Your own, or a parent for anyone: Nate is five.
 dayCheck(op.day);if(!op.day)fail('Choose a day.');
 if(!state.members.includes(op.person))fail('Choose a family member.');
 if(!parent&&op.person!==user.name)fail('Say how you are; a parent can say for the others.',403);
 if(!READINESS.some(r=>r.level===op.level))fail('Pick a face from one to five.');
 state.readiness={...(state.readiness||{}),[op.day]:{...((state.readiness||{})[op.day]||{}),[op.person]:{level:op.level,at:now,by:user.name}}};
 return {summary:null,important:false,title:`${op.person} at breakfast`};
}else if(typeof op.type==='string'&&op.type.startsWith('checkIn')){
 // Check In: "back at the hotel by 4:30". Anyone starts one for themselves; a parent, or whoever
 // started it, ends it. Starting a new one closes that person's last, so there is one at a time.
 const list=state.checkIns;
 if(op.type==='checkInStart'){
  requireText(op.label,120,'destination');if(!op.label.trim())fail('Say where you are heading.');
  if(op.stepId&&!state.steps.some(s=>s.id===op.stepId))fail('Activity not found.',404);
  if(op.hotel!=null)requireText(op.hotel,200,'hotel');
  const due=Date.parse(op.due),at=Date.parse(now);
  if(!Number.isFinite(due)||due<at-60000||due>at+CHECKIN_AHEAD_HOURS*3600000)fail('Choose a time in the next twelve hours.');
  for(const c of list)if(c.from===user.name&&!c.closedAt&&!c.arrivedAt){c.closedAt=now;c.closedBy=user.name;}
  const item={id:randomUUID(),from:user.name,label:op.label.trim(),stepId:op.stepId||null,hotel:op.hotel||null,day:japanDate(new Date(now)),due:new Date(due).toISOString(),startedAt:now,arrivedAt:null,closedAt:null,closedBy:null};
  state.checkIns=[...list,item].slice(-30);
  return {summary:`${user.name} is heading to ${item.label}, back by ${japanClock(new Date(due))}`,important:true,title:'Check In'};
 }
 const c=list.find(c=>c.id===op.id);if(!c||c.closedAt)fail('That check-in is over.',404);
 if(!parent&&c.from!==user.name)fail('Only whoever started it, or a parent, can end it.',403);
 if(op.type==='checkInArrive'){
  if(c.arrivedAt)return {summary:null,important:false,title:'Check In'};
  c.arrivedAt=now;
  return {summary:`${c.from} arrived at ${c.label}`,important:true,title:'Check In'};
 }
 if(op.type==='checkInCancel'){c.closedAt=now;c.closedBy=user.name;return {summary:null,important:false,title:'Check In'};}
 fail('Unknown check-in change.');
}else if(op.type==='runningLate'){
  dayCheck(op.day);if(!op.day||!Number.isInteger(op.delay)||op.delay<1||op.delay>240)fail('Enter a delay of 1–240 minutes.');
  const plan=delayForDay(state,op.day,op.delay);
  for(const c of plan.changes)state.steps.find(s=>s.id===c.id).time=c.time;
  for(const item of plan.backlog){const s=state.steps.find(s=>s.id===item.id);s.backlogFrom={day:s.day,time:s.time,bookingTime:s.bookingTime,status:s.status};Object.assign(s,{day:null,time:null,bookingTime:null,group:'',option:'',status:'todo'});}
  return {summary:`Revised ${op.day} for a ${op.delay}-minute delay. ${plan.backlog.length} activities saved to Options.`,important:true};
 }else if(typeof op.type==='string'&&op.type.startsWith('mascot')){
  // Everybody owns their own character; a parent can sit with one of the boys and help with
  // his. Only ids this app knows how to draw are accepted, so a saved character can never
  // arrive as a picture the phone cannot draw.
  if(!state.members.includes(op.person))fail('Choose a family member.');
  if(!parent&&op.person!==user.name)fail('Design your own character.',403);
  if(op.type==='mascotRemove'){
   if(!state.mascots?.[op.person])fail('There is no character to remove.',404);
   const {[op.person]:removed,...rest}=state.mascots;state.mascots=rest;
   return {summary:null,important:false,title:`${op.person}’s character removed`};
  }
  if(op.type!=='mascotSave')fail('Unknown character action.');
  if(!op.mascot||typeof op.mascot!=='object'||Array.isArray(op.mascot))fail('Invalid character.');
  const character={};
  for(const field of CHOICE_FIELDS){if(!validChoice(field,op.mascot[field]))fail(`Choose a ${field} from the list.`);character[field]=op.mascot[field];}
  for(const [field,max] of Object.entries(TEXT_FIELDS)){
   const value=String(op.mascot[field]??'').trim();
   if(!string(value,max))fail(`Keep the ${field} under ${max} characters.`);
   character[field]=value;
  }
  if(!character.name)fail('Give the character a name.');
  let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid time.');at=new Date(op.at).toISOString();}
  state.mascots={...state.mascots,[op.person]:{...character,updatedAt:at,updatedBy:user.name}};
  return {summary:null,important:false,title:`${op.person}’s character · ${character.name}`};
 }else return false;
 return {summary:op.type==='meeting'?`Meeting point updated for ${op.day}: ${op.place}${op.time?' at '+op.time:''}`:null,important:op.type==='meeting'};
}
