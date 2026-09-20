import {thankYouForDay,THANK_YOU_FROM,THANK_YOU_TO} from '../src/trip-features.js';
import {japanDate} from '../src/timing.js';
// The thank-you notes are private between Damien and Lauren. Damien sees the whole list;
// Lauren only ever receives the note scheduled for the current Japan day; nobody else
// receives any of it. Redaction happens here, at the response boundary, so the note text
// is never sent to a phone that is not meant to read it.
export function visibleTrip(state,user,now=new Date()){
 if(user?.name===THANK_YOU_FROM)return state;
 if(user?.name!==THANK_YOU_TO)return {...state,thankYou:{seen:{},today:null}};
 const day=japanDate(now),note=thankYouForDay(state,day);
 return {...state,thankYou:{seen:state.thankYou?.seen??{},today:note?{id:note.id,day,text:note.text}:null}};
}
export const visibleEnvelope=(envelope,user,now=new Date())=>({...envelope,state:visibleTrip(envelope.state,user,now),user});
