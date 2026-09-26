import {activeSteps,minutes,asClock,japanDate,japanClock} from './timing.js';
import {stepsFor} from './split.js';
import {expressSeeded} from './park-data.js';
import {splitSeeded} from './stop-splits.js';
import {ORDERED_PHRASES,phraseForDay} from './phrasebook-data.js';
import {ALL_FACTS,orderedFacts} from './fact-data.js';
export const BOYS=['Nate','Boston'];
export const THANK_YOU_FROM='Damien',THANK_YOU_TO='Lauren';
export function initialThankYou(){
 return [
 'Thank you for saying yes to Japan. Sixteen days, four passports and a plan that only works because you hold it together.',
 'Thank you for the packing. Every charger, every jumper and every snack the boys will claim they are starving for by nine in the morning.',
 'Thank you for being the calm one at the station. You read the signs, I read the room, and somehow we still get on the right train.',
 'Thank you for letting the boys be loud in a quiet country, and for the way you steer them back without ever making them feel small.',
 'Thank you for the early mornings. I know you were awake long before the rest of us, working out how today was going to run.',
 'Thank you for choosing the small places. The best meal of this trip will be one you found down a side street.',
 'Thank you for the photos you take of us. You are in far too few of them, and I am going to fix that today.',
 'Thank you for your patience with my plans, and for never saying I told you so on the days you very much did.',
 'Thank you for carrying the things nobody sees. The bookings, the messages home, the worrying I get to skip.',
 'Thank you for the way you explain things to Nate. He is five and he is learning a whole country from you, one question at a time.',
 'Thank you for taking Boston seriously. He asks hard questions and you answer them properly. He will remember that longer than the rides.',
 'Thank you for letting today be slower. Not every day has to be a highlight, and you always know which ones should not be.',
 'Thank you for laughing at the parts that went wrong. Those are the stories we will actually tell when we get home.',
 'Thank you for being the person the boys look for first in a crowd. That is not an accident. You earned it.',
 'Thank you for making a hotel room feel like ours within ten minutes of walking in.',
 'Thank you for your company. You are still the person I most want to show a new place to.',
 'Thank you for the budget you quietly keep in your head so the rest of us get to simply enjoy it.',
 'Thank you for the grace at the end of a long day, when the other three Pasfields have run out of it entirely.',
 'Thank you for trying everything once. The boys are braver because they watch you go first.',
 'Thank you for this whole trip. Whatever we remember about Japan, the best part of it was going with you.'
 ].map((text,i)=>({id:`thanks-${i+1}`,text,day:null,order:(i+1)*10}));
}
export const thankYouNotes=state=>[...(state.thankYou?.messages||[])].sort((a,b)=>(a.order-b.order)||String(a.id).localeCompare(String(b.id)));
export function thankYouSchedule(state){
 const notes=thankYouNotes(state),pinned=new Map();
 for(const m of notes)if(m.day&&state.days.some(d=>d.date===m.day)&&!pinned.has(m.day))pinned.set(m.day,m);
 const pool=notes.filter(m=>!m.day);let next=0;
 return state.days.map(d=>({day:d.date,message:pinned.get(d.date)||pool[next++]||null}));
}
export const thankYouForDay=(state,day)=>thankYouSchedule(state).find(entry=>entry.day===day)?.message||null;
// Whether Lauren has opened a day's note, and when. A note opened after midnight in Japan
// reports the date she actually read it, so a late read is not mistaken for one on the day.
export function noteReadState(day,seen,today){
 const at=seen?.[day];
 if(!at)return {read:false,when:null,readDay:null,late:false,pending:day>today?'waiting':day===today?'today':'missed'};
 const when=new Date(at),readDay=japanDate(when);
 return {read:true,when,readDay,late:readDay!==day,pending:null};
}
export const thankYouSpares=state=>{const scheduled=new Set(thankYouSchedule(state).map(e=>e.message?.id));return thankYouNotes(state).filter(m=>!scheduled.has(m.id));};
// A phone number as written, turned into something to tap. Japanese numbers are normally
// written with a leading 0, which has to be dropped once +81 is added — so a number with no
// country code is read as a Japanese one, and the app says so rather than dialling silently.
export function phoneLinks(raw,defaultCountry='81'){
 const written=String(raw||'').trim();
 if(!written||!/\d/.test(written))return null;
 const compact=written.replace(/[^\d+]/g,'');
 let international=null,assumed=false;
 if(compact.startsWith('+'))international=compact.slice(1).replace(/\D/g,'');
 else if(compact.startsWith('00'))international=compact.slice(2).replace(/\D/g,'');
 else if(compact.startsWith('0')){international=defaultCountry+compact.replace(/\D/g,'').slice(1);assumed=true;}
 const dialable=international?`+${international}`:compact.replace(/\D/g,'');
 return {written,tel:`tel:${dialable}`,dialable,international:international?`+${international}`:null,assumed,
  whatsapp:international&&international.length>=8&&international.length<=15?`https://wa.me/${international}`:null};
}
// A long window seat deserves something to do. Shown on the Shinkansen legs.
export const EYE_SPY=[
 {id:'fuji',icon:'🗻',title:'Mount Fuji',hint:'{when}, if the sky is clear. Watch the windows on the {side}.'},
 {id:'passing',icon:'🚅',title:'A Shinkansen going the other way',hint:'Gone in a blink. Listen for the bang as it passes.'},
 {id:'tunnel',icon:'🚇',title:'A tunnel',hint:'Your ears might pop. Count how many you go through.'},
 {id:'paddies',icon:'🌾',title:'Rice fields in neat squares',hint:'Flat, green and fitted together like tiles.'},
 {id:'mountains',icon:'🏔️',title:'Mountains with their tops in cloud',hint:''},
 {id:'sea',icon:'🌊',title:'The sea',hint:'It appears and disappears. Be quick.'},
 {id:'river',icon:'🌉',title:'A long bridge over a river',hint:'Wide, pale and stony underneath.'},
 {id:'nets',icon:'⛳',title:'Tall green nets around a golf range',hint:'Huge nets on poles, right beside the track.'},
 {id:'factory',icon:'🏭',title:'A factory with tall chimneys',hint:''},
 {id:'torii',icon:'⛩️',title:'A shrine gate out of the window',hint:'Look for the orange gate shape.'},
 {id:'roofs',icon:'🏘️',title:'Houses with blue or grey tiled roofs',hint:'They shine when the sun catches them.'},
 {id:'jam',icon:'🚗',title:'Cars stuck in a traffic jam below',hint:'We will go straight past them.'},
 {id:'whitecars',icon:'🅿️',title:'A car park where nearly every car is white',hint:''},
 {id:'trolley',icon:'🛒',title:'The snack trolley coming down the aisle',hint:''},
 {id:'bow',icon:'🧹',title:'The cleaning team bowing on the platform',hint:'They bow to the train before and after they clean it.'},
 {id:'asleep',icon:'💤',title:'Someone fast asleep',hint:'Very common. Be kind about it.'}
];
export const isTrainLeg=step=>/nozomi|shinkansen/i.test(step?.title||'');
export const trainLegs=state=>state.steps.filter(isTrainLeg);
export const eyeSpyKey=(stepId,itemId)=>`${stepId}|${itemId}`;
export const eyeSpySpotted=(state,stepId,person)=>EYE_SPY.filter(item=>state.eyeSpy?.[eyeSpyKey(stepId,item.id)]?.[person]);
// Fuji sits south of the line, so it is on the right heading west and the left heading back —
// and it passes about 40 minutes from the Tokyo end of the journey, whichever way you travel.
export const towardsTokyo=step=>/tokyo/i.test(step?.title||'');
export const fujiSide=step=>towardsTokyo(step)?'left':'right';
export const eyeSpyHint=(item,step)=>item.hint
 .replace('{side}',fujiSide(step))
 .replace('{when}',towardsTokyo(step)?'About 40 minutes before we reach Tokyo':'About 40 minutes out of Tokyo');
// Ride checklist state. `parkRides` records who has ridden what and what the family has
// starred as a must-do; `heights` is each boy's height in cm, so a ride can say plainly
// whether he is tall enough rather than leaving a number to be compared in a queue.
export const riddenBy=(state,rideId)=>state.parkRides?.[rideId]?.ridden||{};
export const isMustDo=(state,rideId)=>!!state.parkRides?.[rideId]?.must;
export function heightCheck(ride,person,heights){
 if(!ride.height)return {limit:false,ok:true,label:'Everyone can ride'};
 const own=heights?.[person];
 if(!own)return {limit:true,ok:null,label:`${ride.height}cm minimum`,short:null};
 const short=ride.height-own;
 return {limit:true,ok:short<=0,label:short<=0?`${person} is tall enough`:`${short}cm too short for ${person}`,short:short>0?short:0};
}
export const parkProgress=(state,park,person)=>park.rides.filter(r=>riddenBy(state,r.id)[person]).length;
// The food list: the built-in dishes plus anything the family adds, with who has tried what
// and how each of us rated it. A rating is 1–5 from one person; the card shows the average.
export const foodEntry=(state,id)=>state.food?.[id]||{};
export const triedFood=(state,id)=>foodEntry(state,id).tried||{};
export const foodRatings=(state,id)=>foodEntry(state,id).ratings||{};
export function foodAverage(state,id){
 const scores=Object.values(foodRatings(state,id)).filter(n=>Number.isFinite(n));
 return scores.length?Math.round((scores.reduce((a,b)=>a+b,0)/scores.length)*10)/10:null;
}
export const FAVOURITE_AT=4;
export const isFavourite=(state,id)=>{const avg=foodAverage(state,id);return avg!==null&&avg>=FAVOURITE_AT;};
// Voice notes, newest first, for a whole day or for one activity on it.
export const voiceNotesFor=(state,{day,stepId}={})=>(state.voiceNotes||[])
 .filter(v=>(!day||v.day===day)&&(stepId===undefined||v.stepId===(stepId||null)))
 .sort((a,b)=>String(b.at).localeCompare(String(a.at)));
export const voiceLength=seconds=>`${Math.floor(seconds/60)}:${String(Math.round(seconds%60)).padStart(2,'0')}`;
// Who has already seen a given day's phrase, so it pops up once each.
export const phraseSeenBy=(state,day)=>state.phraseSeen?.[day]||{};
// The boys' own photographs, newest first, and the vote for the day's best.
export const photosFor=(state,day)=>(state.photos||[]).filter(p=>!day||p.day===day)
 .sort((a,b)=>String(b.at).localeCompare(String(a.at)));
// Whose photo it is, which is not always who put it on: a parent photographs something a boy
// did, on their own phone, and hands it to him. Anything written before photos could be handed
// over belongs to whoever added it, so the fallback is not a guess.
export const photoOwner=photo=>photo?.for||photo?.by||'';
// One person's photographs, across the whole trip, newest first. This is the central section:
// everything of theirs in one place rather than a day at a time.
export const photosOf=(state,person,day)=>photosFor(state,day).filter(p=>photoOwner(p)===person);
// A drawing is somebody's own work rather than a picture of somewhere we went, so it is kept
// apart from the photographs: it never enters the photo of the day, where it would be
// competing with a bullet train for the family's votes. Whose it is follows the same rule as
// a photograph, because a parent sends one a boy drew just as often as he does himself.
export const drawingOwner=drawing=>drawing?.for||drawing?.by||'';
export const drawingsFor=state=>[...(state.drawings||[])].sort((a,b)=>String(b.at).localeCompare(String(a.at)));
export const drawingsOf=(state,person)=>drawingsFor(state).filter(d=>!person||drawingOwner(d)===person);
// How many each of them has, for the filter, so a name with nothing behind it says so.
export const photoCounts=(state,day)=>{
 const counts={};
 for(const photo of photosFor(state,day)){const who=photoOwner(photo);counts[who]=(counts[who]||0)+1;}
 return counts;
};
export const photoVotesFor=(state,day)=>state.photoVotes?.[day]||{};
// One vote each. The winner is the photo with the most, and a tie is a tie — it says so
// rather than picking one, because an arbitrary winner between brothers is worse than none.
export function photoOfTheDay(state,day){
 const entries=photosFor(state,day);
 if(!entries.length)return null;
 const votes=photoVotesFor(state,day);
 const tally={};
 for(const id of Object.values(votes))tally[id]=(tally[id]||0)+1;
 const most=Math.max(0,...Object.values(tally));
 if(!most)return {entries,tally,winners:[],votes:0};
 const winners=entries.filter(p=>tally[p.id]===most);
 return {entries,tally,winners,votes:most};
}
// Best score per person per game, and the janken round in progress.
export const bestScore=(state,person,game)=>state.games?.scores?.[person]?.[game]??0;
// Everybody's best at one game, for a head-to-head. Only people who have actually played it:
// a nought beside a brother's name reads as a score rather than as not having had a go.
export const scoresFor=(state,game)=>Object.fromEntries((state.members||[])
 .map(name=>[name,bestScore(state,name,game)]).filter(([,score])=>score>0));
