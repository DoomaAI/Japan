import {googleFrameView} from '../src/google-frame-data.js';
import {frameKeyView} from '../src/frame-mail-data.js';
import {thankYouForDay,thankYouList,THANK_YOU_FROM,THANK_YOU_FOR} from '../src/trip-features.js';
import {japanDate} from '../src/timing.js';
import {isDeveloping,developingStub} from '../src/film-data.js';
import {questionOpen} from '../src/quiz-data.js';
import {visiblePredictions} from '../src/prediction-data.js';
import {visibleCapsule} from '../src/capsule-data.js';
import {visibleRsvps,guestSummary} from '../src/rsvp-data.js';
// The daily notes are private between Damien and the person each one is for. Damien sees
// every list; Lauren, Nate and Boston each receive only their own note for the current Japan
// day, and never anyone else's. Redaction happens here, at the response boundary, so the note text
// is never sent to a phone that is not meant to read it.
// Janken only works if neither phone can see the other hand before both are thrown. Hiding
// it in the screen would not do: the state behind the screen is one fetch away. So the other
// player's hand is removed here, and only put back once the round is complete.
function hideUnthrownHands(state,user){
 const round=state.games?.janken?.round;
 if(!round||round.done)return state;
 const throws={};
 for(const [person,choice] of Object.entries(round.throws||{}))throws[person]=person===user?.name?choice:'hidden';
 return {...state,games:{...state.games,janken:{...state.games.janken,round:{...round,throws}}}};
}
// Forwarded email is whatever an email happened to carry — a booking, a bank reference, a
// letter from a school. Hiding the screen from the boys would not do: the state behind it is
// one fetch away, so the inbox is removed here, for anyone who is not a parent.
// A tracker's shared link opens a live map of where that bag is, for as long as the link lasts.
// The boys can see which bags have a tracker and that a parent can find them; the link itself
// is removed here, like the inbox, because the state behind the screen is one fetch away.
const hideTrackerLinks=(state,user)=>user?.role==='parent'||!state.trackers?.length?state
 :{...state,trackers:state.trackers.map(t=>({...t,shareUrl:null}))};
const hideInbox=(state,user)=>user?.role==='parent'?state:{...state,inbox:[]};
// The family ledger is the parents' money, and like the inbox it is removed at the boundary.
const hideExpenses=(state,user)=>user?.role==='parent'?state:{...state,expenses:[],payMethods:[],settlements:[],askThread:[],bin:(state.bin||[]).filter(e=>!['expense','payMethod'].includes(e.kind))};
export function visibleTrip(state,user,now=new Date()){
 // The calendar key opens the trip's calendar to anyone holding it, so no phone is sent it as
 // part of the plan; a parent gets it from the one route that hands out the subscription link.
 // The follow-along key is the same kind of thing, and a parent is handed it the same way.
 // The invitation key is the same again: the public link's key, handed to a parent by one route.
 const {calendarKey,followKey,inviteKey,...rest}=state;
 // A screen frame's key opens the follow-along view like the follow key, so it goes to no phone:
 // a parent sees the frames by name and is handed a link by its route. The mailed frames'
 // addresses are the grandparents', and go to the parents only.
 if(rest.frameKeys)rest.frameKeys=user?.role==='parent'?rest.frameKeys.map(frameKeyView):[];
 if(rest.frameEmails&&user?.role!=='parent')rest.frameEmails=[];
 // A Nest Hub frame's Google token (sealed) and its link's secret go to no phone at all.
 if(rest.googleFrames)rest.googleFrames=user?.role==='parent'?rest.googleFrames.map(googleFrameView):[];
 state=hideExpenses(hideTrackerLinks(hideInbox(hideUnthrownHands(rest,user),user),user),user);
 // The dinner quiz: a buzzer phone is not sent the right answer, or anyone else's, until the
 // question has closed. The host's phone has them; it is the one showing the scores.
 if(state.quiz&&user?.name!==state.quiz.host){
  const q=state.quiz,open=questionOpen(q,+now);
  state={...state,quiz:{...q,questions:q.questions.map((x,i)=>i<q.index||(i===q.index&&!open)||q.done?x:{...x,answer:null}),
   answers:Object.fromEntries(Object.entries(q.answers||{}).map(([i,a])=>[i,Number(i)===q.index&&open&&!q.done?Object.fromEntries(Object.entries(a).filter(([n])=>n===user?.name)):a]))}};
 }
 // A film photo still developing goes to no phone, the photographer's included: only that it is
 // there, and whose. The picture itself arrives at seven the next morning.
 if(state.photos?.some(p=>isDeveloping(p,+now)))state={...state,photos:state.photos.map(p=>isDeveloping(p,+now)?developingStub(p):p)};
 // The answers to the invitation: a guest gets their own whole, the others' status only when the
 // organiser shares names, and the counts either way, worked out here so they are right without
 // the records behind them (src/rsvp-data.js).
 if(user?.role!=='parent'&&state.rsvps)state={...state,rsvps:visibleRsvps(state,user),rsvpCounts:guestSummary(state).counts};
 // Sealed predictions are sealed at the boundary too: the others' answers are not sent until
 // the trip is over, only that they have answered.
 if(state.predictions)state={...state,predictions:visiblePredictions(state,user?.name,japanDate(now))};
 // The notes to open next year are sealed the same way: yours, and that the others have written.
 if(state.capsule)state={...state,capsule:visibleCapsule(state,user?.name,japanDate(now))};
 if(user?.name===THANK_YOU_FROM)return state;
 if(!THANK_YOU_FOR.includes(user?.name))return {...state,thankYou:{seen:{},today:null}};
 const day=japanDate(now),note=thankYouForDay(state,day,user.name);
 return {...state,thankYou:{seen:thankYouList(state,user.name).seen??{},today:note?{id:note.id,day,text:note.text}:null}};
}
export const visibleEnvelope=(envelope,user,now=new Date())=>({...envelope,state:visibleTrip(envelope.state,user,now),user});
