import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ensureFeatures} from '../src/trip-features.js';
import {findStop,quickAnswer,quickIntent,quickSpoken,saySpan,sayLeg} from '../src/concierge-quick.js';
import {onHeadphonePress,headphonePress,startHeadphones,headphonesHeld} from '../src/headphones.js';
import {deepLinkAction,DEEP_LINKS} from '../src/deep-links.js';
process.env.LOCAL_DEMO='1';
const {default:handler}=await import('../server/handler.mjs');
const {visibleTrip}=await import('../server/visibility.mjs');
const {readTrip}=await import('../server/store.mjs');
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const fresh=()=>ensureFeatures(structuredClone(seed));
// Saturday in Arashiyama, twenty to ten: Hatoya matcha (9:30) is on, the bridge (9:45) is next.
const at=(clock,day='2026-09-26')=>new Date(`${day}T${clock}:00+09:00`);
const ask=(state,q,clock='09:40',extra={})=>quickAnswer(state,q,{person:'Damien',now:at(clock),...extra});

test('the questions asked walking are told apart, and the rest go on to the Concierge',()=>{
 assert.equal(quickIntent('What’s next?').kind,'next');
 assert.equal(quickIntent('whats up next').kind,'next');
 assert.deepEqual(quickIntent('How long until dinner?'),{kind:'until',target:'dinner'});
 assert.deepEqual(quickIntent('how much time do we have before the tea ceremony'),{kind:'until',target:'the tea ceremony'});
 assert.deepEqual(quickIntent('How do I get to the bamboo grove'),{kind:'directions',target:'the bamboo grove'});
 assert.deepEqual(quickIntent('take us to the hotel'),{kind:'directions',target:'the hotel'});
 assert.equal(quickIntent('how do we get there').kind,'directions');
 assert.equal(quickIntent('when do we need to leave for the game').kind,'leave');
 assert.equal(quickIntent('what time is it').kind,'clock');
 assert.equal(quickIntent('any tips for here').kind,'tips');
 for(const q of ['Is it going to rain tomorrow?','Move the garden to after lunch','Should we tip the taxi driver?','Is Fushimi Inari better today or tomorrow?',''])
  assert.equal(quickIntent(q),null,q);
});

test('what is next goes by the ticks and the clock, so breakfast is not next at dinner time',()=>{
 const state=fresh();
 const now=ask(state,'what’s next');
 assert.equal(now.verdict,'Now: Hatoya matcha, from half past 9 in the morning.');
 assert.match(now.answer,/^Next is Togetsukyo Bridge at 9:45 in the morning, in 5 minutes\./);
 assert.doesNotMatch(now.answer,/It is at Togetsukyo/,'the place is not said when the name already says it');
 assert.match(now.link.url,/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=Togetsukyo/);
 assert.equal(now.quick,true);assert.deepEqual(now.days,['2026-09-26']);
 // A stop under way is now, whatever the clock says.
 state.steps.find(s=>s.id==='2026-09-26-08').status='started';
 assert.match(ask(state,'what is next').verdict,/^Next is Subway home at half past 11/);
 // Everything ticked: the day is done, and the night is at the hotel.
 for(const s of state.steps.filter(s=>s.day==='2026-09-26'))s.status='done';
 assert.equal(ask(state,'next stop').verdict,'That is everything on today’s plan.');
});

test('how long until a stop, found by a word of its name, and the stop beats the walk to it',()=>{
 const state=fresh();
 assert.equal(ask(state,'how long until Isetan').verdict,'An hour and 35 minutes until Isetan food hall stop, at 11:15 in the morning.');
 assert.match(ask(state,'when is dinner').verdict,/until Karasuma Rock dinner, at half past 5 in the evening/);
 assert.equal(findStop(state,'2026-09-26','the the to'),null,'filler alone names nothing');
 assert.equal(ask(state,'how long until the zoo'),null,'nothing on the plan by that name: a question for the Concierge');
 assert.equal(saySpan(1),'1 minute');assert.equal(saySpan(60),'an hour');assert.equal(saySpan(125),'2 hours and 5 minutes');
});

test('the way there is read from the route card, leg by leg, and Japanese is left to the screen',()=>{
 const state=fresh();
 const way=ask(state,'how do we get to Nara Park',undefined,{});
 // Not a trip day of Nara's, so the Nara stop is found on its own day.
 assert.match(way.verdict,/^To Bus towards Nara Park: about 10 minutes, in 2 steps\./);
 assert.match(way.answer,/Take the .* from Kintetsu-Nara Station \(stop 1\) to Todaiji Daibutsuden/);
 const spoken=quickSpoken(way);
 assert.doesNotMatch(spoken,/[぀-ヿ㐀-鿿]/,'an English voice is never handed Japanese');
 assert.match(spoken,/The Japanese to look for is on the screen\.$/);
 assert.match(sayLeg({mode:'walk',text:'Hotel to the station.',minutes:5}),/^Walk: Hotel to the station, about 5 minutes\.$/);
 // A stop with no route still gets Maps, and the hotel is a place even when it is not a stop.
 const grove=ask(state,'directions to the bamboo grove');
 assert.match(grove.answer,/no route written for it/);assert.match(grove.link.url,/destination=Arashiyama%20Bamboo%20Grove/);
});

