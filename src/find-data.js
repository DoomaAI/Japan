// Type anything. One box at the top of Home that finds, as you type and with no signal, whatever
// is already on the phone: a stop, a hotel, a ticket, a phrase, a shopping item, a person, or a
// screen of the app. Raycast's idea: names, not questions — Ask keeps the questions. The trip's
// own search does the stops, tickets, shopping, notes and the rest; this adds what it does not
// carry (the phrases, the hotels, the people, the screens) and puts the best matches first.
import {searchTrip,searchText} from './trip-features.js';
import {ALL_PHRASES} from './phrasebook-data.js';
import {staysOf} from './stay-data.js';
import {PAGES,pagesFor} from './nav-data.js';
export const FIND_MAX=8;
// A match on the start of the name beats one in the middle, which beats one in the notes.
const score=(q,title,rest='')=>{const t=searchText(title),r=searchText(rest);return t.startsWith(q)?3:t.split(' ').some(w=>w.startsWith(q))?2:t.includes(q)?1.5:r.includes(q)?1:0;};
export function findAnything(state,query,user,limit=FIND_MAX){
 const q=searchText(query);if(q.length<2)return [];
 const out=[];
 for(const [id,p] of Object.entries(PAGES))if(pagesFor(user).includes(id)){const s=score(q,p.label,p.note);if(s)out.push({kind:'Screen',id,title:p.label,detail:p.note,page:id,score:s+0.5});}
 for(const p of ALL_PHRASES()){const s=score(q,p.en,[p.romaji,p.ja,p.say].join(' '));if(s)out.push({kind:'Phrase',id:p.id,title:p.en,detail:p.romaji||p.ja,phrase:p,score:s});}
 for(const st of staysOf(state)){const s=score(q,st.hotel,st.city);if(s)out.push({kind:'Hotel',id:st.hotel,title:st.hotel,detail:`${st.nights.length} night${st.nights.length===1?'':'s'} from ${st.from}`,day:st.from,score:s+0.5});}
 for(const n of state.members||[]){const s=score(q,n);if(s)out.push({kind:'Person',id:n,title:n,detail:'Profile, likes and what they rated',page:'planning',score:s});}
 for(const h of searchTrip(state,query))out.push({...h,kind:h.type,score:score(q,h.title,h.detail||'')||0.5});
 const seen=new Set();
 return out.sort((a,b)=>b.score-a.score).filter(h=>{const k=`${h.kind}|${h.id}`;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,limit);
}
