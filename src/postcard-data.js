// A real postcard to the grandparents. The follow-along link is a screen; a card on the fridge
// is the thing they keep. The app does not print or post: it writes the card — the photo, the
// day, and what the boy said about it in his own words — and hands it to the phone's share
// sheet, where a print-and-post app (TouchNote, Australia Post's cards) or plain Messages takes
// it. The provider to build in is logged in the Trip shop as a keepsake with none chosen yet.
import {photoOwner} from './trip-features.js';
import {cut} from './text.js';
export function postcardText(state,photo,{to='Grandma and Grandpa'}={}){
 const days=state?.days||[],i=days.findIndex(d=>d.date===photo?.day),day=days[i];
 const by=photoOwner(photo),said=(state?.voiceNotes||[]).find(v=>v.day===photo?.day&&v.by===by&&v.transcript)?.transcript
  ||(state?.stepReviews&&Object.values(state.stepReviews).map(e=>e.thoughts?.[by]?.text).find(Boolean))||'';
 const diary=String(state?.journal?.[photo?.day]||'').trim();
 const lines=[`Dear ${to},`,
  day?`Day ${i+1} of ${days.length} in ${day.city||'Japan'}: ${day.title||''}.`.replace(': .','.'):'From Japan.',
  said?`${by} says: “${cut(said,220)}”`:diary?cut(diary,220):`A photo by ${by}.`,
  `Love from all of us.`];
 return {title:`A postcard from ${by}`,text:lines.join('\n')};
}