test('off the trip days, only the clock is answered; everything else goes to the Concierge',()=>{
 const state=fresh();
 assert.equal(quickAnswer(state,'what’s next',{now:new Date('2026-12-01T10:00:00+09:00')}),null);
 assert.match(quickAnswer(state,'what time is it',{now:new Date('2026-12-01T10:00:00+09:00')}).verdict,/^It is 10 o’clock in the morning in Japan\.$/);
});

test('an AirPods press goes to the newest listener, and the loop holds only while the app is on screen',()=>{
 const heard=[];
 const offApp=onHeadphonePress(a=>heard.push(`app:${a}`));
 const offVoice=onHeadphonePress(a=>heard.push(`voice:${a}`));
 headphonePress('pause');offVoice();headphonePress('play');offApp();
 assert.deepEqual(heard,['voice:pause','app:play']);
 assert.equal(headphonePress(),false,'nobody listening, nothing happens');
 // A phone, faked: the session's handlers, the touch that unlocks audio, the app going away.
 const handlers={},events={},docEvents={};
 const doc={visibilityState:'visible',addEventListener:(e,f)=>{docEvents[e]=f;},removeEventListener:(e)=>{delete docEvents[e];}};
 const win={navigator:{mediaSession:{setActionHandler:(a,f)=>{handlers[a]=f;}}},document:doc,
  addEventListener:(e,f)=>{events[e]=f;},removeEventListener:(e)=>{delete events[e];},MediaMetadata:function(m){Object.assign(this,m);}};
 globalThis.Audio=function(){this.play=()=>Promise.resolve();this.pause=()=>{};this.paused=false;};
 const stop=startHeadphones(win);
 assert.equal(headphonesHeld(),false,'nothing plays before a touch');
 events.pointerdown();
 assert.equal(headphonesHeld(),true);
 assert.equal(typeof handlers.play,'function');assert.equal(win.navigator.mediaSession.metadata.title,'Concierge');
 const presses=[];const off=onHeadphonePress(a=>presses.push(a));handlers.nexttrack();off();
 assert.deepEqual(presses,['nexttrack']);
 doc.visibilityState='hidden';docEvents.visibilitychange();
 assert.equal(headphonesHeld(),false,'in the background the press goes back to the music');
 assert.equal(handlers.play,null);
 doc.visibilityState='visible';docEvents.visibilitychange();
 assert.equal(headphonesHeld(),true,'back on the screen, it holds again with no new touch');
 stop();assert.equal(headphonesHeld(),false);
});

test('the Concierge opens listening from a Shortcut address',()=>{
 assert.deepEqual(deepLinkAction('?open=concierge'),{type:'concierge'});
 assert.ok(DEEP_LINKS.some(l=>l.path==='/?open=concierge'));
});

const call=async(method,path,body)=>{
 const out={status:0,headers:{},text:''};
 const res={set statusCode(v){out.status=v;},get statusCode(){return out.status;},setHeader:(k,v)=>{out.headers[k.toLowerCase()]=v;},end:t=>{out.text=String(t??'');}};
 await handler({method,url:path,headers:{host:'localhost'},body},res);
 return out;
};
test('Hey Siri, Concierge: a personal key, kept hashed, answers in plain words and is withdrawn by making another',async()=>{
 const made=await call('POST','/api/concierge-link',{});
 const url=JSON.parse(made.text).url;
 assert.match(url,/^http:\/\/localhost\/api\/concierge\?key=[a-f0-9]{64}&q=$/);
 const key=url.match(/key=([a-f0-9]{64})/)[1];
 const {state}=await readTrip();
 assert.equal(state.conciergeKeys.length,1);assert.equal(state.conciergeKeys[0].name,'Damien');
 assert.ok(!JSON.stringify(state.conciergeKeys).includes(key),'the trip keeps the hash, never the key');
 assert.deepEqual(Object.keys(visibleTrip(state,{name:'Damien',role:'parent'}).conciergeKeys[0]).sort(),['createdAt','id','name']);
 assert.deepEqual(visibleTrip(state,{name:'Lauren',role:'parent'}).conciergeKeys,[],'nobody is told about anybody else’s');
 const clock=await call('GET',`/api/concierge?key=${key}&q=${encodeURIComponent('what time is it')}`);
 assert.equal(clock.status,200);assert.match(clock.headers['content-type'],/^text\/plain/);
 assert.match(clock.text,/^It is .* in Japan\.$/);
 const empty=await call('GET',`/api/concierge?key=${key}&q=`);
 assert.match(empty.text,/^Ask me about the trip/);
 const json=await call('GET',`/api/concierge?key=${key}&q=what%20time%20is%20it&format=json`);
 assert.equal(JSON.parse(json.text).answer.quick,true);
 const wrong=await call('GET',`/api/concierge?key=${'0'.repeat(64)}&q=hello`);
 assert.equal(wrong.status,403);assert.match(wrong.text,/not valid any more/,'said in words, because Siri reads it out');
 await call('POST','/api/concierge-link',{});
 assert.equal((await call('GET',`/api/concierge?key=${key}&q=what%20time%20is%20it`)).status,403,'a new link withdraws the old one');
 await call('POST','/api/concierge-link',{stop:true});
 assert.equal((await readTrip()).state.conciergeKeys.length,0);
});
