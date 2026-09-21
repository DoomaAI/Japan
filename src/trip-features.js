import {activeSteps,minutes,asClock,japanDate,japanClock} from './timing.js';
import {ORDERED_PHRASES,phraseForDay} from './phrasebook-data.js';
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
export function ensureFeatures(state){
 return {...state,mapUrl:(state.mapUrl||'').replace('1SDEq4N32fF5lTAzSNS00w5A1R0Ldarw','1mztIuWzTviCEZSLdDxEUqo2WK3HUNfo'),mapEmbed:(state.mapEmbed||'').replace('1SDEq4N32fF5lTAzSNS00w5A1R0Ldarw','1mztIuWzTviCEZSLdDxEUqo2WK3HUNfo'),...seededChallenges(state),shopping:state.shopping??[],meetings:state.meetings??{},contacts:state.contacts??{Damien:'',Lauren:''},alerts:state.alerts??[],journal:state.journal??{},eyeSpy:state.eyeSpy??{},parkRides:state.parkRides??{},heights:state.heights??{},food:state.food??{},foodItems:state.foodItems??[],rates:state.rates??{perAud:DEFAULT_YEN_PER_AUD,at:null,by:null},phraseSeen:state.phraseSeen??{},phraseLog:state.phraseLog??{},customPhrases:state.customPhrases??[],voiceNotes:state.voiceNotes??[],thankYou:state.thankYou??{messages:initialThankYou(),seen:{}}};
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
export function nextSummary(state,day){
 const remaining=activeSteps(state,day).filter(s=>!['done','skipped'].includes(s.status));
 const current=remaining.find(s=>s.status==='started')||remaining[0];
 const fixed=remaining.filter(s=>s.locked&&s.time).sort((a,b)=>a.time.localeCompare(b.time))[0];
 const departure=fixed?new Date(new Date(`${day}T${fixed.time}:00+09:00`).getTime()-((fixed.travelMinutes??20)+(fixed.arrivalBuffer??15))*60000):null;
 return {current,fixed,departure};
}
export function offlineManifest(state,day){
 const d=state.days.find(d=>d.date===day),ids=new Set(activeSteps(state,day).map(s=>s.id));
 const docs=state.documents.filter(d=>d.category!=='memory'&&(d.day===day||ids.has(d.stepId)||(!d.day&&!d.stepId)));
 return {files:[...(d?.pages||[]).map(p=>({key:`page-${p}`,title:`Guide page ${p}`,url:`/api/guide?page=${p}`})),...docs.filter(d=>d.pathname).map(d=>({key:`doc-${d.id}`,title:d.title,url:`/api/document?id=${d.id}`}))],links:docs.filter(d=>d.type==='link')};
}
// A ticket and its attached files are read as one set: the ticket itself first, then each
// file attached to it. Written details and external links hold no file, so they are skipped.
export function attachmentGroup(documents,view){
 if(!view)return [];
 const rootId=view.parentDocumentId||view.id,root=documents.find(d=>d.id===rootId);
 const group=[...(root?.pathname?[root]:[]),...documents.filter(d=>d.parentDocumentId===rootId&&d.pathname)];
 return group.some(d=>d.id===view.id)?group:[view];
}
// HEIC and HEIF are accepted uploads but most browsers cannot draw them in an <img>, so they
// never stand in as a thumbnail — they are offered as a link to the original instead.
export const DRAWABLE=['image/jpeg','image/png','image/webp'];
export const isDrawable=doc=>!!doc?.pathname&&DRAWABLE.includes(doc.type);
// The picture that stands for a ticket: its own photo, else the first photo attached to it.
export const documentThumbnail=(doc,attachments=[])=>isDrawable(doc)?doc:attachments.find(isDrawable)||null;
export function searchTrip(state,query,guide=[]){
 const q=query.trim().toLowerCase();if(!q)return [];
 const hits=[],match=(...parts)=>parts.flat().filter(Boolean).join(' ').toLowerCase().includes(q);
 for(const s of state.steps)if(match(s.title,s.place,s.japanese,s.notes,s.bookingReference,s.website))hits.push({type:s.day?'Activity':'Option',id:s.id,title:s.title,detail:s.notes,day:s.day,step:s});
 for(const d of state.documents)if(match(d.title,d.reference,d.notes,d.tags))hits.push({type:d.category==='memory'?'Memory':'Document',id:d.id,title:d.title,detail:d.notes,day:d.day||state.steps.find(s=>s.id===d.stepId)?.day,document:d});
 for(const l of state.locations||[])if(match(l.name,l.district,l.city,l.address,l.category,l.notes))hits.push({type:'Location',id:l.id,title:l.name,detail:l.address});
 for(const s of state.shopping)if(match(s.title,s.notes,s.store,s.person,s.tags))hits.push({type:'Shopping',id:s.id,title:s.title,detail:s.store,day:s.day});
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
  return {...d,steps,media,challenges,note:state.journal[d.date]||''};
 });
}
export function pendingProgress(state,queue){
 const next=ensureFeatures(structuredClone(state));
 for(const {operation:o}of queue){
  if(o.type==='status'){const s=next.steps.find(s=>s.id===o.id);if(s){s.status=o.status;s.pending=true;if(o.status==='done')s.completedAt=o.at;if(o.status==='started')s.startedAt=o.at;if(o.status==='todo'){delete s.startedAt;delete s.completedAt;}}}
  if(o.type==='phraseSeen'){
   if(o.day){const e={...(next.phraseSeen[o.day]||{})};e[o.person]=e[o.person]||o.at;next.phraseSeen={...next.phraseSeen,[o.day]:e};}
   if(o.phraseIds?.length){const log={...(next.phraseLog[o.person]||{})};for(const id of o.phraseIds)log[id]=log[id]||o.at;next.phraseLog={...next.phraseLog,[o.person]:log};}
  }
  if(o.type==='foodTried'){const e=next.food[o.itemId]||{},tried={...(e.tried||{})};if(o.done)tried[o.person]=tried[o.person]||o.at;else delete tried[o.person];next.food={...next.food,[o.itemId]:{...e,tried}};}
  if(o.type==='foodRating'){const e=next.food[o.itemId]||{},ratings={...(e.ratings||{})};if(o.rating)ratings[o.person]=o.rating;else delete ratings[o.person];next.food={...next.food,[o.itemId]:{...e,ratings}};}
  if(o.type==='parkRide'){const e=next.parkRides[o.rideId]||{},ridden={...(e.ridden||{})};if(o.done)ridden[o.person]=ridden[o.person]||o.at;else delete ridden[o.person];next.parkRides={...next.parkRides,[o.rideId]:{...e,ridden}};}
  if(o.type==='eyeSpy'){const key=eyeSpyKey(o.stepId,o.item),found={...(next.eyeSpy[key]||{})};if(o.done)found[o.person]=found[o.person]||o.at;else delete found[o.person];next.eyeSpy={...next.eyeSpy,[key]:found};}
  if(o.type==='challengeSkip'){const c=next.challenges.find(c=>c.id===o.id);if(c){c.skips={...(c.skips||{})};if(o.done){c.skips[o.person]=c.skips[o.person]||o.at;delete c.completions[o.person];}else delete c.skips[o.person];}}
  if(o.type==='challengeStatus'){const c=next.challenges.find(c=>c.id===o.id);if(c){c.completions={...c.completions};if(o.done)c.completions[o.person]=c.completions[o.person]||o.at;else delete c.completions[o.person];if(o.response!==undefined)c.responses={...(c.responses||{}),[o.person]:o.response};}}
 }
 return next;
}
