import {randomUUID} from 'node:crypto';
import {findRide} from '../src/park-data.js';
import {FOOD,FOOD_KINDS} from '../src/food-data.js';
import {ALL_PHRASES,findPhrase} from '../src/phrasebook-data.js';
import {THROWS,jankenWinner} from '../src/kana-data.js';
const JANKEN_THROWS=THROWS.map(t=>t.id);
import {BOYS,delayForDay,initialThankYou,generatedMissions,nextExtraMission,GENERATED_PER_DAY,EYE_SPY,isTrainLeg,eyeSpyKey,THANK_YOU_FROM,THANK_YOU_TO,PROPOSAL_KINDS,PROPOSAL_TIMING,INTERESTS,PACES,party,personProfile,proposalDraft,proposalPlacement,proposalStepNotes} from '../src/trip-features.js';
const MAX_PROPOSALS=300;
const https=v=>{try{return new URL(v).protocol==='https:';}catch{return false;}};
const string=(v,max)=>typeof v==='string'&&v.length<=max;
export function extraOperation(state,op,user,fail,now){
 const parent=user.role==='parent',dayOK=day=>day===null||state.days.some(d=>d.date===day);
 const requireText=(v,max,label)=>{if(!string(v,max))fail(`Invalid ${label}.`);};
 const dayCheck=day=>{if(!dayOK(day))fail('Choose a trip day or Whole trip.');};
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
    if(op.rating!==0&&!(Number.isInteger(op.rating)&&op.rating>=1&&op.rating<=5))fail('Rate it from 1 to 5 stars.');
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
   state.steps.push({id:randomUUID(),title:p.title,day:op.day,time,originalTime:time,duration:p.duration||30,
    notes:proposalStepNotes(p),place:p.place,japanese:p.japanese,website:p.ticketUrl||p.website,phone:'',
    page:state.days.find(d=>d.date===op.day)?.pages?.[0]||1,kind,group:'',option:'',participants,
    order:Math.max(0,...state.steps.filter(s=>s.day===op.day).map(s=>s.order))+10,
    travelMinutes:20,arrivalBuffer:15,locationId:null,locked,bookingTime:locked?time:null,status:'todo',
    fromProposalId:p.id});
   Object.assign(p,{stepId:state.steps.at(-1).id,scheduledBy:user.name,scheduledAt:now,parked:false});
   return {summary:`${p.title} added to ${op.day}${time?` at ${time}`:''} from the planning board`,important:true,title:p.title};
  }
  fail('Unknown planning action.');
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
    loves:(op.loves??me.loves??'').trim(),avoid:(op.avoid??me.avoid??'').trim(),
    dietary:(op.dietary??me.dietary??'').trim(),notes:(op.notes??me.notes??'').trim()};
   if(values.age!==null&&(!Number.isInteger(values.age)||values.age<0||values.age>120))fail('Enter an age between 0 and 120.');
   if(values.interests.some(id=>!INTERESTS.some(([key])=>key===id)))fail('Choose interests from the list.');
   if(values.interests.length>INTERESTS.length)fail('Choose interests from the list.');
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
   days[date]={city:e.city,code:e.code,max:e.max,min:e.min,rain:e.rain??null};
  }
  state.weather={at:now,by:user.name,days};
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
  if(!parent&&entry.by!==user.name)fail('You can only remove your own photos.',403);
  state.photos=state.photos.filter(p=>p.id!==op.id);
  const votes={...(state.photoVotes[entry.day]||{})};
  for(const [who,id] of Object.entries(votes))if(id===op.id)delete votes[who];
  state.photoVotes={...state.photoVotes,[entry.day]:votes};
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
  const item={title:op.title.trim(),day:op.day??null,person:op.person||'Family',store:op.store||'',notes:op.notes||'',url:op.url||'',quantity:op.quantity??1,budget:op.budget??null};
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
  // Private notes from Damien to Lauren. Only Damien writes them; only Lauren marks one read.
  if(!Array.isArray(state.thankYou?.messages))state.thankYou={seen:{},...state.thankYou,messages:initialThankYou()};
  const notes=state.thankYou.messages;
  if(op.type==='thankYouSeen'){
   if(user.name!==THANK_YOU_TO)fail('These notes are for Lauren.',403);
   if(!op.day||!state.days.some(d=>d.date===op.day))fail('Choose a trip day.');
   state.thankYou.seen={...state.thankYou.seen,[op.day]:now};
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
    state.thankYou.messages=notes.filter(m=>m.id!==op.id);
   }else if(op.type==='thankYouReorder'){
    if(!Array.isArray(op.ids)||op.ids.length!==notes.length||new Set(op.ids).size!==notes.length||op.ids.some(id=>!notes.some(m=>m.id===id)))fail('The notes changed. Reload before reordering them.');
    const slots=notes.map(m=>m.order).sort((a,b)=>a-b);op.ids.forEach((id,i)=>{notes.find(m=>m.id===id).order=slots[i];});
   }else fail('Unknown note action.');
  }
  return {summary:null,important:false,private:true};
 }else if(op.type==='runningLate'){
  dayCheck(op.day);if(!op.day||!Number.isInteger(op.delay)||op.delay<1||op.delay>240)fail('Enter a delay of 1–240 minutes.');
  const plan=delayForDay(state,op.day,op.delay);
  for(const c of plan.changes)state.steps.find(s=>s.id===c.id).time=c.time;
  for(const item of plan.backlog){const s=state.steps.find(s=>s.id===item.id);s.backlogFrom={day:s.day,time:s.time,bookingTime:s.bookingTime,status:s.status};Object.assign(s,{day:null,time:null,bookingTime:null,group:'',option:'',status:'todo'});}
  return {summary:`Revised ${op.day} for a ${op.delay}-minute delay. ${plan.backlog.length} activities saved to Options.`,important:true};
 }else return false;
 return {summary:op.type==='meeting'?`Meeting point updated for ${op.day}: ${op.place}${op.time?' at '+op.time:''}`:null,important:op.type==='meeting'};
}