export const jankenRound=state=>state.games?.janken?.round||null;
export const jankenScores=state=>state.games?.janken?.scores||{};
// A round is over once both players have thrown. Until then nobody sees the other's hand.
export const roundComplete=(round,players)=>!!round&&players.every(p=>round.throws?.[p]);
// The family's own phrases, newest first. Kept apart from the book: the daily rota and the
// log are built from phrase ids that have to exist, and these come and go.
export const ourPhrases=state=>[...(state.customPhrases||[])].sort((a,b)=>String(b.at).localeCompare(String(a.at)));
// Every phrase a person has actually been shown, and when they first met it.
export const phrasesSeenBy=(state,person)=>state.phraseLog?.[person]||{};
export const phraseLogFor=(state,person)=>{
 const seen=phrasesSeenBy(state,person);
 return ORDERED_PHRASES().filter(p=>seen[p.id]).map(p=>({...p,at:seen[p.id]}))
  .sort((a,b)=>String(b.at).localeCompare(String(a.at)));
};
// What to show next: the day's phrase first, then whatever this person has not met yet, so
// swiping on never lands twice on the same one.
export function phraseQueue(state,person,day){
 const seen=phrasesSeenBy(state,person),todays=day?phraseForDay(state.days,day):null;
 const rest=ORDERED_PHRASES().filter(p=>p.id!==todays?.id&&!seen[p.id]);
 return [todays,...rest].filter(Boolean);
}
// Who has already had a fun fact on a given day, so it pops up once each rather than once
// a phone. Kept apart from the log below: this one answers "is today done".
export const factSeenBy=(state,day)=>state.factSeen?.[day]||{};
// Every fact a person has actually been shown, and when they first met it.
export const factsSeenBy=(state,person)=>state.factLog?.[person]||{};
export const factLogFor=(state,person)=>{
 const seen=factsSeenBy(state,person);
 return ALL_FACTS().filter(f=>seen[f.id]).map(f=>({...f,at:seen[f.id]}))
  .sort((a,b)=>String(b.at).localeCompare(String(a.at)));
};
// What to show next: the day's own facts first, because those are the ones about what is
// actually coming up, then the rest of the book — and never one this person has already met.
export function factQueue(state,person,day){
 const seen=factsSeenBy(state,person),ordered=orderedFacts(state.days,day);
 const lead=ordered.find(f=>!seen[f.id])||ordered[0];
 return lead?[lead,...ordered.filter(f=>f.id!==lead.id&&!seen[f.id])]:[];
}
// Searching for Japanese on an English keyboard: nobody types the macron in "arigatō",
// and a question mark or a hyphen should not decide whether a phrase is found.
export const searchText=s=>(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
// Yen per 1 Australian dollar. Kept in the trip so everyone sees the same number, and set by
// a parent rather than trusted to a third party — a shop with no signal still needs to convert.
export const DEFAULT_YEN_PER_AUD=98;
export const yenPerAud=state=>{const v=state.rates?.perAud;return Number.isFinite(v)&&v>0?v:DEFAULT_YEN_PER_AUD;};
export const rateIsSet=state=>Number.isFinite(state.rates?.perAud)&&!!state.rates?.at;
export const yenToAud=(yen,rate)=>Math.round((yen/rate)*100)/100;
export const audToYen=(aud,rate)=>Math.round(aud*rate);
export const asAud=n=>`$${yenToAud(n,1).toFixed(2)}`;
export const MISSION_SEED=2;
// Three missions a day for each boy, written around what that day actually holds.
// Nate is 5, Boston is 8, so each day carries a junior and a senior set.
export const DAY_MISSIONS={
 '2026-09-21':{Nate:[
  ['Airport code detective','Find the letters HND on a sign. Say them out loud, then find them again on a bag tag.','🔤'],
  ['First words in Japanese','Say konnichiwa to one person with a parent beside you. How did they say it back?','👋'],
  ['Window seat report','Look out of the car window on the way to the hotel. Name three things you have never seen at home.','🚗']],
 Boston:[
  ['Arrival planner','Read the arrival board with a parent. Work out how long until our next step, and explain the Japan–Sydney time difference using two phone clocks.','🕐'],
  ['Border process map','List the order of what happened: plane, immigration, bags, customs, car. Explain why each step comes where it does.','🛂'],
  ['First impressions log','Record three things done differently from the airport at home. Say what problem each one solves.','📝']]},
 '2026-09-22':{Nate:[
  ['Forest sound map','Stand still at Meiji Jingu and close your eyes for ten seconds. Name three sounds you can hear.','👂'],
  ['Torii gate counter','Count the big wooden gates we walk through. What shape are they? Draw one in the air.','⛩️','torii'],
  ['Crossing watcher','At Shibuya, watch one full green light with a parent. Guess how many people crossed, then say why it is hard to count.','🚦','crossing']],
 Boston:[
  ['Old and new investigator','Meiji Jingu is a forest inside a city. Find one detail that feels old and one that feels brand new, and explain what each is for.','🏙️'],
  ['Crowd engineer','Watch the Shibuya crossing. Work out the rules that stop people bumping into each other, then suggest one improvement.','🚶'],
  ['Shop window analyst','On Omotesando, compare two shop windows. What is each one trying to make you feel, and how?','🪟']]},
 '2026-09-23':{Nate:[
  ['Light and colour hunt','At teamLab, find a colour that changes while you watch. Tell a parent what made it change.','🌈'],
  ['Little baker','At the bakery, follow each step in order. Say the steps back afterwards, first to last.','🥐'],
  ['Sumo watcher','Watch one bout. Who moved first? Show the family the strongest stance you can make.','🤼']],
 Boston:[
  ['Prediction and evidence','At teamLab, pick an artwork. Predict what happens when you move, test it, then say whether your evidence matched.','🔬'],
  ['Recipe as instructions','Write the bakery steps as instructions someone else could follow. What would go wrong if you swapped two of them?','📋'],
  ['Sumo rules analyst','Work out the rules of winning by watching, before anyone tells you. Then check with the guide — what did you get right?','🏆']]},
 '2026-09-24':{Nate:[
  ['Platform number hunt','Find our platform number on a sign, then find the same number somewhere else on the platform.','🔢'],
  ['Fast train feeling','On the Nozomi, watch something close and something far away. Which one whizzes past faster? Why do you think that is?','🚄'],
  ['Lantern spotter','In Gion, count five paper lanterns. What do you think the writing on them says?','🏮']],
 Boston:[
  ['Rail journey analyst','Find our route on a map. Estimate the distance from Tokyo to Kyoto, then compare it with the real journey information.','🗺️'],
  ['Speed calculator','With a parent, use the journey time and distance to estimate the train speed. Check it against a posted figure.','⏱️'],
  ['Two cities compared','Gion tonight, Tokyo this morning. Name three differences and explain what caused each one.','⚖️']]},
 '2026-09-25':{Nate:[
  ['Ride bravery badge','Choose one ride you were nervous about. Say how you felt before and how you felt after.','🎢'],
  ['Question block hunt','In Super Nintendo World, find three things that look like they came out of a game. Which is your favourite, and why?','❓'],
  ['Queue time guesser','Before a queue, guess how long it will take. Check the clock afterwards — were you close?','⏳']],
 Boston:[
  ['Theme-park strategist','Using posted wait times with a parent, choose the best order for two attractions. Include walking and a break.','🗓️'],
  ['Ride engineering','Pick one ride. Explain how it makes you feel speed — is it real speed, or a trick of sound, light and tilt?','⚙️'],
  ['Land designer','Super Nintendo World turns a game into a place. Name three ways they did it, then design a fourth.','🎮']]},
 '2026-09-26':{Nate:[
  ['Bamboo engineer','Look up in the bamboo grove. Find the rings on a stem and count five. What do you think they are for?','🎋','bamboo'],
  ['River bridge count','At Togetsukyo, count the arches or posts holding the bridge up. Why does a bridge need so many?','🌉','arch'],
  ['Slow looking','Sit still for one minute somewhere quiet. Name one thing you only noticed because you stopped.','🧘']],
 Boston:[
  ['Bamboo structure challenge','Sketch a bamboo stem and label two features that help it stay tall or bend. Compare it with a building you have seen.','📐'],
  ['Bridge load investigator','Look at how Togetsukyo carries its weight. Where does the force go? Sketch your answer.','🏗️'],
  ['Visitor flow study','The grove gets busy. Work out where the pinch points are, and suggest one change that would help.','🚶']]},
 '2026-09-27':{Nate:[
  ['Deer manners','Feed a deer with a parent. What did it do before you gave it the food? Copy the bow it makes.','🦌'],
  ['Giant Buddha size','Stand near the Great Buddha. Guess how many grown-ups tall it is, then find out.','🗿'],
  ['Mochi pounding rhythm','Watch the mochi makers at Nakatanidou. Clap their rhythm. How do they never hit each other?','🍡']],
 Boston:[
  ['Animal behaviour notebook','Observe the deer quietly. Record three behaviours, and separate what you saw from what you think it means.','📓'],
  ['Todai-ji by numbers','Find the height or the age of the Great Buddha hall. Work out how long before Australia was colonised it was built.','🏯'],
  ['Old Kyoto detective','In kimono, notice what changes about how you move. Explain how clothing and building design fit each other.','👘']]},
 '2026-09-28':{Nate:[
  ['Neon sign hunt','Find the Glico running man. Copy his pose for a photo. What else is lit up near him?','🎇'],
  ['Takoyaki watch','Watch someone turn the takoyaki balls. Count how many they turn before they stop. Would you be fast enough?','🐙'],
  ['Gachapon gamble','Choose one gachapon machine. Say what you hope you get before you turn it. Did you get it?','🎰']],
 Boston:[
  ['Market comparison','Compare prices or sizes for three similar items in Shinsaibashi. Which would you choose, and why besides price?','🛍️'],
  ['Neon economics','Dotonbori is covered in signs. Work out who pays for them and what they get back. Which sign works hardest, and why?','💡'],
  ['River city view','From the cruise, work out why Osaka grew up around these canals. What did they carry?','🛶']]},
 '2026-09-29':{Nate:[
  ['Train change tracker','We change trains today. Count how many different trains we ride. Which one was your favourite?','🚉'],
  ['Luggage detective','Our bags travel separately. Say where you think they are right now, and where they will meet us.','🧳'],
  ['First look at the springs','When we arrive, find three things that tell you a story before anyone says a word.','✨']],
 Boston:[
  ['Transfer planner','Read the plan with a parent. Work out our buffer between two steps, and say whether it is enough.','⏲️'],
  ['Luggage logistics','Our bags are forwarded. Map the journey they take, and list two things that could go wrong.','📦'],
  ['Imagineering review','Fantasy Springs is built to tell a story. Explain how it uses sound, light, movement, scenery and timing.','🎭']]},
 '2026-09-30':{Nate:[
  ['Ride story teller','Choose one ride. Tell the story back to us in three sentences: beginning, middle and end.','📖'],
  ['Hidden character hunt','Find three characters hidden in the scenery that are not on any sign. Where were they?','🔍'],
  ['Music mapper','Notice how the music changes as we walk between lands. Where exactly does it swap over?','🎵']],
 Boston:[
  ['Queue design study','Compare two queues. What does each one do to make the waiting feel shorter?','🧵'],
  ['Pass strategist','With a parent, look back at the day. Where did our passes save the most time? What would you change?','🎟️'],
  ['Ride mechanism guess','Pick a ride and work out how it moves you — track, arm, boat or belt. Look for the evidence.','🔧']]},
 '2026-10-01':{Nate:[
  ['Port explorer','DisneySea has different ports. Name your favourite and say what makes it feel different from the others.','🚢'],
  ['Water spotter','Find three places water is used to tell the story. What would change without it?','💧'],
  ['Dumpling verdict','Try a Little Green Dumpling. Describe the taste to someone who has never had one.','🥟']],
 Boston:[
  ['Design a new port','Invent a DisneySea port. Give it a setting, a ride idea, and one detail that makes the story believable.','✏️'],
  ['Water as a tool','Explain three jobs water does here: moving people, making sound, hiding machinery. Find an example of each.','🌊'],
  ['Transition analyst','Walk between two ports and find the exact point the theme changes. How did they hide the join?','🚪']]},
 '2026-10-02':{Nate:[
  ['Market smell map','At Tsukiji, name three smells. Which one made you hungriest?','👃'],
  ['Gachapon sorter','In Akihabara, find a machine and sort what is inside into groups your own way. Explain your rule.','🧩'],
  ['Museum favourite','At Ueno, pick one thing you would put in your own museum. Say why.','🖼️']],
 Boston:[
  ['Market chain','At Tsukiji, trace one food from the sea to the plate. How many people touched it on the way?','🐟'],
  ['Akihabara economics','Work out why so many similar shops sit next to each other. Would they not take each other’s customers?','🏪'],
  ['Museum of our trip','Choose five trip highlights, put them in order, and give your exhibition a name and a one-line description.','🏛️']]},
 '2026-10-03':{Nate:[
  ['Takeshita colour hunt','Find the brightest thing on Takeshita Street. Then find something quiet and plain. Which do you like better?','🎨'],
  ['Animal café manners','At the café, watch before you touch. What did the animals do when they were happy?','🐹'],
  ['Scoreboard reader','At the Giants game, find the score. Who is winning, and by how many?','⚾','scoreboard']],
 Boston:[
  ['Street style analyst','Harajuku is about self-expression. Find three outfits and explain what each one is saying.','🧥'],
  ['Animal welfare check','Look at how the café cares for its animals. List three things they do well, and one thing you would add.','❤️'],
  ['Baseball analyst','Use the scoreboard to explain innings and runs. Predict a result, then compare it with what happens.','📊']]},
 '2026-10-04':{Nate:[
  ['Gift chooser','Pick a present for someone at home. Say who it is for and why they will like it.','🎁'],
  ['Character street spotter','Find three characters you recognise and one you have never seen. Ask what the new one is.','🧸'],
  ['Beyblade launcher','Watch a battle. What makes a spinner last longer — heavy or light? Try your idea.','🌀','top']],
 Boston:[
  ['Smart souvenir buyer','Compare two souvenirs for price, quality, luggage space and usefulness at home. Recommend one within budget.','💴'],
  ['Ginza and Shimokitazawa','We see both today. Compare who each place is for, and how the shops and streets show it.','🏬'],
  ['Beyblade physics','Explain why a spinning top stays upright, and what makes one beat another. Test your theory twice.','🔁']]},
 '2026-10-05':{Nate:[
  ['Pancake describer','Describe the pancakes in three words. Could you make them at home?','🥞'],
  ['Park in the air','Miyashita Park sits on top of shops. Say what is above you and what is below you.','🌳'],
  ['Favourite day vote','Tell the family your favourite day of the trip so far, and one reason why.','⭐']],
 Boston:[
  ['Rooftop park design','A park built above shops solves a problem. Name the problem, and two things the designers had to get right.','🏙️'],
  ['Last-day budget','Work out what is left of your budget and plan how to spend it. Explain your choices.','🧮'],
  ['Trip curator','Choose five highlights and arrange them as a story. Add one thing you learned and one question you still have.','📚']]},
 '2026-10-06':{Nate:[
  ['Lucky cat counter','At Gotokuji, count the cats until you lose count. Which paw is up? Copy it.','🐱','paw'],
  ['Packing helper','Find three of your own things and pack them yourself. Tell a parent when you are done.','🎒'],
  ['Thank you in Japanese','Say arigatou gozaimasu to one person today. How did it feel?','🙏']],
 Boston:[
  ['Lucky cat investigator','Find out why people leave the cats at Gotokuji. Whose wish is each one?','🏮'],
  ['Journey home planner','Read the departure plan. Work out our buffer at Haneda, and what we would do if one step ran late.','✈️'],
  ['Trip documentary','Plan a six-photo story with captions explaining one thing you learned. Choose the photos before we land.','🎬']]}
};
// Reserve missions, drawn one at a time when a boy skips one or asks for something else.
// They work anywhere, so they suit any day of the trip.
export const EXTRA_MISSIONS={
 Nate:[
  ['Colour of the day','Choose a colour. Find five things in that colour before we get back.','🎨'],
  ['Counting game','Count something all day — red cars, dogs, vending machines. Tell us the total tonight.','🔢'],
  ['New food taster','Try one thing you have never eaten. Describe it in three words.','🍽️'],
  ['Sign copier','Find some Japanese writing and copy one character carefully. Show a parent.','✍️'],
  ['Kind helper','Do one helpful thing for someone in the family without being asked. What was it?','🤝'],
  ['Sound collector','Find three sounds you would never hear at home. Make each one yourself.','🔔'],
  ['Tall and small','Find the tallest thing and the smallest thing you can see right now.','📏'],
  ['Photo of the day','Take one photo you really like. Tell us why you chose it.','📸'],
  ['Vending machine detective','Find a vending machine. Guess what three of the drinks are before asking.','🥤'],
  ['Map pointer','On a map with a parent, point to where we are and where we are going.','🗺️']],
 Boston:[
  ['Cost comparison','Pick something we bought today. Work out what it would cost at home, and explain the difference.','💴'],
  ['Timetable reader','Read a timetable or departure board and work out the next two options. Which is better, and why?','🕑'],
  ['Ask a local','With a parent, ask one polite question of someone who works here. What did you learn?','🗣️'],
  ['Design improvement','Find something well designed today. Explain the problem it solves, then improve it.','📐'],
  ['Rule spotter','Find an unwritten rule people here follow. How did you work it out?','👀'],
  ['Estimate then check','Estimate a distance, a wait or a crowd size, then find a way to check it.','📊'],
  ['Material investigator','Pick a building or object. Name its materials and say why each was chosen.','🧱'],
  ['Waste detective','Work out how rubbish and recycling are handled here. How does it differ from home?','♻️'],
  ['Language pattern','Find a Japanese word used on several different signs. Work out what it means.','🔤'],
  ['Teach it back','Choose something you learned today and teach it to your brother so he understands.','🎓']]
};
export const GENERATED_PER_DAY=3;
export const generatedMissions=(state,day,person)=>state.challenges.filter(c=>c.day===day&&c.generated&&c.participants.includes(person));
// The next reserve mission this boy does not already have on this day.
export function nextExtraMission(state,day,person){
 const pool=EXTRA_MISSIONS[person]||[];
 const taken=new Set(state.challenges.filter(c=>c.day===day&&c.participants.includes(person)).map(c=>c.title));
 return pool.find(([title])=>!taken.has(title))||pool[0]||null;
}
export function initialChallenges(days){
 const overall={
 Nate:[['Japanese phrase explorer','Learn and use five useful Japanese words or phrases with a parent. Explain what each means.','💬'],['Stamp and symbol collector','Find three different station or attraction stamps or symbols. Sketch or photograph them where allowed and compare their designs.','🎴'],['Money master','Show two different ways to make the same amount of yen with coins, with a parent helping.','🪙'],['Three-city detective','Choose a detail that makes Tokyo, Kyoto and Osaka feel different. Tell us why.','🗾'],['Photo story maker','Choose four photos and tell a story with a beginning, middle and end.','📷'],['Invent a Japan game','Make a simple game inspired by the trip and teach the family its rules.','🎲']],
 Boston:[['Japanese mini conversation','Learn five useful phrases and try a short polite exchange with a parent alongside. Explain which phrase fits which situation.','🗣️'],['Route master','Help plan three real routes with a parent. Compare travel time, transfers and walking.','🧭'],['Yen budget keeper','Set an agreed souvenir budget, record purchases and calculate what remains.','💰'],['Evidence collector','Investigate three questions about Japan. For each, record what you observed and where you checked the answer.','🔎'],['Trip documentary','Create a six-photo story or short video with captions explaining something you learned.','🎬'],['Design the next family day','Propose a day with travel, an activity, food, a break and a backup option. Explain how the timing works.','📅']]
 };
 return [...days.flatMap(d=>BOYS.flatMap(person=>(DAY_MISSIONS[d.date]?.[person]||[]).map(([title,notes,icon='',diagram=''],i)=>({id:`mission-${d.date}-${person}-${i+1}`,title,notes,icon,diagram,day:d.date,participants:[person],completions:{},responses:{},skips:{}})))),...BOYS.flatMap(person=>overall[person].map(([title,notes,icon=''],i)=>({id:`quest-${person}-${i}`,title,notes,icon,diagram:'',day:null,participants:[person],completions:{},responses:{},skips:{}})))];
}
// The first release gave each boy one mission a day. This adds the fuller day-specific sets
// once, keeping every completion, discovery note and parent-written challenge. A superseded
// single mission is dropped only when nobody completed it.
export function seededChallenges(state){
 if(!state.challenges)return {challenges:initialChallenges(state.days),missionSeed:MISSION_SEED};
 if((state.missionSeed||1)>=MISSION_SEED)return {challenges:state.challenges,missionSeed:state.missionSeed||MISSION_SEED};
 const superseded=c=>/^mission-\d{4}-\d{2}-\d{2}-(Nate|Boston)$/.test(c.id)&&!Object.keys(c.completions||{}).length;
 const kept=state.challenges.filter(c=>!superseded(c)),have=new Set(kept.map(c=>c.id));
 return {challenges:[...kept,...initialChallenges(state.days).filter(c=>!have.has(c.id))],missionSeed:MISSION_SEED};
}
export function ensureFeatures(input){
 const state=splitSeeded({...input,...expressSeeded(input)});
 return {...state,mapUrl:(state.mapUrl||'').replace('1SDEq4N32fF5lTAzSNS00w5A1R0Ldarw','1mztIuWzTviCEZSLdDxEUqo2WK3HUNfo'),mapEmbed:(state.mapEmbed||'').replace('1SDEq4N32fF5lTAzSNS00w5A1R0Ldarw','1mztIuWzTviCEZSLdDxEUqo2WK3HUNfo'),...seededChallenges(state),groupModes:state.groupModes??{},shopping:state.shopping??[],shortlist:state.shortlist??[],meetings:state.meetings??{},contacts:state.contacts??{Damien:'',Lauren:''},alerts:state.alerts??[],journal:state.journal??{},eyeSpy:state.eyeSpy??{},parkRides:state.parkRides??{},heights:state.heights??{},food:state.food??{},foodItems:state.foodItems??[],rates:state.rates??{perAud:DEFAULT_YEN_PER_AUD,at:null,by:null},phraseAudio:state.phraseAudio??{},phraseSeen:state.phraseSeen??{},phraseLog:state.phraseLog??{},factSeen:state.factSeen??{},factLog:state.factLog??{},customPhrases:state.customPhrases??[],games:state.games??{scores:{},janken:{round:null,scores:{}}},weather:{hours:{},...(state.weather??{at:null,by:null,days:{}})},photos:state.photos??[],photoVotes:state.photoVotes??{},drawings:state.drawings??[],voiceNotes:state.voiceNotes??[],proposals:state.proposals??[],todos:state.todos??[],trackers:state.trackers??[],placeCoords:{places:{},at:null,by:null,...(state.placeCoords||{})},packing:{...EMPTY_PACKING,...(state.packing||{})},spending:{...EMPTY_PURSE,...(state.spending||{})},inbox:state.inbox??[],stepReviews:state.stepReviews??{},mascots:state.mascots??{},sumo:{...EMPTY_SUMO,...(state.sumo||{})},party:{...EMPTY_PARTY,...(state.party||{}),people:{...((state.party||{}).people||{})}},thankYou:state.thankYou??{messages:initialThankYou(),seen:{}}};
}
export function delayedDayProposal(steps,delay,nowMinute=null){
 const changes=[],backlog=[],warnings=[];let cursor=nowMinute??0;
 for(let i=0;i<steps.length;i++){
  const s=steps[i];if(['done','skipped'].includes(s.status))continue;
  if(s.locked||s.status==='started'){
   if(s.time){const start=minutes(s.time);if(s.locked&&cursor>start)warnings.push(`${s.title} at ${s.time} may already be too tight. Check directions and the booking.`);cursor=Math.max(cursor,start+(s.duration||0));}
   continue;
  }
  if(!s.time)continue;
  const candidate=Math.max(minutes(s.time)+delay,cursor),next=steps.slice(i+1).find(n=>n.locked&&n.time&&!['done','skipped'].includes(n.status));
  const cutoff=next?minutes(next.time)-(next.travelMinutes??20)-(next.arrivalBuffer??15):1440;
  if(candidate+(s.duration||0)>cutoff||candidate>=1440){backlog.push({id:s.id,title:s.title,reason:next?`Make room to reach ${next.title}`:'No room left today'});continue;}
  if(candidate!==minutes(s.time))changes.push({id:s.id,title:s.title,from:s.time,time:asClock(candidate)});
  cursor=candidate+(s.duration||0);
 }
 return {changes,backlog,warnings};
}
export function delayForDay(state,day,delay,now=new Date()){
 return delayedDayProposal(activeSteps(state,day),delay,day===japanDate(now)?minutes(japanClock(now)):null);
}
// `after` is the stop the hero card is already showing: the tile beneath it answers what comes
// after that one, rather than repeating it.
export function nextSummary(state,day,person=null,after=null){
 const steps=stepsFor(state,day,person),remaining=steps.filter(s=>!['done','skipped'].includes(s.status));
 const from=steps.findIndex(s=>s.id===after);
 const current=from<0?remaining.find(s=>s.status==='started')||remaining[0]:steps.slice(from+1).find(s=>remaining.includes(s));
 const fixed=remaining.filter(s=>s.locked&&s.time).sort((a,b)=>a.time.localeCompare(b.time))[0];
 const departure=fixed?new Date(new Date(`${day}T${fixed.time}:00+09:00`).getTime()-((fixed.travelMinutes??20)+(fixed.arrivalBuffer??15))*60000):null;
 return {current,fixed,departure};
}
export function offlineManifest(state,day){
 const d=state.days.find(d=>d.date===day),ids=new Set(activeSteps(state,day).map(s=>s.id));
 // A used ticket is not downloaded again: there is no point filling a phone with the gates we
 // have already walked through.
 const docs=state.documents.filter(d=>d.category!=='memory'&&!isArchived(d)&&(d.day===day||documentSteps(d).some(id=>ids.has(id))||(!d.day&&!documentSteps(d).length)));
 return {files:[...(d?.pages||[]).map(p=>({key:`page-${p}`,title:`Guide page ${p}`,url:`/api/guide?page=${p}`})),...docs.filter(d=>d.pathname).map(d=>({key:`doc-${d.id}`,title:d.title,url:`/api/document?id=${d.id}`}))],links:docs.filter(d=>d.type==='link')};
}
// A ticket and its attached files are read as one set: the ticket itself first, then each
// file attached to it. Written details and external links hold no file, so they are skipped.
export const ticketFiles=(documents,ticket)=>ticket
 ?[...(ticket.pathname?[ticket]:[]),...documents.filter(d=>d.parentDocumentId===ticket.id&&d.pathname)]
 :[];
export function attachmentGroup(documents,view){
 if(!view)return [];
 const rootId=view.parentDocumentId||view.id;
 const group=ticketFiles(documents,documents.find(d=>d.id===rootId)||{id:rootId});
 return group.some(d=>d.id===view.id)?group:[view];
}
// The ticket a file belongs to: itself, when it is the ticket, else the one it is attached to.
export const ticketOf=(documents,view)=>view?documents.find(d=>d.id===(view.parentDocumentId||view.id))||view:null;
// Every file the Tickets page is showing, in one strip: each ticket's own file, then the files
// attached to it, then straight on into the next ticket, so swiping past the end of one booking
// carries on into the next rather than stopping dead. A booking held only as written details or
// as a link has nothing to draw, so it drops out of the strip rather than turning up as a blank
// page. If the open file is not among the tickets listed — the page was filtered underneath it,
// say — the strip falls back to that one ticket's set, so the viewer never loses its place.
export function attachmentReel(documents,tickets,view){
 const reel=(tickets||[]).flatMap(t=>ticketFiles(documents,t).map(file=>({file,ticket:t})));
 if(view&&reel.some(e=>e.file.id===view.id))return reel;
 const ticket=ticketOf(documents,view);
 return attachmentGroup(documents,view).map(file=>({file,ticket}));
}
// HEIC and HEIF are accepted uploads but most browsers cannot draw them in an <img>, so they
// never stand in as a thumbnail — they are offered as a link to the original instead.
export const DRAWABLE=['image/jpeg','image/png','image/webp'];
export const isDrawable=doc=>!!doc?.pathname&&DRAWABLE.includes(doc.type);
// The picture that stands for a ticket: its own photo, else the first photo attached to it.
export const documentThumbnail=(doc,attachments=[])=>isDrawable(doc)?doc:attachments.find(isDrawable)||null;
// A ticket that has been used — scanned at the gate, the bag collected, the meal eaten — is not
// wrong, it is finished, and a list of finished bookings is what makes the one that matters hard
// to find on a platform. Archiving is the answer to that and deleting is not: what it says is
// still the only record of what was paid for.
export const isArchived=doc=>!!doc?.archivedAt;
export const attachmentsOf=(state,doc)=>(state.documents||[]).filter(a=>a.parentDocumentId===doc?.id);
// One booking can get you through more than one gate. A rail pass covers three legs, a park
// ticket covers the morning and the evening parade, a hotel reservation covers the night either
// side of a day trip — so a ticket is allocated to as many activities as it actually serves.
// The first of them stays in `stepId`, which is what every ticket saved before this had, so a
// ticket written last month reads exactly the same as one allocated to four activities today.
export const documentSteps=doc=>doc?.stepIds?.length?doc.stepIds:(doc?.stepId?[doc.stepId]:[]);
export const documentServesStep=(doc,stepId)=>!!stepId&&documentSteps(doc).includes(stepId);
export const documentStepList=(state,doc)=>documentSteps(doc).map(id=>(state.steps||[]).find(s=>s.id===id)).filter(Boolean);
// A pass that gets you through three gates is not finished at the first one. A booking leaves
// the list when every activity it is allocated to has been ticked off, and not before.
export const documentSpent=(steps,doc)=>{
 const ids=documentSteps(doc);
 return ids.length>0&&ids.every(id=>steps.find(s=>s.id===id)?.status==='done');
};
// What else is hanging off a stop, counted before it is taken off the plan. Removing a stop is
// the one change that cannot be made again — the notes, the times, the ratings and the progress
// go with it — so the question asked first says what is attached and where each kind of thing
// ends up. None of this is deleted with the stop: the tickets and photos stay filed, the
// recordings and the shop finds fall back to the day, and an idea that was put on the day goes
// back to the planning board to be decided again.
export function removalEffects(state,step){
 const id=step?.id||null;
 const docs=(state?.documents||[]).filter(d=>!d.parentDocumentId&&documentServesStep(d,id));
 return {
  tickets:docs.filter(d=>(d.category||'ticket')!=='memory').length,
  photos:docs.filter(d=>d.category==='memory').length,
  voiceNotes:(state?.voiceNotes||[]).filter(v=>v.stepId===id).length,
  finds:(state?.shortlist||[]).filter(s=>s.stepId===id).length,
  idea:!!id&&(state?.proposals||[]).some(p=>p.stepId===id)
 };
}
// Which tickets the page is showing, filters and all. Kept out of the screen so the count beside
// the 'used tickets' toggle is worked out by exactly the same rules as the list itself, and so
// the strip you swipe through can be given the same set the page is showing.
export function ticketList(state,{step=null,all=true,category='',person='',search='',archived=false}={}){
 const q=search.trim().toLowerCase();
 return (state.documents||[]).filter(d=>{
  if(d.parentDocumentId||d.category==='memory'||isArchived(d)!==archived)return false;
  if(!all&&!documentServesStep(d,step?.id))return false;
  if(category&&(d.category||'ticket')!==category)return false;
  const files=attachmentsOf(state,d);
  if(person&&d.person!==person&&!files.some(a=>a.person===person))return false;
  return !q||[d.title,d.reference,d.notes,...(d.tags||[]),...files.flatMap(a=>[a.title,a.notes,...(a.tags||[])])].join(' ').toLowerCase().includes(q);
 });
}
// What we thought of it, afterwards. Separate from a step's own notes, which are the plan —
// these are four opinions about a thing that has happened, kept per person so nobody's stars
// average away somebody else's. Rating something also records that you were there.
export const stepEntry=(state,id)=>state.stepReviews?.[id]||{};
export const stepRatings=(state,id)=>stepEntry(state,id).ratings||{};
export const stepThoughts=(state,id)=>stepEntry(state,id).thoughts||{};
export function stepAverage(state,id){
 const scores=Object.values(stepRatings(state,id)).filter(n=>Number.isFinite(n));
 return scores.length?Math.round((scores.reduce((a,b)=>a+b,0)/scores.length)*10)/10:null;
}
export const stepRated=(state,id)=>Object.keys(stepRatings(state,id)).length;
export const STEP_STARS=5;
// The days we would do again, best first — the trip's own highlights, built out of what the
// four of them actually said rather than out of what was planned.
export function ratedSteps(state,{day=null,min=0}={}){
 return state.steps
  .filter(s=>(!day||s.day===day)&&stepRated(state,s.id)&&(stepAverage(state,s.id)??0)>=min)
  .map(s=>({step:s,average:stepAverage(state,s.id),ratings:stepRatings(state,s.id),thoughts:stepThoughts(state,s.id)}))
  .sort((a,b)=>b.average-a.average||String(a.step.day).localeCompare(String(b.step.day)));
}
export const dayRating=(state,day)=>{
 const rated=ratedSteps(state,{day});
 if(!rated.length)return null;
 return Math.round((rated.reduce((sum,r)=>sum+r.average,0)/rated.length)*10)/10;
};
// The sumo day. Ryogoku Kokugikan on 23 September, which is inside the Aki basho, so there is a
// real card that day with real names on it. The match-ups are published the afternoon before, so
// this is fetched close to the day and kept in the trip: the arena is a basement full of phones
// and the list has to still be there when the signal is not.
export const SUMO_DIVISIONS=[['makuuchi','Makuuchi · the top division'],['juryo','Juryo'],['makushita','Makushita'],['other','Earlier bouts']];
export const divisionLabel=id=>(SUMO_DIVISIONS.find(([key])=>key===id)||SUMO_DIVISIONS.at(-1))[1];
export const SUMO_DAY='2026-09-23';
// The official site files each card under its division and its day — /torikumi/1/11/ is the top
// division on day 11, /torikumi/2/11/ the juryo — and the bare /torikumi/ address on its own is
// a dead page. The Aki basho opens on Sunday 13 September, so our day is day 11, which is what the
// link points at before a card has been loaded to say so.
export const SUMO_DAY_NUMBER=11;
export const SUMO_SITE_DIVISIONS=[['makuuchi',1,'Top division'],['juryo',2,'Juryo'],['makushita',3,'Makushita']];
export function sumoSiteUrl(dayNumber=SUMO_DAY_NUMBER,division='makuuchi'){
 const day=Number.isInteger(dayNumber)&&dayNumber>=1&&dayNumber<=15?dayNumber:SUMO_DAY_NUMBER;
 const [,page]=SUMO_SITE_DIVISIONS.find(([id])=>id===division)||SUMO_SITE_DIVISIONS[0];
 return `https://www.sumo.or.jp/EnHonbashoMain/torikumi/${page}/${day}/`;
}
export const SUMO_SITE=sumoSiteUrl();
export const EMPTY_SUMO={basho:'',dayNumber:null,venue:'',date:null,doorsOpen:'',notes:'',bouts:[],sources:[],wrestlers:{},results:{},predictions:{},at:null,by:null,resultsAt:null,resultsNote:''};
export const sumo=state=>({...EMPTY_SUMO,...(state.sumo||{}),bouts:[...((state.sumo||{}).bouts||[])],
 wrestlers:{...((state.sumo||{}).wrestlers||{})},results:{...((state.sumo||{}).results||{})},
 predictions:{...((state.sumo||{}).predictions||{})}});
export const sumoBouts=state=>[...sumo(state).bouts].sort((a,b)=>(a.order??0)-(b.order??0));
// Bouts grouped the way the afternoon actually runs: the lower divisions first, the top last.
export function sumoCard(state){
 const bouts=sumoBouts(state),order=SUMO_DIVISIONS.map(([id])=>id);
 return SUMO_DIVISIONS.map(([id,label])=>({id,label,bouts:bouts.filter(b=>b.division===id)}))
  .filter(g=>g.bouts.length).sort((a,b)=>order.indexOf(b.id)-order.indexOf(a.id));
}
// Each bout's number on the day, counted within its division in running order the way the
// programme and the official site number them: Makuuchi bout 1 is the first top-division bout.
// Worked out from the card every time rather than stored, so a refreshed card renumbers itself.
export function boutNumbers(state){
 const numbers={};
 for(const group of sumoCard(state))group.bouts.forEach((b,i)=>{numbers[b.id]={number:i+1,of:group.bouts.length,division:group.id};});
 return numbers;
}
export const boutPredictions=(state,id)=>sumo(state).predictions[id]||{};
// Everybody picks before the bout, on whichever phone is out — so a pick is locked the moment
// the result goes in. You cannot call it after you have watched it.
export const predictionsClosed=(state,id)=>!!boutResult(state,id);
// Who is calling them right. A bout nobody has watched yet is still to come rather than wrong,
// which matters when you are three bouts in and the tally would otherwise read as a thrashing.
export function predictionTally(state){
 const {predictions,results}=sumo(state),tally={};
 for(const [id,picks] of Object.entries(predictions))
  for(const [person,pick] of Object.entries(picks)){
   const score=tally[person]||={name:person,right:0,wrong:0,waiting:0,called:0};
   score.called++;
   if(!results[id])score.waiting++;
   else if(results[id].winner===pick)score.right++;
   else score.wrong++;
  }
 return Object.values(tally).sort((a,b)=>b.right-a.right||a.wrong-b.wrong||a.name.localeCompare(b.name));
}
export const predictionLeaders=state=>{
 const tally=predictionTally(state).filter(t=>t.right>0);
 return tally.length?tally.filter(t=>t.right===tally[0].right).map(t=>t.name):[];
};
// The columns of the tipping sheet, in the order the family is listed rather than in the order
// they are winning: a column that moves between bouts is a column nobody can follow.
export const predictionPeople=(state,members=[])=>{
 const picked=new Set(Object.values(sumo(state).predictions).flatMap(picks=>Object.keys(picks)));
 return [...members.filter(Boolean),...[...picked].filter(name=>!members.includes(name)).sort()];
};
// The ladder, read the way a tipping comp's is: everybody on it from the first bout whether or
// not they have called anything, a place rather than a row number, and a hit rate off what has
// actually been watched. Two people on the same record share the place — 1, 1, 3 — because
// breaking a tie by alphabet is how you lose a five-year-old.
export function predictionLadder(state,members=[]){
 const scored=Object.fromEntries(predictionTally(state).map(t=>[t.name,t]));
 const rows=predictionPeople(state,members)
  .map(name=>scored[name]||{name,right:0,wrong:0,waiting:0,called:0})
  .sort((a,b)=>b.right-a.right||a.wrong-b.wrong||a.name.localeCompare(b.name));
 let place=0,previous='';
 return rows.map((row,i)=>{
  const record=`${row.right}/${row.wrong}`;
  if(record!==previous){place=i+1;previous=record;}
  const decided=row.right+row.wrong;
  return {...row,place,decided,percent:decided?Math.round(row.right*100/decided):null};
 });
}
// The card as the afternoon uses it: the next bout without a result as the feature, the rest
// still to come in running order under it, and the finished ones at the foot, latest first.
// `holding` keeps one bout where it is for a moment after its winner goes in, so the win can be
// seen before the list moves on.
export function boutQueue(state,holding=null){
 const order=sumoCard(state).flatMap(g=>g.bouts);
 const open=order.filter(b=>b.id===holding||!boutResult(state,b.id));
 const finished=order.filter(b=>b.id!==holding&&boutResult(state,b.id)).reverse();
 return {next:open[0]||null,upcoming:open.slice(1),finished};
}
// The score as it stood after each bout, in running order: how many each of us had called right
// by then. Only bouts with a result move it, and everybody starts on nought.
export function runningTotals(state,members=[]){
 const people=predictionPeople(state,members),score=Object.fromEntries(people.map(n=>[n,0])),after={};
 for(const bout of sumoBouts(state)){
  const result=boutResult(state,bout.id);if(!result)continue;
  const picks=boutPredictions(state,bout.id);
  for(const name of people)if(picks[name]&&picks[name]===result.winner)score[name]+=1;
  after[bout.id]={...score};
 }
 return after;
}
// The sheet itself: one row per bout, one column per person, the totals along the bottom. Only
// the bouts the comp is actually about — somebody called it, or we watched it — because the
// card runs to forty-odd bouts and nobody has an opinion about the ones before lunch.
export function tippingTable(state,members=[]){
 const people=predictionPeople(state,members);
 const totals=Object.fromEntries(people.map(name=>[name,{name,right:0,wrong:0,waiting:0,called:0}]));
 const rows=[];
 for(const bout of sumoBouts(state)){
  const picks=boutPredictions(state,bout.id),result=boutResult(state,bout.id);
  if(!result&&!Object.keys(picks).length)continue;
  rows.push({id:bout.id,time:bout.time||'',division:bout.division,
   east:bout.east?.name||'',west:bout.west?.name||'',winner:result?.winner||null,
   picks:people.map(name=>{
    const pick=picks[name]||null,outcome=!pick?'none':!result?'waiting':result.winner===pick?'right':'wrong';
    if(pick){totals[name].called++;totals[name][outcome]++;}
    return {name,pick,side:pick?(pick===bout.east?.name?'east':'west'):null,outcome};
   })});
 }
 return {people,rows,totals:people.map(name=>totals[name])};
}
export const wrestlerKey=name=>String(name||'').trim().toLowerCase();
export const wrestlerProfile=(state,name)=>sumo(state).wrestlers[wrestlerKey(name)]||null;
export const boutResult=(state,id)=>sumo(state).results[id]||null;
// Which bout is on now, so the screen says "this one" rather than leaving you counting rows.
// Bouts run to a published time but never exactly, so this is the one that has started most
// recently rather than a claim about what is happening in the ring this second.
export function currentBout(state,clock){
 const now=/^(\d{2}):(\d{2})/.exec(String(clock||''));
 if(!now)return null;
 const minutes=Number(now[1])*60+Number(now[2]);
 const timed=sumoBouts(state).filter(b=>/^\d{2}:\d{2}$/.test(b.time||''));
 const started=timed.filter(b=>Number(b.time.slice(0,2))*60+Number(b.time.slice(3))<=minutes);
 return started.at(-1)||null;
}
// A to-do list, which is not the shopping list and not the planning board. Small things with a
// day on them: post the postcards, buy a SIM at the airport, charge the power banks, return the
// coin locker key. Anyone adds one, anyone ticks it off, and the day it belongs to shows it.
export const TODO_KINDS=[['do','Something to do'],['buy','Something to buy']];
export const todoKindLabel=id=>(TODO_KINDS.find(([key])=>key===id)||TODO_KINDS[0])[1];
export const todos=state=>state.todos||[];
// The packing list: what we are taking, whose it is, and whether it is in the case yet. The
// suggestions are worked out in packing-data.js; what lives in the trip is only what we chose
// and which suggestions we turned down, so a turned-down one stays gone on every phone.
export const EMPTY_PACKING={items:[],dismissed:{}};
export const packing=state=>({...EMPTY_PACKING,...(state.packing||{})});
export const packItem=(o,id)=>({id,title:String(o.title||'').trim(),category:String(o.category||'other'),person:o.person||'Family',
 qty:Number.isInteger(o.qty)&&o.qty>0?o.qty:1,notes:String(o.notes||'').trim(),suggestionId:o.suggestionId??null});
// Still to do first, then oldest first, so the list reads as a queue rather than a pile.
export const sortTodos=list=>[...list].sort((a,b)=>(!!a.doneAt)-(!!b.doneAt)||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
export const todosFor=(state,day=null)=>sortTodos(todos(state).filter(t=>(t.day??null)===(day??null)));
// The purchase shortlist, which is not the shopping list and is not a to-do. The shopping list is
// written before we go: what we have already decided to bring home, with a quantity and a budget.
// This is the other half of shopping — the thing we walked past in a shop in Nara and did not buy.
// A photograph of it, which shop, whereabouts that shop was, what the ticket said, and a couple of
// words for what it is. Three days later nobody remembers a single one of those, and "shall we go
// back for it?" cannot be answered without them.
//
// So it holds what a phone can capture standing up in a shop in twenty seconds and nothing else.
// Deciding is the whole point of a shortlist, so every find carries where the family got to on it,
// and the ones we said yes to add up to a figure we can look at before the last day rather than
// after it.
export const SHORTLIST_STATUS=[['thinking','Still deciding'],['yes','We are getting it'],['no','Passed'],['bought','Bought']];
export const shortlistStatusLabel=id=>(SHORTLIST_STATUS.find(([key])=>key===id)||SHORTLIST_STATUS[0])[1];
export const shortlist=state=>state.shortlist||[];
// Undecided first, because a shortlist is a pile of unanswered questions and those are the ones
// worth looking at; then whatever we said yes to and have not bought; then newest first inside
// each, because the thing just photographed is the thing being looked at.
const SHORTLIST_ORDER={thinking:0,yes:1,bought:2,no:3};
export const sortShortlist=list=>sortShortlistBy(list,'decide');
// Where a find actually was. Three answers to one question, because a shop has three kinds of
// name depending on what you are trying to do with it later: the shop's own name, which is what
// you say out loud; a place off the trip's own map, which is what gets you walking directions and
// a Japanese address; and the activity we were on at the time, which is what you actually
// remember — "the one by the temple, on the Nara day".
//
// An activity carries its own day, so a find pinned to one takes that day rather than keeping a
// second answer that can drift away from it. A find pinned to nothing keeps the day typed on it.
export const shortlistStep=(state,find)=>find?.stepId?(state.steps||[]).find(s=>s.id===find.stepId)||null:null;
export const shortlistPlace=(state,find)=>find?.locationId?(state.locations||[]).find(l=>l.id===find.locationId)||null:null;
export const shortlistDay=(state,find)=>find?.stepId?(shortlistStep(state,find)?.day??null):(find?.day??null);
// And the fourth answer, which is the only one that works in a covered arcade with no street
// name on it: the position the phone was standing in when the photograph was taken. It is not a
// substitute for any of the others — it says nothing about what the shop is called — so it sits
// beside them rather than instead of them, and it is what walking directions go to when it is
// there, because a pin cannot be misread the way a hand-typed address can.
export const shortlistPin=find=>find&&validPin(find.pin??null)&&find.pin?find.pin:null;
// The one line a card shows for where it was, most specific first: the shop if we wrote one, then
// whatever it is pinned to, then the area typed by hand.
export function shortlistWhere(state,find){
 const step=shortlistStep(state,find),place=shortlistPlace(state,find);
 return [find?.shop,place?.name||step?.title,find?.place||place?.district||place?.city].filter(Boolean)
  .filter((part,i,all)=>all.indexOf(part)===i);
}
// How the list is ordered, which is a question the page has to let you answer rather than decide
// for you: a shortlist read on the last morning is read cheapest-first, and one read in the shop
// is read newest-first. A find with no price on it cannot be put in a price order at all, so it
// goes last in both rather than being treated as free and leading the cheap list.
export const SHORTLIST_SORTS=[
 ['decide','Still to decide first'],['want','How much we want it'],['new','Newest first'],['old','Oldest first'],
 ['dear','Dearest first'],['cheap','Cheapest first'],['shop','By shop, A to Z'],['day','By the day we saw it']
];
// How much we want it, nought to five, which is the other half of deciding and the half a price
// cannot answer. Unrated is not nought — it is a question nobody has answered yet — so it sorts
// last rather than bottom, the same way an unpriced find stays out of the cheap list.
export const SHORTLIST_STARS=5;
export const shortlistRating=find=>Number.isInteger(find?.rating)&&find.rating>=1&&find.rating<=SHORTLIST_STARS?find.rating:null;
const age=s=>String(s.createdAt||''),priced=s=>s.price===null||s.price===undefined,unrated=s=>shortlistRating(s)===null;
const SHORTLIST_SORTERS={
 decide:(a,b)=>(SHORTLIST_ORDER[a.status]??0)-(SHORTLIST_ORDER[b.status]??0)||age(b).localeCompare(age(a)),
 new:(a,b)=>age(b).localeCompare(age(a)),
 old:(a,b)=>age(a).localeCompare(age(b)),
 dear:(a,b)=>priced(a)-priced(b)||(b.price??0)-(a.price??0)||age(b).localeCompare(age(a)),
 cheap:(a,b)=>priced(a)-priced(b)||(a.price??0)-(b.price??0)||age(b).localeCompare(age(a)),
 shop:(a,b)=>String(a.shop||a.place||'\uffff').localeCompare(String(b.shop||b.place||'\uffff'))||age(b).localeCompare(age(a)),
 want:(a,b)=>unrated(a)-unrated(b)||(shortlistRating(b)??0)-(shortlistRating(a)??0)||age(b).localeCompare(age(a))
};
export const sortShortlistBy=(list,sort,state)=>[...list].sort(
 sort==='day'
  ? (a,b)=>String(shortlistDay(state,a)||'\uffff').localeCompare(String(shortlistDay(state,b)||'\uffff'))||age(b).localeCompare(age(a))
  : SHORTLIST_SORTERS[sort]||SHORTLIST_SORTERS.decide);
export const shortlistFor=(state,{person='',day='',status='',tag='',query='',sort='decide',stepId='',locationId='',rating=''}={})=>{
 const q=query.trim().toLowerCase(),least=Number(rating)||0;
 return sortShortlistBy(shortlist(state).filter(s=>
  (!person||s.person===person)&&(!day||shortlistDay(state,s)===day)&&(!status||s.status===status)
  &&(!stepId||s.stepId===stepId)&&(!locationId||s.locationId===locationId)
  &&(!least||(shortlistRating(s)??0)>=least)
  &&(!tag||(s.tags||[]).includes(tag))
  &&(!q||[s.title,s.shop,s.place,s.notes,...(s.tags||[])].filter(Boolean).join(' ').toLowerCase().includes(q))),
  sort,state);
};
// What was seen on a day, for the day's own screen: pinned to one of its activities, or simply
// written down on it. Still-deciding first, because a find we are still arguing about is the one
// worth putting in front of somebody standing in the city it is in.
export const shortlistOnDay=(state,day)=>shortlistFor(state,{day});
// A find already handed to the shopping list is not offered a second time, the same way a thing
// to buy already moved to a boy's spending money is not offered again.
export const shoppedAlready=(state,find)=>!!find.shoppingId&&shopping(state).some(s=>s.id===find.shoppingId);
export const shortlistToShop=state=>shortlist(state)
 .filter(s=>['yes','bought'].includes(s.status)&&!s.pending&&!shoppedAlready(state,s));
export const shopping=state=>state.shopping||[];
// What the shortlist comes to. A find with no price on it cannot be added up, so it is counted
// separately rather than quietly treated as free — a total that silently leaves things out is
// worse than no total, because it is the one a budget gets set against.
export function shortlistTotals(list){
 const sum=items=>items.reduce((total,s)=>total+(s.price||0),0);
 const open=list.filter(s=>s.status==='thinking'),yes=list.filter(s=>s.status==='yes'),bought=list.filter(s=>s.status==='bought');
 return {open:open.length,openYen:sum(open),yes:yes.length,yesYen:sum(yes),bought:bought.length,boughtYen:sum(bought),
  unpriced:list.filter(s=>s.price===null||s.price===undefined).length};
}
// Every tag anybody has already used, so the next person picks one rather than typing "presents"
// where somebody else typed "gifts" and splitting the list in two.
export const shortlistTags=state=>[...new Set(shortlist(state).flatMap(s=>s.tags||[]))].sort((a,b)=>a.localeCompare(b));
// Email forwarded into the trip, waiting for a parent to file it. Nothing here is on the
// itinerary: it is a pile on the hall table, in the order it arrived.
export const inboxItems=state=>[...(state.inbox||[])].sort((a,b)=>String(b.receivedAt||'').localeCompare(String(a.receivedAt||'')));
export const inboxWaiting=state=>(state.inbox||[]).length;
export const inboxTitle=item=>(item?.reading?.title||item?.subject||'Forwarded email').slice(0,250);
// What gets written into the ticket's notes when the email is filed, so the English survives on
// the phone afterwards — including with no signal, when the reader cannot be reached at all.
export function inboxNotes(item,limit=4000){
 const reading=item?.reading,lines=[`Forwarded from ${item?.from||'an unknown sender'}${item?.receivedAt?` on ${String(item.receivedAt).slice(0,10)}`:''}.`];
 if(item?.subject)lines.push(`Subject: ${item.subject}`);
 if(reading?.summary?.length)lines.push('',...reading.summary.map(line=>`\u2022 ${line}`));
 if(reading?.actions?.length)lines.push('','To do:',...reading.actions.map(a=>`\u2022 ${a.what}${a.when?` \u2014 ${a.when}`:''}`));
 const body=String(reading?.translation||item?.text||'').trim();
 if(body)lines.push('',reading?.translation?'In English:':'The email said:',body);
 return lines.join('\n').slice(0,limit);
}
export function todoProgress(state,day=null){
 const list=todosFor(state,day);
 return {done:list.filter(t=>t.doneAt).length,total:list.length,open:list.filter(t=>!t.doneAt).length};
}
// Everything with no day on it: the before-we-go jobs and the any-time ones, which is where a
// to-do sits until somebody decides which day it belongs to.
export const unallocatedTodos=state=>todosFor(state,null);
// Spending money, which belongs to Nate and Boston and to nobody else. Each of them has a purse:
// money a parent puts in, and money going out on the things they buy. An amount a day is worked
// out from the trip's own days rather than written into the trip by something running overnight,
// so a phone that has been in a pocket since Kyoto shows the right balance the moment it is
// opened, with no signal and nothing to catch up on.
export const EMPTY_PURSE={allowance:{},topUps:[],items:[],requests:[]};
export const spending=state=>({...EMPTY_PURSE,...(state.spending||{})});
export const allowanceFor=(state,person)=>spending(state).allowance[person]||null;
// Newest first: a top-up is a thing that just happened, and the one you want to see is the last.
export const topUpsFor=(state,person)=>spending(state).topUps.filter(t=>t.person===person)
 .sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
// Still to buy first, oldest first inside each half, so the list reads as a queue the way the
// to-do list does rather than as a pile of receipts.
export const spendItemsFor=(state,person)=>spending(state).items.filter(i=>i.person===person)
 .sort((a,b)=>(!!a.boughtAt)-(!!b.boughtAt)||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
// What an item counts for. Until it is bought that is the guess; afterwards it is what the till
// actually took, which is the only figure a balance should ever be built from.
export const spendCost=item=>Number.isFinite(item?.spent)?item.spent:(item?.estimate||0);
// How many of the trip's days the amount a day has been paid on: counted from the day it starts,
// never past the day it stops, and never past today.
export function allowanceDays(state,person,today=japanDate()){
 const plan=allowanceFor(state,person);
 if(!plan?.yenPerDay||!plan.from)return 0;
 const dates=(state.days||[]).map(d=>d.date),last=plan.to||dates.at(-1)||plan.from;
 return dates.filter(date=>date>=plan.from&&date<=last&&date<=today).length;
}
export const allowancePaid=(state,person,today)=>allowanceDays(state,person,today)*(allowanceFor(state,person)?.yenPerDay||0);
// What a purse is worth right now, every figure in yen. "left" is real money still in the purse;
// "after" is what would be left once the things still on the list are paid for, which is the
// number that answers "can I afford this as well?".
export function purse(state,person,today){
 const items=spendItemsFor(state,person),bought=items.filter(i=>i.boughtAt);
 const topUps=topUpsFor(state,person).reduce((sum,t)=>sum+(t.yen||0),0);
 const allowance=allowancePaid(state,person,today);
 const spent=bought.reduce((sum,i)=>sum+spendCost(i),0);
 const planned=items.filter(i=>!i.boughtAt).reduce((sum,i)=>sum+(i.estimate||0),0);
 const paidIn=topUps+allowance;
 return {topUps,allowance,paidIn,spent,planned,left:paidIn-spent,after:paidIn-spent-planned,
  items:items.length,bought:bought.length,waiting:items.length-bought.length};
}
// The same purse as a money box rather than a bar, for the boy who cannot read the bar yet.
// `level` is how full the box is now, `after` is where it lands once everything still on the list
// is bought, `promised` is the height of the list itself and `shortfall` is the part of it there
// is no money for. All of them are shares of the fullest the box has had to be — money in, or
// everything asked of it, whichever is larger — so a boy who has promised away more than went in
// still gets a drawing that fits inside itself rather than one that runs off its own edges.
export function purseLevels(money){
 const paidIn=money?.paidIn||0,spent=money?.spent||0,planned=money?.planned||0;
 const cap=Math.max(paidIn,spent+planned,1),share=n=>Math.max(0,Math.min(1,n/cap));
 const after=money?.after||0;
 return {level:share(money?.left||0),after:share(after),promised:share(planned),
  shortfall:share(after<0?-after:0),short:after<0,empty:(money?.left||0)<=0};
}
// Asking for more. A boy cannot put money into his own purse, so the only way the balance moves
// in his favour is to ask and have a parent say yes. The ask, the answer and the amount actually
// approved all stay on the record: "can I have ¥2,000" answered with "you can have ¥1,000" is a
// real answer, and a boy should be able to see that is what happened.
export const REQUEST_STATES=[['open','Waiting on Mum or Dad'],['approved','Approved'],['declined','Not this time']];
// Still waiting first, then most recently asked, so the one that needs an answer is at the top.
export const requestsFor=(state,person)=>spending(state).requests.filter(r=>r.person===person)
 .sort((a,b)=>(a.status!=='open')-(b.status!=='open')||String(b.at||'').localeCompare(String(a.at||'')));
// Every ask still waiting on an answer, which is what puts the badge on a parent's screen.
export const openRequests=state=>spending(state).requests.filter(r=>r.status==='open')
 .sort((a,b)=>String(a.at||'').localeCompare(String(b.at||'')));
// What a boy is owed an answer about, in yen, so the purse can say "and ¥2,000 asked for".
export const requestedFor=(state,person)=>requestsFor(state,person)
 .filter(r=>r.status==='open').reduce((sum,r)=>sum+(r.yen||0),0);

// A to-do of the buy kind is the start of a shopping trip, so it can be handed straight to a
// boy's spending list. One that is already there is not offered twice.
export const buyTodosFor=(state,person)=>todos(state)
 .filter(t=>t.kind==='buy'&&!t.doneAt&&(t.person===person||t.person==='Family')
  &&!spending(state).items.some(i=>i.todoId===t.id))
 .sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
// Standing in the street with two tired children: what is near enough to walk to right now.
// Food and the practical things a family runs out of — not sights, which is what the planning
// board is for.
// "Somewhere to eat" is what you ask when you do not mind; most of the time somebody does mind,
// and the specific ask is the useful one — matcha and a sit-down, ramen, a bakery, something the
// boys can hold. A named craving gets a named place; the broad two are still there for when
// nobody can decide.
export const NEARBY_KINDS=[
 ['food','Somewhere to eat'],['quick','Casual eats, something quick'],['ramen','Ramen & noodles'],
 ['sushi','Sushi'],['bakery','Bakery & sandwiches'],['matcha','Matcha & tea'],
 ['sweets','Sweets, cake & ice cream'],['coffee','Coffee or a cold drink'],['izakaya','Izakaya or a beer'],
 ['konbini','Convenience store'],['toilet','Toilets'],['pharmacy','Pharmacy'],['cash','Cash / ATM'],
 ['lockers','Coin lockers'],['rest','Somewhere to sit down'],['playground','Somewhere to run about'],
 ['shelter','Out of the rain']
];
export const PRICE_BANDS=[['free','Free'],['cheap','Cheap'],['mid','Mid-range'],['pricey','Pricey']];
// The same question asked from the food page is a narrower one: a toilet and a coin locker are
// not what somebody reading the food list wants, so only the ones that can feed you are offered.
export const FOOD_NEARBY_KINDS=['food','quick','ramen','sushi','bakery','matcha','sweets','coffee','izakaya','konbini'];
// Which of them is a meal rather than something eaten standing up, and so how long to put aside
// for it when it goes on the day.
export const MEAL_KINDS=['food','ramen','sushi','izakaya'];
// A rating is only worth having where there is a choice to make. A toilet, a cash machine and a
// coin locker are not chosen, they are found; and the nearest Lawson is the right Lawson, because
// the next one is the same shop. Food and drink is where four tenths of a star is worth four
// minutes, so that is where the rating is asked for and where the ranking uses it. Everything
// else is ranked on the walk alone, which is nearest first, as it always was.
export const RATED_KINDS=FOOD_NEARBY_KINDS.filter(id=>id!=='konbini');
export const isRatedKind=id=>RATED_KINDS.includes(id);
// How many dishes a single hunt carries. The list runs to fifty; asking after all of them at once
// is asking after nothing in particular.
export const MAX_DISH_HUNT=12;
// A place is only said to do one of our dishes if the dish is one we asked about. "Takoyaki" is
// the dish the list writes as "Takoyaki — octopus balls", so the shorter answer counts; a dish
// nobody asked after is dropped rather than shown, because that is an invention either way.
export function matchDish(dish,wishlist){
 const asked=searchText(dish);
 if(!asked)return '';
 return (wishlist||[]).find(name=>{
  const on=searchText(name);
  return !!on&&(on===asked||on.startsWith(`${asked} `)||asked.startsWith(`${on} `));
 })||'';
}
export const nearbyKindLabel=id=>(NEARBY_KINDS.find(([key])=>key===id)||NEARBY_KINDS[0])[1];
export const priceBandLabel=id=>(PRICE_BANDS.find(([key])=>key===id)||['',''])[1];
// What a place is worth once the walk to it is counted. A rating on its own marches a five-year-old
// across town for a tenth of a star; a walk on its own puts the nearest vending machine above the
// best bowl of noodles in the city. The family's own exchange rate settles it: a minute on foot is
// worth a tenth of a star, so ten minutes is a whole star, and four and a half stars eleven minutes
// away loses to four stars round the corner.
export const MINUTES_PER_STAR=10;
// Ratings are Google's, so they are held to Google's range and Google's precision. Five stars off
// three people is not a rating, it is three people, so a handful of votes is treated as none.
export const MIN_RATING_VOTES=5;
export const validRating=v=>Number.isFinite(v)&&v>=1&&v<=5?Math.round(v*10)/10:null;
// A place nobody rated still has to sit somewhere in the list, and an unrated convenience store two
// minutes away is exactly the answer sometimes. It is ranked as the ordinary place it probably is —
// never shown a star it did not earn, because the card says plainly when there is no rating.
export const UNRATED_STARS=3.8;
// A walk nobody could estimate is treated as the far end of what is asked for: fifteen minutes.
export const UNKNOWN_WALK=15;
export function placeScore({rating,walkMinutes}){
 const stars=validRating(rating)??UNRATED_STARS;
 const walk=Number.isFinite(walkMinutes)&&walkMinutes>=0?walkMinutes:UNKNOWN_WALK;
 return Math.round((stars-walk/MINUTES_PER_STAR)*100)/100;
}
// The order the cards come in. A dish we are actually hunting still comes first — that is the whole
// point of asking from the food page — and everything else is settled by what it is worth after the
// walk, with the nearer one ahead when two come out level.
export const rankNearby=(a,b)=>(b.dish?1:0)-(a.dish?1:0)
 ||(b.score??0)-(a.score??0)
 ||(a.walkMinutes??UNKNOWN_WALK)-(b.walkMinutes??UNKNOWN_WALK);
// How the rating reads on a card: one decimal place, the way Google writes it, and the number of
// people behind it, because 4.2 from nine hundred is a different thing from 4.2 from nine.
export const ratingText=(rating,count)=>validRating(rating)===null?'':
 `${validRating(rating).toFixed(1)}${Number.isInteger(count)&&count>0?` · ${count.toLocaleString('en-AU')} ratings`:''}`;
// A position is rounded before it goes anywhere: three decimal places is about a hundred metres,
// which is plenty to find a convenience store and not enough to point at a hotel room.
export const COORD_PLACES=3;
export const roundCoord=v=>Math.round(v*10**COORD_PLACES)/10**COORD_PLACES;
export const validCoords=(lat,lng)=>Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
// A pin is the other way round from a position sent off to be looked up. Nobody is being asked
// about it: the family stood somewhere worth coming back to and said so, and the only thing that
// matters is being able to walk back. Four places is about eleven metres — enough to find the
// bakery again on a corner with four of them, and still not a record of which table.
export const PIN_PLACES=4;
export const validPin=p=>p===null||(!!p&&typeof p==='object'&&!Array.isArray(p)&&['lat','lng'].every(k=>Object.hasOwn(p,k))&&Object.keys(p).length===2&&validCoords(p.lat,p.lng));
export const stepPin=s=>s&&typeof s==='object'&&validPin(s.pin??null)&&s.pin?s.pin:null;
export const pinText=p=>`${p.lat.toFixed(PIN_PLACES)}, ${p.lng.toFixed(PIN_PLACES)}`;
// Walking directions from where you are actually standing, when the phone knows; a plain search
// for the place otherwise. Built here from pieces the app checked, never from a model's link.
export function walkingLink(name,area,from){
 const destination=encodeURIComponent([name,area].filter(Boolean).join(' '));
 return from&&validCoords(from.lat,from.lng)
  ? `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${destination}&travelmode=walking`
  : `https://www.google.com/maps/search/?api=1&query=${destination}`;
}
// Who is actually going, and what each of them would want out of a day. The boys fill in their
// own, which is the point: an eight-year-old who has ticked trains and animals gets a different
// list back from a five-year-old who has ticked playgrounds. Nothing here is on the plan — it is
// what the suggestions are built from, and what a parent reads when a day needs rescuing.
export const INTERESTS=[
 ['temples','Temples & shrines'],['history','History & castles'],['art','Art & design'],['anime','Anime, games & manga'],
 ['food','Food & markets'],['drink','Bars, sake & coffee'],['nature','Gardens, parks & nature'],['views','Views & high places'],
 ['shopping','Shopping'],['crafts','Crafts & making things'],['trains','Trains & engineering'],['animals','Animals'],
 ['sport','Sport & sumo'],['music','Music & live shows'],['onsen','Onsen & bathhouses'],['quirky','Weird and wonderful'],
 ['kids','Playgrounds & running about'],['photo','Photo spots'],['quiet','Quiet corners, away from the crowds'],['nightlife','After dark']
];
export const PACES=[['gentle','Gentle · one big thing a day'],['steady','Steady · two or three'],['packed','Packed · we came a long way']];
// The flavours a suggestion can be asked for. The first two are the axis that matters: the ones
// everybody goes to, and the ones you would never find without being told.
export const SUGGEST_KINDS=[
 ['landmark','The famous ones'],['unique','Only-in-Japan, off the usual list'],['cultural','Cultural & traditional'],
 ['food','Food'],['drink','Drink'],['outdoors','Outdoors & views'],['kids','With the boys'],
 ['shopping','Shopping & markets'],['evening','After dark']
];
export const EMPTY_PARTY={people:{},pace:'steady',budget:null,notes:''};
export const party=state=>({...EMPTY_PARTY,...(state.party||{}),people:{...((state.party||{}).people||{})}});
export const personProfile=(state,name)=>({age:null,interests:[],loves:'',avoid:'',dietary:'',notes:'',...(party(state).people[name]||{})});
export const interestLabel=id=>(INTERESTS.find(([key])=>key===id)||[id,id])[1];
export const paceLabel=id=>(PACES.find(([key])=>key===id)||PACES[1])[1];
// Everyone's interests, most shared first — what the family as a whole is actually after.
export function partyInterests(state){
 const tally=new Map();
 for(const name of state.members||[])for(const id of personProfile(state,name).interests)tally.set(id,[...(tally.get(id)||[]),name]);
 return [...tally.entries()].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0])).map(([id,who])=>({id,label:interestLabel(id),who}));
}
export const profileFilled=(state,name)=>{const p=personProfile(state,name);return !!(p.age||p.interests.length||p.loves||p.avoid||p.dietary||p.notes);};
// The party as a paragraph a model can read. Nothing invented: a blank stays blank, so an empty
// profile reads as "nothing said yet" rather than as a person with no interests.
export function partyBrief(state){
 const p=party(state);
 const lines=(state.members||[]).map(name=>{
  const me=personProfile(state,name),bits=[];
  if(me.interests.length)bits.push(`likes ${me.interests.map(interestLabel).join(', ')}`);
  if(me.loves)bits.push(`loves ${me.loves}`);
  if(me.avoid)bits.push(`would rather avoid ${me.avoid}`);
  if(me.dietary)bits.push(`food: ${me.dietary}`);
  if(me.notes)bits.push(me.notes);
  return `${name}${me.age?`, ${me.age}`:''} — ${bits.length?bits.join('; '):'nothing said yet'}`;
 });
 lines.push(`Pace: ${paceLabel(p.pace)}`);
 if(p.budget)lines.push(`Rough budget: ¥${p.budget.toLocaleString('en-AU')} a day for all of them`);
 if(p.notes)lines.push(`Worth knowing: ${p.notes}`);
 return lines.join('\n');
}
// The planning board. Before anything is on a day, anyone in the family can put a place, a meal
// or an event up where the others can see it, back it with a vote or star it as a must-do.
// Nothing here is the plan: an idea only becomes an activity when a parent puts it on a day, and
// from that moment the step is the plan and the idea is the record of why it is there.
export const PROPOSAL_KINDS=[['place','Place to see'],['food','Food or drink'],['event','Event or show'],['activity','Activity'],['shopping','Shopping'],['rest','Rest or downtime'],['other','Something else']];
// Whether an idea can go anywhere in a day, only inside its opening hours, or has to be booked
// for an exact time. This is the tag that decides whether its scheduled step is locked.
export const PROPOSAL_TIMING=[['flex','Flexible · any time'],['window','Available times only'],['fixed','Needs a fixed time']];
export const PROPOSAL_SORTS=[['top','Most wanted'],['musts','Must-do first'],['new','Newest first'],['cost','Cheapest first']];
export const PLACEMENT_LABEL={open:'Up for a vote',scheduled:'On the itinerary',options:'Moved to Options',parked:'Parked'};
export const proposals=state=>state.proposals||[];
export const findProposal=(state,id)=>proposals(state).find(p=>p.id===id)||null;
export const proposalVoters=(p,vote)=>Object.entries(p.votes||{}).filter(([,v])=>v===vote).map(([name])=>name).sort();
export const proposalMusts=p=>Object.keys(p.musts||{}).sort();
export const proposalScore=p=>proposalVoters(p,1).length-proposalVoters(p,-1).length;
export const proposalStep=(state,p)=>p?.stepId?state.steps.find(s=>s.id===p.stepId)||null:null;
// One word for where an idea has got to, worked out from the step it created rather than stored
// beside it, so an activity that was deleted or moved back to Options cannot leave the board
// still claiming a day and a time it no longer has.
export function proposalPlacement(state,p){
 const step=proposalStep(state,p);
 if(step)return {state:step.day?'scheduled':'options',step,day:step.day,time:step.time||null,locked:!!step.locked};
 return {state:p.parked?'parked':'open',step:null,day:null,time:null,locked:false};
}
// One shape for a new or edited idea, used by the form, by the server that checks it and by the
// phone that draws it before it has synced, so all three describe the same card.
export function proposalDraft(op){
 const number=(v,fallback)=>v===''||v===null||v===undefined?fallback:Number(v);
 return {title:String(op.title??'').trim(),place:String(op.place??'').trim(),japanese:String(op.japanese??'').trim(),
  website:String(op.website??'').trim(),ticketUrl:String(op.ticketUrl??'').trim(),mapUrl:String(op.mapUrl??'').trim(),notes:String(op.notes??''),
  cost:number(op.cost,null),costNote:String(op.costNote??'').trim(),category:op.category??'place',
  suitableFor:[...new Set(Array.isArray(op.suitableFor)?op.suitableFor:[])],
  tags:[...new Set((Array.isArray(op.tags)?op.tags:[]).map(t=>String(t).trim()).filter(Boolean))],
  day:op.day||null,availability:String(op.availability??'').trim(),timing:op.timing??'flex',
  time:op.time||null,duration:number(op.duration,60),source:op.source==='suggested'?'suggested':'typed'};
}
// What a scheduled step carries over from the board: the opening hours and the price the family
// agreed on are exactly what someone standing outside the place will want to read.
export function proposalStepNotes(p){
 const lines=[p.notes,p.availability?`Available: ${p.availability}`:'',
  p.cost===null||p.cost===undefined?'':`Estimated cost ¥${p.cost.toLocaleString('en-AU')}${p.costNote?` · ${p.costNote}`:''}`];
 return lines.filter(Boolean).join('\n').slice(0,4000);
}
export function rankedProposals(state,{query='',category='',suits='',by='',placement='',day='',sort='top'}={}){
 const q=query.trim().toLowerCase();
 const list=proposals(state).filter(p=>{
  const where=proposalPlacement(state,p);
  if(placement&&where.state!==placement)return false;
  if(category&&p.category!==category)return false;
  if(day&&(where.day||p.day)!==day)return false;
  if(suits&&(p.suitableFor||[]).length&&!p.suitableFor.includes(suits))return false;
  if(by&&p.addedBy!==by&&(p.votes||{})[by]===undefined&&!(p.musts||{})[by])return false;
  return !q||[p.title,p.place,p.japanese,p.notes,p.availability,p.costNote,p.addedBy,...(p.tags||[])].filter(Boolean).join(' ').toLowerCase().includes(q);
 });
 const musts=p=>proposalMusts(p).length,age=p=>String(p.createdAt||'');
 const order={top:(a,b)=>proposalScore(b)-proposalScore(a)||musts(b)-musts(a)||age(a).localeCompare(age(b)),
  musts:(a,b)=>musts(b)-musts(a)||proposalScore(b)-proposalScore(a)||age(a).localeCompare(age(b)),
  new:(a,b)=>age(b).localeCompare(age(a)),
  cost:(a,b)=>(a.cost??Infinity)-(b.cost??Infinity)||proposalScore(b)-proposalScore(a)};
 return [...list].sort(order[sort]||order.top);
}
export function searchTrip(state,query,guide=[]){
 const q=query.trim().toLowerCase();if(!q)return [];
 const hits=[],match=(...parts)=>parts.flat().filter(Boolean).join(' ').toLowerCase().includes(q);
 for(const s of state.steps)if(match(s.title,s.place,s.japanese,s.notes,s.bookingReference,s.website))hits.push({type:s.day?'Activity':'Option',id:s.id,title:s.title,detail:s.notes,day:s.day,step:s});
 for(const p of proposals(state))if(match(p.title,p.place,p.japanese,p.notes,p.availability,p.costNote,p.addedBy,p.tags))hits.push({type:'Planning',id:p.id,title:p.title,detail:p.notes||p.place,day:proposalPlacement(state,p).day||p.day});
 // An archived ticket is hidden from the list, not from the trip: search still finds it, says so,
 // and opens the used pile on it rather than a page that looks empty.
 for(const d of state.documents)if(match(d.title,d.reference,d.notes,d.tags))hits.push({type:d.category==='memory'?'Memory':isArchived(d)?'Used ticket':'Document',id:d.id,title:d.title,detail:d.notes,day:d.day||state.steps.find(s=>s.id===d.stepId)?.day,document:d});
 for(const l of state.locations||[])if(match(l.name,l.district,l.city,l.address,l.category,l.notes))hits.push({type:'Location',id:l.id,title:l.name,detail:l.address});
 for(const s of state.shopping)if(match(s.title,s.notes,s.store,s.person,s.tags))hits.push({type:'Shopping',id:s.id,title:s.title,detail:s.store,day:s.day});
 for(const s of shortlist(state))if(match(s.title,s.notes,s.shop,s.place,s.person,s.tags,shortlistWhere(state,s)))hits.push({type:'Shortlist',id:s.id,title:s.title,detail:shortlistWhere(state,s).join(' · '),day:shortlistDay(state,s)});
 for(const i of spending(state).items)if(match(i.title,i.notes,i.person))hits.push({type:'Spending',id:i.id,title:i.title,detail:`${i.person}’s spending money`,day:i.day});
 for(const c of state.challenges)if(match(c.title,c.notes))hits.push({type:'Challenge',id:c.id,title:c.title,day:c.day});
 for(const [day,m]of Object.entries(state.meetings))if(match(m.place,m.japanese,m.notes))hits.push({type:'Meeting',id:day,title:m.place,detail:m.notes,day});
 for(const [day,n]of Object.entries(state.journal))if(match(n))hits.push({type:'Diary',id:day,title:`Diary · ${day}`,detail:n,day});
 for(const p of guide)if(match(p.text))hits.push({type:'Guide',id:p.number,title:`Guide page ${p.number}`,page:p.number});
 return hits;
}
export function diaryDays(state,day){
 return state.days.filter(d=>!day||d.date===day).map(d=>{
  const steps=state.steps.filter(s=>s.day===d.date&&s.status==='done').sort((a,b)=>(a.completedAt||'').localeCompare(b.completedAt||''));
  const media=state.documents.filter(m=>m.category==='memory'&&(m.day===d.date||state.steps.find(s=>s.id===m.stepId)?.day===d.date));
  const challenges=state.challenges.flatMap(c=>Object.entries(c.completions||{}).filter(([,at])=>at&&japanDate(new Date(at))===d.date).map(([name])=>`${name}: ${c.title}${c.responses?.[name]?' — '+c.responses[name]:''}`));
  return {...d,steps,media,challenges,note:state.journal[d.date]||'',rating:dayRating(state,d.date),reviews:ratedSteps(state,{day:d.date})};
 });
}
export function pendingProgress(state,queue){
 const next=ensureFeatures(structuredClone(state));
 for(const {operation:o}of queue){
  if(o.type==='status'){const s=next.steps.find(s=>s.id===o.id);if(s){s.status=o.status;s.pending=true;if(o.status==='done')s.completedAt=o.at;if(o.status==='started')s.startedAt=o.at;if(o.status==='todo'){delete s.startedAt;delete s.completedAt;}
   // The tickets for an activity ticked off on a train with no signal leave the list there and
   // then, exactly as they will when the change lands, rather than lingering until it syncs.
   if(o.status==='done')next.documents=next.documents.map(d=>documentServesStep(d,s.id)&&documentSpent(next.steps,d)&&d.category!=='memory'&&!d.archivedAt?{...d,archivedAt:o.at,archivedWith:s.id,pending:true}:d);
   if(o.status==='todo')next.documents=next.documents.map(d=>d.archivedWith&&documentServesStep(d,s.id)?{...d,archivedAt:null,archivedBy:null,archivedWith:null,pending:true}:d);
  }}
  if(o.type==='phraseSeen'){
   if(o.day){const e={...(next.phraseSeen[o.day]||{})};e[o.person]=e[o.person]||o.at;next.phraseSeen={...next.phraseSeen,[o.day]:e};}
   if(o.phraseIds?.length){const log={...(next.phraseLog[o.person]||{})};for(const id of o.phraseIds)log[id]=log[id]||o.at;next.phraseLog={...next.phraseLog,[o.person]:log};}
  }
  if(o.type==='factSeen'){
   if(o.day){const e={...(next.factSeen[o.day]||{})};e[o.person]=e[o.person]||o.at;next.factSeen={...next.factSeen,[o.day]:e};}
   if(o.factIds?.length){const log={...(next.factLog[o.person]||{})};for(const id of o.factIds)log[id]=log[id]||o.at;next.factLog={...next.factLog,[o.person]:log};}
  }
  if(o.type==='gameScore'){
   const mine={...(next.games.scores[o.person]||{})};
   mine[o.game]=Math.max(mine[o.game]||0,o.score);
   next.games={...next.games,scores:{...next.games.scores,[o.person]:mine}};
  }
  if(o.type==='foodTried'){const e=next.food[o.itemId]||{},tried={...(e.tried||{})};if(o.done)tried[o.person]=tried[o.person]||o.at;else delete tried[o.person];next.food={...next.food,[o.itemId]:{...e,tried}};}
  if(o.type==='foodRating'){const e=next.food[o.itemId]||{},ratings={...(e.ratings||{})};if(o.rating)ratings[o.person]=o.rating;else delete ratings[o.person];next.food={...next.food,[o.itemId]:{...e,ratings}};}
  if(o.type==='expressPick'||o.type==='expressUsed'){const slot=next.expressSlots.find(s=>s.id===o.id);if(slot){
   if(o.type==='expressPick'){const picks={...(slot.picks||{})};if(o.rideId)picks[o.person]=o.rideId;else delete picks[o.person];slot.picks=picks;}
   else{const used={...(slot.used||{})};if(o.done)used[o.person]=used[o.person]||o.at;else delete used[o.person];slot.used=used;}
   slot.pending=true;
  }}
  if(o.type==='parkRide'){const e=next.parkRides[o.rideId]||{},ridden={...(e.ridden||{})};if(o.done)ridden[o.person]=ridden[o.person]||o.at;else delete ridden[o.person];next.parkRides={...next.parkRides,[o.rideId]:{...e,ridden}};}
  if(o.type==='eyeSpy'){const key=eyeSpyKey(o.stepId,o.item),found={...(next.eyeSpy[key]||{})};if(o.done)found[o.person]=found[o.person]||o.at;else delete found[o.person];next.eyeSpy={...next.eyeSpy,[key]:found};}
  // An idea thought of on a train with no signal, and the votes cast on one, are additions:
  // they are still right whenever they land, so the board shows them straight away.
  if(o.type==='proposalAdd')next.proposals=[...next.proposals,{id:`pending-${o.operationId}`,...proposalDraft(o),addedBy:o.person,createdAt:o.at,votes:{},musts:{},parked:false,stepId:null,pending:true}];
  if(o.type==='proposalVote'){const p=next.proposals.find(p=>p.id===o.id);if(p){const votes={...(p.votes||{})};if(o.vote===0)delete votes[o.person];else votes[o.person]=o.vote;p.votes=votes;p.pending=true;}}
  if(o.type==='proposalMust'){const p=next.proposals.find(p=>p.id===o.id);if(p){const musts={...(p.musts||{})};if(o.must)musts[o.person]=musts[o.person]||o.at;else delete musts[o.person];p.musts=musts;p.pending=true;}}
  if(o.type==='stepRating'||o.type==='stepThought'){
   const entry={...(next.stepReviews[o.id]||{})};
   if(o.type==='stepRating'){const ratings={...(entry.ratings||{})};if(o.rating)ratings[o.person]=o.rating;else delete ratings[o.person];entry.ratings=ratings;}
   else{const thoughts={...(entry.thoughts||{})};if(String(o.thought||'').trim())thoughts[o.person]={text:String(o.thought).trim(),at:o.at};else delete thoughts[o.person];entry.thoughts=thoughts;}
   next.stepReviews={...next.stepReviews,[o.id]:entry};
  }
  if(o.type==='sumoPredict'){const next_sumo={...next.sumo,predictions:{...(next.sumo.predictions||{})}};
   const forBout={...(next_sumo.predictions[o.id]||{})};
   if(o.winner)forBout[o.person]=o.winner;else delete forBout[o.person];
   if(Object.keys(forBout).length)next_sumo.predictions[o.id]=forBout;else delete next_sumo.predictions[o.id];
   next.sumo=next_sumo;}
  if(o.type==='sumoResult'){const next_sumo={...next.sumo,results:{...(next.sumo.results||{})}};
   if(o.winner)next_sumo.results[o.id]={winner:o.winner,by:o.by||'',at:o.at};else delete next_sumo.results[o.id];
   next.sumo=next_sumo;}
  // A character is only ever your own to design, so one made with no signal can stand beside
  // your name straight away rather than waiting for the family plan to catch up.
  if(o.type==='mascotSave')next.mascots={...next.mascots,[o.person]:{...o.mascot,updatedAt:o.at,pending:true}};
  if(o.type==='mascotRemove'){const {[o.person]:removed,...rest}=next.mascots;next.mascots=rest;}
  // Something seen in a shop with no signal in it, which is most shops: the find is words and is
  // still exactly as true whenever it lands, so it goes on the shortlist at once. Its photograph
  // cannot follow until there is signal, so the card says so rather than offering a camera that
  // would post against an entry the trip has never heard of.
  if(o.type==='shortlistAdd')next.shortlist=[...next.shortlist,{id:`pending-${o.operationId}`,title:String(o.title||'').trim(),
   shop:String(o.shop||'').trim(),place:String(o.place||'').trim(),notes:String(o.notes||'').trim(),
   person:o.person||'Family',day:o.stepId?null:(o.day??null),price:o.price??null,tags:Array.isArray(o.tags)?o.tags:[],
   stepId:o.stepId??null,locationId:o.locationId??null,pin:validPin(o.pin??null)?(o.pin??null):null,
   rating:shortlistRating(o),shoppingId:null,
   status:'thinking',photo:null,addedBy:o.by||'',createdAt:o.at,decidedBy:null,decidedAt:null,pending:true}];
  // How much we want it is an opinion formed standing in front of the thing, which is exactly
  // where there is no signal, so it is given on the spot and lands whenever the phone does.
  if(o.type==='shortlistRating'){const f=next.shortlist.find(f=>f.id===o.id);if(f){f.rating=shortlistRating(o);f.pending=true;}}
  if(o.type==='shortlistStatus'){const f=next.shortlist.find(f=>f.id===o.id);if(f){f.status=o.status;f.decidedBy=o.status==='thinking'?null:(o.by||f.decidedBy);f.decidedAt=o.status==='thinking'?null:o.at;f.pending=true;}}
  if(o.type==='todoAdd')next.todos=[...next.todos,{id:`pending-${o.operationId}`,title:String(o.title||'').trim(),kind:o.kind==='buy'?'buy':'do',day:o.day??null,person:o.person||'Family',notes:String(o.notes||''),createdBy:o.by||'',createdAt:o.at,doneAt:null,doneBy:null,pending:true}];
  // Something put in the case on a train, and a suggestion added or turned down there, are all
  // still right whenever they land, so the list shows them at once.
  if(o.type==='packAdd'||o.type==='packAddAll'){
   const list=o.type==='packAdd'?[o]:(Array.isArray(o.items)?o.items:[]);
   next.packing={...next.packing,items:[...next.packing.items,...list.map((item,i)=>({...packItem(item,`pending-${o.operationId}-${i}`),
    createdBy:o.by||'',createdAt:o.at,packedAt:null,packedBy:null,pending:true}))]};
  }
  if(o.type==='packStatus')next.packing={...next.packing,items:next.packing.items.map(i=>i.id!==o.id?i:{...i,packedAt:o.packed?o.at:null,packedBy:o.packed?o.by||i.packedBy:null,pending:true})};
  if(o.type==='packDismiss'){const dismissed={...next.packing.dismissed};if(o.dismissed)dismissed[o.suggestionId]={by:o.by||'',at:o.at};else delete dismissed[o.suggestionId];next.packing={...next.packing,dismissed};}
  if(o.type==='todoStatus'){const t=next.todos.find(t=>t.id===o.id);if(t){t.doneAt=o.done?o.at:null;t.doneBy=o.done?o.by||t.doneBy:null;t.pending=true;}}
  // Something wanted, and something bought, both with no signal: additions and a record of what
  // happened, so the purse on the screen is right long before it reaches the family plan.
  if(o.type==='spendAdd')next.spending={...next.spending,items:[...next.spending.items,{id:`pending-${o.operationId}`,person:o.person,title:String(o.title||'').trim(),estimate:Number.isFinite(o.estimate)?o.estimate:null,spent:null,day:o.day??null,notes:String(o.notes||''),todoId:o.todoId??null,createdBy:o.by||'',createdAt:o.at,boughtAt:null,boughtBy:null,pending:true}]};
  // Asking is an addition and is still a fair question whenever it lands, so it shows at once.
  if(o.type==='spendRequest')next.spending={...next.spending,requests:[...next.spending.requests,{id:`pending-${o.operationId}`,person:o.person,yen:Number.isFinite(o.yen)?o.yen:0,reason:String(o.reason||'').trim(),at:o.at,by:o.by||'',status:'open',decidedBy:null,decidedAt:null,approvedYen:null,reply:'',pending:true}]};
  if(o.type==='spendBought')next.spending={...next.spending,items:next.spending.items.map(i=>i.id!==o.id?i:{...i,boughtAt:o.done?o.at:null,boughtBy:o.done?o.by||i.boughtBy:null,spent:o.done&&Number.isFinite(o.spent)?o.spent:o.done?i.spent:null,pending:true})};
  if(o.type==='challengeSkip'){const c=next.challenges.find(c=>c.id===o.id);if(c){c.skips={...(c.skips||{})};if(o.done){c.skips[o.person]=c.skips[o.person]||o.at;delete c.completions[o.person];}else delete c.skips[o.person];}}
  if(o.type==='challengeStatus'){const c=next.challenges.find(c=>c.id===o.id);if(c){c.completions={...c.completions};if(o.done)c.completions[o.person]=c.completions[o.person]||o.at;else delete c.completions[o.person];if(o.response!==undefined)c.responses={...(c.responses||{}),[o.person]:o.response};}}
 }
 return next;
}
