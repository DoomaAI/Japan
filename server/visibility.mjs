import {thankYouForDay,THANK_YOU_FROM,THANK_YOU_TO} from '../src/trip-features.js';
import {japanDate} from '../src/timing.js';
// The thank-you notes are private between Damien and Lauren. Damien sees the whole list;
// Lauren only ever receives the note scheduled for the current Japan day; nobody else
// receives any of it. Redaction happens here, at the response boundary, so the note text
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
export function visibleTrip(state,user,now=new Date()){
 state=hideUnthrownHands(state,user);
 if(user?.name===THANK_YOU_FROM)return state;
 if(user?.name!==THANK_YOU_TO)return {...state,thankYou:{seen:{},today:null}};
 const day=japanDate(now),note=thankYouForDay(state,day);
 return {...state,thankYou:{seen:state.thankYou?.seen??{},today:note?{id:note.id,day,text:note.text}:null}};
}
export const visibleEnvelope=(envelope,user,now=new Date())=>({...envelope,state:visibleTrip(envelope.state,user,now),user});
